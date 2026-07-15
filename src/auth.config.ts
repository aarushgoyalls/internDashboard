import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import Google from "next-auth/providers/google";

// EDGE-SAFE config: no Prisma, no Node-only APIs. This is what middleware
// imports, so it must stay lightweight. Google reads AUTH_GOOGLE_ID /
// AUTH_GOOGLE_SECRET from env automatically. If no Google creds are set
// (local dev with only the impersonation switcher), we register no providers
// here and rely on the dev Credentials provider added in auth.ts.
//
// The extra scope + access_type/prompt below are for Calendar sync
// (src/lib/googleCalendar.ts): calendar.events lets the app create/cancel
// events on a supervisor's calendar when they schedule a meeting.
// access_type=offline + prompt=consent are required or Google only ever
// hands back an access_token (no refresh_token), which expires in ~1hr and
// then silently breaks Calendar sync for that user.
export default {
  providers: process.env.AUTH_GOOGLE_ID
    ? [
        Google({
          authorization: {
            params: {
              scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
              access_type: "offline",
              prompt: "consent",
            },
          },
          // Every supervisor/intern is pre-provisioned by email (seeded or
          // added via the Admin panel) before they ever sign in, so their
          // very first Google sign-in always finds a User row with no
          // linked Account yet. Without this, Auth.js's default
          // anti-hijack check refuses to link them and bounces back to
          // /login (OAuthAccountNotLinked) — blocking every account except
          // the rare one created fresh by a real first sign-in. Safe to
          // trust here because our own signIn callback (auth.ts) already
          // gates who reaches this point to the two company email domains
          // (or a pre-existing row), so this only ever links a Google
          // account to a same-email row we already provisioned ourselves.
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : [],
  pages: { signIn: "/login" },
  callbacks: {
    // Runs on every request. On sign-in `user` is present -> copy identity into
    // the token. Afterwards the token already carries it (no DB needed).
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        // role/departmentId are custom fields our adapter user carries.
        // (auth.ts has a Prisma fallback for the rare case they're missing.)
        token.role = (user as { role?: "INTERN" | "SUPERVISOR" | "ADMIN" }).role;
        token.departmentId =
          (user as { departmentId?: string | null }).departmentId ?? null;
        token.isAlsoIntern =
          (user as { isAlsoIntern?: boolean }).isAlsoIntern ?? false;
      }
      return token;
    },
    // Expose the token fields to server components / client via useSession.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.departmentId = (token.departmentId as string | null) ?? null;
        session.user.isAlsoIntern = (token.isAlsoIntern as boolean) ?? false;
        session.user.rolePreviewChosen = (token.rolePreviewChosen as boolean) ?? false;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
