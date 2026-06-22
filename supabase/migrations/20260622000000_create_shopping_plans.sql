-- Migration: Create shopping_plans table for Planning Shopping module
-- Allows users to plan daily/monthly shopping, manage list items, and track realizations.

CREATE TABLE IF NOT EXISTS public.shopping_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('daily', 'monthly')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of items: { id, name, qty, unitPrice, total, isRealized }
  total_planned NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_realized NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_realized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_shopping_plans_workspace ON public.shopping_plans(workspace_id);
CREATE INDEX IF NOT EXISTS idx_shopping_plans_user ON public.shopping_plans(user_id);

-- Enable RLS
ALTER TABLE public.shopping_plans ENABLE ROW LEVEL SECURITY;

-- 1. Select policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopping_plans' AND policyname = 'shopping_plans_select_policy') THEN
    CREATE POLICY shopping_plans_select_policy ON public.shopping_plans
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopping_plans' AND policyname = 'shopping_plans_insert_policy') THEN
    CREATE POLICY shopping_plans_insert_policy ON public.shopping_plans
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Update policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopping_plans' AND policyname = 'shopping_plans_update_policy') THEN
    CREATE POLICY shopping_plans_update_policy ON public.shopping_plans
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shopping_plans' AND policyname = 'shopping_plans_delete_policy') THEN
    CREATE POLICY shopping_plans_delete_policy ON public.shopping_plans
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_shopping_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shopping_plans_updated_at ON public.shopping_plans;
CREATE TRIGGER trg_shopping_plans_updated_at
  BEFORE UPDATE ON public.shopping_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_shopping_plans_updated_at();
