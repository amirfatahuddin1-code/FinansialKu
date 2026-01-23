-- =====================================================
-- TEST FEATURE GATING: Simulate Expired Subscription
-- =====================================================
-- Run this SQL in Supabase SQL Editor to test feature gating

-- Replace 'USER_ID_HERE' with the actual user UUID from auth.users
-- You can find user IDs in Supabase Dashboard -> Authentication -> Users

-- =====================================================
-- STEP 1: Get your User ID
-- =====================================================
-- Run this query first to find your user ID:
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- =====================================================
-- STEP 2: Create an EXPIRED subscription for testing
-- =====================================================
-- Copy & modify this query with your user ID:

-- First, mark all existing subscriptions as expired
UPDATE subscriptions 
SET status = 'expired', updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID_HERE';  -- Replace with actual UUID

-- Option A: Set expiry date to yesterday (to make it expired)
UPDATE subscriptions 
SET expires_at = NOW() - INTERVAL '1 day'
WHERE user_id = 'YOUR_USER_ID_HERE';  -- Replace with actual UUID

-- =====================================================
-- STEP 3: Verify the subscription is expired
-- =====================================================
SELECT 
    s.id,
    s.user_id,
    s.plan_id,
    s.status,
    s.expires_at,
    CASE WHEN s.expires_at < NOW() THEN 'EXPIRED' ELSE 'ACTIVE' END as actual_status
FROM subscriptions s
WHERE s.user_id = 'YOUR_USER_ID_HERE';  -- Replace with actual UUID

-- =====================================================
-- STEP 4: Restore subscription (when done testing)
-- =====================================================
-- To restore, run this:
UPDATE subscriptions 
SET 
    status = 'active',
    expires_at = NOW() + INTERVAL '30 days',
    updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID_HERE';  -- Replace with actual UUID

-- =====================================================
-- ALTERNATIVE: Create a new test user with NO subscription
-- =====================================================
-- Register a new user in the app
-- The trigger should auto-create a 3-day trial
-- Wait 3 days OR manually expire it using Step 2 above
