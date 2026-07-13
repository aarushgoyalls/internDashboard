import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getManagedInterns } from "@/lib/access";
import { Avatar } from "@/components/Avatar";
import { createProject, archiveProject, updateProjectAssignments } from "./actions";

// Supervisors create + assign projects to their own interns; admins can do
// the same for anyone. Assigned projects populate the daily form's Project
// dropdown (see src/components/ProgressForm.tsx).
export default async function ProjectsPage() {
  const me = await requireRole("SUPERVISOR", "ADMIN");
  const isAdmin = me.role === "ADMIN";

  const [projects, managedInterns] = await Promise.all([
    prisma.project.findMany({
      where: { archived: false, ...(isAdmin ? {} : { createdById: me.id }) },
      include: { assignments: { include: { intern: true } }, createdBy: true },
      orderBy: { createdAt: "desc" },
    }),
    getManagedInterns(me),
  ]);

  const input = "field";
  const sectionTitle = "section-title";

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <h1 className="page-title">Projects</h1>

        <section>
          <h2 className={sectionTitle}>New project</h2>
          <form action={createProject} className="card mt-3 flex flex-wrap items-end gap-3 p-4">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-muted">Name</label>
              <input name="name" required placeholder="Project name" className={`mt-1 w-full ${input}`} />
            </div>
            <div className="flex-[2] min-w-48">
              <label className="block text-xs font-semibold text-muted">Description (optional)</label>
              <input name="description" placeholder="What's this project about?" className={`mt-1 w-full ${input}`} />
            </div>
            <button className="btn-primary px-3 py-1.5">Add</button>
          </form>
        </section>

        <section>
          <h2 className={sectionTitle}>
            {isAdmin ? "All projects" : "Your projects"} ({projects.length})
          </h2>
          <div className="mt-3 space-y-3">
            {projects.length === 0 && (
              <p className="card px-4 py-8 text-center text-sm text-subtle">
                No projects yet.
              </p>
            )}
            {projects.map((p) => {
              const assignedIds = new Set(p.assignments.map((a) => a.internId));
              return (
                <div key={p.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      {p.description && <p className="mt-0.5 text-sm text-muted">{p.description}</p>}
                      {isAdmin && <p className="mt-1 text-xs text-subtle">Created by {p.createdBy.name ?? p.createdBy.email}</p>}
                    </div>
                    <form action={archiveProject.bind(null, p.id)}>
                      <button className="btn-secondary px-2.5 py-1 text-xs">
                        Archive
                      </button>
                    </form>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {p.assignments.map((a) => (
                      <span key={a.id} className="pill border border-border bg-surface-muted text-muted">
                        <Avatar name={a.intern.name} email={a.intern.email} image={a.intern.image} size={16} />
                        {a.intern.name ?? a.intern.email}
                      </span>
                    ))}
                    {p.assignments.length === 0 && <span className="text-xs text-subtle">Not assigned to anyone yet</span>}
                  </div>

                  <form action={updateProjectAssignments.bind(null, p.id)} className="mt-3 flex flex-wrap items-end gap-2">
                    <select
                      name="internIds"
                      multiple
                      size={Math.min(6, Math.max(3, managedInterns.length))}
                      defaultValue={[...assignedIds]}
                      className={`${input} min-w-56`}
                    >
                      {managedInterns.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name ?? i.email}
                        </option>
                      ))}
                    </select>
                    <button className="btn-secondary px-3 py-1.5">
                      Save assignment
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
