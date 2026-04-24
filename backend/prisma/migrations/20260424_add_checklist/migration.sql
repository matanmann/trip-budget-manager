-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "notes" TEXT,
    "category" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistItem_tripId_idx" ON "ChecklistItem"("tripId");

-- CreateIndex
CREATE INDEX "ChecklistItem_tripId_isDone_idx" ON "ChecklistItem"("tripId", "isDone");

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
