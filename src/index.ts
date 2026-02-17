function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function withCORS(res: Response) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
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
    if (path === "/health" && request.method === "GET") {
      const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      return withCORS(Response.json({ ok: row?.ok === 1 }));
    }

    // --- ADMIN STATS ---
    if (path === "/api/admin/stats" && request.method === "GET") {
      const totalSuppliers = await env.DB.prepare(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'supplier'"
      ).first<{ c: number }>();

      const pendingSuppliers = await env.DB.prepare(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'supplier' AND status = 'pending'"
      ).first<{ c: number }>();

      const activeSuppliers = await env.DB.prepare(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'supplier' AND status = 'active'"
      ).first<{ c: number }>();

      const totalJobs = await env.DB.prepare(
        "SELECT COUNT(*) AS c FROM jobs"
      ).first<{ c: number }>();

      const totalBuyers = await env.DB.prepare(
        "SELECT COUNT(*) AS c FROM users WHERE role = 'buyer'"
      ).first<{ c: number }>();

      // You don't have an early_access table yet
      const earlyAccess = 0;

      return withCORS(
        Response.json({
          totalSuppliers: totalSuppliers?.c ?? 0,
          pendingSuppliers: pendingSuppliers?.c ?? 0,
          activeSuppliers: activeSuppliers?.c ?? 0,
          totalJobs: totalJobs?.c ?? 0,
          totalBuyers: totalBuyers?.c ?? 0,
          earlyAccess,
        })
      );
    }

    // --- SUPPLIER LIST ---
    if (path === "/api/admin/suppliers" && request.method === "GET") {
      const status = (url.searchParams.get("status") || "all").toLowerCase();

      let sql = `
        SELECT
          sp.id,
          sp.company_name,
          sp.contact_name,
          u.email,
          sp.phone,
          u.status,
          sp.approved_at,
          u.created_at
        FROM supplier_profiles sp
        JOIN users u ON u.id = sp.user_id
        WHERE u.role = 'supplier'
      `;

      const binds: any[] = [];

      if (status !== "all") {
        sql += " AND u.status = ?";
        binds.push(status);
      }

      sql += " ORDER BY sp.id DESC LIMIT 200";

      const stmt = env.DB.prepare(sql);
      const { results } = binds.length
        ? await stmt.bind(...binds).all()
        : await stmt.all();

      return withCORS(Response.json({ results }));
    }

    // --- OPTIONAL: keep lead creation if you're using it ---
    if (path === "/api/lead" && request.method === "POST") {
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
    }

    return withCORS(new Response("Not found", { status: 404 }));
  },
} satisfies ExportedHandler<Env>;
