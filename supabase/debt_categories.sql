-- Menambahkan Kategori Khusus untuk Manajemen Hutang Piutang
-- Menggunakan UUID eksplisit untuk menghindari error "invalid input syntax for type uuid"

-- 1. Kategori Pemasukan: Dapat Pinjaman
INSERT INTO categories (id, name, type, icon, color, is_default)
VALUES 
('93498308-b119-4537-b648-52541334863a', 'Dapat Pinjaman', 'income', '💰', '#10b981', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Kategori Pengeluaran: Bayar Hutang
INSERT INTO categories (id, name, type, icon, color, is_default)
VALUES 
('17799564-901d-4861-9cc4-773411030245', 'Bayar Hutang', 'expense', '💸', '#ef4444', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Kategori Pengeluaran: Beri Pinjaman
INSERT INTO categories (id, name, type, icon, color, is_default)
VALUES 
('e23058a5-d858-450f-aae6-553b6fa72d32', 'Beri Pinjaman', 'expense', '🤝', '#f59e0b', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Kategori Pemasukan: Terima Piutang
INSERT INTO categories (id, name, type, icon, color, is_default)
VALUES 
('f7380907-7469-424f-a2e6-c146d9d13e00', 'Terima Piutang', 'income', '📥', '#3b82f6', true)
ON CONFLICT (id) DO NOTHING;
