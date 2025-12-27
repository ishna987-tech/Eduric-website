/* Eduric static site helpers */
(function () {
  // Optional: set window.EDURIC = { CALENDLY_URL: "https://calendly.com/..." }
  const url = (window.EDURIC && window.EDURIC.CALENDLY_URL) || "";
  document.querySelectorAll("[data-calendly]").forEach((el) => {
    if (!url) return;
    el.setAttribute("href", url);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });

  // Contact form (static-friendly): try POST if endpoint provided, else mailto fallback.
  const form = document.querySelector("form[data-contact-form]");
  if (!form) return;

  const status = document.getElementById("formStatus");
  const endpoint = (window.EDURIC && window.EDURIC.CONTACT_ENDPOINT) || "";

  function mailto(payload) {
    const subject = encodeURIComponent(payload.subject || "Eduric inquiry");
    const body = encodeURIComponent(
      `Name: ${payload.name}\nCompany: ${payload.company}\nEmail: ${payload.email}\n\nMessage:\n${payload.message}`
    );
    window.location.href = `mailto:info@eduric.com?subject=${subject}&body=${body}`;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (status) status.textContent = "Preparing…";

    const payload = {
      name: form.querySelector("[name=name]")?.value || "",
      email: form.querySelector("[name=email]")?.value || "",
      subject: form.querySelector("[name=subject]")?.value || "",
      message: form.querySelector("[name=message]")?.value || "",
      company: form.querySelector("[name=company]")?.value || "",
      hp: form.querySelector("[name=hp]")?.value || "" // honeypot
    };

    if (payload.hp) return; // bot

    // If no endpoint configured, use mailto immediately.
    if (!endpoint) {
      if (status) status.textContent = "Opening email…";
      mailto(payload);
      return;
    }

    try {
      if (status) status.textContent = "Sending…";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Request failed");
      form.reset();
      if (status) status.textContent = "Sent. We’ll respond shortly.";
    } catch (err) {
      if (status) status.textContent = "Opening email…";
      mailto(payload);
      console.error(err);
    }
  });
})();