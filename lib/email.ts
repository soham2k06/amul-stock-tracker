import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? "Amul Stock Tracker <alerts@sohamb.com>";

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(error.message);
}

export async function sendNotificationEmailVerification(
  to: string,
  url: string,
) {
  await sendEmail({
    to,
    subject: "Confirm your notification email - Amul Stock Tracker",
    html: `
      <p>Confirm this address to receive Amul restock alerts by email.</p>
      <p><a href="${url}">Confirm email</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });
}

export async function sendRecoveryEmailVerification(to: string, url: string) {
  await sendEmail({
    to,
    subject: "Confirm your recovery email - Amul Stock Tracker",
    html: `
      <p>Confirm this address to use it for password recovery on your account.</p>
      <p><a href="${url}">Confirm email</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  });
}

export async function sendResetPasswordEmail(to: string, url: string) {
  await sendEmail({
    to,
    subject: "Reset your password - Amul Stock Tracker",
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${url}">Reset password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `,
  });
}

export async function sendStockAlertEmail(
  to: string,
  { title, body, url }: { title: string; body: string; url: string },
) {
  await sendEmail({
    to,
    subject: `${title} - Amul Stock Tracker`,
    html: `
      <p><strong>${title}</strong></p>
      <p>${body.replace(/\n/g, "<br />")}</p>
      <p><a href="${url}">View product</a></p>
    `,
  });
}

export async function sendTestEmail(to: string) {
  await sendEmail({
    to,
    subject: "Test notification - Amul Stock Tracker",
    html: `<p>Email notifications are working correctly!</p>`,
  });
}

export async function sendAdminOtpEmail(to: string, code: string) {
  await sendEmail({
    to,
    subject: "Your admin login code - Amul Stock Tracker",
    html: `
      <p>Your admin login code is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>This code expires in 5 minutes. If you didn't request this, you can ignore this email.</p>
    `,
  });
}
