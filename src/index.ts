function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const withCORS = (res: Response) => {
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
      return new Response(res.body, { status: res.status, headers });
    };

    if (url.pathname === "/health") {
      const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return withCORS(Response.json({ ok: row?.ok === 1 }));
    }

    if (url.pathname === "/api/lead" && request.method === "POST") {
      try {
        const body: any = await request.json();

        const name = String(body?.name ?? "");
        const email = String(body?.email ?? "");
        const phone = String(body?.phone ?? "");
        const service = String(body?.service ?? "");
        const message = String(body?.message ?? "");

        if (!email || !service) {
          return withCORS(
            Response.json({ error: "Email and service are required" }, { status: 400 })
          );
        }

        await env.DB.prepare(
          `INSERT INTO leads (name, email, phone, service, message, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        )
          .bind(name, email, phone, service, message)
          .run();

        return withCORS(Response.json({ ok: true }));
      } catch {
        return withCORS(Response.json({ error: "Server error" }, { status: 500 }));
      }
    }

    return withCORS(new Response("Not found", { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
