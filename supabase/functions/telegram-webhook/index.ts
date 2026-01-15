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

        // Find linked user
        const { data: link } = await supabase
            .from('telegram_user_links')
            .select('user_id')
            .eq('telegram_user_id', telegramUserId)
            .single()

        if (!link) {
            // User not linked, send instruction message via Telegram Bot API
            console.log('User not linked:', telegramUserId)
            return new Response(JSON.stringify({
                method: 'sendMessage',
                chat_id: message.chat.id,
                text: `⚠️ Akun belum terhubung.\n\nID Telegram Anda: \`${telegramUserId}\`\n\nSilakan hubungkan akun Anda di aplikasi FinansialKu terlebih dahulu.`,
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

        const category = findCategory(parsed.keyword, categories || [], parsed.type)

        // Insert transaction
        const { data, error } = await supabase
            .from('telegram_transactions')
            .insert({
                user_id: link.user_id,
                telegram_user_id: telegramUserId,
                type: parsed.type,
                amount: parsed.amount,
                category_id: category?.id || null,
                description: parsed.description,
                original_message: text,
                synced: false
            })
            .select()
            .single()

        if (error) {
            console.error('Insert error:', error)
            throw error
        }

        return new Response(JSON.stringify({
            ok: true,
            transaction: data
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
    // Pattern: keyword amount [description]
    // Examples: 
    //   "makan 50000"
    //   "gaji +5000000 bonus akhir tahun"
    //   "transport -25000 grab"

    const patterns = [
        // With + or - prefix
        /^(\w+)\s+([+-]?)(\d+(?:[.,]\d+)?)\s*(.*)$/i,
        // Amount first
        /^([+-]?)(\d+(?:[.,]\d+)?)\s+(\w+)\s*(.*)$/i,
    ]

    for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) {
            let keyword, sign, amountStr, description

            if (match[2] && (match[2] === '+' || match[2] === '-')) {
                // Pattern 1
                keyword = match[1].toLowerCase()
                sign = match[2]
                amountStr = match[3]
                description = match[4] || keyword
            } else if (match[1] === '+' || match[1] === '-' || !isNaN(parseInt(match[2]))) {
                // Pattern 2
                sign = match[1] || ''
                amountStr = match[2]
                keyword = match[3].toLowerCase()
                description = match[4] || keyword
            } else {
                keyword = match[1].toLowerCase()
                sign = match[2] || ''
                amountStr = match[3]
                description = match[4] || keyword
            }

            const amount = parseFloat(amountStr.replace(',', '.'))
            if (isNaN(amount) || amount <= 0) continue

            const type = sign === '+' ? 'income' : 'expense'

            return {
                keyword,
                amount,
                type,
                description: description || keyword
            }
        }
    }

    return null
}

function findCategory(keyword: string, categories: any[], type: string) {
    const keywordMap: { [key: string]: string[] } = {
        'makanan': ['makan', 'food', 'makanan', 'resto', 'restaurant', 'cafe', 'kopi', 'coffee'],
        'transportasi': ['transport', 'transportasi', 'grab', 'gojek', 'uber', 'taxi', 'bensin', 'fuel', 'parkir'],
        'belanja': ['belanja', 'shop', 'shopping', 'beli', 'buy'],
        'hiburan': ['hiburan', 'entertainment', 'movie', 'film', 'game', 'nonton'],
        'kesehatan': ['kesehatan', 'health', 'dokter', 'doctor', 'obat', 'medicine', 'apotek'],
        'tagihan': ['tagihan', 'bill', 'listrik', 'electric', 'air', 'water', 'internet', 'pulsa'],
        'gaji': ['gaji', 'salary', 'income', 'penghasilan'],
        'bonus': ['bonus', 'reward', 'hadiah'],
    }

    // Find matching category by keyword
    for (const cat of categories) {
        const catName = cat.name.toLowerCase()

        // Direct match
        if (catName.includes(keyword) || keyword.includes(catName)) {
            return cat
        }

        // Check keyword mappings
        for (const [catKey, keywords] of Object.entries(keywordMap)) {
            if (catName.includes(catKey) && keywords.some(k => keyword.includes(k) || k.includes(keyword))) {
                return cat
            }
        }
    }

    // Return first category of matching type
    return categories.find(c => c.type === type)
}
