import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  role: Role;
  departmentId: string | null;
  isAlsoIntern: boolean;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/** The signed-in user, or null. Safe to call anywhere on the server. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser | undefined) ?? null;
}

// ── Page guards (use in Server Components / layouts) ────────────
// These redirect, which is the right UX for a full page load.

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/"); // no peeking at higher-priv pages
  return user;
}

export const isSupervisorOrAdmin = (u: SessionUser) =>
  u.role === "SUPERVISOR" || u.role === "ADMIN";

// ── API guards (use in Route Handlers) ──────────────────────────
// These return a Response instead of redirecting. Pattern:
//   const guard = await requireApiUser(); if (guard instanceof NextResponse) return guard;
//   const user = guard; // typed SessionUser

export async function requireApiUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}

export async function requireApiRole(
  ...roles: Role[]
): Promise<SessionUser | NextResponse> {
  const guard = await requireApiUser();
  if (guard instanceof NextResponse) return guard;
  if (!roles.includes(guard.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return guard;
}
