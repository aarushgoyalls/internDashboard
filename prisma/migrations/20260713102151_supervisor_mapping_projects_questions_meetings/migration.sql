-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "FormSubmission" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SupervisorAssignment" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormQuestion" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormAnswer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "FormAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organizerId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 30,
    "location" TEXT,
    "recurrence" "RecurrenceFrequency" NOT NULL DEFAULT 'NONE',
    "recurrenceEndDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttendee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupervisorAssignment_internId_idx" ON "SupervisorAssignment"("internId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorAssignment_supervisorId_internId_key" ON "SupervisorAssignment"("supervisorId", "internId");

-- CreateIndex
CREATE INDEX "ProjectAssignment_internId_idx" ON "ProjectAssignment"("internId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_projectId_internId_key" ON "ProjectAssignment"("projectId", "internId");

-- CreateIndex
CREATE INDEX "FormAnswer_questionId_idx" ON "FormAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "FormAnswer_submissionId_questionId_key" ON "FormAnswer"("submissionId", "questionId");

-- CreateIndex
CREATE INDEX "Meeting_organizerId_idx" ON "Meeting"("organizerId");

-- CreateIndex
CREATE INDEX "Meeting_startAt_idx" ON "Meeting"("startAt");

-- CreateIndex
CREATE INDEX "MeetingAttendee_userId_idx" ON "MeetingAttendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingAttendee_meetingId_userId_key" ON "MeetingAttendee"("meetingId", "userId");

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAssignment" ADD CONSTRAINT "SupervisorAssignment_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAssignment" ADD CONSTRAINT "SupervisorAssignment_internId_fkey" FOREIGN KEY ("internId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_internId_fkey" FOREIGN KEY ("internId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAnswer" ADD CONSTRAINT "FormAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAnswer" ADD CONSTRAINT "FormAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "FormQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
