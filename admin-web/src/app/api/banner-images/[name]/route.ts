import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  disconnected,
  nest,
  SESSION_COOKIE,
  sessionToken,
} from "@/lib/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.(?:jpg|png)$/i.test(name))
    return new NextResponse(null, { status: 404 });
  const token = await sessionToken();
  if (!token) return new NextResponse(null, { status: 401 });
  try {
    const upstream = await nest("/uploads/banners/" + name, token);
    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
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
