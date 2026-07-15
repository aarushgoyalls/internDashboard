import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/rbac";
import { generateSupervisorDigest } from "@/lib/supervisorDigest";

// Emails every supervisor a daily submission summary. Triggered by Vercel
// Cron (see vercel.json) OR manually by an admin. Auth: valid CRON_SECRET
// bearer token, OR an authenticated admin session. Mirrors
// /api/cron/reminders.
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const cronOk = secret ? req.headers.get("authorization") === `Bearer ${secret}` : false;

  if (!cronOk) {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateSupervisorDigest();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
