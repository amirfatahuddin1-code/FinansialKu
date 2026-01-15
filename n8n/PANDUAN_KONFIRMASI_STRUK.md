# Flow Konfirmasi Struk (Bukan Langsung Simpan)

## Konsep Baru

```
User kirim foto struk
    ↓
AI Gemini analisis
    ↓
Bot tampilkan preview:
"🧾 Preview Struk:
🏪 LARIS MAJU MART
📅 2026-01-12

📦 4 item:
• Beng-beng: Rp 15.000 [food]
• Susu: Rp 12.500 [food]

💵 Total: Rp 27.500

Reply 'ya' untuk simpan
Reply 'edit' untuk koreksi"
    ↓
User reply "ya" → Simpan ke server
User reply "edit" → Minta koreksi
```

---

## Node-node yang Diperlukan

### 1. Telegram Trigger
Sama seperti sebelumnya

### 2. Analisa Gambar (Gemini)
Sama seperti sebelumnya

### 3. Parse Receipt (Code)
Update untuk TIDAK langsung kirim ke server, tapi simpan sementara

### 4. Send Preview (Telegram)
Kirim pesan konfirmasi dengan detail transaksi

### 5. Tunggu Reply
Workflow terpisah untuk handle "ya" atau "edit"

---

## Alternatif: Simpan Dulu Sebagai Draft

Lebih mudah: simpan ke server dengan status `draft: true`, lalu:
- Reply "ya" → update jadi `draft: false`
- Reply "edit" → update data lalu confirm

---

## Update Server: Tambah field draft

```javascript
// Di endpoint POST /api/transactions/batch
// Tambah field draft: true secara default
```

---

## Kode Parse Receipt Baru

```javascript
// Parse items dari Gemini - UNTUK PREVIEW (belum disimpan)
const r = $input.first().json;
let t = '';

if (r.candidates && r.candidates[0]) {
  t = r.candidates[0].content?.parts?.[0]?.text || '';
}

let chatId = '';
try { 
  chatId = $('Telegram Trigger').first().json.message.chat.id; 
} catch(e) {}

try {
  const m = t.match(/\{[\s\S]*\}/);
  if (m) {
    const p = JSON.parse(m[0]);
    
    if (p.error) {
      return { json: { ok: false, error: p.error, chatId } };
    }
    
    const date = p.date || new Date().toISOString().split('T')[0];
    const store = p.store || 'Toko';
    
    const items = (p.items || []).map(item => ({
      name: item.name,
      price: parseInt(item.price) || 0,
      category: item.category || 'other'
    })).filter(item => item.price > 0);
    
    let itemList = '';
    let total = 0;
    items.forEach((item, i) => {
      itemList += `${i + 1}. ${item.name}: Rp ${item.price.toLocaleString('id-ID')} [${item.category}]\n`;
      total += item.price;
    });
    
    // Format pesan preview
    let preview = `🧾 *Preview Struk*\n\n`;
    preview += `🏪 *${store}*\n`;
    preview += `📅 ${date}\n\n`;
    preview += `📦 *${items.length} item:*\n`;
    preview += itemList;
    preview += `\n💵 *Total: Rp ${total.toLocaleString('id-ID')}*\n\n`;
    preview += `---\n`;
    preview += `Reply *ya* untuk simpan\n`;
    preview += `Reply *edit [no] [nilai baru]* untuk koreksi\n`;
    preview += `Contoh: \`edit 1 25000\` atau \`edit 2 hapus\``;
    
    return {
      json: {
        store,
        date,
        chatId,
        transactions: items,
        itemList,
        total,
        itemCount: items.length,
        preview,
        ok: items.length > 0
      }
    };
  }
} catch(e) {
  return { json: { ok: false, error: e.message, chatId } };
}

return { json: { ok: false, error: 'No items found', chatId } };
```

---

## Node Send Preview (Telegram)

**Chat ID:** `{{ $json.chatId }}`

**Text:** `{{ $json.preview }}`

**Parse Mode:** Markdown

---

## Workflow Kedua: Handle Confirm/Edit

### Node 1: Telegram Trigger

### Node 2: IF - Check Reply
Kondisi: text starts with "ya" OR text starts with "edit"

### Node 3a: Jika "ya"
- Get pending data dari session/cache
- Kirim ke /api/transactions/batch
- Reply "✅ Tersimpan!"

### Node 3b: Jika "edit"
- Parse: "edit 1 25000"
- Update item yang dimaksud
- Kirim preview ulang

---

## Cara Simpan Data Sementara

Karena n8n workflow stateless, opsi penyimpanan:

1. **Simpan di Server sebagai draft** (Recommended)
2. **Gunakan n8n Static Data**
3. **Encode data di message ID**

Rekomendasi: Simpan draft ke server dengan `confirmed: false`
