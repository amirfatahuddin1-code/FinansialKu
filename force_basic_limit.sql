-- ============================================================
-- SCRIPT FORCE STOP TRIAL & SIMULATE LIMIT (300)
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
    v_user_email TEXT := 'amirfatahuddin@gmail.com'; -- PASTIKAN EMAIL INI BENAR
    v_user_id UUID;
    v_current_month INTEGER;
    v_current_year INTEGER;
BEGIN
    v_current_month := EXTRACT(MONTH FROM NOW());
    v_current_year := EXTRACT(YEAR FROM NOW());

    -- 1. Cari User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User dengan email % tidak ditemukan', v_user_email;
    END IF;

    -- 2. UBAH SUBSCRIPTION KE BASIC (HAPUS SIFAT TRIAL)
    -- Kita update semua subscription aktif/trial menjadi Basic Active
    UPDATE subscriptions
    SET 
        plan_id = 'basic',
        status = 'active', -- Pastikan status active, BUKAN trial
        expires_at = NOW() + INTERVAL '30 days'
    WHERE user_id = v_user_id 
      AND status IN ('trial', 'active');

    -- Jika tidak ada subscription, buat baru
    IF NOT FOUND THEN
        INSERT INTO subscriptions (user_id, plan_id, status, starts_at, expires_at)
        VALUES (v_user_id, 'basic', 'active', NOW(), NOW() + INTERVAL '30 days');
    END IF;

    -- 3. SET USAGE KE 300
    INSERT INTO messaging_usage (user_id, month, year, wa_count, telegram_count)
    VALUES (v_user_id, v_current_month, v_current_year, 300, 0)
    ON CONFLICT (user_id, month, year) DO UPDATE 
    SET wa_count = 300; 
    -- Total count = wa_count + telegram_count. 
    -- Jika telegram_count ada isinya, total akan > 300, yang juga akan kena limit.

    RAISE NOTICE 'Sukses! Akun % sekarang di-set ke PLAN BASIC (Active) dengan 300 Transaksi.', v_user_email;
END $$;
