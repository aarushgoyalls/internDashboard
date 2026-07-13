-- Rename the middle status value (data-preserving). Postgres supports renaming
-- an in-use enum value directly, so existing rows keep their value.
ALTER TYPE "StatusValue" RENAME VALUE 'AT_RISK' TO 'UNSATISFACTORY';

-- The weekly form is now a daily form: the period column covers a day, not a week.
-- RENAME preserves existing data (Prisma can't auto-detect renames, so we hand-write it).
ALTER TABLE "FormSubmission" RENAME COLUMN "weekStart" TO "periodStart";
ALTER INDEX "FormSubmission_internId_weekStart_key" RENAME TO "FormSubmission_internId_periodStart_key";
