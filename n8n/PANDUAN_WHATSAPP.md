# Panduan Setup WhatsApp Integration (Fonnte) - Complete

Panduan lengkap untuk menghubungkan WhatsApp ke FinansialKu menggunakan n8n dan Fonnte.

## Arsitektur

```
WhatsApp → Fonnte → n8n Webhook → AI Processing → Supabase → Fonnte → WhatsApp
```

### Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Fonnte Webhook                                 │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                        ┌─────▼─────┐
                        │  Switch   │
                        └─────┬─────┘
            ┌─────────────────┼─────────────────┬─────────────┬─────────┐
            │                 │                 │             │         │
    ┌───────▼───────┐  ┌──────▼──────┐  ┌──────▼──────┐ ┌────▼────┐ ┌──▼──┐
    │ Upload Struk  │  │   Laporan   │  │    Help     │ │  Info   │ │Link │
    │   (Groq)      │  │ (DeepSeek)  │  │             │ │         │ │     │
    └───────┬───────┘  └──────┬──────┘  └──────┬──────┘ └────┬────┘ └──┬──┘
            │                 │                 │             │         │
            │          ┌──────▼──────┐         │             │         │
            │          │  AI Agent   │         │             │         │
            │          │  DeepSeek   │         │             │         │
            │          └──────┬──────┘         │             │         │
            │                 │                 │             │         │
    ┌───────▼───────┐  ┌──────▼──────┐         │             │         │
    │Groq Vision API│  │   Format    │         │             │         │
    └───────┬───────┘  │   Report    │         │             │         │
            │          └──────┬──────┘         │             │         │
    ┌───────▼───────┐         │                │             │         │
    │ Parse Receipt │         │                │             │         │
    └───────┬───────┘         │                │             │         │
            │                 │                │             │         │
            ▼                 ▼                ▼             ▼         ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                         Send via Fonnte API                          │
    └─────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────┐
    │                      Input Data Manual (Default)                     │
    └─────────────────────────────┬───────────────────────────────────────┘
                                  │
                          ┌───────▼───────┐
                          │  AI Agent     │
                          │  (DeepSeek)   │
                          └───────┬───────┘
                                  │
                          ┌───────▼───────┐
                          │ Validate &    │
                          │   Enrich      │
                          └───────┬───────┘
                                  │
                          ┌───────▼───────┐
                          │Save to Server │
                          └───────┬───────┘
                                  │
                          ┌───────▼───────┐
                          │ Reply Success │
                          └───────────────┘
```

## Fitur

| Fitur | AI Provider | Deskripsi |
|-------|-------------|-----------|
| 📸 Upload Struk | **Groq Vision** | Scan foto struk, ekstrak semua item |
| 💬 Input Manual | **DeepSeek** | Parse pesan teks seperti "Makan 50rb" |
| 📊 Laporan | **DeepSeek** | Generate laporan keuangan |
| ❓ /help | - | Tampilkan panduan penggunaan |
| ℹ️ /info | - | Info grup/akun dan Group ID |
| 🔗 /link | - | Hubungkan dengan akun FinansialKu |

## Prasyarat

1. **Akun Fonnte** - Daftar di [fonnte.com](https://fonnte.com)
2. **Device WhatsApp terkoneksi** di Fonnte
3. **n8n instance** yang berjalan (self-hosted atau cloud)
4. **Akun Groq** - Untuk AI vision (gratis di [groq.com](https://groq.com))
5. **Akun DeepSeek** - Untuk AI text (di [deepseek.com](https://deepseek.com))

## Langkah Setup

### 1. Setup Database (Supabase)

Jalankan SQL script di Supabase SQL Editor:

```sql
-- File: supabase/whatsapp_schema.sql
-- Copy dan jalankan isi file tersebut di SQL Editor
```

### 2. Deploy Edge Function (Supabase)

```bash
# Dari folder project
supabase functions deploy whatsapp-webhook
```

### 3. Import Workflow ke n8n

1. Buka n8n
2. Klik **Import Workflow**
3. Pilih file `n8n/finansialku_whatsapp_complete.json`
4. Klik **Import**

### 4. Setup Credentials di n8n

Buka **Settings > Credentials** dan buat:

#### A. HTTP Header Auth - Fonnte API
- Name: `Fonnte API`
- Header Name: `Authorization`
- Header Value: `YOUR_FONNTE_API_TOKEN`

#### B. HTTP Header Auth - Groq API
- Name: `Groq API`
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_GROQ_API_KEY`

#### C. HTTP Header Auth - Supabase Auth
- Name: `Supabase Auth`
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_SUPABASE_SERVICE_KEY`

#### D. DeepSeek API
- Name: `DeepSeek account`
- API Key: `YOUR_DEEPSEEK_API_KEY`

### 5. Konfigurasi Environment Variables di n8n

Buka **Settings > Environment Variables** dan tambahkan:

| Variable | Nilai | Deskripsi |
|----------|-------|-----------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | URL project Supabase |

### 6. Update Credential di Nodes

Setelah import, update credential references di setiap node:

1. Klik setiap node yang berwarna merah/warning
2. Pilih credential yang sudah dibuat
3. Save

### 7. Aktifkan Workflow

1. Klik toggle **Active** pada workflow
2. Copy **Webhook URL** dari node "Fonnte Webhook"
   - Format: `https://your-n8n.com/webhook/whatsapp-fonnte`

### 8. Konfigurasi Webhook di Fonnte

1. Login ke [my.fonnte.com](https://my.fonnte.com)
2. Pilih device Anda
3. Masuk ke menu **Webhook**
4. Paste URL webhook n8n di field **Webhook URL**
5. Klik **Save**

## Cara Penggunaan

### Menghubungkan Nomor WhatsApp

Di aplikasi FinansialKu:
1. Buka **Settings > WhatsApp**
2. Masukkan nomor WhatsApp Anda
3. Klik **Hubungkan**

### Commands yang Tersedia

| Command | Deskripsi |
|---------|-----------|
| `/help` | Tampilkan panduan |
| `/info` | Info akun dan Group ID |
| `/laporan` | Laporan bulan ini |
| `/laporan minggu` | Laporan minggu ini |
| `/link KODE` | Hubungkan dengan akun |

### Format Pesan Transaksi

Kirim pesan dengan format sederhana:

**Pengeluaran:**
- `makan 50rb`
- `grab 25000`
- `belanja 150k`
- `bayar listrik 500ribu`

**Pemasukan:**
- `gaji 5jt`
- `bonus 500rb`
- `terima transfer 1000000`

### Upload Struk

Kirim foto struk dan bot akan otomatis:
1. Mendeteksi toko dan tanggal
2. Mengekstrak semua item
3. Mengkategorikan setiap item
4. Menyimpan ke database

## Troubleshooting

### Pesan tidak dibalas
- Pastikan webhook Fonnte sudah dikonfigurasi
- Cek log n8n untuk error
- Pastikan device Fonnte online

### Error "Not authenticated"
- Pastikan nomor WA sudah dihubungkan di Settings
- Atau grup sudah ditambahkan

### Struk tidak terbaca
- Pastikan foto jelas dan tidak blur
- Struk harus lengkap terlihat
- Coba foto dengan pencahayaan lebih baik

### AI tidak memahami pesan
- Gunakan format yang lebih jelas
- Contoh: "Makan siang 50rb" bukan "makan"
- Sertakan nominal dengan jelas

## API Endpoints

### Supabase Edge Function

```
POST /functions/v1/whatsapp-webhook
```

Body:
```json
{
  "sender": "628123456789",
  "senderName": "John",
  "groupId": "optional",
  "type": "expense",
  "amount": 50000,
  "category": "food",
  "description": "Makan siang"
}
```

### Fonnte API

```
POST https://api.fonnte.com/send
Headers: Authorization: YOUR_TOKEN

Body (form-urlencoded):
- target: 628123456789
- message: Pesan balasan
```
