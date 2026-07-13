"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type DevUser = { id: string; name: string | null; email: string; role: string; department: string | null };

// Dev-only impersonation. Lets you jump into any seeded user without Google.
// Rendered only in development (the page gates on NODE_ENV).
export function DevSwitcher({ users, callbackUrl }: { users: DevUser[]; callbackUrl: string }) {
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-card border border-warning/30 bg-warning-tint p-4">
      <p className="eyebrow text-warning">
        Dev only · Sign in as
      </p>
      <p className="mt-1 text-xs text-warning/80">
        Skips Google. Not available in production.
      </p>
      <div className="mt-3 flex gap-2">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="flex-1 rounded-btn border border-warning/30 bg-surface px-2 py-1.5 text-sm text-foreground"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.role}{u.department ? ` · ${u.department}` : ""}
            </option>
          ))}
        </select>
        <button
          disabled={loading || !userId}
          onClick={() => {
            setLoading(true);
            signIn("dev-impersonate", { userId, callbackUrl });
          }}
          className="rounded-btn bg-warning px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "…" : "Go"}
        </button>
      </div>
    </div>
  );
}
