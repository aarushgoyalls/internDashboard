import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { NOTIFICATION_TYPES } from "@/lib/constants";

const PREVIEW_LENGTH = 300;

function preview(body: string): string {
  return body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH)}…` : body;
}

// Notifies the other participant of a DM thread — bell entry + best-effort
// email. Best-effort internally (email failure never throws) so callers can
// fire-and-forget this via `after()` without risking an unhandled rejection.
export async function notifyDmMessage(opts: {
  threadId: string;
  senderId: string;
  senderLabel: string;
  body: string;
}): Promise<void> {
  const other = await prisma.dMParticipant.findFirst({
    where: { threadId: opts.threadId, userId: { not: opts.senderId } },
    select: { user: { select: { id: true, email: true, active: true } } },
  });
  if (!other || !other.user.active) return;

  await prisma.notification.create({
    data: {
      userId: other.user.id,
      type: NOTIFICATION_TYPES.NEW_DM_MESSAGE,
      body: `${opts.senderLabel}: ${preview(opts.body)}`,
      link: `/dm/${opts.threadId}`,
    },
  });

  await sendEmail({
    to: other.user.email,
    subject: `New message from ${opts.senderLabel}`,
    text: `${opts.senderLabel} sent you a message:\n\n${opts.body}`,
  }).catch(() => {
    /* best-effort — GMAIL_USER/GMAIL_APP_PASSWORD may not be configured */
  });
}

// Notifies every other active member of a channel's department — bell entry
// + best-effort email. No-op for channels not tied to a department (e.g.
// #general), which is deliberately excluded from this feature.
export async function notifyChannelMessage(opts: {
  channelId: string;
  senderId: string;
  senderLabel: string;
  body: string;
}): Promise<void> {
  const channel = await prisma.channel.findUnique({
    where: { id: opts.channelId },
    select: { name: true, departmentId: true },
  });
  if (!channel?.departmentId) return;

  const recipients = await prisma.user.findMany({
    where: { departmentId: channel.departmentId, active: true, id: { not: opts.senderId } },
    select: { id: true, email: true },
  });
  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: NOTIFICATION_TYPES.NEW_CHANNEL_MESSAGE,
      body: `${opts.senderLabel} in #${channel.name}: ${preview(opts.body)}`,
      link: `/channels/${opts.channelId}`,
    })),
  });

  await Promise.allSettled(
    recipients.map((r) =>
      sendEmail({
        to: r.email,
        subject: `New message in #${channel.name} from ${opts.senderLabel}`,
        text: `${opts.senderLabel} posted in #${channel.name}:\n\n${opts.body}`,
      })
    )
  );
}
