import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Coarse doorman (runs on the edge): is there a valid session at all? If not,
// bounce to /login. Fine-grained role checks happen per-page/route via rbac.ts
// (those run in the Node runtime where Prisma is available).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Publicly reachable without a session.
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron"); // cron is protected by its own secret

  if (!isLoggedIn && !isPublic) {
    // API paths get a JSON 401; page paths get bounced to /login.
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }

  // Route the home path to each role's landing page here (the token carries the
  // role), so "/" never falls through to a prerendered redirect.
  if (isLoggedIn && pathname === "/") {
    const role = req.auth?.user?.role;
    const dest = role === "INTERN" ? "/form" : "/dashboard";
    return Response.redirect(new URL(dest, req.nextUrl.origin));
  }
});

// Run middleware on everything except static assets and image files.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
