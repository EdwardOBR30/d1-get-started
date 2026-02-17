function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function withCORS(res: Response, origin = "*") {
  const headers = new Headers(res.headers);
  const ch = corsHeaders(origin);
  for (const [k, v] of Object.entries(ch)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Handle browser CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Health check (confirms production Worker can query production D1)
    if (pathname === "/health") {
      const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return withCORS(Response.json({ ok: row?.ok === 1 }));
    }

    // Your existing endpoint (kept)
    if (pathname === "/api/beverages") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM Customers WHERE CompanyName = ?"
      )
        .bind("Bs Beverages")
        .all();

      return withCORS(Response.json(results));
    }

    return withCORS(
      new Response("Try /health or /api/beverages", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
