import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/rbac";
import { ROLE_PREVIEW_EMAIL } from "@/lib/rolePreview";
import { ChooseRoleForm } from "./ChooseRoleForm";

export default async function ChooseRolePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.email?.toLowerCase() !== ROLE_PREVIEW_EMAIL) redirect("/");

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-lg font-extrabold text-white">
            LA
          </span>
          <h1 className="page-title">Preview as...</h1>
          <p className="mt-1 text-sm text-muted">
            Pick a role for this session. It doesn&apos;t change your stored
            account role — sign in again to pick a different one.
          </p>
        </div>
        <div className="panel p-6">
          <ChooseRoleForm />
        </div>
      </div>
    </main>
  );
}
