import type { Request } from "express";
export type Role = "admin" | "receptionist" | "technician" | "customer";
export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: Role;
    name: string;
    [key: string]: unknown;
  };
  sessionId: string;
}
