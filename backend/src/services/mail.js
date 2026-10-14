import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transport = config.SMTP_URL ? nodemailer.createTransport(config.SMTP_URL) : null;

/**
 * Sends a plain-text email through SMTP_URL, or logs it when SMTP isn't configured.
 * Never throws: email is a side effect and must not break the request that caused it.
 */
export async function sendMail({ to, subject, text }) {
  if (!transport) {
    console.info(`[mail] (SMTP_URL not set, logging only) to=${to} subject="${subject}"\n${text}`);
    return;
  }
  try {
    await transport.sendMail({ from: config.MAIL_FROM, to, subject, text });
  } catch (err) {
    console.error(`[mail] failed to send "${subject}" to ${to}: ${err.message}`);
  }
}
