"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SDLC_STAGE_META, SDLC_STAGE_VALUES } from "@/lib/constants";

type Dept = { id: string; name: string; isSoftware: boolean };
type ProjectOption = { id: string; name: string };
type QuestionOption = { id: string; prompt: string };
type ExistingAnswer = { questionId: string; answer: string };
type Existing = {
  departmentId: string | null;
  project: string;
  projectId: string | null;
  didThisWeek: string;
  planNextWeek: string;
  blocked: boolean;
  blockerDetail: string | null;
  sdlcStage: string | null;
} | null;

// The daily progress form. If `existing` is provided, it pre-fills for editing
// (interns can revise today's entry). Posts to /api/form.
export function ProgressForm({
  departments,
  defaultDepartmentId,
  existing,
  projects,
  questions,
  existingAnswers,
}: {
  departments: Dept[];
  defaultDepartmentId: string | null;
  existing: Existing;
  projects: ProjectOption[];
  questions: QuestionOption[];
  existingAnswers: ExistingAnswer[];
}) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = useState(existing?.departmentId ?? defaultDepartmentId ?? "");
  const [projectId, setProjectId] = useState(existing?.projectId ?? "");
  const [project, setProject] = useState(existing?.project ?? "");
  const [didThisWeek, setDidThisWeek] = useState(existing?.didThisWeek ?? "");
  const [planNextWeek, setPlanNextWeek] = useState(existing?.planNextWeek ?? "");
  const [blocked, setBlocked] = useState(existing?.blocked ?? false);
  const [blockerDetail, setBlockerDetail] = useState(existing?.blockerDetail ?? "");
  const [sdlcStage, setSdlcStage] = useState(existing?.sdlcStage ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(existingAnswers.map((a) => [a.questionId, a.answer]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const isSoftwareDept = departments.find((d) => d.id === departmentId)?.isSoftware ?? false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId,
          projectId: projects.length > 0 ? projectId || null : null,
          project: projects.length > 0 ? undefined : project,
          didThisWeek,
          planNextWeek,
          blocked,
          blockerDetail,
          sdlcStage: isSoftwareDept ? sdlcStage || null : null,
          answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? "" })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setSavedAt(new Date().toLocaleTimeString());
        router.refresh(); // re-render the server component (status banner, history)
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  const field = "field mt-1";
  const label = "block text-sm font-semibold text-foreground";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={label}>Department</label>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required className={field}>
          <option value="" disabled>Select department…</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>Project</label>
        {projects.length > 0 ? (
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required className={field}>
            <option value="" disabled>Select project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <>
            <input value={project} onChange={(e) => setProject(e.target.value)} required placeholder="What are you working on?" className={field} />
            <p className="mt-1 text-xs text-subtle">No project assigned yet — ask your supervisor, or describe it here for now.</p>
          </>
        )}
      </div>

      {isSoftwareDept && (
        <div>
          <label className={label}>Where in the software cycle is this?</label>
          <select value={sdlcStage} onChange={(e) => setSdlcStage(e.target.value)} required className={field}>
            <option value="" disabled>Select stage…</option>
            {SDLC_STAGE_VALUES.map((s) => (
              <option key={s} value={s}>{SDLC_STAGE_META[s].label}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={label}>What I did today</label>
        <textarea value={didThisWeek} onChange={(e) => setDidThisWeek(e.target.value)} required rows={4} className={field} />
      </div>

      <div>
        <label className={label}>What&apos;s planned for tomorrow</label>
        <textarea value={planNextWeek} onChange={(e) => setPlanNextWeek(e.target.value)} required rows={4} className={field} />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input type="checkbox" checked={blocked} onChange={(e) => setBlocked(e.target.checked)} className="h-4 w-4 rounded border-border-strong accent-accent" />
          I&apos;m blocked on something
        </label>
        {blocked && (
          <textarea
            value={blockerDetail}
            onChange={(e) => setBlockerDetail(e.target.value)}
            rows={3}
            placeholder="What's blocking you?"
            className={field}
          />
        )}
      </div>

      {questions.length > 0 && (
        <div className="space-y-4 border-t border-border pt-4">
          {questions.map((q) => (
            <div key={q.id}>
              <label className={label}>{q.prompt}</label>
              <input
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                className={field}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : existing ? "Update today's entry" : "Submit"}
        </button>
        {savedAt && <span className="text-sm font-medium text-success">Saved at {savedAt}</span>}
      </div>
    </form>
  );
}
