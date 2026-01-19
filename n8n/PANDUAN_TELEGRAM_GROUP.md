# Tutorial Lengkap: Setup Telegram Group Bot untuk Finansialku

Panduan lengkap untuk mengaktifkan fitur pencatatan keuangan bersama pasangan melalui grup Telegram.

---

## Daftar Isi
1. [Prasyarat](#prasyarat)
2. [Step 1: Setup Database Supabase](#step-1-setup-database-supabase)
3. [Step 2: Deploy Edge Function](#step-2-deploy-edge-function)
4. [Step 3: Buat Bot Telegram](#step-3-buat-bot-telegram)
5. [Step 4: Konfigurasi n8n](#step-4-konfigurasi-n8n)
6. [Step 5: Buat Grup dan Invite Bot](#step-5-buat-grup-dan-invite-bot)
7. [Step 6: Setting di Web App](#step-6-setting-di-web-app)
8. [Fitur Canggih](#fitur-canggih)
9. [Troubleshooting](#troubleshooting)

---

## Prasyarat

Pastikan Anda sudah memiliki:
- ✅ **n8n** (lokal atau cloud)
- ✅ **OpenAI API Key**
- ✅ **Supabase Project** dengan database Finansialku
- ✅ **Supabase CLI** (untuk deploy Edge Function - jika ingin deploy sendiri)

---

## Step 1: Setup Database Supabase

1. Buka **Supabase Dashboard** > **SQL Editor**
2. Klik **New Query**
3. Jalankan script dari file `supabase/telegram_group_link.sql`:
   (Membuat tabel untuk link grup)
4. Jalankan script dari file `supabase/add_sender_name.sql`:
   (Menambahkan kolom sender_name ke tabel transactions)

---

## Step 2: Deploy Edge Function

Fitur ini menggunakan **Supabase Edge Function** (`handle-receipt`) untuk memproses transaksi.

1. Buka terminal di folder project
2. Login ke Supabase CLI: `supabase login`
3. Deploy function:
   ```bash
   supabase functions deploy handle-receipt
   ```
4. Catat URL Function, misal: `https://[PROJECT-REF].supabase.co/functions/v1/handle-receipt`

---

## Step 3: Buat Bot Telegram

1. Chat **@BotFather** di Telegram, kirim `/newbot`
2. Simpan **Bot Token**
3. Matikan **Group Privacy**:
   - `/mybots` > Pilih Bot > **Bot Settings** > **Group Privacy** > **Turn off**
   (Agar bot bisa membaca pesan di grup)

---

## Step 4: Konfigurasi n8n

1. **Import Workflow**: `n8n/finansialku_telegram_group.json`
2. **Setup Credentials**:
   - **Telegram API**: Masukkan Bot Token
   - **OpenAI API**: Masukkan OpenAI Key
3. **Konfigurasi Node "Kirim ke Server" (HTTP Request)**:
   - **Method**: POST
   - **URL**: URL Edge Function dari Step 2
   - **Headers**: 
     - `Authorization`: `Bearer [SUPABASE_ANON_KEY]`
     - `Content-Type`: `application/json`
4. **Update Template Pesan (Node "Reply Sukses")**:
   ```
   ✅ Tercatat!

   {{ $json.type === 'income' ? '💰 Pemasukan' : '💸 Pengeluaran' }}
   💵 Rp {{ parseInt($json.amount).toLocaleString('id-ID') }}
   📁 {{ $json.categoryName }}
   📝 {{ $json.description }}
   ```

---

## Step 5: Buat Grup dan Invite Bot

1. Buat grup Telegram baru (misal: "Keuangan Kita")
2. Invite Pasangan dan Bot
3. Kirim pesan tes: `/info`
   - Bot akan membalas dengan **Group ID** (misal: `-1001234567`)

---

## Step 6: Setting di Web App

1. Buka Web App > **Pengaturan** > **Grup Telegram**
2. Masukkan **Group ID** (dari command `/info`)
3. Klik **Link Group**
4. Selesai! Transaksi dari grup ini sekarang akan masuk ke akun Anda.

---

## Fitur Canggih

### 1. Flexible Category Matching
Anda tidak perlu menghafal keyword kategori. Bot akan otomatis mencocokkan kata-kata dalam pesan dengan **nama kategori di database Anda**.

Contoh:
- Kategori di Database: "Uang Makan", "Transportasi Kantor"
- Pesan: "Grab ke kantor 50rb"
- Bot akan match ke: **Transportasi Kantor**

### 2. Sender Badge
Di Web App, transaksi dari grup akan memiliki badge nama pengirim:
`👤 Amir` atau `👤 Siti`

---

## Troubleshooting

### Bot menampilkan `📂 undefined` atau `📂 Lainnya`
- Pastikan Edge Function sudah di-update dengan versi terbaru yang mengembalikan `categoryName`.
- Di n8n, pastikan field JSON yang digunakan adalah `categoryName`, bukan `categoryId`.

### Transaksi tidak muncul badge pengirim
- Pastikan kolom `sender_name` sudah ada di tabel `transactions` (Step 1).
- Hanya transaksi baru yang akan memiliki badge.
