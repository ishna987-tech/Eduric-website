/* Eduric — contact form server-side submit (no mailto) */
(function () {
  const form = document.querySelector("form[data-contact-form]");
  if (!form) return;

  const status = document.getElementById("formStatus");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (status) status.textContent = "Sending…";

    const payload = {
      name: form.querySelector("[name=name]")?.value || "",
      email: form.querySelector("[name=email]")?.value || "",
      company: form.querySelector("[name=company]")?.value || "",
      subject: form.querySelector("[name=subject]")?.value || "",
      message: form.querySelector("[name=message]")?.value || "",
      hp: form.querySelector("[name=hp]")?.value || ""
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "Request failed");

      form.reset();
      if (status) status.textContent = "Sent. We’ll respond shortly.";
    } catch (err) {
      console.error(err);
      if (status) status.textContent = "Could not send. Please email info@eduric.com.";
    }
  });
})();