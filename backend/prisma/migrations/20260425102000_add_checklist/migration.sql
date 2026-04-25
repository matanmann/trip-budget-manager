-- Create checklist table
CREATE TABLE IF NOT EXISTS "ChecklistItem" (
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

-- Indexes
CREATE INDEX IF NOT EXISTS "ChecklistItem_tripId_idx" ON "ChecklistItem"("tripId");
CREATE INDEX IF NOT EXISTS "ChecklistItem_tripId_isDone_idx" ON "ChecklistItem"("tripId", "isDone");

-- Foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ChecklistItem_tripId_fkey'
  ) THEN
    ALTER TABLE "ChecklistItem"
      ADD CONSTRAINT "ChecklistItem_tripId_fkey"
      FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
