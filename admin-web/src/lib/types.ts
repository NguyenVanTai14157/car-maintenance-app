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
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export type CatalogKind = "brands" | "models" | "types";
export interface CatalogItem {
  id: number;
  name: string;
  active: boolean;
  brand_id?: number;
  type_id?: number | null;
  brand_name?: string;
  type_name?: string;
  brand_active?: boolean;
  type_active?: boolean;
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
  brand_id: number | null;
  model_id: number | null;
  type_id: number | null;
  type_name: string | null;
  catalog_brand_name?: string;
  catalog_model_name?: string;
  notes?: string;
  image?: string;
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
  active_brands: number;
  active_models: number;
  active_types: number;
  top_brands: { name: string; vehicles: number }[];
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
