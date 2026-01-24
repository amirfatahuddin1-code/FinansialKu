-- Reset usage count to 0 for testing
UPDATE messaging_usage 
SET wa_count = 0, telegram_count = 0 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'amirfatahuddin1@gmail.com'
);

-- Check result
SELECT * FROM messaging_usage 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'amirfatahuddin1@gmail.com'
);
