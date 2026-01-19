# Tutorial Lengkap: Setup Telegram Group Bot untuk Finansialku

Panduan lengkap untuk mengaktifkan fitur pencatatan keuangan bersama pasangan melalui grup Telegram.

---

## Daftar Isi
1. [Prasyarat](#prasyarat)
2. [Step 1: Jalankan SQL di Supabase](#step-1-jalankan-sql-di-supabase)
3. [Step 2: Buat Bot Telegram (Skip jika sudah ada)](#step-2-buat-bot-telegram)
4. [Step 3: Import Workflow ke n8n](#step-3-import-workflow-ke-n8n)
5. [Step 4: Konfigurasi Credentials n8n](#step-4-konfigurasi-credentials-n8n)
6. [Step 5: Aktifkan Workflow](#step-5-aktifkan-workflow)
7. [Step 6: Buat Grup dan Invite Bot](#step-6-buat-grup-dan-invite-bot)
8. [Step 7: Link Grup di Web App (Opsional)](#step-7-link-grup-di-web-app)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Prasyarat

Pastikan Anda sudah memiliki:
- ✅ n8n sudah terinstall dan berjalan (lokal atau cloud)
- ✅ OpenAI API Key
- ✅ Sync Server berjalan di `http://localhost:3001`
- ✅ Akun Supabase dengan database Finansialku

---

## Step 1: Jalankan SQL di Supabase

1. Buka **Supabase Dashboard** > **SQL Editor**
2. Klik **New Query**
3. Copy-paste isi file `supabase/telegram_group_link.sql`:

```sql
-- Link grup Telegram ke akun user
CREATE TABLE IF NOT EXISTS telegram_group_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  telegram_group_id TEXT NOT NULL UNIQUE,
  group_name TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE telegram_group_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own group links
CREATE POLICY "Users can CRUD own telegram group links" ON telegram_group_links
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Service role can read for matching
CREATE POLICY "Service role can read all telegram group links" ON telegram_group_links
  FOR SELECT USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_telegram_group_links_group_id 
  ON telegram_group_links(telegram_group_id);
```

4. Klik **Run** (tombol hijau)
5. Pastikan output: `Success. No rows returned`

---

## Step 2: Buat Bot Telegram

> ⏩ **Skip step ini jika Anda sudah punya bot @FinanzaidBot**

1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Ikuti instruksi:
   - Masukkan nama bot: `FinansialKu Bot`
   - Masukkan username: `finansialku_bot` (harus unik)
4. **Simpan Bot Token** yang diberikan (format: `123456789:ABCdefGHI...`)

### Aktifkan Group Privacy

Agar bot bisa membaca pesan di grup:
1. Kirim `/mybots` ke @BotFather
2. Pilih bot Anda
3. Klik **Bot Settings** > **Group Privacy** 
4. Klik **Turn off**

---

## Step 3: Import Workflow ke n8n

1. Buka n8n di browser: `http://localhost:5678`
2. Klik **⊕** (New Workflow) atau buka workflow baru
3. Klik **⋮** (menu) di pojok kanan atas
4. Pilih **Import from File**
5. Pilih file: `n8n/finansialku_telegram_group.json`
6. Workflow akan muncul seperti ini:

```
[Telegram Trigger] → [OpenAI] → [Parse JSON] → [IF Success] → [HTTP Request] → [Reply Sukses]
                                                     ↓
                                              [Reply Error]
```

---

## Step 4: Konfigurasi Credentials n8n

### 4.1 Telegram API Credential

1. Klik node **Telegram Trigger**
2. Di panel kanan, klik **Credential to connect with**
3. Klik **Create New**
4. Masukkan:
   - **Credential Name**: `Telegram Bot`
   - **Access Token**: Paste Bot Token dari BotFather
5. Klik **Save**

### 4.2 OpenAI API Credential

1. Klik node **OpenAI**
2. Di panel kanan, klik **Credential to connect with**
3. Klik **Create New** 
4. Masukkan:
   - **Credential Name**: `OpenAI API`
   - **API Key**: Paste OpenAI API Key Anda
5. Klik **Save**

### 4.3 Update URL Sync Server (Jika Perlu)

1. Klik node **HTTP Request**
2. Di panel kanan, periksa **URL**:
   - Lokal: `http://localhost:3001/api/transaction`
   - Production: Ganti dengan URL server Anda

---

## Step 5: Aktifkan Workflow

1. Klik toggle **Active/Inactive** di pojok kanan atas
2. Status berubah menjadi **Active** (hijau)
3. Workflow sekarang mendengarkan pesan Telegram

> ⚠️ **Penting**: Jangan tutup tab n8n atau matikan komputer jika menggunakan n8n lokal!

---

## Step 6: Buat Grup dan Invite Bot

### 6.1 Buat Grup Telegram

1. Buka Telegram
2. Klik **Menu** (☰) > **New Group**
3. Tambahkan pasangan Anda sebagai member
4. Beri nama grup: `Keuangan Bersama` (atau nama lain)
5. Klik **Create**

### 6.2 Invite Bot ke Grup

1. Buka grup yang baru dibuat
2. Klik nama grup (di atas) > **Add Members**
3. Cari username bot Anda (contoh: `@finansialku_bot`)
4. Tambahkan bot ke grup

### 6.3 Test Kirim Pesan

Kirim pesan di grup:
```
Makan siang 50rb
```

Bot akan membalas:
```
✅ Tercatat oleh [Nama Anda]!

💸 Pengeluaran
💵 Rp 50.000
📁 food
📝 Makan siang
```

---

## Step 7: Link Grup di Web App (Opsional)

Untuk fitur manajemen grup di web app:

1. Buka Finansialku di browser
2. Login dengan akun Anda
3. Klik **⚙️ Settings** > Tab **Grup Telegram**
4. Dapatkan ID Grup:
   - Kirim `/info` di grup (jika bot mendukung)
   - Atau gunakan bot @userinfobot di Telegram
5. Masukkan **ID Grup** (format: `-1001234567890`)
6. Masukkan **Nama Grup** (opsional)
7. Klik **Hubungkan Grup**

---

## Testing

### Test Case 1: Pengeluaran
```
Input: "Kopi 25rb"
Output: ✅ Tercatat oleh [nama]! 💸 Rp 25.000 📁 food
```

### Test Case 2: Pemasukan
```
Input: "Gaji bulan ini 5jt"
Output: ✅ Tercatat oleh [nama]! 💰 Rp 5.000.000 📁 salary
```

### Test Case 3: Multi-user
```
User A kirim: "Bensin 100rb"
User B kirim: "Belanja bulanan 500rb"
→ Kedua transaksi muncul di web app dengan badge nama masing-masing
```

---

## Troubleshooting

### Bot tidak merespon di grup

| Kemungkinan Penyebab | Solusi |
|---------------------|--------|
| Bot belum di-invite ke grup | Tambahkan bot ke grup |
| Group Privacy aktif | Matikan via @BotFather > Bot Settings > Group Privacy |
| Workflow tidak aktif | Aktifkan di n8n (toggle hijau) |
| n8n tidak berjalan | Jalankan n8n |

### Error "Failed to parse JSON"

- Pastikan format pesan natural: `Makan 50rb`, bukan `{"type":"expense"}`
- OpenAI mungkin gagal parse, coba lagi

### Transaksi tidak muncul di web app

1. Cek sync server berjalan: `http://localhost:3001/api/health`
2. Cek response dari HTTP Request node di n8n
3. Pastikan Anda login dengan akun yang sama

### Credential error di n8n

1. Re-check Bot Token dari @BotFather
2. Re-check OpenAI API Key
3. Pastikan credential sudah di-assign ke node

---

## Ringkasan Alur

```
👥 Grup Telegram
     │
     ▼ (kirim pesan)
🤖 Bot menerima
     │
     ▼
🔄 n8n Workflow
     │ 
     ├─ OpenAI parse pesan
     ├─ Ekstrak: type, amount, category
     ├─ Tambah: isGroup, senderName
     │
     ▼
💻 Sync Server
     │
     ▼
🌐 Web App (poll transaksi)
```

---

**Selesai!** 🎉 Sekarang Anda dan pasangan bisa mencatat keuangan bersama via grup Telegram.
