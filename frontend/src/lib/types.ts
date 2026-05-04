// Type definitions for AsetLink

export interface Building {
  id: number;
  name: string;
  code: string;
  rooms_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: number;
  building_id: number;
  room_number: string;
  qr_path: string | null;
  building?: Building;
  tickets_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  tickets_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  id: number;
  name: string;
  phone: string;
  status: 'available' | 'busy';
  tickets_count?: number;
  created_at: string;
  updated_at: string;
}

export type TicketStatus = 'new' | 'validated' | 'assigned' | 'in_progress' | 'done';

export interface TicketLog {
  id: number;
  ticket_id: number;
  from_status: string | null;
  to_status: string;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_code: string;
  reporter_name: string;
  reporter_phone: string;
  room_id: number;
  category_id: number;
  description: string;
  photo_path: string | null;
  status: TicketStatus;
  technician_id: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  room?: Room;
  category?: Category;
  technician?: Technician | null;
  logs?: TicketLog[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AnalyticsData {
  summary: {
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    avg_repair_hours: number;
  };
  building_trends: Array<{
    building: string;
    code: string;
    total: number;
    resolved: number;
    pending: number;
  }>;
  category_distribution: Array<{
    name: string;
    value: number;
  }>;
  monthly_trend: Array<{
    month: string;
    total: number;
    resolved: number;
  }>;
  status_distribution: Array<{
    name: string;
    value: number;
  }>;
}
