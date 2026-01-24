-- Check recent transactions for ALL users to see where they are landing
SELECT 
    t.id, 
    t.created_at, 
    t.amount, 
    t.description, 
    t.source, 
    t.user_id,
    u.email
FROM transactions t
LEFT JOIN auth.users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 10;

-- Check RLS Policies on transactions table
SELECT * FROM pg_policies WHERE tablename = 'transactions';
