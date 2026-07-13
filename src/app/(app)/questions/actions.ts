"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function createQuestion(formData: FormData) {
  const me = await requireRole("SUPERVISOR");
  const prompt = String(formData.get("prompt") ?? "").trim();
  if (!prompt) return;
  const count = await prisma.formQuestion.count({ where: { supervisorId: me.id, active: true } });
  await prisma.formQuestion.create({ data: { supervisorId: me.id, prompt, order: count } });
  revalidatePath("/questions");
}

// Soft-delete: hides the question from future forms without destroying
// FormAnswer rows tied to past submissions.
export async function deleteQuestion(questionId: string) {
  const me = await requireRole("SUPERVISOR");
  await prisma.formQuestion.updateMany({
    where: { id: questionId, supervisorId: me.id },
    data: { active: false },
  });
  revalidatePath("/questions");
}
