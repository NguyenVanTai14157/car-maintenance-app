import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import type { AdminUser } from "./types";

export const SESSION_COOKIE = "autocare.admin.session";
export const cookieOptions = () => ({
  httpOnly: true,
  secure:
    process.env.ADMIN_COOKIE_SECURE === "true" ||
    (process.env.ADMIN_COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production"),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
});
export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
export async function nest(
  path: string,
  token?: string,
  method = "GET",
  body?: unknown,
) {
  return fetch(
    (process.env.ADMIN_API_URL || "http://127.0.0.1:3000").replace(/\/$/, "") +
      path,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
}
export async function currentAdmin(): Promise<AdminUser | null> {
  const token = await sessionToken();
  if (!token) return null;
  const response = await nest("/auth/me", token);
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw Error("Không thể tải tài khoản quản trị.");
  const user: AdminUser = await response.json();
  return user.role === "admin" ? user : null;
}
export async function requireAdmin() {
  const user = await currentAdmin();
  if (!user) redirect("/login");
  return user;
}
export function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === request.nextUrl.origin;
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function disconnected() {
  return json(
    {
      message:
        "Không kết nối được máy chủ. Vui lòng kiểm tra backend và thử lại.",
    },
    502,
  );
}
export async function bodyJson(request: NextRequest) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw Error("INVALID_BODY");
  const raw = await request.text();
  if (raw.length > 16000) throw Error("INVALID_BODY");
  return JSON.parse(raw);
}
