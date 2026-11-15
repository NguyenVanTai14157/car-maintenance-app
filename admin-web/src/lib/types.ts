export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "user" | "admin";
  active: boolean;
  avatar?: string;
  created_at: string;
  vehicle_count?: number;
  vehicles?: number;
  plans?: number;
  records?: number;
}
export interface HomeBanner {
  id: number;
  title: string;
  action_text: string;
  target_path: "/plans" | "/record-edit" | "/vehicles";
  image_path: string;
  image_paths?: string[];
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export interface Vehicle {
  id: number;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  brand: string;
  model: string;
  plate: string | null;
  year: number | null;
  odometer: number;
  archived: boolean;
  notes?: string;
  image?: string;
  images?: string[];
}
export interface MaintenanceRecord {
  id: number;
  category_name: string;
  performed_date: string;
  odometer: number;
  cost: number;
  content: string;
  notes: string;
  images: string[];
}
export interface Dashboard {
  users: number;
  active_users: number;
  active_admins: number;
  vehicles: number;
  archived_vehicles: number;
  maintenance_plans: {
    planned: number;
    soon: number;
    due: number;
    overdue: number;
    completed: number;
    cancelled: number;
  };
  top_brands: { name: string; vehicles: number }[];
}
export interface AdminPlan {
  id: number;
  vehicle_id: number;
  category_name: string;
  due_date: string | null;
  due_km: number | null;
  current_km: number;
  brand: string;
  model: string;
  plate: string | null;
  year: number | null;
  cancelled: boolean;
  completed_record_id: number | null;
  status: "planned" | "soon" | "due" | "overdue" | "completed" | "cancelled";
  reasons: string[];
}
export interface AuditLog {
  id: string;
  actor_id: number | null;
  actor_name: string | null;
  action: string;
  entity: string;
  target_id: number;
  created_at: string;
  details: {
    fields?: string[];
    role?: string;
    active?: boolean;
    before?: { role?: string; active?: boolean };
    after?: { role?: string; active?: boolean };
  };
}
