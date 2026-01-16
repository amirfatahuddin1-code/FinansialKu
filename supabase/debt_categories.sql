-- Menambahkan Kategori Khusus untuk Manajemen Hutang Piutang

-- 1. Kategori Pemasukan: Dapat Pinjaman (Saat kita berhutang)
INSERT INTO categories (id, name, type, icon, color, is_default)
VALUES 
('income_debt', 'Dapat Pinjaman', 'income', '💰', '#10b981', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Kategori Pengeluaran: Bayar Hutang (Saat kita melunasi hutang)
INSERT INTO categories (id, name, type, icon, color, is_default)
VALUES 
('expense_pay_debt', 'Bayar Hutang', 'expense', '💸', '#ef4444', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Kategori Pengeluaran: Beri Pinjaman (Saat kita memberi piutang)
INSERT INTO categories (id, name, type, icon, color, is_default)
VALUES 
('expense_loan', 'Beri Pinjaman', 'expense', '🤝', '#f59e0b', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Kategori Pemasukan: Terima Piutang (Saat orang membayar hutang ke kita)
INSERT INTO categories (id, name, type, icon, color, is_default)
VALUES 
('income_collect_debt', 'Terima Piutang', 'income', '📥', '#3b82f6', true)
ON CONFLICT (id) DO NOTHING;
