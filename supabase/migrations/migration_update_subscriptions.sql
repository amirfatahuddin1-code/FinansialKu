-- Gunakan UPSERT (Insert on conflict do update) agar tidak melanggar foreign key
-- dan update data yang sudah ada seperti 'lifetime', 'bulanan', 'tahunan'.

INSERT INTO public.subscription_plans (id, name, price, duration_days, features, created_at)
VALUES 
(
  'basic',
  'Basic',
  0,
  36500,
  '{ "manual_tx": "unlimited", "ai_assistant": 20, "messaging_transactions": 20, "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": 1, "workspace_max": 2 }'::jsonb,
  now()
),
(
  'bulanan',
  'Pro - Bulanan',
  20000,
  30,
  '{ "manual_tx": "unlimited", "ai_assistant": "unlimited", "messaging_transactions": "unlimited", "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": "unlimited", "workspace_max": "unlimited" }'::jsonb,
  now()
),
(
  'tahunan',
  'Pro - Tahunan',
  118000,
  365,
  '{ "manual_tx": "unlimited", "ai_assistant": "unlimited", "messaging_transactions": "unlimited", "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": "unlimited", "workspace_max": "unlimited" }'::jsonb,
  now()
),
(
  'lifetime',
  'Pro - Lifetime',
  159000,
  36500,
  '{ "manual_tx": "unlimited", "ai_assistant": "unlimited", "messaging_transactions": "unlimited", "budgeting": true, "events": true, "savings": true, "debts": true, "reports": true, "financial_calculator": true, "theme_changes": "unlimited", "workspace_max": "unlimited" }'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days,
  features = EXCLUDED.features;

-- Hapus plan trial yang sebelumnya sempat terbuat (opsional, jika tidak ada constraint yang mengikat)
-- DELETE FROM public.subscription_plans WHERE id = 'trial';

-- Create Function to auto-subscribe Basic
CREATE OR REPLACE FUNCTION public.handle_new_user_basic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_basic_plan_id text;
BEGIN
  -- Get the Basic plan ID
  SELECT id INTO v_basic_plan_id
  FROM public.subscription_plans
  WHERE name = 'Basic'
  LIMIT 1;

  IF v_basic_plan_id IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, started_at, expires_at)
    VALUES (
      new.id,
      v_basic_plan_id,
      'active',
      now(),
      now() + interval '36500 days'
    );
  END IF;

  RETURN new;
END;
$$;

-- Create Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_basic ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;

CREATE TRIGGER on_auth_user_created_basic
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_basic();
