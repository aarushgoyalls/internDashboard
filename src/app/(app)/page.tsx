import { redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";

// Must run per-request (reads the session) — never prerender to a static redirect.
export const dynamic = "force-dynamic";

// Home routes each role to its natural landing page (low friction: interns land
// straight on the form they must fill; supervisors/admins on their dashboard).
export default async function Home() {
  const me = await requireUser();
  if (me.role === "INTERN") redirect("/form");
  redirect("/dashboard");
}
