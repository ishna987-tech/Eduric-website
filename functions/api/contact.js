export async function onRequest({ request, env }) {
  // ---- CORS / Preflight (same-origin by default) ----
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = new Set([
    "https://eduric.com",
    "https://www.eduric.com",
    "https://eduric-website.pages.dev"
  ]);

  const corsHeaders = () => ({
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://eduric.com",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }

  // ---- Basic origin/host guard ----
  const host = request.headers.get("Host") || "";
  const allowedHosts = new Set(["eduric.com", "www.eduric.com", "eduric-website.pages.dev"]);
  if (!allowedHosts.has(host)) {
    return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }

  // ---- Parse request ----
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }

  const name = (payload.name || "").trim();
  const company = (payload.company || "").trim();
  const email = (payload.email || "").trim();
  const subject = (payload.subject || "").trim();
  const message = (payload.message || "").trim();
  const website = (payload.website || "").trim(); // honeypot

  // Honeypot hit => pretend success (do not send)
  if (website) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }

  // Basic validation
  if (!name || !email || !subject || !message) {
    return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }

  // ---- Optional rate limiting (Cloudflare KV binding: EDURIC_KV) ----
  // Configure in Cloudflare Pages: Settings → Functions → KV bindings
  // Binding name: EDURIC_KV
  const kv = env.EDURIC_KV;
  if (kv) {
    try {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const key = `rl:${ip}`;
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 hour
      const limit = 8; // max submissions per IP per hour

      const raw = await kv.get(key);
      let state = raw ? JSON.parse(raw) : { count: 0, resetAt: now + windowMs };

      if (now > state.resetAt) state = { count: 0, resetAt: now + windowMs };

      state.count += 1;

      if (state.count > limit) {
        return new Response(JSON.stringify({ ok: false, error: "Too many requests. Try again later." }), {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      // Save back with TTL slightly longer than window
      await kv.put(key, JSON.stringify(state), { expirationTtl: Math.ceil(windowMs / 1000) + 60 });
    } catch {
      // If KV fails, do not block submissions.
    }
  }

  // ---- Compose email ----
  const to = "info@eduric.com";
  const from = "Eduric Website <info@eduric.com>";

  const submittedAt = new Date().toISOString();
  const safe = (s) => (s || "").replace(/[<>]/g, "");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>New contact request (eduric.com)</h2>
      <p><strong>Name:</strong> ${safe(name)}<br/>
         <strong>Company:</strong> ${safe(company || "-")}<br/>
         <strong>Work email:</strong> ${safe(email)}<br/>
         <strong>Subject:</strong> ${safe(subject)}<br/>
         <strong>Submitted at:</strong> ${safe(submittedAt)}<br/>
         <strong>Source host:</strong> ${safe(host)}</p>
      <hr/>
      <p style="white-space: pre-wrap;">${safe(message)}</p>
    </div>
  `;

  // MailChannels (Cloudflare Email Routing-style sender)
  // NOTE: You must have DNS records correct for eduric.com for best deliverability.
  const mailChannelsPayload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: "info@eduric.com", name: "Eduric Website" },
    reply_to: { email, name: name || "Website Visitor" },
    subject: `[Eduric Contact] ${subject}`,
    content: [{ type: "text/html", value: html }],
  };

  try {
    const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(mailChannelsPayload),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return new Response(JSON.stringify({ ok: false, error: "Email provider error", detail: t.slice(0, 200) }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "Send failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }
}
