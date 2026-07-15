"use client";

import { useState } from "react";
import type { Role } from "@prisma/client";
import { PREVIEW_ROLES } from "@/lib/rolePreview";

// No <SessionProvider> is mounted in this app (server components read the
// session via auth() directly), so useSession()'s update() isn't available
// here. This replicates what it does under the hood: POST the new role to
// NextAuth's session endpoint with a fresh CSRF token, which reaches the
// jwt() `trigger === "update"` handling in src/auth.ts.
async function previewAs(role: Role) {
  const csrfRes = await fetch("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csrfToken, data: { role } }),
  });
  if (!res.ok) throw new Error("Failed to switch role");
}

export function ChooseRoleForm() {
  const [pending, setPending] = useState<Role | null>(null);

  async function choose(role: Role) {
    setPending(role);
    try {
      await previewAs(role);
      // Hard navigation: the role change lives in a re-signed session
      // cookie, not client router state, so a full reload (rather than
      // next/navigation's client-side transition) is what reliably picks
      // it up on the next request.
      window.location.href = "/";
    } catch {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      {PREVIEW_ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          disabled={pending !== null}
          onClick={() => choose(r.value)}
          className="btn-secondary flex w-full items-center justify-between px-3 py-2 disabled:opacity-50"
        >
          <span className="text-left">
            <span className="block font-medium text-foreground">{r.label}</span>
            <span className="block text-xs text-muted">{r.description}</span>
          </span>
          {pending === r.value && <span className="text-xs text-subtle">…</span>}
        </button>
      ))}
    </div>
  );
}
