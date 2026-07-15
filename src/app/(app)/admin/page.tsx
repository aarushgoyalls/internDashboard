import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { getReminderSettings } from "@/lib/settings";
import { Avatar } from "@/components/Avatar";
import { SupervisorInternPicker } from "@/components/SupervisorInternPicker";
import {
  createDepartment,
  createUser,
  updateUser,
  updateSettings,
  runRemindersNow,
  runSupervisorDigestNow,
  toggleDepartmentSoftware,
  setUserActive,
  updateSupervisorAssignments,
} from "./actions";

const ROLES = ["INTERN", "SUPERVISOR", "ADMIN"] as const;

export default async function AdminPage() {
  await requireRole("ADMIN");

  const [settings, departments, users, supervisors, interns] = await Promise.all([
    getReminderSettings(),
    prisma.department.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } }),
    prisma.user.findMany({ include: { department: true }, orderBy: [{ role: "asc" }, { name: "asc" }] }),
    prisma.user.findMany({
      where: { role: "SUPERVISOR" },
      include: { supervisorOf: { include: { intern: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { OR: [{ role: "INTERN" }, { isAlsoIntern: true }], active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const input = "field";
  const sectionTitle = "section-title";

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-10">
        <h1 className="page-title">Admin</h1>

        {/* Reminder settings */}
        <section>
          <h2 className={sectionTitle}>Reminder settings</h2>
          <p className="mt-1 text-xs text-subtle">The progress form recurs daily. An intern is flagged overdue after this many days without a submission.</p>
          <div className="card mt-3 flex flex-wrap items-end gap-4 p-4">
            <form action={updateSettings} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted">Overdue after (days without a submission)</label>
                <input type="number" name="reminderIntervalDays" min={0} max={30} defaultValue={settings.reminderIntervalDays} className={`mt-1 w-24 ${input}`} />
              </div>
              <button className="btn-primary px-3 py-1.5">Save</button>
            </form>
            <form action={runRemindersNow}>
              <button className="btn-secondary px-3 py-1.5">
                Run reminders now
              </button>
            </form>
            <form action={runSupervisorDigestNow}>
              <button className="btn-secondary px-3 py-1.5">
                Email supervisor digest now
              </button>
            </form>
          </div>
          <p className="mt-2 text-xs text-subtle">
            Supervisors also get a daily email at 8:00 PM IST with how many of
            their interns submitted today and who&apos;s missing (requires
            GMAIL_USER / GMAIL_APP_PASSWORD to be set).
          </p>
        </section>

        {/* Departments */}
        <section>
          <h2 className={sectionTitle}>Departments</h2>
          <p className="mt-1 text-xs text-subtle">Departments marked &quot;Software&quot; get an extra SDLC-stage question on the daily form.</p>
          <div className="card mt-3 p-4">
            <div className="space-y-2">
              {departments.map((d) => (
                <form
                  key={d.id}
                  action={toggleDepartmentSoftware.bind(null, d.id)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-btn border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground"
                >
                  <span>{d.name} <span className="text-subtle">· {d._count.users}</span></span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <input type="checkbox" name="isSoftware" defaultChecked={d.isSoftware} className="h-3.5 w-3.5 rounded border-border-strong accent-accent" />
                      Software
                    </label>
                    <button className="btn-secondary px-2 py-1 text-xs">Save</button>
                  </div>
                </form>
              ))}
            </div>
            <form action={createDepartment} className="mt-4 flex flex-wrap items-center gap-2">
              <input name="name" required placeholder="New department name" className={`flex-1 min-w-40 ${input}`} />
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input type="checkbox" name="isSoftware" className="h-3.5 w-3.5 rounded border-border-strong accent-accent" />
                Software
              </label>
              <button className="btn-primary px-3 py-1.5">Add</button>
            </form>
          </div>
        </section>

        {/* Supervisor <-> intern mapping */}
        <section>
          <h2 className={sectionTitle}>Supervisor assignments</h2>
          <p className="mt-1 text-xs text-subtle">
            Which interns each supervisor manages — independent of department. Drives project
            assignment, daily-form questions, and meeting invitees.
          </p>
          <div className="mt-3 space-y-3">
            {supervisors.map((s) => {
              const assignedIds = new Set(s.supervisorOf.map((a) => a.internId));
              return (
                <form
                  key={s.id}
                  action={updateSupervisorAssignments.bind(null, s.id)}
                  className="card flex flex-wrap items-start justify-between gap-3 p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} email={s.email} image={s.image} size={32} />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{s.name ?? s.email}</p>
                      <p className="text-xs text-subtle">{assignedIds.size} intern{assignedIds.size === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <SupervisorInternPicker interns={interns} initialAssignedIds={[...assignedIds]} />
                    <button className="btn-secondary px-3 py-1.5">Save</button>
                  </div>
                </form>
              );
            })}
            {supervisors.length === 0 && <p className="text-sm text-subtle">No supervisors yet.</p>}
          </div>
        </section>

        {/* Create user */}
        <section>
          <h2 className={sectionTitle}>Add user</h2>
          <form action={createUser} className="card mt-3 flex flex-wrap items-end gap-3 p-4">
            <div className="flex-1 min-w-32">
              <label className="block text-xs font-semibold text-muted">Name</label>
              <input name="name" placeholder="Full name" className={`mt-1 w-full ${input}`} />
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-muted">Email</label>
              <input name="email" type="email" required placeholder="name@firm.com" className={`mt-1 w-full ${input}`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted">Role</label>
              <select name="role" defaultValue="INTERN" className={`mt-1 ${input}`}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted">Department</label>
              <select name="departmentId" className={`mt-1 ${input}`}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted">Internship end date</label>
              <input type="date" name="internshipEndDate" className={`mt-1 ${input}`} />
            </div>
            <button className="btn-primary px-3 py-1.5">Create</button>
          </form>
        </section>

        {/* Users table */}
        <section>
          <h2 className={sectionTitle}>Users ({users.length})</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-subtle">
                  <th className="px-4 py-2.5 font-semibold">User</th>
                  <th className="px-4 py-2.5 font-semibold">Role, department &amp; end date</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className={u.active ? "" : "bg-surface-muted opacity-60"}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} email={u.email} image={u.image} size={32} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {u.name ?? u.email}
                            {!u.active && <span className="ml-1.5 text-xs font-normal text-subtle">(deactivated)</span>}
                          </p>
                          <p className="truncate text-xs text-subtle">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" colSpan={2}>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateUser.bind(null, u.id)} className="flex flex-wrap items-center gap-2">
                          <select name="role" defaultValue={u.role} className={input}>
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <select name="departmentId" defaultValue={u.departmentId ?? ""} className={input}>
                            <option value="">None</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                          <input
                            type="date"
                            name="internshipEndDate"
                            defaultValue={u.internshipEndDate ? u.internshipEndDate.toISOString().slice(0, 10) : ""}
                            title="Internship end date"
                            className={input}
                          />
                          <button className="btn-secondary px-3 py-1.5">Save</button>
                        </form>
                        <form action={setUserActive.bind(null, u.id)}>
                          <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                          <button
                            className={`rounded-btn px-3 py-1.5 text-sm font-medium ${
                              u.active
                                ? "border border-danger/30 text-danger hover:bg-danger-tint"
                                : "border border-success/30 text-success hover:bg-success-tint"
                            }`}
                          >
                            {u.active ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
