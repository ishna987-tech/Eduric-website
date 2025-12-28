export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    // Honeypot spam trap
    if (data && data.hp) return new Response("ok", { status: 200 });

    const name = (data.name || "").toString().slice(0, 120);
    const email = (data.email || "").toString().slice(0, 160);
    const company = (data.company || "").toString().slice(0, 160);
    const subject = (data.subject || "Website inquiry").toString().slice(0, 160);
    const message = (data.message || "").toString().slice(0, 6000);

    if (!email || !message || !subject) {
      return new Response("Missing fields", { status: 400 });
    }

    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response("Server not configured: missing RESEND_API_KEY", { status: 500 });
    }

    const to = env.CONTACT_TO || "info@eduric.com";
    const from = env.CONTACT_FROM || "contact@eduric.com"; // must be verified in Resend
    const replyTo = email;

    const text =
`New message from Eduric.com

Name: ${name}
Email: ${email}
Company: ${company}

Message:
${message}
`;

    const payload = {
      from,
      to: [to],
      reply_to: replyTo,
      subject: `[Eduric.com] ${subject}`,
      text
    };

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const body = await resp.text();
    if (!resp.ok) {
      // Return provider error to help debug quickly
      return new Response(`Resend error (${resp.status}): ${body}`, { status: 502 });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
}
