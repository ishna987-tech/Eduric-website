/* Eduric static site helpers */
(function () {
  // Wire all calendly buttons
  const url = (window.EDURIC && window.EDURIC.CALENDLY_URL) || "";
  document.querySelectorAll("[data-calendly]").forEach((el) => {
    if (!url) return;
    el.setAttribute("href", url);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });

  // Contact form (progressive enhancement)
  const form = document.querySelector("form[data-contact-form]");
  if (!form) return;

  const status = document.getElementById("formStatus");
  const endpoint = (window.EDURIC && window.EDURIC.CONTACT_ENDPOINT) || "/api/contact";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (status) status.textContent = "Sending…";

    const payload = {
      name: form.querySelector("[name=name]")?.value || "",
      email: form.querySelector("[name=email]")?.value || "",
      subject: form.querySelector("[name=subject]")?.value || "",
      message: form.querySelector("[name=message]")?.value || "",
      company: form.querySelector("[name=company]")?.value || "",
      hp: form.querySelector("[name=hp]")?.value || "" // honeypot
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Request failed");
      }
      form.reset();
      if (status) status.textContent = "Sent. We’ll respond shortly.";
    } catch (err) {
      if (status) status.textContent = "Could not send. Please email info@eduric.com.";
      console.error(err);
    }
  });
})();