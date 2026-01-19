# Panduan Setup Telegram Group Bot

Panduan ini menjelaskan cara menggunakan fitur pencatatan bersama pasangan melalui grup Telegram.

## Prasyarat
- Bot Telegram sudah dibuat dan dikonfigurasi
- n8n sudah terinstall dan berjalan
- Sync Server sudah berjalan di `http://localhost:3001`

## Langkah 1: Import Workflow Baru

1. Buka n8n di browser (`http://localhost:5678`)
2. Klik **Import from File**
3. Pilih file: `finansialku_telegram_group.json`
4. Pastikan credentials Telegram dan OpenAI sudah dikonfigurasi

## Langkah 2: Buat Grup Telegram

1. Buka Telegram
2. Buat grup baru dengan pasangan Anda
3. Beri nama grup (misal: "Keuangan Kita")
4. Invite bot ke dalam grup

## Langkah 3: Jalankan SQL di Supabase

Jalankan file `supabase/telegram_group_link.sql` di Supabase SQL Editor untuk membuat tabel `telegram_group_links`.

```sql
-- Jalankan ini di Supabase SQL Editor
-- (isi file ada di telegram_group_link.sql)
```

## Langkah 4: (Opsional) Link Grup ke Akun

Untuk fitur lanjutan, link grup Telegram ke akun user melalui web app:
1. Login ke Finansialku
2. Buka Pengaturan > Telegram Group
3. Klik "Link Grup" dan masukkan ID grup

Untuk sementara, fitur shared account bisa langsung digunakan karena pasangan login dengan akun yang sama.

## Cara Penggunaan

### Mencatat Transaksi
Kirim pesan di grup dalam format natural:
- `Makan siang 50rb`
- `Bensin motor 100ribu`
- `Gaji bulan ini 5jt` (otomatis income)
- `Belanja bulanan 500rb`

### Contoh Response Bot
```
✅ Tercatat oleh Amir!

💸 Pengeluaran
💵 Rp 50.000
📁 food
📝 Makan siang
```

### Info Yang Disimpan
- **isGroup**: true (menandakan dari grup)
- **groupName**: Nama grup Telegram
- **senderId**: ID Telegram pengirim
- **senderName**: Nama pengirim

## Troubleshooting

### Bot tidak merespon di grup
1. Pastikan bot sudah di-invite ke grup
2. Pastikan n8n workflow sudah aktif
3. Cek log n8n untuk error

### Transaksi tidak muncul di web app
1. Pastikan sync server berjalan
2. Pastikan grup sudah ter-link ke akun (untuk fitur lanjutan)
3. Untuk shared account, berdua harus login dengan akun yang sama

## Perbedaan dengan Private Chat

| Fitur | Private Chat | Group Chat |
|-------|-------------|------------|
| isGroup | false | true |
| groupName | null | "Nama Grup" |
| senderName | null | "Nama Pengirim" |
| Response bot | ✅ Tercatat! | ✅ Tercatat oleh [Nama]! |
