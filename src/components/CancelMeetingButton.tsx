"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelMeetingButton({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={cancel} disabled={busy} className="btn-ghost px-2 py-1 text-xs text-danger">
      {busy ? "Cancelling…" : "Cancel"}
    </button>
  );
}
