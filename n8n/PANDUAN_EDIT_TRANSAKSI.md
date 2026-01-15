# Panduan: Edit Transaksi via Telegram

## Endpoint Baru di Server

### 1. GET /api/transactions/last
Ambil transaksi terakhir untuk diedit:
```
GET /api/transactions/last?count=5&chatId=123456
```

### 2. PATCH /api/transactions/:id
Edit transaksi:
```json
PATCH /api/transactions/abc123
Body: {
  "amount": 50000,
  "date": "2026-01-12",
  "description": "Makan siang",
  "categoryId": "food"
}
```

---

## Cara Kerja Edit via Telegram

1. User kirim: `edit` atau `/edit`
2. Bot tampilkan 5 transaksi terakhir dengan nomor
3. User reply: `1 50000` (edit nomor 1, ubah amount jadi 50000)
4. Bot konfirmasi perubahan

---

## Setup n8n Workflow untuk Edit

### Workflow Baru: "Edit Transaction"

**Node 1: Telegram Trigger**
- Updates: message

**Node 2: IF - Check Edit Command**
Kondisi: `$json.message.text` starts with "edit" atau "/edit"

**Node 3: HTTP Request - Get Last Transactions**
- Method: GET
- URL: `YOUR_NGROK_URL/api/transactions/last?count=5&chatId={{ $json.message.chat.id }}`

**Node 4: Code - Format Transaction List**
```javascript
const transactions = $input.first().json.transactions || [];
const chatId = $('Telegram Trigger').first().json.message.chat.id;

if (transactions.length === 0) {
  return {
    json: {
      chatId: chatId,
      message: '❌ Tidak ada transaksi yang bisa diedit.'
    }
  };
}

let list = '📝 Transaksi terakhir:\n\n';
transactions.forEach((t, i) => {
  list += `${i + 1}. ${t.description}\n`;
  list += `   💵 Rp ${t.amount.toLocaleString('id-ID')} | 📅 ${t.date}\n\n`;
});

list += '---\n';
list += 'Reply format:\n';
list += '• "1 50000" = ubah amount #1 jadi 50rb\n';
list += '• "1 tanggal 2026-01-15" = ubah tanggal\n';
list += '• "1 hapus" = hapus transaksi #1';

return {
  json: {
    chatId: chatId,
    message: list,
    transactions: transactions
  }
};
```

**Node 5: Telegram - Send List**
- Chat ID: `{{ $json.chatId }}`
- Text: `{{ $json.message }}`

---

## Workflow: Handle Edit Reply

Buat workflow kedua untuk handle reply edit.

**Node 1: Telegram Trigger**

**Node 2: Code - Parse Edit Command**
```javascript
const text = $input.first().json.message.text || '';
const chatId = $input.first().json.message.chat.id;

// Parse format: "1 50000" atau "1 tanggal 2026-01-15" atau "1 hapus"
const match = text.match(/^(\d+)\s+(.+)$/);

if (!match) {
  return { json: { valid: false, chatId } };
}

const index = parseInt(match[1]) - 1;
const action = match[2].trim();

let updates = {};

if (action === 'hapus') {
  return { json: { valid: true, chatId, index, action: 'delete' } };
}

if (action.startsWith('tanggal ')) {
  updates.date = action.replace('tanggal ', '');
} else if (action.startsWith('kategori ')) {
  updates.categoryId = action.replace('kategori ', '');
} else if (action.startsWith('deskripsi ')) {
  updates.description = action.replace('deskripsi ', '');
} else {
  // Assume it's amount
  const amount = parseInt(action.replace(/\D/g, ''));
  if (amount > 0) {
    updates.amount = amount;
  }
}

return {
  json: {
    valid: Object.keys(updates).length > 0,
    chatId,
    index,
    action: 'update',
    updates
  }
};
```

**Node 3: HTTP Request - Get Last Transactions**
URL: `YOUR_NGROK_URL/api/transactions/last?count=5&chatId={{ $json.chatId }}`

**Node 4: Code - Get Transaction ID**
```javascript
const transactions = $input.first().json.transactions || [];
const prev = $('Parse Edit Command').first().json;
const index = prev.index;

if (index < 0 || index >= transactions.length) {
  return { json: { valid: false, error: 'Index tidak valid' } };
}

return {
  json: {
    ...prev,
    transactionId: transactions[index].id,
    transaction: transactions[index]
  }
};
```

**Node 5: IF - Is Delete?**
Kondisi: `$json.action` equals "delete"

**Node 6a (Delete): HTTP Request**
- Method: DELETE
- URL: `YOUR_NGROK_URL/api/transactions/{{ $json.transactionId }}`

**Node 6b (Update): HTTP Request**
- Method: PATCH
- URL: `YOUR_NGROK_URL/api/transactions/{{ $json.transactionId }}`
- Body: `{{ JSON.stringify($json.updates) }}`

**Node 7: Telegram - Confirm**
- Text: `✅ Transaksi berhasil diubah!`

---

## Format Perintah Edit

| Perintah | Contoh | Hasil |
|----------|--------|-------|
| Ubah amount | `1 50000` | Amount #1 → Rp 50.000 |
| Ubah tanggal | `1 tanggal 2026-01-15` | Tanggal #1 → 2026-01-15 |
| Ubah kategori | `1 kategori transport` | Kategori #1 → transport |
| Ubah deskripsi | `1 deskripsi Gojek` | Deskripsi #1 → Gojek |
| Hapus | `1 hapus` | Hapus transaksi #1 |
