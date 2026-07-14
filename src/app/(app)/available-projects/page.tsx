import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { activeProjectCount, MAX_ACTIVE_PROJECTS } from "@/lib/access";
import { Avatar } from "@/components/Avatar";
import { WordCountField } from "@/components/WordCountField";
import { timeAgo } from "@/lib/format";
import {
  createListedProject,
  unlistProject,
  addToWishlist,
  removeFromWishlist,
  expressInterest,
  withdrawInterest,
  assignInterestedIntern,
} from "./actions";

// Public marketplace: supervisors/admins list open projects here; every
// signed-in user can browse; interns can privately wishlist AND, separately,
// signal real interest (which notifies the supervisor). Approving/assigning
// reuses the same ProjectAssignment table /projects manages.
export default async function AvailableProjectsPage() {
  const me = await requireUser();
  const isSupervisorOrAdmin = me.role === "SUPERVISOR" || me.role === "ADMIN";
  const isInternish = me.role === "INTERN" || me.isAlsoIntern;

  const [listedProjects, departments, myWishlist, myInterests, myActiveCount] = await Promise.all([
    prisma.project.findMany({
      where: { listed: true, archived: false },
      include: { createdBy: true, department: true, interests: { include: { intern: true } } },
      orderBy: { createdAt: "desc" },
    }),
    isSupervisorOrAdmin ? prisma.department.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    isInternish
      ? prisma.projectWishlist.findMany({ where: { internId: me.id }, select: { projectId: true } })
      : Promise.resolve([]),
    isInternish
      ? prisma.projectInterest.findMany({ where: { internId: me.id }, select: { projectId: true } })
      : Promise.resolve([]),
    isInternish ? activeProjectCount(me.id) : Promise.resolve(0),
  ]);

  const wishlistIds = new Set(myWishlist.map((w) => w.projectId));
  const interestIds = new Set(myInterests.map((i) => i.projectId));

  // Active-project counts for every intern who's shown interest anywhere, so
  // the owner's "Assign" button can reflect the MAX_ACTIVE_PROJECTS cap.
  const internIdsWithInterest = [...new Set(listedProjects.flatMap((p) => p.interests.map((i) => i.internId)))];
  const countEntries = await Promise.all(
    internIdsWithInterest.map(async (id) => [id, await activeProjectCount(id)] as const)
  );
  const activeCountByIntern = new Map(countEntries);

  const sectionTitle = "section-title";

  function ProjectCard(p: (typeof listedProjects)[number]) {
    const isOwner = me.role === "ADMIN" || p.createdById === me.id;
    const inWishlist = wishlistIds.has(p.id);
    const interested = interestIds.has(p.id);

    return (
      <div key={p.id} className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{p.name}</p>
              {p.department && (
                <span className="pill border border-border bg-surface-muted text-[10px] text-muted">
                  {p.department.name}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-subtle">
              Posted by {p.createdBy.name ?? p.createdBy.email}
            </p>
          </div>
          {isOwner && (
            <form action={unlistProject.bind(null, p.id)}>
              <button className="btn-secondary px-2.5 py-1 text-xs">Unlist</button>
            </form>
          )}
        </div>

        {p.description && <p className="mt-2 text-sm text-muted">{p.description}</p>}
        {p.skillsRequired && (
          <p className="mt-2 text-xs text-subtle">
            <span className="font-semibold text-muted">Skills required: </span>
            {p.skillsRequired}
          </p>
        )}

        {isInternish && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form action={(inWishlist ? removeFromWishlist : addToWishlist).bind(null, p.id)}>
              <button className="btn-secondary px-2.5 py-1 text-xs">
                {inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              </button>
            </form>
            <form action={(interested ? withdrawInterest : expressInterest).bind(null, p.id)}>
              <button className={interested ? "btn-secondary px-2.5 py-1 text-xs" : "btn-primary px-2.5 py-1 text-xs"}>
                {interested ? "Withdraw interest" : "I'm interested"}
              </button>
            </form>
          </div>
        )}

        {isOwner && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="eyebrow">Interested ({p.interests.length})</p>
            {p.interests.length === 0 && <p className="mt-1 text-xs text-subtle">No interest yet</p>}
            <div className="mt-2 space-y-1.5">
              {p.interests.map((i) => {
                const count = activeCountByIntern.get(i.internId) ?? 0;
                const atCap = count >= MAX_ACTIVE_PROJECTS;
                return (
                  <div key={i.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-muted">
                      <Avatar name={i.intern.name} email={i.intern.email} image={i.intern.image} size={18} />
                      {i.intern.name ?? i.intern.email}
                      <span className="text-xs text-subtle">· {timeAgo(i.createdAt)}</span>
                    </span>
                    {atCap ? (
                      <span className="text-xs text-subtle">At {MAX_ACTIVE_PROJECTS}-project limit</span>
                    ) : (
                      <form action={assignInterestedIntern.bind(null, p.id, i.internId)}>
                        <button className="btn-secondary px-2.5 py-1 text-xs">Assign</button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  const wishlisted = listedProjects.filter((p) => wishlistIds.has(p.id));

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <h1 className="page-title">Projects Available</h1>

        {isSupervisorOrAdmin && (
          <section>
            <h2 className={sectionTitle}>List a project</h2>
            <form action={createListedProject} className="card mt-3 space-y-3 p-4">
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-semibold text-muted">Name</label>
                  <input name="name" required placeholder="Project name" className="field mt-1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted">Department</label>
                  <select name="departmentId" className="field mt-1">
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <WordCountField
                name="description"
                label="Description (optional)"
                maxWords={300}
                rows={4}
                placeholder="What's this project about?"
              />
              <WordCountField
                name="skillsRequired"
                label="Skills required (optional)"
                maxWords={50}
                rows={2}
                placeholder="e.g. React, SQL, basic data analysis"
              />
              <button className="btn-primary px-3 py-1.5">List project</button>
            </form>
          </section>
        )}

        {isInternish && (
          <section>
            <h2 className={sectionTitle}>My wishlist ({wishlisted.length})</h2>
            <div className="mt-3 space-y-3">
              {wishlisted.length === 0 && (
                <p className="card px-4 py-8 text-center text-sm text-subtle">
                  Nothing wishlisted yet — browse projects below and add ones you like.
                </p>
              )}
              {wishlisted.map(ProjectCard)}
            </div>
            <p className="mt-2 text-xs text-subtle">
              You&apos;re on {myActiveCount}/{MAX_ACTIVE_PROJECTS} active projects.
            </p>
          </section>
        )}

        <section>
          <h2 className={sectionTitle}>Browse ({listedProjects.length})</h2>
          <div className="mt-3 space-y-3">
            {listedProjects.length === 0 && (
              <p className="card px-4 py-8 text-center text-sm text-subtle">No projects listed yet.</p>
            )}
            {listedProjects.map(ProjectCard)}
          </div>
        </section>
      </div>
    </div>
  );
}
