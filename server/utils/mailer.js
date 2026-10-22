// Sends LifeOS emails (the Focus mode exit code). Uses Gmail (or any SMTP)
// from the SMTP_USER / SMTP_PASS settings on the server; for Gmail, SMTP_PASS
// is a 16-letter "app password", not your normal password.
// In tests, MAIL_FILE makes it write the mail to a file instead.
import fs from "node:fs";
import nodemailer from "nodemailer";

let transport = null;
export const mailReady = () => Boolean(process.env.MAIL_FILE || (process.env.SMTP_USER && process.env.SMTP_PASS));

export async function sendMail({ to, subject, text }) {
  if (process.env.MAIL_FILE) {
    fs.appendFileSync(process.env.MAIL_FILE, JSON.stringify({ to, subject, text }) + "\n");
    return;
  }
  if (!mailReady()) throw Object.assign(new Error("Email isn't set up on the server yet."), { status: 503 });
  transport ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({ from: `LifeOS <${process.env.SMTP_USER}>`, to, subject, text });
}

/** a***r@gmail.com */
export function maskEmail(e) {
  const [name, domain] = String(e).split("@");
  if (!domain) return "your email";
  return `${name[0]}${"*".repeat(Math.max(1, Math.min(6, name.length - 2)))}${name.length > 1 ? name[name.length - 1] : ""}@${domain}`;
}
