-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "listed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skillsRequired" TEXT;

-- CreateTable
CREATE TABLE "ProjectWishlist" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectWishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInterest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectWishlist_internId_idx" ON "ProjectWishlist"("internId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWishlist_projectId_internId_key" ON "ProjectWishlist"("projectId", "internId");

-- CreateIndex
CREATE INDEX "ProjectInterest_projectId_idx" ON "ProjectInterest"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInterest_projectId_internId_key" ON "ProjectInterest"("projectId", "internId");

-- AddForeignKey
ALTER TABLE "ProjectWishlist" ADD CONSTRAINT "ProjectWishlist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWishlist" ADD CONSTRAINT "ProjectWishlist_internId_fkey" FOREIGN KEY ("internId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInterest" ADD CONSTRAINT "ProjectInterest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInterest" ADD CONSTRAINT "ProjectInterest_internId_fkey" FOREIGN KEY ("internId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
