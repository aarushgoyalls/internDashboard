import nodemailer from "nodemailer";

// Sends real email via a Gmail/Workspace mailbox + an App Password
// (myaccount.google.com/apppasswords — requires 2-Step Verification on
// GMAIL_USER). Nothing else in this app sends real email yet; this is the
// drop-in point referenced in src/lib/reminders.ts.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendEmail(opts: { to: string; subject: string; text: string }): Promise<void> {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not configured — see .env.example");
  }
  await getTransporter().sendMail({
    from: `LeptonArgo <${GMAIL_USER}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  });
}
