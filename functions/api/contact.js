export async function onRequestPost(context) {
  try {
    const data = await context.request.json();

    // Anti-spam: honeypot must be empty
    if (data && data.hp) {
      return new Response("ok", { status: 200 });
    }

    const name = (data.name || "").toString().slice(0, 120);
    const email = (data.email || "").toString().slice(0, 160);
    const company = (data.company || "").toString().slice(0, 160);
    const subject = (data.subject || "Eduric website inquiry").toString().slice(0, 160);
    const message = (data.message || "").toString().slice(0, 6000);

    if (!email || !message || !subject) {
      return new Response("Missing fields", { status: 400 });
    }

    // MailChannels (works on Cloudflare Workers/Pages)
    const payload = {
      personalizations: [{ to: [{ email: "info@eduric.com", name: "Eduric" }] }],
      from: { email: "noreply@eduric.com", name: "Eduric Website" },
      reply_to: { email, name: name || email },
      subject: `[Eduric.com] ${subject}`,
      content: [
        {
          type: "text/plain",
          value:
`New message from Eduric.com

Name: ${name}
Email: ${email}
Company: ${company}

Message:
${message}
`
        }
      ]
    };

    const resp = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(`Email send failed: ${txt}`, { status: 502 });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response("Server error", { status: 500 });
  }
}