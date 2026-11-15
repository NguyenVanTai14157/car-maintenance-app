import { nest, sessionToken } from "@/lib/server";

export async function GET(request: Request) {
  const token = await sessionToken();
  if (!token) return new Response(null, { status: 401 });
  try {
    const upstream = await nest("/admin/system-logs/events", token, "GET", undefined, request.signal);
    if (!upstream.ok) return new Response(null, { status: upstream.status });
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
