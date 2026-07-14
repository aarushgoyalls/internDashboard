import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/rbac";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { DevSwitcher } from "@/components/DevSwitcher";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const cb = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";

  // Already signed in? Skip the login screen.
  const user = await getSessionUser();
  if (user) redirect(cb);

  const isDev = process.env.NODE_ENV === "development";
  const rolePriority: Record<string, number> = { ADMIN: 0, SUPERVISOR: 1, INTERN: 2 };
  const devUsers = isDev
    ? (
        await prisma.user.findMany({ include: { department: true } })
      )
        .sort(
          (a, b) =>
            (rolePriority[a.role] ?? 9) - (rolePriority[b.role] ?? 9) ||
            (a.name ?? "").localeCompare(b.name ?? "")
        )
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department?.name ?? null,
        }))
    : [];

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-lg font-extrabold text-white">
            LA
          </span>
          <h1 className="page-title">LeptonArgo</h1>
          <p className="mt-1 text-sm text-muted">Weekly check-ins &amp; supervisor visibility</p>
        </div>

        <div className="panel p-6 space-y-4">
          <GoogleSignInButton callbackUrl={cb} />
          {isDev && devUsers.length > 0 && (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-surface px-2 text-xs text-subtle">or</span>
                </div>
              </div>
              <DevSwitcher users={devUsers} callbackUrl={cb} />
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-subtle">
          Access restricted to authorized firm members.
        </p>
      </div>
    </main>
  );
}
