-- Add Lifetime Deal Plan
INSERT INTO subscription_plans (id, name, price, duration_days, features) VALUES
  ('lifetime', 'Lifetime Deal', 97000, 36500, '{
    "app_transactions": "unlimited",
    "messaging_transactions": "unlimited",
    "budget": true,
    "savings": true,
    "reports": true,
    "debts": true,
    "calculator": true,
    "ai_assistant": true,
    "export_reports": true
  }'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  duration_days = EXCLUDED.duration_days,
  features = EXCLUDED.features;
