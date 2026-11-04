/** Transport contract. Runtime checks are performed by service validation. */
export interface UsersInput {
  role?: string;
  name?: string;
  password?: string;
  active?: boolean;
}
