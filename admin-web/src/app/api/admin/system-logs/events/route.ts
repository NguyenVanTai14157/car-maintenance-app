import { nest, sessionToken } from "@/lib/server";

export async function GET(request: Request) {
  const token = await sessionToken();
  if (!token) return new Response(null, { status: 401 });
  try {
    const upstream = await nest("/admin/system-logs/events", token, "GET", undefined, request.signal);
    if (!upstream.ok) return new Response(null, { status: upstream.status });
    if (!upstream.body) return new Response(null, { status: 502 });
    const reader = upstream.body.getReader();
    let cancelled = false;
    const body = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (cancelled) return;
          if (done) controller.close();
          else controller.enqueue(value);
        } catch {
          // End the event stream cleanly when the API restarts; the client reconnects.
          if (!cancelled) controller.close();
        }
      },
      async cancel() {
        cancelled = true;
        await reader.cancel().catch(() => {});
      },
    });
    return new Response(body, {
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
