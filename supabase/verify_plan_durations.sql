-- Verify and Fix Subscription Plan Durations
-- Run this in Supabase SQL Editor if users report incorrect durations

-- 1. Check current plans
SELECT id, name, price, duration_days FROM subscription_plans;

-- 2. Ensure standard durations are correct
UPDATE subscription_plans 
SET name = 'Basic', duration_days = 30 
WHERE id = 'basic';

UPDATE subscription_plans 
SET name = 'Pro', duration_days = 30 
WHERE id = 'pro';

UPDATE subscription_plans 
SET name = 'Basic (3 Bulan)', duration_days = 90 
WHERE id = 'basic_3m';

UPDATE subscription_plans 
SET name = 'Pro (3 Bulan)', duration_days = 90 
WHERE id = 'pro_3m';

UPDATE subscription_plans 
SET name = 'Basic (1 Tahun)', duration_days = 365 
WHERE id = 'basic_1y';

UPDATE subscription_plans 
SET name = 'Pro (1 Tahun)', duration_days = 365 
WHERE id = 'pro_1y';

-- 3. Verify changes
SELECT id, name, price, duration_days FROM subscription_plans;
