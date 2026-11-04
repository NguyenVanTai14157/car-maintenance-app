/** Transport contract. Runtime checks are performed by service validation. */
export interface AuthInput {
  name?: string;
  password?: string;
  identifier?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  current?: string;
}
