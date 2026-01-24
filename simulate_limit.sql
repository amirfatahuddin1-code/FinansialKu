-- ==========================================
-- SCRIPT SIMULASI LIMIT TRANSAKSI (300)
-- Jalankan script ini di Supabase SQL Editor
-- ==========================================

-- Ganti 'email_anda@contoh.com' dengan email yang Anda gunakan untuk login di aplikasi
DO $$
DECLARE
    v_user_email TEXT := 'amirfatahuddin@gmail.com'; -- GANTI EMAIL INI JIKA PERLU
    v_user_id UUID;
    v_current_month INTEGER;
    v_current_year INTEGER;
BEGIN
    v_current_month := EXTRACT(MONTH FROM NOW());
    v_current_year := EXTRACT(YEAR FROM NOW());

    -- 1. Cari User ID berdasarkan Email
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User dengan email % tidak ditemukan', v_user_email;
    END IF;

    -- 2. Update atau Insert Usage menjadi 300
    INSERT INTO messaging_usage (user_id, month, year, wa_count, telegram_count)
    VALUES (v_user_id, v_current_month, v_current_year, 300, 0)
    ON CONFLICT (user_id, month, year) DO UPDATE 
    SET wa_count = 300;

    RAISE NOTICE 'Sukses! Kuota WA untuk % telah diubah menjadi 300.', v_user_email;
END $$;
