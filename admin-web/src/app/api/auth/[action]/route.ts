import { NextRequest } from "next/server";
import {
  bodyJson,
  cookieOptions,
  currentAdmin,
  disconnected,
  json,
  nest,
  sameOrigin,
  SESSION_COOKIE,
  sessionToken,
} from "@/lib/server";
type Context = { params: Promise<{ action: string }> };
export async function GET(_: NextRequest, { params }: Context) {
  if ((await params).action !== "session")
    return json({ message: "Không tìm thấy chức năng." }, 404);
  try {
    const user = await currentAdmin();
    const response = json(
      user || { message: "Phiên đăng nhập đã hết hạn." },
      user ? 200 : 401,
    );
    if (!user)
      response.cookies.set(SESSION_COOKIE, "", {
        ...cookieOptions(),
        maxAge: 0,
      });
    return response;
  } catch {
    return disconnected();
  }
}
export async function POST(request: NextRequest, { params }: Context) {
  if (!sameOrigin(request))
    return json({ message: "Yêu cầu không hợp lệ." }, 403);
  const { action } = await params;
  if (
    ![
      "login",
      "logout",
      "password",
      "profile",
      "forgot-password",
      "reset-password",
    ].includes(action)
  )
    return json({ message: "Không tìm thấy chức năng." }, 404);
  let body: unknown;
  try {
    body = await bodyJson(request);
  } catch {
    return json({ message: "Dữ liệu nhập không hợp lệ." }, 400);
  }
  const token = await sessionToken();
  if (["logout", "password", "profile"].includes(action) && !token)
    return json({ message: "Vui lòng đăng nhập lại." }, 401);
  try {
    if (action === "logout") {
      try {
        await nest("/auth/logout", token, "POST", {});
      } catch {
        /* End this browser session even when backend is unavailable. */
      }
      const response = json({ ok: true });
      response.cookies.set(SESSION_COOKIE, "", {
        ...cookieOptions(),
        maxAge: 0,
      });
      return response;
    }
    const endpoint =
      action === "login"
        ? "/admin/auth/login"
        : action === "profile"
          ? "/auth/me"
          : "/auth/" + action;
    const upstream = await nest(
        endpoint,
        token,
        action === "profile" ? "PATCH" : "POST",
        body,
      ),
      data = await upstream.json();
    if (action === "login" && upstream.ok) {
      if (data.user?.role !== "admin" || typeof data.accessToken !== "string")
        return json({ message: "Tài khoản không có quyền quản trị." }, 403);
      const response = json({ user: data.user });
      response.cookies.set(SESSION_COOKIE, data.accessToken, cookieOptions());
      return response;
    }
    const response = json(data, upstream.status);
    if (upstream.status === 401 && action !== "login")
      response.cookies.set(SESSION_COOKIE, "", {
        ...cookieOptions(),
        maxAge: 0,
      });
    return response;
  } catch {
    return disconnected();
  }
}
