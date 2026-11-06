import { NextRequest } from "next/server";
import {
  bodyJson,
  cookieOptions,
  disconnected,
  json,
  nest,
  sameOrigin,
  SESSION_COOKIE,
  sessionToken,
} from "@/lib/server";
type Context = { params: Promise<{ path: string[] }> };
function allowed(method: string, path: string) {
  if (method === "GET")
    return /^(dashboard|users(?:\/\d+)?|vehicles(?:\/\d+(?:\/records)?)?|audit-logs|catalog\/(brands|models|types))$/.test(
      path,
    );
  if (method === "POST")
    return /^(users|catalog\/(brands|models|types))$/.test(path);
  if (method === "PATCH" || method === "DELETE")
    return /^(users\/\d+|catalog\/(brands|models|types)\/\d+)$/.test(path);
  return false;
}
async function handle(request: NextRequest, { params }: Context) {
  const path = (await params).path.join("/");
  if (!allowed(request.method, path))
    return json({ message: "Không tìm thấy chức năng." }, 404);
  if (request.method !== "GET" && !sameOrigin(request))
    return json({ message: "Yêu cầu không hợp lệ." }, 403);
  const token = await sessionToken();
  if (!token) return json({ message: "Vui lòng đăng nhập quản trị." }, 401);
  let body: unknown;
  if (["POST", "PATCH"].includes(request.method))
    try {
      body = await bodyJson(request);
    } catch {
      return json({ message: "Dữ liệu nhập không hợp lệ." }, 400);
    }
  try {
    const upstream = await nest(
        "/admin/" + path + request.nextUrl.search,
        token,
        request.method,
        body,
      ),
      data = await upstream.json();
    const response = json(data, upstream.status);
    if (upstream.status === 401)
      response.cookies.set(SESSION_COOKIE, "", {
        ...cookieOptions(),
        maxAge: 0,
      });
    return response;
  } catch {
    return disconnected();
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
