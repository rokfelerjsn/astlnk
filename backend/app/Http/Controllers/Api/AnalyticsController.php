<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Category;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        [$from, $to] = $this->dateRange($request);
        $filters = $this->filters($request);

        $periodQuery = $this->ticketQuery($filters, $from, $to);
        $snapshotQuery = $this->ticketQuery($filters);

        $totalTickets = (clone $periodQuery)->count();
        $resolved = (clone $periodQuery)->where('status', 'done')->count();
        $avgRepairTime = $this->averageRepairHours((clone $periodQuery)->where('status', 'done')->whereNotNull('resolved_at'));

        $openTickets = (clone $snapshotQuery)->where('status', 'new')->count();
        $inProgress = (clone $snapshotQuery)->whereIn('status', ['assigned', 'in_progress'])->count();

        $buildingTrends = $this->buildingTrends($filters, $from, $to);
        $categoryDistribution = $this->categoryDistribution($filters, $from, $to);
        $monthlyTrend = $this->monthlyTrend($filters, $from, $to);
        $statusDistribution = (clone $periodQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn($item) => [
                'name' => $item->status,
                'value' => $item->count,
            ]);

        $response = [
            'summary' => [
                'total' => $totalTickets,
                'open' => $openTickets,
                'in_progress' => $inProgress,
                'resolved' => $resolved,
                'avg_repair_hours' => round($avgRepairTime, 1),
            ],
            'building_trends' => $buildingTrends,
            'category_distribution' => $categoryDistribution,
            'monthly_trend' => $monthlyTrend,
            'status_distribution' => $statusDistribution,
            'meta' => [
                'from' => $from?->toDateString(),
                'to' => $to?->toDateString(),
                'filters' => $filters,
                'compare' => $request->boolean('compare'),
            ],
        ];

        if ($request->boolean('compare') && $from && $to) {
            $response['comparison'] = $this->comparison($filters, $from, $to, $response['summary']);
        }

        return response()->json($response);
    }

    private function dateRange(Request $request): array
    {
        $from = $request->date('from') ? Carbon::parse($request->query('from'))->startOfDay() : null;
        $to = $request->date('to') ? Carbon::parse($request->query('to'))->endOfDay() : null;

        if (! $from && ! $to) {
            $from = now()->startOfMonth()->subMonths(5)->startOfDay();
            $to = now()->endOfMonth()->endOfDay();
        }

        if ($from && ! $to) {
            $to = now()->endOfDay();
        }

        if (! $from && $to) {
            $from = Ticket::min('created_at') ? Carbon::parse(Ticket::min('created_at'))->startOfDay() : now()->startOfDay();
        }

        return [$from, $to];
    }

    private function filters(Request $request): array
    {
        return [
            'buildingId' => $request->query('buildingId'),
            'categoryId' => $request->query('categoryId'),
            'technicianId' => $request->query('technicianId'),
            'priority' => $request->query('priority'),
            'status' => $request->query('status'),
        ];
    }

    private function ticketQuery(array $filters, ?Carbon $from = null, ?Carbon $to = null): Builder
    {
        return Ticket::query()
            ->when($from && $to, fn($q) => $q->whereBetween('created_at', [$from, $to]))
            ->when($filters['buildingId'], fn($q, $id) => $q->whereHas('room', fn($room) => $room->where('building_id', $id)))
            ->when($filters['categoryId'], fn($q, $id) => $q->where('category_id', $id))
            ->when($filters['technicianId'], fn($q, $id) => $q->where('technician_id', $id))
            ->when($filters['status'], fn($q, $status) => $q->where('status', $status))
            ->when($filters['priority'] && Schema::hasColumn('tickets', 'priority'), fn($q) => $q->where('priority', $filters['priority']));
    }

    private function averageRepairHours(Builder $query): float
    {
        return (float) $query->get(['created_at', 'resolved_at'])
            ->avg(fn($ticket) => $ticket->created_at->diffInMinutes($ticket->resolved_at) / 60) ?? 0;
    }

    private function buildingTrends(array $filters, ?Carbon $from, ?Carbon $to)
    {
        return Building::query()
            ->when($filters['buildingId'], fn($q, $id) => $q->whereKey($id))
            ->get()
            ->map(function ($building) use ($filters, $from, $to) {
                $scope = $this->ticketQuery([...$filters, 'buildingId' => $building->id], $from, $to);
                $ticketCount = (clone $scope)->count();
                $resolvedCount = (clone $scope)->where('status', 'done')->count();

                return [
                    'id' => $building->id,
                    'building' => $building->name,
                    'code' => $building->code,
                    'total' => $ticketCount,
                    'resolved' => $resolvedCount,
                    'pending' => max($ticketCount - $resolvedCount, 0),
                ];
            });
    }

    private function categoryDistribution(array $filters, ?Carbon $from, ?Carbon $to)
    {
        return Category::query()
            ->when($filters['categoryId'], fn($q, $id) => $q->whereKey($id))
            ->get()
            ->map(function ($category) use ($filters, $from, $to) {
                $count = $this->ticketQuery([...$filters, 'categoryId' => $category->id], $from, $to)->count();

                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'value' => $count,
                ];
            });
    }

    private function monthlyTrend(array $filters, ?Carbon $from, ?Carbon $to)
    {
        if (! $from || ! $to) {
            return collect();
        }

        $cursor = $from->copy()->startOfMonth();
        $last = $to->copy()->startOfMonth();
        $months = collect();

        while ($cursor->lte($last)) {
            $monthStart = $cursor->copy()->startOfMonth()->max($from);
            $monthEnd = $cursor->copy()->endOfMonth()->min($to);
            $scope = $this->ticketQuery($filters, $monthStart, $monthEnd);

            $months->push([
                'month' => $cursor->format('M Y'),
                'total' => (clone $scope)->count(),
                'resolved' => (clone $scope)->where('status', 'done')->count(),
            ]);

            $cursor->addMonth();
        }

        return $months;
    }

    private function comparison(array $filters, Carbon $from, Carbon $to, array $current): array
    {
        $days = $from->diffInDays($to) + 1;
        $previousTo = $from->copy()->subSecond()->endOfDay();
        $previousFrom = $from->copy()->subDays($days)->startOfDay();
        $query = $this->ticketQuery($filters, $previousFrom, $previousTo);
        $previous = [
            'total' => (clone $query)->count(),
            'resolved' => (clone $query)->where('status', 'done')->count(),
            'avg_repair_hours' => round($this->averageRepairHours((clone $query)->where('status', 'done')->whereNotNull('resolved_at')), 1),
        ];

        return [
            'from' => $previousFrom->toDateString(),
            'to' => $previousTo->toDateString(),
            'summary' => $previous,
            'changes' => [
                'total' => $this->change($current['total'], $previous['total']),
                'resolved' => $this->change($current['resolved'], $previous['resolved']),
                'avg_repair_hours' => $this->change($current['avg_repair_hours'], $previous['avg_repair_hours'], true),
            ],
        ];
    }

    private function change(float|int $current, float|int $previous, bool $lowerIsBetter = false): array
    {
        $difference = $current - $previous;
        $percent = $previous > 0 ? ($difference / $previous) * 100 : ($current > 0 ? 100 : 0);

        return [
            'difference' => round($difference, 1),
            'percent' => round($percent, 1),
            'better' => $lowerIsBetter ? $difference < 0 : $difference > 0,
        ];
    }
}