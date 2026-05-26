// Supabase Edge Function: telegram-webhook
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WIB_OFFSET = 7 * 60 * 60 * 1000;

function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getWibToday(): string {
    return toLocalDateStr(new Date(Date.now() + WIB_OFFSET));
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const groqApiKey = Deno.env.get('GROQ_API_KEY')
        const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase configuration')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const body = await req.json()
        const message = body.message

        if (!message) {
            return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const telegramUserId = String(message.from.id)
        const telegramUsername = message.from.username || 'User'

        // --- 1. HANDLE COMMANDS ---
        const text = message.text ? message.text.trim() : '';
        // Regex to match /start, /help, /id, /info optionally followed by @botname
        const commandRegex = /^\/(start|help|id|info)(?:@\w+)?$/i;

        if (commandRegex.test(text)) {
            const isGroup = message.chat.type === 'group' || message.chat.type === 'supergroup';
            const matchedCommand = text.match(commandRegex)?.[1]?.toLowerCase();
            let replyText = '';

            if (matchedCommand === 'start' || matchedCommand === 'help') {
                replyText = `Hai! Aku Karsafin AI, temen setia buat urusan duitmu! 😊
Aku bantu catat transaksi, cek pengeluaran, dan pantau budget. Pencatatan terintegrasi dengan aplikasi Karsafin!
📱 Cek aplikasi untuk edit transaksi, atur anggaran, dan lihat laporan lengkap
━━━━━━━━━━━━━━━━━━━━
🔥 FITUR BARU: SCAN STRUK
━━━━━━━━━━━━━━━━━━━━
Ambil foto struk, dan Karsafin akan deteksi transaksi secara otomatis!
Nih, panduan simpel biar kamu langsung jago:
━━━━━━━━━━━━━━━━━━━━
1️⃣ CATAT TRANSAKSI
━━━━━━━━━━━━━━━━━━━━
Cukup ketik apa yang kamu keluarin atau masuk beserta nama akunnya, contohnya:
• makan siang 25rb gopay
• gaji 2jt bca
• tabungan 100k mandiri
• parkir 10rb cash
• bakso 10rb restoran
💡 Tips: Kasih tahu nama akun (contoh: gopay/bca), kategori (contoh: hiburan), atau waktu (contoh: kemarin) biar aku lebih akurat!
━━━━━━━━━━━━━━━━━━━━
2️⃣ CEK UANGMU
━━━━━━━━━━━━━━━━━━━━
Mau lihat totalnya? Tulis aja:
• total pengeluaran
• total pemasukan
• pengeluaran hari ini
• pengeluaran minggu ini
• pengeluaran bulan ini
━━━━━━━━━━━━━━━━━━━━
3️⃣ PANTAU BUDGET
━━━━━━━━━━━━━━━━━━━━
Ketik "sisa anggaran" buat tahu berapa yang masih bisa dipake bulan ini.
━━━━━━━━━━━━━━━━━━━━
📝 CATATAN KECIL
━━━━━━━━━━━━━━━━━━━━
• Tulis santai, aku fleksibel ngikutin gayamu!
• Tambah detail kalo mau hasil maksimal.
Selamat mencatat! 🚀`;
            } else if (isGroup) {
                // Group Context: Group ID
                replyText = `👥 *Info Grup*\n\nID Grup ini:\n\`${message.chat.id}\`\n\nSalin ID ini ke pengaturan aplikasi Karsafin (Menu Telegram > Hubungkan Grup).`
            } else {
                // Private Context: User ID
                replyText = `👋 Halo ${telegramUsername}!\n\nID Telegram Anda:\n\`${telegramUserId}\`\n\nSalin ID ini ke aplikasi Karsafin (Menu Telegram > Hubungkan Manual).`;
            }

            return new Response(JSON.stringify({
                method: 'sendMessage',
                chat_id: message.chat.id,
                text: replyText,
                parse_mode: 'Markdown'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // --- 2. IDENTIFY USER & LINK ---
        let link = null;
        let isGroupChat = message.chat.type === 'group' || message.chat.type === 'supergroup';

        if (isGroupChat) {
            const { data: groupLink } = await supabase.from('telegram_group_links').select('user_id').eq('telegram_group_id', String(message.chat.id)).maybeSingle()
            if (groupLink) link = groupLink;
        }
        if (!link) {
            const { data: userLink } = await supabase.from('telegram_user_links').select('user_id').eq('telegram_user_id', telegramUserId).maybeSingle()
            link = userLink;
        }

        if (!link) {
            // Only reply if it looks like a command or transaction attempt
            if (message.text || message.photo) {
                const idInfo = isGroupChat ? `ID Grup: \`${message.chat.id}\`` : `ID: \`${telegramUserId}\``;
                return new Response(JSON.stringify({
                    method: 'sendMessage',
                    chat_id: message.chat.id,
                    text: `⚠️ Akun belum terhubung.\n\n${idInfo}\nSilakan hubungkan di aplikasi Karsafin.`,
                    parse_mode: 'Markdown'
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
            return new Response('ok', { headers: corsHeaders })
        }

        const userId = link.user_id;

        // Get user's active/first joined workspace
        const { data: workspaceMembers } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', userId)
            .order('joined_at', { ascending: true })
            .limit(1);
        const workspaceId = workspaceMembers && workspaceMembers.length > 0 ? workspaceMembers[0].workspace_id : null;

        // Get all user's financial accounts
        const { data: allAccounts } = await supabase
            .from('financial_accounts')
            .select('id, name, is_default')
            .eq('user_id', userId);

        const defaultAccount = allAccounts?.find(a => a.is_default) || allAccounts?.[0] || null;
        const accountId = defaultAccount ? defaultAccount.id : null;

        // --- 3. FETCH USER DATA (Categories & Subscription) ---
        const { data: categories } = await supabase.from('categories').select('id, name, type').eq('user_id', userId)

        const { data: sub } = await supabase.rpc('get_active_subscription', { p_user_id: userId })
        const subscription = sub && sub.length > 0 ? sub[0] : null
        if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trial')) {
            return new Response(JSON.stringify({ method: 'sendMessage', chat_id: message.chat.id, text: '❌ Langganan tidak aktif.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Helper: Check Usage Limit (Basic Plan: Dynamic Telegram quota)
        if (subscription.plan_id && subscription.plan_id.startsWith('basic') && subscription.status !== 'trial') {
            const { data: profile } = await supabase
                .from('profiles')
                .select('telegram_quota, last_telegram_reset')
                .eq('id', userId)
                .single();

            const todayStr = getWibToday();
            let limit = 20;

            if (profile) {
                limit = profile.telegram_quota ?? 20;
                if (profile.last_telegram_reset !== todayStr) {
                    limit = 20;
                    await supabase
                        .from('profiles')
                        .update({ telegram_quota: 20, last_telegram_reset: todayStr })
                        .eq('id', userId);
                }
            }

            const { data: usage } = await supabase.rpc('get_messaging_usage', { p_user_id: userId })
            const telegramUsage = usage && usage.length > 0 ? usage[0].telegram_count : 0
            if (telegramUsage >= limit) {
                return new Response(JSON.stringify({ 
                    method: 'sendMessage', 
                    chat_id: message.chat.id, 
                    text: `⛔ Batas harian tercapai. Pengguna paket Basic hanya dapat mencatat maksimal ${limit} transaksi per hari lewat Telegram. Silakan upgrade ke Pro atau tonton video di menu Kuota AI untuk menambah kuota!` 
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }

        let transactionsToSave = [];

        // --- 4. HANDLE PHOTO (RECEIPT SCANNING) ---
        if (message.photo && message.photo.length > 0) {
            if (!groqApiKey || !telegramBotToken) {
                // If secrets missing, reply error (optional: keep silent to not spam)
                return new Response(JSON.stringify({ method: 'sendMessage', chat_id: message.chat.id, text: '⚠️ Sistem belum dikonfigurasi (API Key missing).' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            // Get largest photo
            const validPhotos = message.photo.filter((p: any) => p.file_size < 20 * 1024 * 1024); // Limit < 20MB
            const photo = validPhotos[validPhotos.length - 1]; // Largest
            if (!photo) return new Response('ok', { headers: corsHeaders });

            // Get File Path from Telegram
            const fileRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getFile?file_id=${photo.file_id}`);
            const fileData = await fileRes.json();
            if (!fileData.ok) throw new Error('Failed to get file path');

            const imageUrl = `https://api.telegram.org/file/bot${telegramBotToken}/${fileData.result.file_path}`;

            // Send to Groq (Llama Vision)
            const chatCompletion = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text", "text": `Current Date: ${getWibToday()}. Extract transaction data. Return ONLY JSON: {"items": [{"name": "item name", "amount": number}], "total": number, "store": "store name", "date": "YYYY-MM-DD", "category": "Food/Transport/Shopping"}.`
                                },
                                { "type": "image_url", "image_url": { "url": imageUrl } }
                            ]
                        }
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1024,
                    "response_format": { "type": "json_object" }
                })
            });

            const aiRes = await chatCompletion.json();
            if (aiRes.error) {
                console.error('Groq Error:', aiRes.error);
                return new Response(JSON.stringify({ method: 'sendMessage', chat_id: message.chat.id, text: `⚠️ Gagal membaca struk: ${aiRes.error.message}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            const rawContent = aiRes.choices[0].message.content;
            const cleanJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanJson);

            // Process Result
            const storeName = result.store || 'Toko';

            // Validate Date (YYYY-MM-DD)
            let txDate = getWibToday(); // Default to today (WIB)
            if (result.date && /^\d{4}-\d{2}-\d{2}$/.test(result.date)) {
                txDate = result.date;
            }

            const senderName = [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || telegramUserId;

            // Map generic category from AI to User's Category ID
            const aiCategory = result.category || 'Belanja';
            const mappedCategory = findCategory(result.store + ' ' + aiCategory + ' ' + (result.items?.[0]?.name || ''), categories || [], 'expense'); // Improved context for matching
            const categoryId = mappedCategory?.id || null;

            // Strategy: Insert Total as one transaction OR Items?
            // User likely prefers Items if detected, but let's allow fallback.
            if (result.items && result.items.length > 0) {
                for (const item of result.items) {
                    transactionsToSave.push({
                        user_id: userId,
                        workspace_id: workspaceId,
                        account_id: accountId,
                        type: 'expense',
                        amount: item.amount || item.price,
                        category_id: categoryId,
                        description: `${storeName} - ${item.name}`,
                        date: txDate,
                        source: 'telegram-receipt',
                        sender_name: senderName
                    })
                }
            } else {
                transactionsToSave.push({
                    user_id: userId,
                    workspace_id: workspaceId,
                    account_id: accountId,
                    type: 'expense',
                    amount: result.total,
                    category_id: categoryId,
                    description: `Struk ${storeName}`,
                    date: txDate,
                    source: 'telegram-receipt',
                    sender_name: senderName
                })
            }

        }

        // --- 5. HANDLE TEXT ---
        else if (message.text) {
            const todayStr = getWibToday();

            // 1. Extract transaction date & clean time words from text locally
            const { date: parsedDate, cleanedText } = parseLocalTimeAndClean(message.text, todayStr);
            let txDate = parsedDate;
            let parsed: any = null;

            // 2. Try Groq Text Parsing first (passing original text for full context, including date)
            if (groqApiKey) {
                const aiRes = await runGroqText(groqApiKey, message.text, todayStr);
                if (aiRes.data && aiRes.data.amount > 0) {
                    parsed = aiRes.data;
                    // Prioritize locally parsed specific date if found; otherwise fallback to Groq parsed date
                    txDate = parsedDate !== todayStr ? parsedDate : (aiRes.data.date || parsedDate);
                }
            }

            // 3. Fallback to local regex-based parsing
            if (!parsed) {
                const localParsed = parseTransaction(cleanedText);
                if (localParsed) {
                    parsed = localParsed;
                }
            }

            if (parsed && parsed.amount > 0) {
                const category = findCategory(parsed.description || 'Transaksi', categories || [], parsed.type)
                const senderName = [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || telegramUserId

                let txAccountId = accountId
                let txDescription = parsed.description

                const matchedAccount = findAccount(message.text, allAccounts || [])
                if (matchedAccount) {
                    txAccountId = matchedAccount.id
                    const nameLower = matchedAccount.name.toLowerCase()
                    const cleanNameLower = nameLower.replace(/\bbank\b|\bdompet\b|\bakun\b/g, '').trim()
                    
                    const descLower = txDescription.toLowerCase()
                    if (descLower.includes(nameLower)) {
                        const regex = new RegExp('\\b' + nameLower + '\\b', 'gi')
                        txDescription = txDescription.replace(regex, '').replace(/\s+/g, ' ').trim()
                    } else if (cleanNameLower.length >= 3 && descLower.includes(cleanNameLower)) {
                        const regex = new RegExp('\\b' + cleanNameLower + '\\b', 'gi')
                        txDescription = txDescription.replace(regex, '').replace(/\s+/g, ' ').trim()
                    }
                    
                    if (txDescription.toLowerCase().includes('cash')) {
                        txDescription = txDescription.replace(/\bcash\b/gi, '').replace(/\s+/g, ' ').trim()
                    } else if (txDescription.toLowerCase().includes('tunai')) {
                        txDescription = txDescription.replace(/\btunai\b/gi, '').replace(/\s+/g, ' ').trim()
                    }
                }

                // Clean trailing/leading spaces & commas & non-word chars
                txDescription = txDescription.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

                // Clean connector words from description (pakai, lewat, via, etc.)
                txDescription = txDescription.replace(/\b(pakai|pake|dengan|menggunakan|melalui|lewat|via|transfer)\s*/gi, '').replace(/\s+/g, ' ').trim();

                if (!txDescription) txDescription = 'Transaksi'

                transactionsToSave.push({
                    user_id: userId,
                    workspace_id: workspaceId,
                    account_id: txAccountId,
                    type: parsed.type,
                    amount: parsed.amount,
                    category_id: category?.id || null,
                    description: txDescription,
                    date: txDate,
                    source: 'telegram',
                    sender_name: senderName
                })
            }
        }

        // --- 6. SAVE & REPLY ---
        if (transactionsToSave.length > 0) {
            const { error } = await supabase.from('transactions').insert(transactionsToSave)
            if (error) { console.error('Insert Error:', error); throw error; }

            // Increment Usage
            await supabase.rpc('increment_messaging_count', { p_user_id: userId, p_type: 'telegram' })

            // Build Reply
            const firstTx = transactionsToSave[0]; // For generic info
            const totalAmount = transactionsToSave.reduce((sum, t) => sum + t.amount, 0);
            const count = transactionsToSave.length;
            const displayCat = categories?.find(c => c.id === firstTx.category_id)?.name || 'Lainnya';
            const txDateDisplay = firstTx.date; // Use the actual date saved

            let replyText = '';
            if (message.photo) {
                replyText = `🧾 *Struk Tercatat!*\n📅 ${txDateDisplay}\n🏪 ${firstTx.description.split(' - ')[0]}\n💵 Total: Rp ${totalAmount.toLocaleString('id-ID')}\n📂 ${displayCat}\n📦 ${count} item tersimpan.`;
            } else {
                const typeEmoji = firstTx.type === 'income' ? '💰' : '💸';
                const typeLabel = firstTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
                const matchedAcc = allAccounts?.find(a => a.id === firstTx.account_id);
                const accLabel = matchedAcc ? `💳 Akun: *${matchedAcc.name}*\n` : '';
                replyText = `✅ *Tercatat!*\n${typeEmoji} ${typeLabel}\n💵 Rp ${firstTx.amount.toLocaleString('id-ID')}\n📅 ${txDateDisplay}\n${accLabel}📂 ${displayCat}\n📝 ${firstTx.description}`;
            }

            return new Response(JSON.stringify({
                method: 'sendMessage',
                chat_id: message.chat.id,
                text: replyText,
                parse_mode: 'Markdown'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        return new Response('ok', { headers: corsHeaders })

    } catch (error) {
        console.error('Error:', error)
        // Try to reply with error if possible, otherwise just 200 to satisfy webhook
        return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})

// --- HELPER FUNCTIONS ---

function parseTransaction(text: string) {
    const cleanText = text.trim()
    
    // Amount Regex matching:
    // - sign: ([+-]?)
    // - number block: (\d+(?:[.,]\d+)*)
    // - suffix: \s*(rb|ribu|k|jt|juta)?\b
    const amountRegex = /([+-]?)\s*(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta)?\b/i
    const match = cleanText.match(amountRegex)
    if (!match) return null

    const sign = match[1] || ''
    let numberStr = match[2]
    const suffix = match[3]?.toLowerCase()

    let amount = 0

    if (suffix) {
        numberStr = numberStr.replace(',', '.')
        amount = parseFloat(numberStr)
        
        if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') amount *= 1000
        else if (suffix === 'jt' || suffix === 'juta') amount *= 1000000
    } else {
        numberStr = numberStr.replace(/[.,]/g, '')
        amount = parseInt(numberStr, 10)
    }

    if (isNaN(amount) || amount <= 0) return null

    let description = cleanText.replace(match[0], '').trim()
    description = description.replace(/^[,.\s\-]+|[,.\s\-]+$/g, '').trim();
    // Clean connector words from description (defense in depth)
    description = description.replace(/\b(pakai|pake|dengan|menggunakan|melalui|lewat|via|transfer)\s*/gi, '').replace(/\s+/g, ' ').trim();
    if (!description) description = 'Transaksi'
    description = description.replace(/\s+/g, ' ')

    let type = 'expense'
    if (sign === '+') type = 'income'
    else {
        const incomeKeywords = ['gaji', 'terima', 'dapat', 'income', 'pemasukan', 'deposit', 'transfer masuk']
        if (incomeKeywords.some(k => description.toLowerCase().includes(k))) type = 'income'
    }

    const keyword = description.split(' ')[0].toLowerCase()
    return { keyword, amount, type, description }
}

function findCategory(description: string, categories: any[], type: string) {
    const lowerDesc = description.toLowerCase()

    // 1. Direct Match
    const sortedCats = [...categories].sort((a, b) => b.name.length - a.name.length)
    for (const cat of sortedCats) {
        if (lowerDesc.includes(cat.name.toLowerCase())) return cat
    }

    // 2. Keyword Map (Priority)
    const keywordMap: { [key: string]: string[] } = {
        'kesehatan': ['sakit', 'sehat', 'dokter', 'doctor', 'obat', 'medis', 'periksa', 'klinik', 'rs', 'hospital', 'apotek'],
        'transport': ['transport', 'grab', 'gojek', 'uber', 'taxi', 'bensin', 'fuel', 'parkir', 'tol', 'ojek', 'driver', 'bengkel', 'service'],
        'tagihan': ['tagih', 'listrik', 'air', 'internet', 'wifi', 'pln', 'pdam', 'pulsa', 'data', 'token', 'pajak', 'ipl'],
        'pendidikan': ['sekolah', 'kursus', 'buku', 'kuliah', 'spp', 'edukasi', 'les', 'uang sekolah'],
        'makan': ['makan', 'food', 'resto', 'warung', 'cafe', 'kopi', 'coffee', 'snack', 'jajan', 'lunch', 'dinner', 'sarapan', 'breakfast', 'bubur', 'nasi', 'lontong', 'mie', 'bakso', 'soto', 'kue', 'roti', 'minum', 'haus', 'lapar', 'ayam', 'bebek', 'sate', 'gorengan'],
        'hiburan': ['hibur', 'nonton', 'game', 'film', 'movie', 'wisata', 'jalan', 'vacation', 'spotify', 'netflix', 'youtube'],
        'gaji': ['gaji', 'salary', 'honor', 'upah', 'tunjangan', 'thr'],
        'bonus': ['bonus', 'reward', 'hadiah', 'cashback'],
        'belanja': ['belanja', 'shop', 'mart', 'market', 'beli', 'buy', 'tisu', 'sabun', 'shampoo', 'odol', 'pasta gigi', 'indomaret', 'alfamart', 'superindo', 'hypermart'],
    }

    for (const [key, keywords] of Object.entries(keywordMap)) {
        if (keywords.some(k => lowerDesc.includes(k))) {
            const match = categories.find(c => c.name.toLowerCase().includes(key) || (key === 'makan' && c.name.toLowerCase().includes('food')))
            if (match) return match
        }
    }

    return categories.find(c => c.type === type)
}

function findAccount(text: string, accounts: any[]) {
    if (!accounts || accounts.length === 0) return null;
    const lowerText = text.toLowerCase();
    
    const sortedAccounts = [...accounts].sort((a, b) => b.name.length - a.name.length);
    
    for (const acc of sortedAccounts) {
        const name = acc.name.toLowerCase();
        
        if (lowerText.includes(name)) {
            return acc;
        }
        
        const cleanName = name.replace(/\bbank\b|\bdompet\b|\bakun\b/g, '').trim();
        if (cleanName.length >= 3 && lowerText.includes(cleanName)) {
            return acc;
        }
    }
    
    if (lowerText.includes('cash') || lowerText.includes('tunai') || lowerText.includes('dompet')) {
        const cashAcc = accounts.find(a => {
            const n = a.name.toLowerCase();
            return n.includes('cash') || n.includes('tunai') || n.includes('kas');
        });
        if (cashAcc) return cashAcc;
    }
    
    return null;
}

async function runGroqText(apiKey: string | undefined, text: string, today: string) {
    if (!apiKey) return { error: 'API Key missing' }

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": `You are a financial parsing assistant. Extract transaction details from the user text (Indonesian).
Today is: ${today} (YYYY-MM-DD).

If the user specifies a transaction date/time (e.g. "kemarin", "lusa", "2 hari lalu", "minggu lalu", or a specific date like "15 maret", "senin lalu"), calculate the transaction date and output it in "date" field (YYYY-MM-DD).
If no date is mentioned, use today's date: ${today}.

Return ONLY JSON format:
{
  "type": "expense" | "income",
  "amount": number,
  "description": "string",
  "category": "string keyword",
  "date": "YYYY-MM-DD"
}

Rules:
- "description" MUST BE cleaned from any time/date words (like kemarin, lusa, hari ini, tanggal, senin lalu, dll), account names/sources (like bca, gopay, ovo, cash, bank, etc.), AND connector words (like pakai, pake, lewat, via, transfer, dengan, menggunakan, melalui).
- "makan 50k" -> type: expense, amount: 50000, description: "Makan", category: "makanan", date: "${today}"
- "kemarin beli gas lpg 100k" -> type: expense, amount: 100000, description: "Beli gas lpg", category: "gas", date: "<yesterday's date>"
- "gaji 5jt bca" -> type: income, amount: 5000000, description: "Gaji", category: "gaji", date: "${today}"
- Guess type expense if unclear. Handle 'k' (thousand), 'jt' (million).`
                    },
                    { "role": "user", "content": text }
                ],
                "temperature": 0.1,
                "response_format": { "type": "json_object" }
            })
        })
        const json = await res.json()
        if (json.error) {
            throw new Error(json.error.message)
        }
        const content = json.choices[0].message.content
        return { data: JSON.parse(content) }
    } catch (e) {
        console.error('Groq Text Error:', e)
        return { error: e.message }
    }
}

function parseLocalTimeAndClean(text: string, todayStr: string): { date: string, cleanedText: string } {
    let transactionDate = todayStr;
    let cleanedText = text;

    const parts = todayStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);

    // 1. Handle relative time patterns (case-insensitive, stateless without /g global flag)
    const relativePatterns = [
        { regex: /\bkemarin\s+lusa\b|\b2\s+hari\s+lalu\b/i, adjustDays: -2 },
        { regex: /\bkemarin\b/i, adjustDays: -1 },
        { regex: /\bhari\s+ini\b/i, adjustDays: 0 },
        { regex: /\bbesok\b/i, adjustDays: 1 },
        { regex: /\blusa\b/i, adjustDays: 2 }
    ];

    for (const pattern of relativePatterns) {
        if (pattern.regex.test(cleanedText)) {
            const adjustedDate = new Date(dateObj);
            adjustedDate.setDate(adjustedDate.getDate() + pattern.adjustDays);
            
            const y = adjustedDate.getFullYear();
            const m = String(adjustedDate.getMonth() + 1).padStart(2, '0');
            const d = String(adjustedDate.getDate()).padStart(2, '0');
            transactionDate = `${y}-${m}-${d}`;
            
            cleanedText = cleanedText.replace(pattern.regex, '').trim();
            break;
        }
    }

    // 2. Handle absolute dates (e.g. "18 mei 2026", "18/05/2026", "18 mei", "18/05")
    const monthNames = [
        'januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
        'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'ags', 'agu', 'sep', 'okt', 'nov', 'des',
        'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
        'may', 'oct', 'dec'
    ];
    const monthRegexStr = monthNames.join('|');

    // Pattern A: DD [Month] YYYY or DD [Month] (e.g., "18 mei 2026", "18 mei")
    const absDateRegexText = new RegExp(`\\b(\\d{1,2})\\s+(${monthRegexStr})\\s*(\\d{4})?\\b`, 'i');
    const matchText = cleanedText.match(absDateRegexText);

    if (matchText) {
        const matchDay = parseInt(matchText[1], 10);
        const matchMonthStr = matchText[2].toLowerCase();
        let matchYear = matchText[3] ? parseInt(matchText[3], 10) : year;

        // Map month name to index (0-11)
        let matchMonth = -1;
        const indonesianMonths = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'ag', 'sep', 'okt', 'nov', 'des'];
        const englishMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        for (let i = 0; i < 12; i++) {
            if (matchMonthStr.startsWith(indonesianMonths[i]) || matchMonthStr.startsWith(englishMonths[i])) {
                matchMonth = i;
                break;
            }
        }

        if (matchMonth !== -1 && matchDay >= 1 && matchDay <= 31) {
            const targetDate = new Date(matchYear, matchMonth, matchDay);
            const y = targetDate.getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            const d = String(targetDate.getDate()).padStart(2, '0');
            transactionDate = `${y}-${m}-${d}`;
            cleanedText = cleanedText.replace(matchText[0], '').trim();
        }
    } else {
        // Pattern B: DD/MM/YYYY or DD-MM-YYYY or DD/MM or DD-MM (numeric formats)
        const numericDateRegex = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;
        const matchNum = cleanedText.match(numericDateRegex);

        if (matchNum) {
            const matchDay = parseInt(matchNum[1], 10);
            const matchMonth = parseInt(matchNum[2], 10) - 1; // 0-indexed
            let matchYear = matchNum[3] ? parseInt(matchNum[3], 10) : year;
            if (matchNum[3] && matchNum[3].length === 2) {
                matchYear = 2000 + matchYear;
            }

            if (matchMonth >= 0 && matchMonth <= 11 && matchDay >= 1 && matchDay <= 31) {
                const targetDate = new Date(matchYear, matchMonth, matchDay);
                const y = targetDate.getFullYear();
                const m = String(targetDate.getMonth() + 1).padStart(2, '0');
                const d = String(targetDate.getDate()).padStart(2, '0');
                transactionDate = `${y}-${m}-${d}`;
                cleanedText = cleanedText.replace(matchNum[0], '').trim();
            }
        }
    }

    // 3. Handle generic "tanggal \d+" patterns
    const dateMatch = cleanedText.match(/\btanggal\s+(\d+)\b/i);
    if (dateMatch) {
        const targetDay = parseInt(dateMatch[1], 10);
        if (targetDay >= 1 && targetDay <= 31) {
            const targetDate = new Date(dateObj);
            targetDate.setDate(targetDay);
            
            const y = targetDate.getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            const d = String(targetDate.getDate()).padStart(2, '0');
            transactionDate = `${y}-${m}-${d}`;
            
            cleanedText = cleanedText.replace(dateMatch[0], '').trim();
        }
    }

    return { date: transactionDate, cleanedText };
}
