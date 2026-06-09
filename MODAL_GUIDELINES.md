# Panduan Membuat Modal / Pop-Up di Karsafin

Dokumen ini berisi panduan dan standar wajib (best practices) bagi agen AI atau pengembang saat membuat komponen Modal atau Pop-up baru di proyek Karsafin.

## Masalah Umum
Secara default, jika Anda menempatkan komponen modal di dalam DOM secara inline (tanpa portal), modal tersebut akan terjebak dalam *stacking context* dari elemen induknya. Hal ini menyebabkan modal tidak bisa menutupi elemen-elemen global yang memiliki `z-index` tinggi, seperti:
- Navbar / Header
- Sidebar navigasi utama

## Solusi Wajib: Gunakan `createPortal` dan Z-Index Tinggi

Agar modal atau pop-up selalu berada di lapisan teratas (menutupi seluruh layar termasuk header dan sidebar), Anda **WAJIB** menggunakan `createPortal` dari `react-dom` dan merendernya langsung ke `document.body`.

### Aturan Utama:
1. **Gunakan `createPortal`**: Selalu render modal ke `document.body`.
2. **Z-Index Tinggi**: Berikan class `z-[100]` atau `z-50` (pastikan lebih tinggi dari header/sidebar) pada container `fixed inset-0` dari modal tersebut.
3. **Mounted State**: Karena Next.js menggunakan Server-Side Rendering (SSR), `document.body` tidak tersedia saat *initial render* di server. Gunakan state `mounted` dengan `useEffect` untuk menghindari error hydration.

### Contoh Implementasi Standar:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function CustomModal() {
  const [showModal, setShowModal] = useState(false);
  
  // 1. Tambahkan state mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button onClick={() => setShowModal(true)}>Buka Modal</button>

      {/* 2. Cek mounted & showModal, lalu gunakan createPortal */}
      {mounted && showModal && createPortal(
        <div
          // 3. Gunakan fixed inset-0 dan z-index tinggi (contoh: z-[100])
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()} // Mencegah klik di dalam modal menutup modal
          >
            <h3>Judul Modal</h3>
            <p>Konten modal di sini...</p>
            <button onClick={() => setShowModal(false)}>Tutup</button>
          </div>
        </div>,
        document.body // 4. Render ke document.body
      )}
    </>
  );
}
```

Dengan mengikuti panduan di atas, semua modal yang baru dibuat akan selalu konsisten berada di atas seluruh elemen antarmuka browser.
