<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Category;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(): JsonResponse
    {
        // Summary counts
        $totalTickets = Ticket::count();
        $openTickets = Ticket::whereIn('status', ['new'])->count();
        $inProgress = Ticket::whereIn('status', ['assigned', 'in_progress'])->count();
        $resolved = Ticket::where('status', 'done')->count();

        // Average repair time (in hours)
        $avgRepairTime = Ticket::where('status', 'done')
            ->whereNotNull('resolved_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
            ->value('avg_hours');

        // For SQLite compatibility in dev
        if ($avgRepairTime === null) {
            $avgRepairTime = Ticket::where('status', 'done')
                ->whereNotNull('resolved_at')
                ->get()
                ->avg(fn($t) => $t->created_at->diffInHours($t->resolved_at));
        }

        // Damage trends per building
        $buildingTrends = Building::withCount('rooms')
            ->get()
            ->map(function ($building) {
                $ticketCount = Ticket::whereHas('room', fn($q) => $q->where('building_id', $building->id))->count();
                $resolvedCount = Ticket::whereHas('room', fn($q) => $q->where('building_id', $building->id))
                    ->where('status', 'done')->count();
                return [
                    'id' => $building->id,
                    'building' => $building->name,
                    'code' => $building->code,
                    'total' => $ticketCount,
                    'resolved' => $resolvedCount,
                    'pending' => $ticketCount - $resolvedCount,
                ];
            });

        // Category distribution
        $categoryDistribution = Category::withCount('tickets')
            ->get()
            ->map(fn($cat) => [
                'id' => $cat->id,
                'name' => $cat->name,
                'value' => $cat->tickets_count,
            ]);

        // Monthly trend (last 6 months)
        $monthlyTrend = collect(range(5, 0))->map(function ($monthsAgo) {
            $date = now()->subMonths($monthsAgo);
            $count = Ticket::whereYear('created_at', $date->year)
                ->whereMonth('created_at', $date->month)
                ->count();
            $resolved = Ticket::whereYear('created_at', $date->year)
                ->whereMonth('created_at', $date->month)
                ->where('status', 'done')
                ->count();
            return [
                'month' => $date->format('M Y'),
                'total' => $count,
                'resolved' => $resolved,
            ];
        });

        // Status distribution
        $statusDistribution = Ticket::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->map(fn($item) => [
                'name' => $item->status,
                'value' => $item->count,
            ]);

        return response()->json([
            'summary' => [
                'total' => $totalTickets,
                'open' => $openTickets,
                'in_progress' => $inProgress,
                'resolved' => $resolved,
                'avg_repair_hours' => round($avgRepairTime ?? 0, 1),
            ],
            'building_trends' => $buildingTrends,
            'category_distribution' => $categoryDistribution,
            'monthly_trend' => $monthlyTrend,
            'status_distribution' => $statusDistribution,
        ]);
    }
}
