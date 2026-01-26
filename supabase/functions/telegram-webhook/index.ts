// Supabase Edge Function: telegram-webhook
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        // Regex to match /start, /id, /info optionally followed by @botname
        const commandRegex = /^\/(start|id|info)(?:@\w+)?$/i;

        if (commandRegex.test(text)) {
            const isGroup = message.chat.type === 'group' || message.chat.type === 'supergroup';
            let replyText = '';

            if (isGroup) {
                // Group Context: Group ID
                replyText = `👥 *Info Grup*\n\nID Grup ini:\n\`${message.chat.id}\`\n\nSalin ID ini ke pengaturan aplikasi Karsafin (Menu Telegram > Hubungkan Grup).`
            } else {
                // Private Context: User ID
                // Careful with username in Markdown
                replyText = `👋 Halo ${telegramUsername}!\n\nID Telegram Anda:\n\`${telegramUserId}\`\n\nSalin ID ini ke aplikasi Karsafin (Menu Telegram > Hubungkan Manual).\n\nKetik transaksi: "makan 50000"`;
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

        // --- 3. FETCH USER DATA (Categories & Subscription) ---
        const { data: categories } = await supabase.from('categories').select('id, name, type').eq('user_id', userId)

        const { data: sub } = await supabase.rpc('get_active_subscription', { p_user_id: userId })
        const subscription = sub && sub.length > 0 ? sub[0] : null
        if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trial')) {
            return new Response(JSON.stringify({ method: 'sendMessage', chat_id: message.chat.id, text: '❌ Langganan tidak aktif.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Helper: Check Usage Limit (Basic Plan)
        if (subscription.plan_id && subscription.plan_id.startsWith('basic') && subscription.status !== 'trial') {
            const { data: usage } = await supabase.rpc('get_messaging_usage', { p_user_id: userId })
            const currentUsage = usage && usage.length > 0 ? usage[0].total_count : 0
            if (currentUsage >= 300) {
                return new Response(JSON.stringify({ method: 'sendMessage', chat_id: message.chat.id, text: `⛔ Kuota tercapai (${currentUsage}/300). Upgrade ke Pro!` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
                                    "type": "text", "text": `Current Date: ${new Date().toISOString().split('T')[0]}. Extract transaction data. Return ONLY JSON: {"items": [{"name": "item name", "amount": number}], "total": number, "store": "store name", "date": "YYYY-MM-DD", "category": "Food/Transport/Shopping"}.`
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
            let txDate = new Date().toISOString().split('T')[0]; // Default to today
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
            const parsed = parseTransaction(message.text)
            if (parsed && parsed.amount > 0) {
                const category = findCategory(parsed.description, categories || [], parsed.type)
                const senderName = [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || telegramUserId

                transactionsToSave.push({
                    user_id: userId,
                    type: parsed.type,
                    amount: parsed.amount,
                    category_id: category?.id || null,
                    description: parsed.description,
                    date: new Date().toISOString().split('T')[0],
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
                replyText = `✅ *Tercatat!*\n${typeEmoji} ${typeLabel}\n💵 Rp ${firstTx.amount.toLocaleString('id-ID')}\n📂 ${displayCat}\n📝 ${firstTx.description}`;
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
    const amountRegex = /([+-]?)\s*(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?\b/i
    const match = cleanText.match(amountRegex)
    if (!match) return null

    const sign = match[1] || ''
    const numberStr = match[2].replace(',', '.')
    const suffix = match[3]?.toLowerCase()
    let amount = parseFloat(numberStr)

    // Handle Suffixes
    if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') amount *= 1000
    else if (suffix === 'jt' || suffix === 'juta') amount *= 1000000

    if (isNaN(amount) || amount <= 0) return null

    let description = cleanText.replace(match[0], '').trim()
    if (!description) description = 'Transaksi'
    description = description.replace(/\s+/g, ' ')

    let type = 'expense'
    if (sign === '+') type = 'income' // Explicit +
    else {
        // Keyword heuristic
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
