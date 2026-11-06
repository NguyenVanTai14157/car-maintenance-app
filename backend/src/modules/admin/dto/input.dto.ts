export interface UserCreateInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: "user" | "admin";
  active?: boolean;
}
export interface UserUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: "user" | "admin";
  active?: boolean;
}
export interface CatalogInput {
  name?: string;
  active?: boolean;
  brand_id?: number;
  type_id?: number | null;
}
export interface PageQuery {
  page?: string;
  page_size?: string;
  q?: string;
  active?: string;
  role?: string;
  owner_id?: string;
  brand_id?: string;
  model_id?: string;
  type_id?: string;
  archived?: string;
  actor_id?: string;
  action?: string;
  entity?: string;
}
