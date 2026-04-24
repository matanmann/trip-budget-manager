-- Add missing fields used by trip settings update/create endpoints
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "categoryBudgets" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "travelers" INTEGER NOT NULL DEFAULT 1;
