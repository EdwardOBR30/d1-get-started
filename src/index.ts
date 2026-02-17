function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(resBody: unknown, status = 200) {
  return new Response(JSON.stringify(resBody), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function withCORS(res: Response) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}

function requireAdmin(request: Request, env: Env) {
  // Add this secret in Cloudflare Worker settings OR wrangler vars/secrets:
  // ADMIN_TOKEN = "some-long-random-string"
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token && token === (env as any).ADMIN_TOKEN;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Health check
    if (path === "/health") {
      const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return withCORS(json({ ok: row?.ok === 1 }));
    }

    // ---- ADMIN READ API ----
    if (path.startsWith("/api/admin")) {
      if (!requireAdmin(request, env)) {
        return withCORS(json({ error: "Unauthorized" }, 401));
      }

      // Card stats
      if (path === "/api/admin/stats" && request.method === "GET") {
        // Adjust table/column names to match YOUR schema
        const totalSuppliers = await env.DB.prepare(
          "SELECT COUNT(*) AS c FROM suppliers"
        ).first<{ c: number }>();

        const pendingSuppliers = await env.DB.prepare(
          "SELECT COUNT(*) AS c FROM suppliers WHERE status = 'pending'"
        ).first<{ c: number }>();

        const activeSuppliers = await env.DB.prepare(
          "SELECT COUNT(*) AS c FROM suppliers WHERE status = 'active'"
        ).first<{ c: number }>();

        const totalJobs = await env.DB.prepare(
          "SELECT COUNT(*) AS c FROM jobs"
        ).first<{ c: number }>();

        const totalBuyers = await env.DB.prepare(
          "SELECT COUNT(*) AS c FROM buyers"
        ).first<{ c: number }>();

        const earlyAccess = await env.DB.prepare(
          "SELECT COUNT(*) AS c FROM early_access"
        ).first<{ c: number }>();

        return withCORS(
          json({
            totalSuppliers: totalSuppliers?.c ?? 0,
            pendingSuppliers: pendingSuppliers?.c ?? 0,
            activeSuppliers: activeSuppliers?.c ?? 0,
            totalJobs: totalJobs?.c ?? 0,
            totalBuyers: totalBuyers?.c ?? 0,
            earlyAccess: earlyAccess?.c ?? 0,
          })
        );
      }

      // Supplier list
      if (path === "/api/admin/suppliers" && request.method === "GET") {
        const status = (url.searchParams.get("status") || "all").toLowerCase();

        let sql =
          "SELECT id, company_name, contact_name, email, phone, status, created_at FROM suppliers";
        const binds: any[] = [];

        if (status !== "all") {
          sql += " WHERE status = ?";
          binds.push(status);
        }

        sql += " ORDER BY id DESC LIMIT 200";

        const stmt = env.DB.prepare(sql);
        const { results } = binds.length ? await stmt.bind(...binds).all() : await stmt.all();

        return withCORS(json({ results }));
      }

      return withCORS(json({ error: "Not found" }, 404));
    }

    // Keep your existing POST /api/lead etc if needed
    return withCORS(json({ error: "Not found" }, 404));
  },
} satisfies ExportedHandler<Env>;
