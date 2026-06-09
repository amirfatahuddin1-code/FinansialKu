-- Migration: Create user_features and feature_errors tables for "Kreasi User" module
-- Allows users to create custom features with AI-generated structured definitions

-- 1. User Features table
CREATE TABLE IF NOT EXISTS public.user_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN (
    'dashboard_widget',
    'smart_filter',
    'notification_trigger',
    'auto_rule',
    'report_template',
    'budget_strategy',
    'custom_calc'
  )),
  definition JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  max_error_count INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Feature Errors audit log
CREATE TABLE IF NOT EXISTS public.feature_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id UUID NOT NULL REFERENCES public.user_features(id) ON DELETE CASCADE,
  error_message TEXT,
  error_stack TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_features_workspace ON public.user_features(workspace_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_user_features_user ON public.user_features(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_errors_feature ON public.feature_errors(feature_id);

-- 4. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_user_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_features_updated_at ON public.user_features;
CREATE TRIGGER trg_user_features_updated_at
  BEFORE UPDATE ON public.user_features
  FOR EACH ROW EXECUTE FUNCTION public.update_user_features_updated_at();

-- 5. Row Level Security
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_errors ENABLE ROW LEVEL SECURITY;

-- Users can only see their own features (or workspace features they're part of)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_features' AND policyname = 'user_features_select_policy') THEN
    CREATE POLICY user_features_select_policy ON public.user_features
      FOR SELECT USING (
        auth.uid() = user_id
        OR workspace_id IN (
          SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_features' AND policyname = 'user_features_insert_policy') THEN
    CREATE POLICY user_features_insert_policy ON public.user_features
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_features' AND policyname = 'user_features_update_policy') THEN
    CREATE POLICY user_features_update_policy ON public.user_features
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_features' AND policyname = 'user_features_delete_policy') THEN
    CREATE POLICY user_features_delete_policy ON public.user_features
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Feature errors: users can see errors for their own features
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_errors' AND policyname = 'feature_errors_select_policy') THEN
    CREATE POLICY feature_errors_select_policy ON public.feature_errors
      FOR SELECT USING (
        feature_id IN (SELECT id FROM public.user_features WHERE user_id = auth.uid())
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_errors' AND policyname = 'feature_errors_insert_policy') THEN
    CREATE POLICY feature_errors_insert_policy ON public.feature_errors
      FOR INSERT WITH CHECK (
        feature_id IN (SELECT id FROM public.user_features WHERE user_id = auth.uid())
      );
  END IF;
END $$;
