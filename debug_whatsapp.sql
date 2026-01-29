-- Cek Link WhatsApp
SELECT * FROM whatsapp_user_links;

-- Cek 5 Transaksi Terakhir dari WhatsApp
SELECT * FROM transactions 
WHERE source = 'whatsapp' OR source = 'whatsapp-receipt'
ORDER BY created_at DESC 
LIMIT 5;
