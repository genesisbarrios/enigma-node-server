const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "Enigma Labs CRM <crm@enigma-labs.com>";

// Sends the client (e.g. Monark Barbershop) an email with a new contact form
// submission's info. Silently no-ops if RESEND_API_KEY isn't configured yet,
// so a missing email key never blocks saving the lead to the database.
async function sendContactNotification({ to, clientName, submission }) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing — skipping contact notification email.");
    return { skipped: true };
  }

  if (!to) {
    console.warn(`No contactEmail configured for client "${clientName}" — skipping notification email.`);
    return { skipped: true };
  }

  const rows = Object.entries(submission)
    .filter(([, value]) => value)
    .map(([key, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;text-transform:capitalize">${key}</td><td>${value}</td></tr>`)
    .join("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject: `New website contact — ${clientName}`,
      html: `<h2>New contact form submission</h2><table>${rows}</table>`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Resend email failed", res.status, text);
    return { skipped: false, error: text };
  }

  return { skipped: false };
}

module.exports = { sendContactNotification };
