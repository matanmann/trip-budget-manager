-- Ensure trip settings fields exist, then keep categoryBudgets nullable
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "categoryBudgets" JSONB;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "travelers" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Trip" ALTER COLUMN "categoryBudgets" DROP NOT NULL;
