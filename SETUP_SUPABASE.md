# 🚀 Tutorial Lengkap Setup Supabase untuk FinansialKu

## Daftar Isi
1. [Buat Akun & Project Supabase](#step-1-buat-akun--project-supabase)
2. [Setup Database Schema](#step-2-setup-database-schema)
3. [Enable Google OAuth](#step-3-enable-google-oauth)
4. [Update Credentials di Kode](#step-4-update-credentials-di-kode)
5. [Test Aplikasi](#step-5-test-aplikasi)
6. [Deploy ke Vercel](#step-6-deploy-ke-vercel)

---

## Step 1: Buat Akun & Project Supabase

### 1.1 Daftar/Login
1. Buka [https://supabase.com](https://supabase.com)
2. Klik **"Start your project"** atau **"Sign In"**
3. Login dengan **GitHub** (paling mudah)

### 1.2 Buat Project Baru
1. Di Dashboard, klik **"New Project"**
2. Pilih Organization (atau buat baru)
3. Isi form:
   - **Name**: `finansialku`
   - **Database Password**: Buat password kuat (SIMPAN INI!)
   - **Region**: `Southeast Asia (Singapore)` ← terdekat dari Indonesia
4. Klik **"Create new project"**
5. Tunggu 1-2 menit sampai project ready

### 1.3 Catat Credentials
Setelah project ready:
1. Buka **Project Settings** (ikon gear di sidebar kiri bawah)
2. Klik **API** di menu
3. Catat 2 nilai ini:
   ```
   Project URL: https://xxxxx.supabase.co
   anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
   ```

---

## Step 2: Setup Database Schema

### 2.1 Buka SQL Editor
1. Di sidebar kiri, klik **SQL Editor**
2. Klik **"New query"**

### 2.2 Copy-Paste Schema
1. Buka file `supabase/schema.sql` di project Anda
2. Copy SELURUH isinya
3. Paste di SQL Editor Supabase
4. Klik **"Run"** (atau Ctrl+Enter)

### 2.3 Verifikasi
Setelah berhasil, di sidebar kiri klik **Table Editor**. Anda harus lihat tabel:
- ✅ profiles
- ✅ categories
- ✅ transactions
- ✅ budgets
- ✅ savings
- ✅ events
- ✅ event_items

> **Troubleshooting**: Jika ada error, pastikan Anda copy seluruh isi file termasuk bagian triggers dan policies.

---

## Step 3: Enable Google OAuth

### 3.1 Setup di Supabase
1. Di sidebar, klik **Authentication**
2. Klik tab **Providers**
3. Cari **Google** dan klik toggle untuk enable
4. Anda akan melihat field untuk:
   - Client ID
   - Client Secret
   
   (Jangan tutup halaman ini, kita akan kembali)

### 3.2 Buat OAuth Credentials di Google Cloud

#### A. Buka Google Cloud Console
1. Buka [https://console.cloud.google.com](https://console.cloud.google.com)
2. Login dengan akun Google Anda

#### B. Buat Project Baru (jika belum ada)
1. Klik dropdown project di header
2. Klik **"New Project"**
3. Beri nama: `FinansialKu`
4. Klik **Create**

#### C. Enable OAuth Consent Screen
1. Di sidebar kiri, buka **APIs & Services** → **OAuth consent screen**
2. Pilih **External** (untuk publik)
3. Klik **Create**
4. Isi form:
   - **App name**: `FinansialKu`
   - **User support email**: Email Anda
   - **Developer contact email**: Email Anda
5. Klik **Save and Continue** sampai selesai

#### D. Buat OAuth Client ID
1. Buka **APIs & Services** → **Credentials**
2. Klik **"+ Create Credentials"** → **OAuth client ID**
3. Pilih **Web application**
4. Beri nama: `FinansialKu Web`
5. Di **Authorized JavaScript origins**, tambahkan:
   ```
   http://localhost:5500
   http://127.0.0.1:5500
   https://your-app-name.vercel.app  (nanti setelah deploy)
   ```
6. Di **Authorized redirect URIs**, tambahkan:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   > Ganti `YOUR_PROJECT_REF` dengan ID project Anda (lihat di URL Supabase)
   
7. Klik **Create**
8. Akan muncul popup dengan **Client ID** dan **Client Secret**. **COPY KEDUANYA!**

### 3.3 Masukkan ke Supabase
1. Kembali ke halaman Supabase → Authentication → Providers → Google
2. Paste:
   - **Client ID**: dari Google Console
   - **Client Secret**: dari Google Console
3. Klik **Save**

---

## Step 4: Update Credentials di Kode

### 4.1 Edit supabase.js
Buka file `supabase.js` dan update baris 3-4:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ANON_KEY_HERE';
```

Ganti dengan nilai dari **Step 1.3**.

### 4.2 Simpan File
Pastikan file tersimpan (Ctrl+S).

---

## Step 5: Test Aplikasi

### 5.1 Jalankan Locally
Anda bisa gunakan Live Server di VS Code atau simple HTTP server:

**Option A: VS Code Live Server**
1. Install extension "Live Server"
2. Klik kanan di `landing.html` → **"Open with Live Server"**

**Option B: Python HTTP Server**
```bash
cd "C:\Users\amirf\OneDrive\Documents\Project App"
python -m http.server 5500
```
Lalu buka http://localhost:5500/landing.html

### 5.2 Test Flow
1. **Landing Page** → Klik "Mulai Sekarang"
2. **Register** → Buat akun baru dengan email
3. **Cek Email** → Klik link verifikasi (jika enabled)
4. **Login** → Masuk dengan akun yang dibuat
5. **Dashboard** → Harus muncul dengan data kosong
6. **Tambah Transaksi** → Test create transaction
7. **Google Login** → Test login dengan Google

---

## Step 6: Deploy ke Vercel

### 6.1 Persiapan
1. Push project ke GitHub:
   ```bash
   cd "C:\Users\amirf\OneDrive\Documents\Project App"
   git init
   git add .
   git commit -m "Initial commit - FinansialKu SaaS"
   git remote add origin https://github.com/USERNAME/finansialku.git
   git push -u origin main
   ```

### 6.2 Deploy via Vercel
1. Buka [https://vercel.com](https://vercel.com)
2. Login dengan GitHub
3. Klik **"Import Project"**
4. Pilih repository `finansialku`
5. Klik **Deploy**
6. Tunggu beberapa menit

### 6.3 Update OAuth URLs
Setelah deploy, Anda akan dapat URL seperti `https://finansialku-xxx.vercel.app`

1. **Di Google Cloud Console**:
   - Tambahkan URL produksi ke **Authorized JavaScript origins**
   - Contoh: `https://finansialku-xxx.vercel.app`

2. **Di Supabase**:
   - Buka **Authentication** → **URL Configuration**
   - Tambahkan URL produksi ke **Redirect URLs**

---

## 📋 Checklist Setup

Pastikan semua item ini sudah dilakukan:

- [ ] Buat project Supabase
- [ ] Catat Project URL dan anon key
- [ ] Jalankan schema.sql di SQL Editor
- [ ] Verifikasi 7 tabel terbuat
- [ ] Enable Google provider
- [ ] Buat OAuth credentials di Google Cloud
- [ ] Masukkan Client ID & Secret ke Supabase
- [ ] Update credentials di supabase.js
- [ ] Test login/register locally
- [ ] Test tambah transaksi
- [ ] Test login dengan Google
- [ ] Deploy ke Vercel
- [ ] Update OAuth URLs untuk production

---

## 🆘 Troubleshooting

### Error: "Invalid API key"
→ Cek ulang SUPABASE_ANON_KEY di supabase.js

### Error: "relation does not exist"
→ Jalankan ulang schema.sql di SQL Editor

### Google Login tidak redirect
→ Cek Authorized redirect URIs di Google Console. Harus match dengan `https://xxx.supabase.co/auth/v1/callback`

### Data tidak muncul
→ Buka browser DevTools (F12) → Console, cek error messages

### RLS Policy error
→ Pastikan user sudah login. RLS mencegah akses tanpa autentikasi.

---

## 📞 Butuh Bantuan?

Jika ada kendala, berikan informasi:
1. Screenshot error (jika ada)
2. Browser DevTools Console log
3. Langkah mana yang bermasalah

Happy deploying! 🚀
