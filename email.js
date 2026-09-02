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

// Sends the person who just submitted a contact form or signed up for the
// newsletter a friendly auto-reply. Email clients strip <script>/<iframe>
// embeds, so instead of the live Donorbox widget we link out to the site's
// donate page with a styled button — same destination, works everywhere.
function buildThankYouEmail({
  name,
  clientName,
  source,
  siteUrl,
  donateUrl,
  getInvolvedUrl,
  heroImageUrl,
}) {
  const firstName = (name || "").trim().split(" ")[0];
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  const heading =
    source === "newsletter" ? "Thank you for signing up!" : "Thank you for reaching out to us!";

  const body =
    source === "newsletter"
      ? `You're on the list — we'll keep you posted with updates from ${clientName}.`
      : `We got your message and will be reaching out to you shortly.`;

  const buttons = [
    donateUrl ? { label: "Donate Now", url: donateUrl, primary: true } : null,
    getInvolvedUrl ? { label: "See How to Get Involved", url: getInvolvedUrl, primary: false } : null,
  ].filter(Boolean);

  const buttonsHtml = buttons.length
    ? buttons
        .map(
          (btn) => `
            <a href="${btn.url}" style="display:inline-block;margin:6px 8px;padding:14px 28px;border-radius:999px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;${
              btn.primary
                ? "background:#d1638a;color:#ffffff;"
                : "background:#ffffff;color:#d1638a;border:2px solid #d1638a;"
            }">${btn.label}</a>`
        )
        .join("")
    : siteUrl
    ? `<a href="${siteUrl}" style="display:inline-block;margin:6px 8px;padding:14px 28px;border-radius:999px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;background:#d1638a;color:#ffffff;">Visit Our Site</a>`
    : "";

  const html = `
  <div style="background:#fdf3f6;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      ${
        heroImageUrl
          ? `<img src="${heroImageUrl}" alt="${clientName}" width="520" style="width:100%;max-width:520px;height:auto;display:block;border:0;">`
          : ""
      }
      <div style="padding:32px;">
        <p style="margin:0 0 4px;color:#333;font-size:15px;">${greeting}</p>
        <h1 style="margin:0 0 16px;color:#111;font-size:22px;line-height:1.3;">${heading}</h1>
        <p style="margin:0 0 12px;color:#444;font-size:15px;line-height:1.6;">${body}</p>
        <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.6;">
          In the meantime, you can make a donation or see how to get involved on our site:
        </p>
        <div style="text-align:center;margin-bottom:8px;">${buttonsHtml}</div>
      </div>
      <div style="padding:20px 32px;background:#fdf3f6;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">${clientName}${
          siteUrl ? ` &middot; <a href="${siteUrl}" style="color:#d1638a;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, "")}</a>` : ""
        }</p>
      </div>
    </div>
  </div>`;

  return { subject: heading, html };
}

// Sends the person who just submitted a contact form or signed up for the
// newsletter a friendly auto-reply. Email clients strip <script>/<iframe>
// embeds, so instead of the live Donorbox widget we link out to the site's
// donate page with a styled button — same destination, works everywhere.
async function sendThankYouEmail({
  to,
  name,
  clientName,
  source,
  siteUrl,
  donateUrl,
  getInvolvedUrl,
  heroImageUrl,
  replyTo,
}) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY missing — skipping thank-you email.");
    return { skipped: true };
  }

  if (!to) {
    return { skipped: true };
  }

  const { subject, html } = buildThankYouEmail({
    name,
    clientName,
    source,
    siteUrl,
    donateUrl,
    getInvolvedUrl,
    heroImageUrl,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${clientName} <crm@enigma-labs.com>`,
      to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Resend thank-you email failed", res.status, text);
    return { skipped: false, error: text };
  }

  return { skipped: false };
}

// Sends one OUTREACH email (a campaign send or a 1:1 reply) to a single
// subscriber. "(name)" in the html is mail-merged with their first name —
// called once per recipient from the campaign-send route since the merge
// differs per person.
async function sendCrmCampaignEmail({ to, name, clientName, subject, html, replyTo }) {
  if (!RESEND_API_KEY) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY missing" };
  }
  if (!to) {
    return { ok: false, skipped: true, error: "No recipient email" };
  }

  const firstName = (name || "").trim().split(" ")[0] || "there";
  const mergedHtml = (html || "").replace(/\(name\)/gi, firstName);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${clientName} <crm@enigma-labs.com>`,
      to,
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      html: mergedHtml,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Resend campaign email failed", res.status, text);
    return { ok: false, error: text };
  }

  const data = await res.json();
  return { ok: true, resendId: data?.id };
}

module.exports = { sendContactNotification, sendThankYouEmail, buildThankYouEmail, sendCrmCampaignEmail };
