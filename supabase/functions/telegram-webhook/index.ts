// Supabase Edge Function: telegram-webhook
// Deploy this to Supabase Edge Functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const body = await req.json()

        // Telegram sends updates in this format
        const message = body.message
        if (!message || !message.text) {
            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const telegramUserId = String(message.from.id)
        const telegramUsername = message.from.username || ''
        const text = message.text.trim()

        // Handle Commands
        if (text === '/start' || text === '/id') {
            return new Response(JSON.stringify({
                method: 'sendMessage',
                chat_id: message.chat.id,
                text: `👋 Halo @${telegramUsername}!\n\nID Telegram Anda adalah:\n\`${telegramUserId}\`\n\nSilakan salin ID tersebut dan masukkan ke aplikasi FinansialKu (Menu Telegram > Hubungkan Manual) untuk menghubungkan akun.\n\nSetelah terhubung, Anda bisa mencatat keuangan dengan format:\n_makan 50000_\n_gaji +5000000_`,
                parse_mode: 'Markdown'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Parse transaction from message
        // Format: "makan 50000" or "gaji +5000000" or "transport -25000"
        const parsed = parseTransaction(text)

        if (!parsed) {
            // Not a transaction message, ignore
            return new Response(JSON.stringify({ ok: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (parsed.amount <= 0) {
            return new Response(JSON.stringify({
                method: 'sendMessage',
                chat_id: message.chat.id,
                text: '⚠️ Jumlah transaksi harus lebih besar dari 0.',
                parse_mode: 'Markdown'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const senderName = [message.from.first_name, message.from.last_name].filter(Boolean).join(' ') || message.from.username || telegramUserId

        // Determine Target User ID
        // Priority:
        // 1. Group Link (if in group) -> User who owns the group link
        // 2. Personal Link -> User who owns the Telegram account

        let link = null;
        let isGroupChat = message.chat.type === 'group' || message.chat.type === 'supergroup';

        if (isGroupChat) {
            const { data: groupLink } = await supabase
                .from('telegram_group_links')
                .select('user_id')
                .eq('telegram_group_id', String(message.chat.id))
                .maybeSingle()

            if (groupLink) {
                link = groupLink; // Use group owner
                console.log('Using Group Link:', groupLink.user_id)
            }
        }

        // Fallback to Personal Link
        if (!link) {
            const { data: userLink } = await supabase
                .from('telegram_user_links')
                .select('user_id')
                .eq('telegram_user_id', telegramUserId)
                .maybeSingle()

            link = userLink;
        }

        if (!link) {
            // User not linked, send instruction message via Telegram Bot API
            console.log('User/Group not linked:', telegramUserId)
            return new Response(JSON.stringify({
                method: 'sendMessage',
                chat_id: message.chat.id,
                text: `⚠️ Akun belum terhubung.\n\nID Telegram Anda: \`${telegramUserId}\`\n${isGroupChat ? `ID Grup: \`${message.chat.id}\`\n` : ''}\nSilakan hubungkan akun Anda di aplikasi FinansialKu terlebih dahulu.`,
                parse_mode: 'Markdown'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Find category by keyword
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, type')
            .eq('user_id', link.user_id)

        // --- FEATURE GATING & LIMIT CHECK ---
        const userId = link.user_id;

        // 1. Get subscription status
        const { data: sub } = await supabase.rpc('get_active_subscription', { p_user_id: userId })
        const subscription = sub && sub.length > 0 ? sub[0] : null

        // 2. Check if user can transact
        if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trial')) {
            return new Response(JSON.stringify({
                method: 'sendMessage',
                chat_id: message.chat.id,
                text: '❌ Langganan Anda tidak aktif.\nSilakan upgrade di aplikasi untuk mencatat transaksi via Telegram.',
                parse_mode: 'Markdown'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 3. Check Usage Limit for Basic Plans
        let currentUsage = -1;
        if (subscription.plan_id && subscription.plan_id.startsWith('basic') && subscription.status !== 'trial') {
            const { data: usage } = await supabase.rpc('get_messaging_usage', { p_user_id: userId })
            currentUsage = usage && usage.length > 0 ? usage[0].total_count : 0

            if (currentUsage >= 300) {
                return new Response(JSON.stringify({
                    method: 'sendMessage',
                    chat_id: message.chat.id,
                    text: `⛔ Kuota transaksi bulanan terlampaui (${currentUsage}/300).\nUpgrade ke Pro untuk transaksi unlimited!`,
                    parse_mode: 'Markdown'
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }
        // ------------------------------------

        const category = findCategory(parsed.description, categories || [], parsed.type)

        // Insert transaction directly to main transactions table (so it shows in app)
        const { data, error } = await supabase
            .from('transactions')
            .insert({
                user_id: link.user_id,
                type: parsed.type,
                amount: parsed.amount,
                category_id: category?.id || null,
                description: parsed.description,
                date: new Date().toISOString().split('T')[0],
                source: 'telegram',
                sender_name: isGroupChat ? senderName : null // Only add sender name in groups
            })
            .select()
            .single()

        if (error) {
            console.error('Insert error:', error)
            throw error
        }

        // --- INCREMENT USAGE COUNT ---
        await supabase.rpc('increment_messaging_count', {
            p_user_id: userId,
            p_type: 'telegram'
        })
        // -----------------------------

        const categoryName = category?.name || 'Lainnya'
        const typeEmoji = parsed.type === 'income' ? '💰' : '💸'

        return new Response(JSON.stringify({
            method: 'sendMessage',
            chat_id: message.chat.id,
            text: `✅ *Tercatat!*
${typeEmoji} ${parsed.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
💵 Rp ${parsed.amount.toLocaleString('id-ID')}
📂 ${categoryName}
📝 ${parsed.description}`,
            parse_mode: 'Markdown'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})

function parseTransaction(text: string) {
    // 1. Clean the text
    const cleanText = text.trim()

    // 2. Regex to find amount with common suffixes (rb, k, jt, juta, ribu)
    // Matches:
    // - 50000
    // - 50.000
    // - 50k / 50rb / 50ribu
    // - 5jt / 5juta
    const amountRegex = /([+-]?)\s*(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?\b/i

    const match = cleanText.match(amountRegex)

    if (!match) return null

    const sign = match[1] || ''
    const numberStr = match[2].replace(',', '.')
    const suffix = match[3]?.toLowerCase()

    let amount = parseFloat(numberStr)

    // Handle Suffixes
    if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') {
        amount *= 1000
    } else if (suffix === 'jt' || suffix === 'juta') {
        amount *= 1000000
    }

    if (isNaN(amount) || amount <= 0) return null

    // Remove the found amount from text to get description
    // distinct from the amount part
    let description = cleanText.replace(match[0], '').trim()

    // If description becomes empty (e.g. just sent "50rb"), use "Transaksi" or infer category later
    if (!description) {
        description = 'Transaksi'
    }

    // Cleanup description (remove extra spaces, punctuation)
    description = description.replace(/\s+/g, ' ')

    // Determine type (expense/income)
    // Default to expense, unless specified '+' or keyword 'gaji', 'terima', 'masuk'
    let type = 'expense'
    if (sign === '+') {
        type = 'income'
    } else {
        const incomeKeywords = ['gaji', 'terima', 'dapat', 'income', 'pemasukan', 'deposit', 'transfer masuk']
        if (incomeKeywords.some(k => description.toLowerCase().includes(k))) {
            type = 'income'
        }
    }

    // Extract potential keyword for category matching (first word of description)
    const keyword = description.split(' ')[0].toLowerCase()

    return {
        keyword,
        amount,
        type,
        description
    }
}

function findCategory(description: string, categories: any[], type: string) {
    const lowerDesc = description.toLowerCase()

    // 1. Direct Match: Check if any category name appears in the description
    // Sort by length desc so "makanan ringan" matches before "makanan"
    const sortedCats = [...categories].sort((a, b) => b.name.length - a.name.length)
    for (const cat of sortedCats) {
        if (lowerDesc.includes(cat.name.toLowerCase())) {
            return cat
        }
    }

    // 2. Keyword Map (Ordered by Priority)
    // Specific categories first, Generic (like 'Belanja' with 'beli') last
    const keywordMap: { [key: string]: string[] } = {
        'kesehatan': ['sakit', 'sehat', 'dokter', 'doctor', 'obat', 'medis', 'periksa', 'klinik', 'rs', 'hospital', 'apotek'],
        'transport': ['transport', 'grab', 'gojek', 'uber', 'taxi', 'bensin', 'fuel', 'parkir', 'tol', 'ojek', 'driver', 'bengkel', 'service'],
        'tagihan': ['tagih', 'listrik', 'air', 'internet', 'wifi', 'pln', 'pdam', 'pulsa', 'data', 'token', 'pajak', 'ipl'],
        'pendidikan': ['sekolah', 'kursus', 'buku', 'kuliah', 'spp', 'edukasi', 'les', 'uang sekolah'],
        'makan': ['makan', 'food', 'resto', 'warung', 'cafe', 'kopi', 'coffee', 'snack', 'jajan', 'lunch', 'dinner', 'sarapan', 'breakfast', 'bubur', 'nasi', 'lontong', 'mie', 'bakso', 'soto', 'kue', 'roti', 'minum', 'haus', 'lapar', 'ayam', 'bebek', 'sate', 'gorengan'],
        'hiburan': ['hibur', 'nonton', 'game', 'film', 'movie', 'wisata', 'jalan', 'vacation', 'spotify', 'netflix', 'youtube'],
        'gaji': ['gaji', 'salary', 'honor', 'upah', 'tunjangan', 'thr'],
        'bonus': ['bonus', 'reward', 'hadiah', 'cashback'],
        // Generic last
        'belanja': ['belanja', 'shop', 'mart', 'market', 'beli', 'buy', 'tisu', 'sabun', 'shampoo', 'odol', 'pasta gigi', 'indomaret', 'alfamart', 'superindo', 'hypermart'],
    }

    // Iterate through PRIORITY MAP first
    for (const [key, keywords] of Object.entries(keywordMap)) {
        // Check if description contains any keyword for this concept
        if (keywords.some(k => lowerDesc.includes(k))) {
            // Find a matching category in the user's categories
            // e.g. if key is 'makan', look for category with name containing 'makan' (or 'Food')
            const match = categories.find(c => c.name.toLowerCase().includes(key) || (key === 'makan' && c.name.toLowerCase().includes('food')))
            if (match) return match
        }
    }

    // 3. Fallback: Return first category of matching type
    return categories.find(c => c.type === type)
}
