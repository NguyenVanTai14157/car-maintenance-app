/** Transport contract. Runtime checks are performed by service validation. */
export interface VehiclesInput {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  odometer?: number;
}
