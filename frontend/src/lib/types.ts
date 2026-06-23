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
  normalized_phone?: string | null;
  status: 'available' | 'busy';
  whatsapp_enabled?: boolean;
  last_whatsapp_seen_at?: string | null;
  tickets_count?: number;
  created_at: string;
  updated_at: string;
}

export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'done';

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
  archived_at: string | null;
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
    id: number;
    building: string;
    code: string;
    total: number;
    resolved: number;
    pending: number;
  }>;
  category_distribution: Array<{
    id: number;
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
  meta?: {
    from: string | null;
    to: string | null;
    compare: boolean;
    filters: Record<string, string | null>;
  };
  comparison?: {
    from: string;
    to: string;
    summary: {
      total: number;
      resolved: number;
      avg_repair_hours: number;
    };
    changes: {
      total: AnalyticsChange;
      resolved: AnalyticsChange;
      avg_repair_hours: AnalyticsChange;
    };
  };
}

export interface AnalyticsChange {
  difference: number;
  percent: number;
  better: boolean;
}

export type WhatsAppDeviceStatus = 'connected' | 'disconnected' | 'qr_pending' | 'banned' | 'error';

export interface WhatsAppDevice {
  id: number | string;
  display_name: string;
  phone_number: string | null;
  provider: string;
  status: WhatsAppDeviceStatus;
  quality_rating: string | null;
  last_seen_at: string | null;
  connected_at: string | null;
  messages_today?: number;
  metadata?: Record<string, unknown> | null;
  qr?: string | null;
  expires_at?: string | null;
}

export interface WhatsAppConnectResult {
  device_id: number | string;
  id?: number | string;
  status: WhatsAppDeviceStatus;
  qr?: string | null;
  expires_at?: string | null;
  transport?: string;
  phone?: string | null;
  phone_number?: string | null;
}
