-- CreateEnum
CREATE TYPE "SdlcStage" AS ENUM ('PLANNING', 'REQUIREMENTS', 'DESIGN', 'IMPLEMENTATION', 'TESTING', 'DEPLOYMENT', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "isSoftware" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FormSubmission" ADD COLUMN     "sdlcStage" "SdlcStage";
