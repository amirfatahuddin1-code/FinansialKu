-- FinansialKu Subscription System Schema
-- Run this SQL in Supabase SQL Editor

-- ========== SUBSCRIPTION PLANS ==========
-- Predefined subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- in IDR
  duration_days INTEGER NOT NULL,
  features JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, price, duration_days, features) VALUES
  ('trial', 'Trial', 0, 3, '{
    "app_transactions": "unlimited",
    "messaging_transactions": "unlimited",
    "budget": true,
    "savings": true,
    "reports": true,
    "debts": true,
    "calculator": true,
    "ai_assistant": true,
    "export_reports": true
  }'::jsonb),
  ('basic', 'Basic', 15000, 30, '{
    "app_transactions": "unlimited",
    "messaging_transactions": 300,
    "budget": true,
    "savings": true,
    "reports": true,
    "debts": true,
    "calculator": true,
    "ai_assistant": false,
    "export_reports": false
  }'::jsonb),
  ('pro', 'Pro', 30000, 30, '{
    "app_transactions": "unlimited",
    "messaging_transactions": "unlimited",
    "budget": true,
    "savings": true,
    "reports": true,
    "debts": true,
    "calculator": true,
    "ai_assistant": true,
    "export_reports": true
  }'::jsonb),
  -- NEW: Quarterly Plans (10% Discount)
  ('basic_3m', 'Basic (3 Bulan)', 40500, 90, '{
    "app_transactions": "unlimited",
    "messaging_transactions": 900,
    "budget": true,
    "savings": true,
    "reports": true,
    "debts": true,
    "calculator": true,
    "ai_assistant": false,
    "export_reports": false
  }'::jsonb),
  ('pro_3m', 'Pro (3 Bulan)', 81000, 90, '{
    "app_transactions": "unlimited",
    "messaging_transactions": "unlimited",
    "budget": true,
    "savings": true,
    "reports": true,
    "debts": true,
    "calculator": true,
    "ai_assistant": true,
    "export_reports": true
  }'::jsonb),
  -- NEW: Yearly Plans (20% Discount)
  ('basic_1y', 'Basic (1 Tahun)', 144000, 365, '{
    "app_transactions": "unlimited",
    "messaging_transactions": 3600,
    "budget": true,
    "savings": true,
    "reports": true,
    "debts": true,
    "calculator": true,
    "ai_assistant": false,
    "export_reports": false
  }'::jsonb),
  ('pro_1y', 'Pro (1 Tahun)', 288000, 365, '{
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


-- ========== USER SUBSCRIPTIONS ==========
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES subscription_plans(id) NOT NULL,
  status TEXT CHECK (status IN ('trial', 'active', 'expired', 'cancelled')) NOT NULL DEFAULT 'trial',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);


-- ========== PAYMENT TRANSACTIONS ==========
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id TEXT UNIQUE NOT NULL,
  plan_id TEXT REFERENCES subscription_plans(id) NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'success', 'failed', 'expired', 'cancelled')) NOT NULL DEFAULT 'pending',
  payment_type TEXT, -- e.g., 'bank_transfer', 'gopay', 'qris'
  midtrans_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);


-- ========== MESSAGING USAGE TRACKING ==========
-- Track WA/Telegram transaction count per month
CREATE TABLE IF NOT EXISTS messaging_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  wa_count INTEGER DEFAULT 0,
  telegram_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_messaging_usage_user_id ON messaging_usage(user_id);


-- ========== ROW LEVEL SECURITY ==========

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_usage ENABLE ROW LEVEL SECURITY;

-- Subscription plans: everyone can read
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
  FOR SELECT USING (true);

-- Subscriptions: users can only see their own
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can update subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Payment transactions: users can view their own
CREATE POLICY "Users can view own payments" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON payment_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments" ON payment_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Messaging usage: users can view/update their own
CREATE POLICY "Users can CRUD own messaging usage" ON messaging_usage
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage messaging usage" ON messaging_usage
  FOR ALL USING (auth.role() = 'service_role');


-- ========== FUNCTIONS ==========

-- Function to get active subscription for a user
CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_id TEXT,
  plan_name TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    s.plan_id,
    sp.name as plan_name,
    s.status,
    s.expires_at,
    sp.features
  FROM subscriptions s
  JOIN subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
    AND s.expires_at > NOW()
    AND s.status IN ('trial', 'active')
  ORDER BY s.expires_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to create trial subscription for new user
CREATE OR REPLACE FUNCTION create_trial_subscription(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  INSERT INTO subscriptions (user_id, plan_id, status, starts_at, expires_at)
  VALUES (
    p_user_id,
    'trial',
    'trial',
    NOW(),
    NOW() + INTERVAL '3 days'
  )
  RETURNING id INTO v_subscription_id;
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to activate subscription after payment
CREATE OR REPLACE FUNCTION activate_subscription(
  p_user_id UUID,
  p_plan_id TEXT,
  p_order_id TEXT
)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
  v_duration_days INTEGER;
  v_current_expires TIMESTAMPTZ;
BEGIN
  -- Get plan duration
  SELECT duration_days INTO v_duration_days
  FROM subscription_plans
  WHERE id = p_plan_id;
  
  -- Check if user has active subscription to extend
  SELECT expires_at INTO v_current_expires
  FROM subscriptions
  WHERE user_id = p_user_id
    AND expires_at > NOW()
    AND status IN ('trial', 'active')
  ORDER BY expires_at DESC
  LIMIT 1;
  
  -- Mark old subscriptions as expired
  UPDATE subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE user_id = p_user_id
    AND status IN ('trial', 'active');
  
  -- Create new subscription
  INSERT INTO subscriptions (user_id, plan_id, status, starts_at, expires_at)
  VALUES (
    p_user_id,
    p_plan_id,
    'active',
    NOW(),
    COALESCE(
      CASE WHEN v_current_expires > NOW() THEN v_current_expires ELSE NOW() END,
      NOW()
    ) + (v_duration_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_subscription_id;
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to increment messaging count
CREATE OR REPLACE FUNCTION increment_messaging_count(
  p_user_id UUID,
  p_type TEXT -- 'wa' or 'telegram'
)
RETURNS INTEGER AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
  v_new_count INTEGER;
BEGIN
  v_current_month := EXTRACT(MONTH FROM NOW());
  v_current_year := EXTRACT(YEAR FROM NOW());
  
  -- Upsert and increment
  INSERT INTO messaging_usage (user_id, month, year, wa_count, telegram_count)
  VALUES (
    p_user_id,
    v_current_month,
    v_current_year,
    CASE WHEN p_type = 'wa' THEN 1 ELSE 0 END,
    CASE WHEN p_type = 'telegram' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, month, year) DO UPDATE SET
    wa_count = CASE WHEN p_type = 'wa' THEN messaging_usage.wa_count + 1 ELSE messaging_usage.wa_count END,
    telegram_count = CASE WHEN p_type = 'telegram' THEN messaging_usage.telegram_count + 1 ELSE messaging_usage.telegram_count END
  RETURNING CASE WHEN p_type = 'wa' THEN wa_count ELSE telegram_count END INTO v_new_count;
  
  RETURN v_new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get current messaging usage
CREATE OR REPLACE FUNCTION get_messaging_usage(p_user_id UUID)
RETURNS TABLE (wa_count INTEGER, telegram_count INTEGER, total_count INTEGER) AS $$
DECLARE
  v_current_month INTEGER;
  v_current_year INTEGER;
BEGIN
  v_current_month := EXTRACT(MONTH FROM NOW());
  v_current_year := EXTRACT(YEAR FROM NOW());
  
  RETURN QUERY
  SELECT 
    COALESCE(mu.wa_count, 0) as wa_count,
    COALESCE(mu.telegram_count, 0) as telegram_count,
    COALESCE(mu.wa_count, 0) + COALESCE(mu.telegram_count, 0) as total_count
  FROM messaging_usage mu
  WHERE mu.user_id = p_user_id
    AND mu.month = v_current_month
    AND mu.year = v_current_year;
  
  -- Return zeros if no record exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========== TRIGGER: Auto-create trial for new users ==========

CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create trial subscription for new user
  PERFORM create_trial_subscription(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_subscription'
  ) THEN
    CREATE TRIGGER on_auth_user_created_subscription
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();
  END IF;
END;
$$;
