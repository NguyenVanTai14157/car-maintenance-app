/** Transport contract. Runtime checks are performed by service validation. */
export interface GaragesInput {
  name?: string;
  address?: string;
  open_hour?: number;
  close_hour?: number;
  capacity?: number;
  cancel_hours?: number;
  reminder_hours?: number;
  notification_template?: string;
  active?: boolean;
}
