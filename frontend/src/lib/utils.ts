import { TicketStatus } from './types';

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Baru',
  assigned: 'Ditugaskan',
  in_progress: 'Dikerjakan',
  done: 'Selesai',
};

export const STATUS_FLOW: TicketStatus[] = [
  'new',
  'assigned',
  'in_progress',
  'done',
];

export const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; dot: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  assigned: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  in_progress: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  done: { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
};

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDateShort(dateString);
}
