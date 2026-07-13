import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { createQuestion, deleteQuestion } from "./actions";

// Supervisor-authored short-text questions appended to their interns' daily
// form (see src/app/(app)/form/page.tsx, which unions questions from every
// supervisor mapped to the signed-in intern).
export default async function QuestionsPage() {
  const me = await requireRole("SUPERVISOR");

  const questions = await prisma.formQuestion.findMany({
    where: { supervisorId: me.id, active: true },
    orderBy: { order: "asc" },
  });

  const input = "field";
  const sectionTitle = "section-title";

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        <h1 className="page-title">Daily form questions</h1>
        <p className="text-sm text-muted">
          Questions you add here show up below the standard fields on your interns&apos; daily form.
          Short-text answers only.
        </p>

        <section>
          <h2 className={sectionTitle}>Add question</h2>
          <form action={createQuestion} className="card mt-3 flex flex-wrap items-end gap-3 p-4">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-semibold text-muted">Prompt</label>
              <input name="prompt" required placeholder="e.g. Any risks to flag?" className={`mt-1 w-full ${input}`} />
            </div>
            <button className="btn-primary px-3 py-1.5">Add</button>
          </form>
        </section>

        <section>
          <h2 className={sectionTitle}>Your questions ({questions.length})</h2>
          <div className="mt-3 space-y-2">
            {questions.length === 0 && (
              <p className="card px-4 py-8 text-center text-sm text-subtle">
                No custom questions yet.
              </p>
            )}
            {questions.map((q) => (
              <div key={q.id} className="card flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="text-sm text-foreground">{q.prompt}</p>
                <form action={deleteQuestion.bind(null, q.id)}>
                  <button className="rounded-btn border border-danger/30 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-tint transition">
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
