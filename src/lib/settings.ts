import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/constants";

// Reads the configurable reminder settings from AppSetting, falling back to
// defaults when a key hasn't been set yet. Values are stored as strings.
export async function getReminderSettings(): Promise<{ reminderIntervalDays: number }> {
  const row = await prisma.appSetting.findUnique({
    where: { key: SETTING_KEYS.reminderIntervalDays },
  });
  const n = row ? parseInt(row.value, 10) : NaN;
  return {
    reminderIntervalDays: Number.isFinite(n) ? n : DEFAULT_SETTINGS.reminderIntervalDays,
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
