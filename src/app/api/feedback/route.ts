import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/rbac";
import { feedbackSchema } from "@/lib/validation";
import { FEEDBACK_RECIPIENT_EMAIL } from "@/lib/constants";
import { sendEmail } from "@/lib/email";

// POST /api/feedback -> any signed-in user (any role) suggests a feature.
// Saved to the DB (visible on /admin) and emailed straight to
// FEEDBACK_RECIPIENT_EMAIL — no in-app notification/bell involved. Email
// delivery is best-effort: a failure there never fails the request, since
// the feedback is already saved either way.
export async function POST(req: Request) {
  const guard = await requireApiUser();
  if (guard instanceof NextResponse) return guard;
  const user = guard;

  const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const { message } = parsed.data;

  const feedback = await prisma.feedback.create({
    data: { authorId: user.id, message },
  });

  const authorLabel = user.name ?? user.email ?? "Someone";
  await sendEmail({
    to: FEEDBACK_RECIPIENT_EMAIL,
    subject: `New feedback from ${authorLabel}`,
    text: message,
  }).catch(() => {
    /* best-effort — GMAIL_USER/GMAIL_APP_PASSWORD may not be configured */
  });

  return NextResponse.json({ feedback }, { status: 201 });
}
