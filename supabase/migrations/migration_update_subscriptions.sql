-- Hapus rencana lama (Opsional, pastikan jika ini di production, sesuaikan dengan ID yang lama, tapi untuk kemudahan kita clear dulu atau update)
-- Karena ini script migration, kita akan hapus semua plans jika memungkinkan (hati-hati di production) atau pakai upsert.
-- Gunakan nama yang konsisten.

DELETE FROM public.subscription_plans;

-- Insert Trial Plan
INSERT INTO public.subscription_plans (id, name, price, duration_days, features, created_at)
VALUES (
  gen_random_uuid(),
  'Trial',
  0,
  14,
  '{ "manual_tx": "unlimited", "ai_assistant": "unlimited", "messaging_transactions": "unlimited", "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": "unlimited", "workspace_max": "unlimited" }'::jsonb,
  now()
);

-- Insert Basic Plans
INSERT INTO public.subscription_plans (id, name, price, duration_days, features, created_at)
VALUES 
(
  gen_random_uuid(),
  'Basic - Bulanan',
  25000,
  30,
  '{ "manual_tx": "unlimited", "ai_assistant": 20, "messaging_transactions": 20, "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": 1, "workspace_max": 2 }'::jsonb,
  now()
),
(
  gen_random_uuid(),
  'Basic - Tahunan',
  250000,
  365,
  '{ "manual_tx": "unlimited", "ai_assistant": 20, "messaging_transactions": 20, "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": 1, "workspace_max": 2 }'::jsonb,
  now()
),
(
  gen_random_uuid(),
  'Basic - Lifetime',
  999000,
  36500,
  '{ "manual_tx": "unlimited", "ai_assistant": 20, "messaging_transactions": 20, "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": 1, "workspace_max": 2 }'::jsonb,
  now()
);

-- Insert Pro Plans
INSERT INTO public.subscription_plans (id, name, price, duration_days, features, created_at)
VALUES 
(
  gen_random_uuid(),
  'Pro - Bulanan',
  75000,
  30,
  '{ "manual_tx": "unlimited", "ai_assistant": "unlimited", "messaging_transactions": "unlimited", "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": "unlimited", "workspace_max": "unlimited" }'::jsonb,
  now()
),
(
  gen_random_uuid(),
  'Pro - Tahunan',
  750000,
  365,
  '{ "manual_tx": "unlimited", "ai_assistant": "unlimited", "messaging_transactions": "unlimited", "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": "unlimited", "workspace_max": "unlimited" }'::jsonb,
  now()
),
(
  gen_random_uuid(),
  'Pro - Lifetime',
  1999000,
  36500,
  '{ "manual_tx": "unlimited", "ai_assistant": "unlimited", "messaging_transactions": "unlimited", "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": "unlimited", "workspace_max": "unlimited" }'::jsonb,
  now()
);

-- Create Function to auto-subscribe Trial
CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial_plan_id uuid;
BEGIN
  -- Get the Trial plan ID
  SELECT id INTO v_trial_plan_id
  FROM public.subscription_plans
  WHERE name = 'Trial'
  LIMIT 1;

  IF v_trial_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, started_at, expires_at)
    VALUES (
      new.id,
      v_trial_plan_id,
      'active',
      now(),
      now() + interval '14 days'
    );
  END IF;

  RETURN new;
END;
$$;

-- Create Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;
CREATE TRIGGER on_auth_user_created_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_trial();
