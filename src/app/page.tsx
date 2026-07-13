// Requests to "/" are always intercepted by src/proxy.ts before this ever
// renders (redirected to /login, or straight to /form or /dashboard for a
// signed-in user) — this is just a light, on-brand fallback shell.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-lg font-extrabold text-white">
        ID
      </span>
      <p className="page-title mt-4">Intern Dashboard</p>
      <p className="mt-1 text-sm text-subtle">Redirecting…</p>
    </div>
  );
}
