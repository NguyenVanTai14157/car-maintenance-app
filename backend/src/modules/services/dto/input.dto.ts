/** Transport contract. Runtime checks are performed by service validation. */
export interface ServicesInput {
  checklistText?: string;
  name?: string;
  description?: string;
  price?: number;
  duration?: number;
  active?: boolean;
}
