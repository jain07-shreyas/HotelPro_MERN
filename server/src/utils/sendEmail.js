import nodemailer from "nodemailer";

let transporter;
const getTransporter = () => {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
};

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// Never throws: a failed email must not break a booking or payment.
// Without SMTP settings the email is only logged to the console, so local development keeps working.
export const sendEmail = async ({ to, subject, html, devNote }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email skipped - SMTP not configured] to: ${to} | subject: ${subject}${devNote ? ` | ${devNote}` : ""}`);
    return false;
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM || `HotelPro <${process.env.SMTP_USER}>`, to, subject, html });
    return true;
  } catch (err) {
    console.error("[Email error]", err.message);
    return false;
  }
};

const layout = (title, body) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#0f172a;color:#fff;padding:18px 24px;font-size:20px;font-weight:bold">Hotel<span style="color:#f59e0b">Pro</span></div>
    <div style="padding:24px;color:#0f172a">
      <h2 style="margin-top:0">${title}</h2>${body}
      <p style="color:#64748b;font-size:12px;margin-top:24px">This is an automated message from HotelPro.</p>
    </div>
  </div>`;

const details = (b) => `
  <table style="width:100%;font-size:14px;border-collapse:collapse">
    <tr><td style="padding:4px 0;color:#64748b">Room</td><td>${esc(b.room?.roomNumber)} (${esc(b.room?.category)})</td></tr>
    <tr><td style="padding:4px 0;color:#64748b">Check-in</td><td>${fmt(b.checkInDate)}</td></tr>
    <tr><td style="padding:4px 0;color:#64748b">Check-out</td><td>${fmt(b.checkOutDate)}</td></tr>
    <tr><td style="padding:4px 0;color:#64748b">Nights</td><td>${b.nights}</td></tr>
    <tr><td style="padding:4px 0;color:#64748b">Total</td><td><b>$${b.totalAmount}</b></td></tr>
    <tr><td style="padding:4px 0;color:#64748b">Booking ID</td><td>${b._id}</td></tr>
  </table>`;

// `booking` must have guest and room populated.
export const sendBookingConfirmation = (booking) =>
  sendEmail({
    to: booking.guest.email,
    subject: "Your HotelPro booking is confirmed",
    html: layout("Booking confirmed", `<p>Hi ${esc(booking.guest.name)}, thank you for your payment. Your stay is confirmed.</p>${details(booking)}`),
  });

export const sendBookingCancellation = (booking) =>
  sendEmail({
    to: booking.guest.email,
    subject: "Your HotelPro booking was cancelled",
    html: layout(
      "Booking cancelled",
      `<p>Hi ${esc(booking.guest.name)}, your booking has been cancelled.${
        booking.paymentStatus === "refunded" ? " A full refund has been issued to your original payment method (it can take 5-10 days to appear)." : ""
      }</p>${details(booking)}`
    ),
  });

export const sendVerificationEmail = (user, url) =>
  sendEmail({
    to: user.email,
    subject: "Verify your HotelPro email",
    devNote: `verify link: ${url}`,
    html: layout(
      "Verify your email",
      `<p>Hi ${esc(user.name)}, please confirm your email address to finish setting up your account.</p>
       <p><a href="${url}" style="background:#10b981;color:#020617;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Verify email</a></p>
       <p style="color:#64748b;font-size:12px">This link is valid for 24 hours.</p>`
    ),
  });

export const sendPasswordResetEmail = (user, url) =>
  sendEmail({
    to: user.email,
    subject: "Reset your HotelPro password",
    devNote: `reset link: ${url}`,
    html: layout(
      "Reset your password",
      `<p>Hi ${esc(user.name)}, we received a request to reset your password.</p>
       <p><a href="${url}" style="background:#10b981;color:#020617;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Choose a new password</a></p>
       <p style="color:#64748b;font-size:12px">This link is valid for 30 minutes. If you did not ask for this, you can ignore this email.</p>`
    ),
  });
