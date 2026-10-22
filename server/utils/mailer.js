// Sends LifeOS emails (the Focus mode exit code).
// - RESEND_API_KEY (preferred): sends through Resend over HTTPS. Works on
//   Render's free plan, which blocks normal email (SMTP) connections. Without
//   your own domain, Resend only delivers to the address you signed up with.
// - SMTP_USER / SMTP_PASS: Gmail (app password) or any SMTP server — only on
//   hosts that allow SMTP.
// In tests, MAIL_FILE makes it write the mail to a file instead.
import fs from "node:fs";
import nodemailer from "nodemailer";

let transport = null;
export const mailReady = () => Boolean(process.env.MAIL_FILE || process.env.RESEND_API_KEY || (process.env.SMTP_USER && process.env.SMTP_PASS));
const fail = (msg) => Object.assign(new Error(msg), { status: 503 });

export async function sendMail({ to, subject, text }) {
  if (process.env.MAIL_FILE) {
    fs.appendFileSync(process.env.MAIL_FILE, JSON.stringify({ to, subject, text }) + "\n");
    return;
  }
  if (!mailReady()) throw fail("Email isn't set up on the server yet.");
  if (process.env.RESEND_API_KEY) {
    let res;
    try {
      res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.MAIL_FROM || "LifeOS <onboarding@resend.dev>", to: [process.env.MAIL_TO || to], subject, text }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw fail("Couldn't reach the email service. Try again in a minute.");
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[mail] Resend ${res.status}: ${body.slice(0, 300)}`);
      throw fail(res.status === 403 ? "The email service refused this address — the code can only go to the email you used to sign up for Resend." : "The email service didn't accept the email. Try again in a minute.");
    }
    return;
  }
  transport ||= nodemailer.createTransport({
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  try {
    await transport.sendMail({ from: `LifeOS <${process.env.SMTP_USER}>`, to, subject, text });
  } catch (e) {
    console.error(`[mail] SMTP: ${e.message}`);
    throw fail("Couldn't send the email (the server may block email connections). Try again later.");
  }
}

/** a***r@gmail.com */
export function maskEmail(e) {
  const [name, domain] = String(e).split("@");
  if (!domain) return "your email";
  return `${name[0]}${"*".repeat(Math.max(1, Math.min(6, name.length - 2)))}${name.length > 1 ? name[name.length - 1] : ""}@${domain}`;
}
