-- 1. Cek Link Telegram -> Email User
-- Lihat akun Telegram ini terhubung ke email mana
SELECT 
    l.telegram_user_id,
    -- Removed display_name as it might not exist
    u.email as linked_email,
    l.user_id
FROM telegram_user_links l
JOIN auth.users u ON l.user_id = u.id;

-- 2. Cek 10 Transaksi Terakhir (Global)
-- Lihat siapa pemilik sebenarnya dari transaksi "Beli roti" dll
SELECT 
    t.created_at,
    t.description,
    t.amount,
    u.email as owner_email,
    t.source
FROM transactions t
LEFT JOIN auth.users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 10;
