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

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const withCORS = (res: Response) => {
      const headers = new Headers(res.headers);
      Object.entries(corsHeaders()).forEach(([k, v]) =>
        headers.set(k, v)
      );
      return new Response(res.body, {
        status: res.status,
        headers,
      });
    };

    // Health check
    if (url.pathname === "/health") {
      const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return withCORS(Response.json({ ok: row?.ok === 1 }));
    }

    // Create lead endpoint
    if (url.pathname === "/api/lead" && request.method === "POST") {
      try {
        const body = await request.json();

        const name = body.name || "";
        const email = body.email || "";
        const phone = body.phone || "";
        const service = body.service || "";
        const message = body.message || "";

        if (!email || !service) {
          return withCORS(
            Response.json(
              { error: "Email and service are required" },
              { status: 400 }
            )
          );
        }

        await env.DB.prepare(
          `INSERT INTO leads (name, email, phone, service, message, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        )
          .bind(name, email, phone, service, message)
          .run();

        return withCORS(Response.json({ ok: true }));
      } catch (err) {
        return withCORS(
          Response.json({ error: "Server error" }, { status: 500 })
        );
      }
    }

    return withCORS(new Response("Not found", { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
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

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const withCORS = (res: Response) => {
      const headers = new Headers(res.headers);
      Object.entries(corsHeaders()).forEach(([k, v]) =>
        headers.set(k, v)
      );
      return new Response(res.body, {
        status: res.status,
        headers,
      });
    };

    // Health check
    if (url.pathname === "/health") {
      const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return withCORS(Response.json({ ok: row?.ok === 1 }));
    }

    // Create lead endpoint
    if (url.pathname === "/api/lead" && request.method === "POST") {
      try {
        const body = await request.json();

        const name = body.name || "";
        const email = body.email || "";
        const phone = body.phone || "";
        const service = body.service || "";
        const message = body.message || "";

        if (!email || !service) {
          return withCORS(
            Response.json(
              { error: "Email and service are required" },
              { status: 400 }
            )
          );
        }

        await env.DB.prepare(
          `INSERT INTO leads (name, email, phone, service, message, created_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`
        )
          .bind(name, email, phone, service, message)
          .run();

        return withCORS(Response.json({ ok: true }));
      } catch (err) {
        return withCORS(
          Response.json({ error: "Server error" }, { status: 500 })
        );
      }
    }

    return withCORS(new Response("Not found", { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
