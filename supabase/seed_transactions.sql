DO $$
DECLARE
  v_user_id UUID;
  v_expense_cats UUID[];
  v_income_cat UUID;
  v_acc_id UUID;
  v_month_start DATE;
  v_month_end DATE;
  v_date DATE;
  v_cat_id UUID;
  v_amount NUMERIC;
  v_desc TEXT;
  v_num_tx INT;
  v_day INT;
  v_cat_name TEXT;
  v_created INT := 0;
BEGIN
  -- 1. Find user
  SELECT id INTO v_user_id FROM profiles WHERE email = 'karsafinid@gmail.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User karsafinid@gmail.com not found';
  END IF;

  -- 2. Find expense categories
  SELECT ARRAY_AGG(id) INTO v_expense_cats FROM categories
  WHERE type = 'expense' AND (user_id = v_user_id OR is_default = TRUE);
  IF v_expense_cats IS NULL OR array_length(v_expense_cats, 1) = 0 THEN
    RAISE EXCEPTION 'No expense categories found';
  END IF;

  -- 3. Find income category
  SELECT id INTO v_income_cat FROM categories
  WHERE type = 'income' AND (user_id = v_user_id OR is_default = TRUE)
  ORDER BY is_default DESC, name LIMIT 1;
  IF v_income_cat IS NULL THEN
    RAISE EXCEPTION 'No income category found';
  END IF;

  -- 4. Find a default account
  SELECT id INTO v_acc_id FROM financial_accounts
  WHERE (user_id = v_user_id OR is_default = TRUE)
  ORDER BY is_default DESC LIMIT 1;

  -- 5. Loop each month from Jan 2026 to current month
  FOR v_month_start IN
    SELECT generate_series('2026-01-01'::DATE, date_trunc('month', CURRENT_DATE)::DATE, '1 month'::INTERVAL)
  LOOP
    v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::DATE;

    -- === Generate income (1-2 per month) ===
    FOR i IN 1..(1 + floor(random() * 2)::INT) LOOP
      v_day := 1 + floor(random() * 5)::INT;
      v_date := v_month_start + (v_day - 1) * INTERVAL '1 day';
      v_amount := (3 + random() * 5) * 1000000; -- 3-8 jt
      v_desc := CASE floor(random() * 5)::INT
        WHEN 0 THEN 'Gaji bulanan'
        WHEN 1 THEN 'Bonus project'
        WHEN 2 THEN 'Freelance design'
        WHEN 3 THEN 'Komisi penjualan'
        WHEN 4 THEN 'Hasil jual barang'
        ELSE 'Pemasukan'
      END;

      INSERT INTO transactions (user_id, type, amount, description, date, category_id, account_id, source)
      VALUES (v_user_id, 'income', v_amount, v_desc, v_date, v_income_cat, v_acc_id, 'manual');
      v_created := v_created + 1;
    END LOOP;

    -- === Generate expenses (25-40 per month) ===
    v_num_tx := 25 + floor(random() * 16)::INT;
    FOR i IN 1..v_num_tx LOOP
      v_day := 1 + floor(random() * (EXTRACT(DAY FROM v_month_end)::INT))::INT;
      v_date := v_month_start + (v_day - 1) * INTERVAL '1 day';
      v_cat_id := v_expense_cats[1 + floor(random() * array_length(v_expense_cats, 1))::INT];

      -- Get category name for description logic
      SELECT name INTO v_cat_name FROM categories WHERE id = v_cat_id;

      -- Random amount based on category
      v_amount := CASE v_cat_name
        WHEN 'Makanan' THEN (10 + floor(random() * 71)::INT) * 1000      -- 10k-80k
        WHEN 'Transport' THEN (7 + floor(random() * 144)::INT) * 1000    -- 7k-150k
        WHEN 'Tagihan' THEN (50 + floor(random() * 451)::INT) * 1000     -- 50k-500k
        WHEN 'Belanja' THEN (15 + floor(random() * 186)::INT) * 1000     -- 15k-200k
        WHEN 'Hiburan' THEN (25 + floor(random() * 276)::INT) * 1000     -- 25k-300k
        WHEN 'Kesehatan' THEN (15 + floor(random() * 136)::INT) * 1000   -- 15k-150k
        WHEN 'Pendidikan' THEN (50 + floor(random() * 451)::INT) * 1000  -- 50k-500k
        ELSE (10 + floor(random() * 91)::INT) * 1000
      END;

      -- Description based on category
      v_desc := CASE v_cat_name
        WHEN 'Makanan' THEN (ARRAY['Nasi goreng + es teh','Bakso + minum','Makan siang di warteg','Ayam geprek + es jeruk','Sate padang','Seblak + minum','Nasi uduk + telur','Mie ayam + pangsit','Pecel lele + es teh','Sop iga sapi'])[1 + floor(random() * 10)::INT]
        WHEN 'Transport' THEN (ARRAY['Gojek ke kantor','Grab ke stasiun','Bensin motor','Bensin mobil','Parkir','Tol','Angkot','Bis kota','Taxi','KRL commuter'])[1 + floor(random() * 10)::INT]
        WHEN 'Tagihan' THEN (ARRAY['Listrik bulanan','Air PDAM','Internet WiFi','Pulsa','BPJS Kesehatan','Paket data','Telpon rumah','Netflix','Spotify Premium','iCloud storage'])[1 + floor(random() * 10)::INT]
        WHEN 'Belanja' THEN (ARRAY['Indomaret','Alfamart','Superindo','Transmart','Pasar tradisional','Sayur mayur','Sabun & deterjen','Minyak goreng','Beras 5kg','Gula & kopi'])[1 + floor(random() * 10)::INT]
        WHEN 'Hiburan' THEN (ARRAY['Nonton bioskop','Netflix monthly','Game online','Karaoke','Konser musik','Billiard','Swimming','Badminton','Nongkrong di cafe','Live music'])[1 + floor(random() * 10)::INT]
        WHEN 'Kesehatan' THEN (ARRAY['Obat batuk','Dokter umum','Vitamin C','Cek lab','Obat flu','Jamu','Tensi check','Minyak kayu putih','Salep luka','Multivitamin'])[1 + floor(random() * 10)::INT]
        WHEN 'Pendidikan' THEN (ARRAY['Buku','Kursus online','Les bahasa','Seminar','Workshop','Modul belajar','Alat tulis','Biaya ujian','Bootcamp','E-book'])[1 + floor(random() * 10)::INT]
        ELSE 'Pembelian'
      END;

      INSERT INTO transactions (user_id, type, amount, description, date, category_id, account_id, source)
      VALUES (v_user_id, 'expense', v_amount, v_desc, v_date, v_cat_id, v_acc_id, 'manual');
      v_created := v_created + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Done. Created % transactions from Jan 2026 to %', v_created, to_char(CURRENT_DATE, 'Month YYYY');
END $$;
