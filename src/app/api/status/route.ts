import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/rbac";
import { canViewIntern } from "@/lib/access";
import { statusSchema } from "@/lib/validation";

// POST /api/status -> supervisor/admin sets an intern's status + notes.
export async function POST(req: Request) {
  const guard = await requireApiRole("SUPERVISOR", "ADMIN");
  if (guard instanceof NextResponse) return guard;

  const parsed = statusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const { internId, status, notes } = parsed.data;

  const intern = await prisma.user.findUnique({
    where: { id: internId },
    select: { role: true, isAlsoIntern: true },
  });
  if (!intern || (intern.role !== "INTERN" && !intern.isAlsoIntern))
    return NextResponse.json({ error: "Not an intern" }, { status: 400 });

  // RBAC scoping: a supervisor may only touch interns explicitly mapped to them.
  if (!(await canViewIntern(guard, internId)))
    return NextResponse.json({ error: "Not one of your interns" }, { status: 403 });

  const saved = await prisma.internStatus.upsert({
    where: { internId },
    create: { internId, status, notes: notes ?? null, updatedById: guard.id },
    update: { status, notes: notes ?? null, updatedById: guard.id },
  });
  return NextResponse.json({ status: saved });
}
