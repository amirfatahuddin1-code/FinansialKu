# Panduan Setup WhatsApp Integration (WAHA)

Panduan ini menggantikan integrasi Fonnte sebelumnya. Kita menggunakan **WAHA (WhatsApp HTTP API)** yang di-host sendiri (VPS Hostinger).

## Arsitektur

```
WhatsApp Mobile <-> WAHA (VPS) <-> Supabase Edge Function <-> Database
```

## Prasyarat

1.  **WAHA Instance**: Terinstall dan berjalan di VPS.
    *   Harus memiliki **Public URL** (misal: `http://1.2.3.4:3000` atau domain `https://waha.example.com`).
    *   Supabase harus bisa mengakses URL ini untuk mengirim balasan.
2.  **Supabase Project**: Project FinansialKu.
3.  **Groq API Key**: Untuk fitur baca struk via AI.

## Langkah Setup

### 1. Konfigurasi Environment Variables (Supabase)

Masuk ke Dashboard Supabase > **Settings** > **Edge Functions**. Tambahkan variable berikut:

| Variable | Deskripsi | Contoh Value |
| :--- | :--- | :--- |
| `WAHA_BASE_URL` | URL publik server WAHA Anda | `http://103.xxx.xxx.xxx:3000` |
| `WAHA_API_KEY` | API Key WAHA (jika diset) | `secret_key_123` |
| `GROQ_API_KEY` | API Key dari Groq Console | `gsk_...` |
| `SUPABASE_URL` | URL Project Supabase | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (secret) | `eyJ...` |

> [!IMPORTANT]
> **WAHA_BASE_URL** tidak boleh `localhost` atau `127.0.0.1` karena Supabase berjalan di cloud. Gunakan IP Public VPS atau Domain.

### 2. Deploy Edge Function

Deploy function `whatsapp-webhook` yang baru:

```bash
supabase functions deploy whatsapp-webhook
```

URL Function akan muncul, misal: `https://xyz.supabase.co/functions/v1/whatsapp-webhook`

### 3. Konfigurasi Webhook di WAHA

Masuk ke Dashboard WAHA (biasanya di port 3000 dashboard) atau via API:

Set webhook URL ke URL Edge Function di atas.

```json
{
  "url": "https://xyz.supabase.co/functions/v1/whatsapp-webhook",
  "events": ["message", "message.created"]
}
```

## Troubleshooting

### Pesan Masuk tapi Tidak Ada Balasan
1.  **Cek WAHA_BASE_URL**: Pastikan URL ini bisa diakses dari internet. Coba buka di browser HP (jika port terbuka).
2.  **Cek Logs Function**: Lihat logs di Supabase Dashboard > Edge Functions > whatsapp-webhook > Logs.
    *   Jika logs kosong: Webhook dari WAHA belum masuk. Cek konfigurasi Webhook di WAHA.
    *   Jika ada logs "Sending reply..." tapi tidak sampai: Cek `WAHA_BASE_URL` lagi.

### Nomor Tidak Terhubung
1.  Pastikan nomor HP di aplikasi FinansialKu sudah benar (format 08... atau 62...).
2.  Gunakan `/id` di WA ke bot untuk melihat ID nomor Anda yang terbaca oleh sistem.
