-- ============================================================
-- SCRIPT CEK DATA USER (DEBUGGING) - SELECT VERSION
-- Jalankan script ini di Supabase SQL Editor
-- Hasilnya akan muncul sebagai TABEL di tab 'Results'
-- ============================================================

SELECT
  u.email,
  
  -- Subscription Info
  (SELECT plan_id || ' (' || status || ')' 
   FROM subscriptions 
   WHERE user_id = u.id AND status IN ('active', 'trial') 
   ORDER BY expires_at DESC LIMIT 1) as subscription_status,

  -- Usage Count
  (SELECT COALESCE(wa_count,0) + COALESCE(telegram_count,0)
   FROM messaging_usage 
   WHERE user_id = u.id 
     AND month = EXTRACT(MONTH FROM NOW()) 
     AND year = EXTRACT(YEAR FROM NOW())) as current_usage,

  -- Linked Accounts
  (SELECT phone_number FROM whatsapp_user_links WHERE user_id = u.id LIMIT 1) as wa_number,
  (SELECT telegram_user_id FROM telegram_user_links WHERE user_id = u.id LIMIT 1) as telegram_id,

  -- Recent Transactions (JSON View)
  (SELECT jsonb_agg(jsonb_build_object(
      'desc', description, 
      'amt', amount, 
      'src', source, 
      'date', created_at::date
   ))
   FROM (
     SELECT description, amount, source, created_at
     FROM transactions 
     WHERE user_id = u.id 
     ORDER BY created_at DESC 
     LIMIT 5
   ) t) as last_5_transactions

FROM auth.users u
WHERE u.email = 'amirfatahuddin@gmail.com'; -- Pastikan email ini benar
