import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import authConfig from "@/auth.config";
import { ROLE_PREVIEW_EMAIL } from "@/lib/rolePreview";

const PREVIEWABLE_ROLES: Role[] = ["INTERN", "SUPERVISOR", "ADMIN"];

// NODE-only config: adapter (Prisma), sign-in gating, and the dev-only
// impersonation provider. This module must never be imported by middleware.

const isDev = process.env.NODE_ENV === "development";

// Dev-only "Sign in as..." — lets you jump into any seeded user without a real
// Google account. HARD-GATED: the provider isn't even registered outside dev,
// and authorize() double-checks NODE_ENV.
const devImpersonate = Credentials({
  id: "dev-impersonate",
  name: "Dev impersonate",
  credentials: { userId: { label: "User ID", type: "text" } },
  async authorize(creds) {
    if (process.env.NODE_ENV !== "development") return null;
    const userId = typeof creds?.userId === "string" ? creds.userId : null;
    if (!userId) return null;
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (!u || !u.active) return null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      departmentId: u.departmentId,
      isAlsoIntern: u.isAlsoIntern,
    };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // JWT strategy is required by the Credentials provider and lets edge
  // middleware read the session without a DB call.
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [...authConfig.providers, ...(isDev ? [devImpersonate] : [])],
  callbacks: {
    ...authConfig.callbacks,
    // Gate who may sign in. Google users must match an allowed email domain
    // or already exist (seeded). Dev impersonation is always allowed (dev only).
    async signIn({ user, account }) {
      if (account?.provider === "dev-impersonate") return true;
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;
        const domains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const domainOk = domains.some((d) => email.endsWith(`@${d}`));
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && !existing.active) return false; // deactivated: block sign-in
        if (!(domainOk || !!existing)) return false;

        // The adapter's linkAccount only runs the FIRST time an Account row
        // is created for this provider+providerAccountId — a repeat sign-in
        // never refreshes the stored tokens. Since auth.config.ts forces
        // prompt=consent on every request (for Calendar sync), Google
        // re-sends a refresh_token on every sign-in; without this manual
        // upsert that fresh token is silently discarded, leaving anyone who
        // already had an Account row before Calendar sync was added stuck
        // without a refresh_token forever, even after re-consenting.
        await prisma.account.updateMany({
          where: { provider: "google", providerAccountId: account.providerAccountId },
          data: {
            access_token: account.access_token ?? undefined,
            refresh_token: account.refresh_token ?? undefined,
            expires_at: account.expires_at ?? undefined,
            token_type: account.token_type ?? undefined,
            scope: account.scope ?? undefined,
            id_token: account.id_token ?? undefined,
          },
        });
        return true;
      }
      return true;
    },
    // Same as the edge jwt callback, but with a Prisma fallback in case the
    // adapter user didn't carry role/department (safe: only runs on sign-in).
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: typeof token.role }).role;
        token.departmentId =
          (user as { departmentId?: string | null }).departmentId ?? null;
        token.isAlsoIntern =
          (user as { isAlsoIntern?: boolean }).isAlsoIntern ?? false;
        if (!token.role) {
          const dbu = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, departmentId: true, isAlsoIntern: true },
          });
          token.role = dbu?.role;
          token.departmentId = dbu?.departmentId ?? null;
          token.isAlsoIntern = dbu?.isAlsoIntern ?? false;
        }
        // Fresh sign-in: the post-login role picker (if it applies to this
        // account) hasn't been shown yet this session.
        token.rolePreviewChosen = false;
      }
      // One hardcoded account can preview any role after signing in (see
      // src/lib/rolePreview.ts and src/app/choose-role). This only ever
      // overwrites the JWT's role claim for the current session — it never
      // touches the User row in Postgres, so the account's real stored role
      // is untouched and everyone else's session update calls are ignored.
      if (
        trigger === "update" &&
        typeof token.email === "string" &&
        token.email.toLowerCase() === ROLE_PREVIEW_EMAIL
      ) {
        const requestedRole = (session as { role?: Role } | undefined)?.role;
        if (requestedRole && PREVIEWABLE_ROLES.includes(requestedRole)) {
          token.role = requestedRole;
          token.rolePreviewChosen = true;
        }
      }
      return token;
    },
  },
});
