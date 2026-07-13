import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { Avatar } from "@/components/Avatar";
import { openDm } from "./actions";

const ROLE_LABEL: Record<string, string> = { INTERN: "Intern", SUPERVISOR: "Supervisor", ADMIN: "Admin" };

// Start a DM: pick anyone in the firm. (Spec: 1:1 DMs between any two users.)
export default async function NewDmPage() {
  const me = await requireUser();
  const users = await prisma.user.findMany({
    where: { id: { not: me.id } },
    include: { department: true },
    orderBy: [{ name: "asc" }],
  });

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="page-title">New message</h1>
        <p className="mt-1 text-sm text-muted">Pick someone to start a direct conversation.</p>

        <ul className="card mt-6 divide-y divide-border">
          {users.map((u) => (
            <li key={u.id}>
              <form action={openDm.bind(null, u.id)}>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted transition">
                  <Avatar name={u.name} email={u.email} image={u.image} size={36} />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{u.name ?? u.email}</p>
                    <p className="text-xs text-subtle">
                      {ROLE_LABEL[u.role]}
                      {u.department ? ` · ${u.department.name}` : ""}
                    </p>
                  </div>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
