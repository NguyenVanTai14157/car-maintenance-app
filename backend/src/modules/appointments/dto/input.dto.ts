/** Transport contract. Runtime checks are performed by service validation. */
export interface AppointmentsInput {
  vehicle_id?: number;
  garage_id?: number;
  service_ids?: number[];
  starts_at?: string;
  notes?: string;
  action?: string;
  reason?: string;
  condition?: string;
  odometer?: number;
  technician_id?: number;
  checked?: boolean[];
  description?: string;
  amount?: number;
  extra_id?: number;
  kind?: string;
  data?: string;
  images?: string[];
  photo_id?: number;
  paid?: boolean;
  rating?: number;
  comment?: string;
  message?: string;
}
