-- Migration: Create investment_assets table for syncing investment portfolios.
-- Supports double-quoted camelCase columns to align with TypeScript models.

CREATE TABLE IF NOT EXISTS public.investment_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('saham', 'reksadana', 'emas', 'obligasi', 'crypto')),
  units NUMERIC(20, 6) NOT NULL DEFAULT 0,
  "avgBuyPrice" NUMERIC(20, 2) NOT NULL DEFAULT 0,
  "currentPrice" NUMERIC(20, 2) NOT NULL DEFAULT 0,
  platform VARCHAR(255) NOT NULL,
  "accountId" UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  "purchaseDate" TIMESTAMPTZ,
  "transactionId" UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_investment_assets_workspace ON public.investment_assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_investment_assets_user ON public.investment_assets(user_id);

-- Enable RLS
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;

-- 1. Select policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investment_assets' AND policyname = 'investment_assets_select_policy') THEN
    CREATE POLICY investment_assets_select_policy ON public.investment_assets
      FOR SELECT USING (
        auth.uid() = user_id
        OR workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 2. Insert policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investment_assets' AND policyname = 'investment_assets_insert_policy') THEN
    CREATE POLICY investment_assets_insert_policy ON public.investment_assets
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Update policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investment_assets' AND policyname = 'investment_assets_update_policy') THEN
    CREATE POLICY investment_assets_update_policy ON public.investment_assets
      FOR UPDATE USING (
        auth.uid() = user_id
        OR workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4. Delete policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investment_assets' AND policyname = 'investment_assets_delete_policy') THEN
    CREATE POLICY investment_assets_delete_policy ON public.investment_assets
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auto-update updatedAt trigger
CREATE OR REPLACE FUNCTION public.update_investment_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_investment_assets_updated_at ON public.investment_assets;
CREATE TRIGGER trg_investment_assets_updated_at
  BEFORE UPDATE ON public.investment_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_investment_assets_updated_at();
