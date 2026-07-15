import type { Role } from "@prisma/client";

// One hardcoded account gets a "preview any role" option right after signing
// in. It's a session-only override (never written to the User row in
// Postgres) — see the jwt() `trigger === "update"` handling in src/auth.ts.
export const ROLE_PREVIEW_EMAIL = "aarush.goyal@leptonsoftware.com";

export const PREVIEW_ROLES: { value: Role; label: string; description: string }[] = [
  { value: "INTERN", label: "Intern", description: "Daily form, own dashboard" },
  { value: "SUPERVISOR", label: "Supervisor", description: "Manage interns & projects" },
  { value: "ADMIN", label: "Admin", description: "Full access, all departments" },
];
