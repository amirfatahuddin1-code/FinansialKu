# Panduan: Setup Per-Item Receipt Parsing di n8n

## Endpoint Baru di Server

```
POST /api/transactions/batch
```

Body:
```json
{
  "store": "LARIS MAJU MART",
  "date": "2026-01-12",
  "chatId": 5252510664,
  "transactions": [
    {"name": "Beng-beng", "price": 15000, "category": "food"},
    {"name": "Susu Diamond", "price": 12500, "category": "food"},
    {"name": "Panadol", "price": 8000, "category": "health"}
  ]
}
```

---

## Update Prompt Gemini

Di node **"Analisa Gambar"**, ganti prompt menjadi:

```
Analisis foto struk/receipt belanja ini.

Ekstrak SETIAP ITEM dengan kategori yang sesuai.

Kembalikan HANYA JSON (tanpa markdown, tanpa penjelasan tambahan):
{
  "store": "nama toko",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "nama item", "price": harga_angka, "category": "kategori"}
  ]
}

KATEGORI YANG TERSEDIA:
- food: makanan, minuman, snack, susu, roti, mie, beras
- health: obat, vitamin, masker medis, tissue
- shopping: sabun, shampoo, deterjen, sikat gigi, alat rumah
- bills: pulsa, token listrik
- transport: bensin, parkir
- entertainment: game, streaming
- education: buku, alat tulis
- other: lainnya yang tidak masuk kategori di atas

PENTING:
- Harga dalam angka saja (contoh: 15000, bukan "Rp 15.000")
- Tanggal format YYYY-MM-DD
- Jika tidak terbaca, gunakan: {"error": "tidak bisa dibaca"}
```

---

## Update Node Code (Parse Receipt)

Ganti kode di node Code menjadi:

```javascript
// Parse items dari Gemini response
const r = $input.first().json;
let t = '';

// Ambil text dari struktur Gemini
if (r.candidates && r.candidates[0]) {
  t = r.candidates[0].content?.parts?.[0]?.text || '';
} else if (r.text) {
  t = r.text;
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
      return { json: { ok: false, error: p.error } };
    }
    
    const date = p.date || new Date().toISOString().split('T')[0];
    const store = p.store || 'Toko';
    
    // Format untuk batch endpoint
    const items = (p.items || []).map(item => ({
      name: item.name,
      price: parseInt(item.price) || 0,
      category: item.category || 'other'
    })).filter(item => item.price > 0);
    
    // Buat item list untuk reply Telegram
    let itemList = '';
    let total = 0;
    items.forEach(item => {
      itemList += `• ${item.name}: Rp ${item.price.toLocaleString('id-ID')} [${item.category}]\n`;
      total += item.price;
    });
    
    return {
      json: {
        store: store,
        date: date,
        chatId: chatId,
        transactions: items,
        itemList: itemList,
        total: total,
        itemCount: items.length,
        ok: items.length > 0
      }
    };
  }
} catch(e) {
  return { json: { ok: false, error: e.message } };
}

return { json: { ok: false, error: 'No items found' } };
```

---

## Update Node HTTP Request

Ubah konfigurasi:

1. **URL**: `YOUR_NGROK_URL/api/transactions/batch`
2. **Method**: POST
3. **Body Content Type**: JSON
4. **JSON Body**:

```json
{
  "store": "{{ $json.store }}",
  "date": "{{ $json.date }}",
  "chatId": {{ $json.chatId }},
  "transactions": {{ JSON.stringify($json.transactions) }}
}
```

---

## Update Reply Telegram

Ubah text menjadi:

```
🧾 Struk tercatat!

🏪 {{ $('Parse Receipt').first().json.store }}
📅 {{ $('Parse Receipt').first().json.date }}

📦 {{ $('Parse Receipt').first().json.itemCount }} item:
{{ $('Parse Receipt').first().json.itemList }}
💵 Total: Rp {{ $('Parse Receipt').first().json.total.toLocaleString('id-ID') }}
```

---

## Hasil Akhir

Dari 1 struk, akan muncul beberapa transaksi di FinansialKu:

| Item | Kategori | Jumlah |
|------|----------|--------|
| Beng-beng Share | food | Rp 16.000 |
| Susu Diamond | food | Rp 12.500 |
| Skuy Bakery | food | Rp 10.000 |
| Panadol | health | Rp 8.000 |

Setiap item tercatat terpisah dengan kategori yang sesuai!
