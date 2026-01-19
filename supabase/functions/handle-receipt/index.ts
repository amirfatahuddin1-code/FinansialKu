// Supabase Edge Function: handle-receipt
// Menerima data JSON dari n8n Receipt Parser

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
        console.log('Receipt data received:', body)

        // Validasi input dari n8n
        // Format: { store, date, chatId, transactions: [{ name, price, category }] }
        const { store, date, chatId, transactions } = body

        if (!chatId) {
            throw new Error('Invalid data format. Need chatId.')
        }

        // 1. Cari User ID berdasarkan Telegram Chat ID
        // Support both private chat (telegram_user_links) and group (telegram_group_links)
        const telegramId = String(chatId)
        let userId: string | null = null

        // First, try telegram_user_links (for private chats)
        const { data: userLink, error: userLinkError } = await supabase
            .from('telegram_user_links')
            .select('user_id')
            .eq('telegram_user_id', telegramId)
            .single()

        if (userLink && !userLinkError) {
            userId = userLink.user_id
            console.log('Found user via telegram_user_links:', userId)
        }

        // If not found, try telegram_group_links (for group chats)
        if (!userId) {
            const { data: groupLink, error: groupLinkError } = await supabase
                .from('telegram_group_links')
                .select('user_id')
                .eq('telegram_group_id', telegramId)
                .single()

            if (groupLink && !groupLinkError) {
                userId = groupLink.user_id
                console.log('Found user via telegram_group_links:', userId)
            }
        }

        if (!userId) {
            console.error('User/Group link not found for chatId:', telegramId)
            return new Response(JSON.stringify({
                error: 'User not linked. Please link your Telegram account or group in the app first.',
                chatId: telegramId
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }


        // 2. Siapkan data untuk insert
        const transactionsToInsert = []

        // Dapatkan semua categories user untuk mapping
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, type')
            .eq('user_id', userId)

        // Helper function cari category ID
        const findCategoryId = (catName: string) => {
            if (!categories) return null
            if (!catName) {
                const fallback = categories.find(c => c.type === 'expense')
                return fallback?.id || null
            }

            const catLower = catName.toLowerCase()

            // Coba match exact name (case insensitive)
            const exact = categories.find(c => c.name.toLowerCase() === catLower)
            if (exact) return exact.id

            // Mapping dari OpenAI category ke keywords Indonesia
            const categoryKeywords: Record<string, string[]> = {
                'food': ['makanan', 'makan', 'food', 'minum', 'jajan', 'kuliner', 'resto'],
                'transport': ['transportasi', 'transport', 'bensin', 'ojek', 'parkir', 'tol', 'kendaraan'],
                'shopping': ['belanja', 'shopping', 'mart', 'market', 'mall', 'toko', 'beli'],
                'entertainment': ['hiburan', 'entertainment', 'nonton', 'game', 'rekreasi'],
                'health': ['kesehatan', 'health', 'obat', 'dokter', 'sehat', 'apotek'],
                'bills': ['tagihan', 'bills', 'listrik', 'air', 'internet', 'pulsa', 'utilitas'],
                'education': ['pendidikan', 'education', 'kursus', 'buku', 'sekolah'],
                'other': ['lainnya', 'other', 'lain']
            }

            // Cari kategori user berdasarkan keyword match
            for (const [aiCategory, keywords] of Object.entries(categoryKeywords)) {
                // Jika OpenAI return category ini
                if (catLower === aiCategory || keywords.includes(catLower)) {
                    // Cari di kategori user yang cocok dengan keywords
                    for (const keyword of keywords) {
                        const found = categories.find(c =>
                            c.name.toLowerCase().includes(keyword) ||
                            c.name.toLowerCase() === keyword
                        )
                        if (found) return found.id
                    }
                }
            }

            // Fallback: category pertama yg tipe expense
            const fallback = categories.find(c => c.type === 'expense')
            return fallback?.id || null
        }


        // Helper untuk tanggal WIB (UTC+7)
        // Solusi Hard-coded: Geser waktu server (UTC) sejauh +7 jam
        const getWIBDate = () => {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000); // Konversi ke murni UTC dulu
            const wibTime = new Date(utc + (7 * 60 * 60 * 1000)); // Tambah 7 Jam
            return wibTime.toISOString().slice(0, 10); // Ambil YYYY-MM-DD
        }

        // KASUS A: INPUT ADALAH STRUK (Receipt) -> ARRAY 'transactions'
        if (body.transactions && Array.isArray(body.transactions)) {
            const { store, date } = body

            for (const item of body.transactions) {
                const categoryName = item.category || 'Lainnya'
                const categoryId = findCategoryId(categoryName)

                transactionsToInsert.push({
                    user_id: userId,
                    type: 'expense',
                    amount: Number(item.price),
                    category_id: categoryId,
                    description: store ? `${store} - ${item.name}` : item.name,
                    date: date || getWIBDate(), // Prioritize tanggal struk, fallback ke NOW
                    created_at: new Date().toISOString()
                })
            }
        }
        // KASUS B: INPUT ADALAH SINGLE TRANSACTION (Manual Chat)
        else if (body.amount) {
            const categoryName = body.category || body.categoryId || 'Lainnya'
            const categoryId = findCategoryId(categoryName)

            transactionsToInsert.push({
                user_id: userId,
                type: body.type || 'expense',
                amount: Number(body.amount),
                category_id: categoryId,
                description: body.description || body.originalMessage || 'Transaksi Telegram',
                // FORCE use server time (WIB) untuk chat manual, abaikan tanggal kiriman n8n yang mungkin UTC
                date: getWIBDate(),
                // Save sender name for group transactions
                sender_name: body.senderName || null,
                created_at: new Date().toISOString()
            })
        }

        // 3. Bulk Insert ke tabel transactions
        if (transactionsToInsert.length > 0) {
            const { data, error } = await supabase
                .from('transactions')
                .insert(transactionsToInsert)
                .select()

            if (error) throw error

            return new Response(JSON.stringify({
                success: true,
                message: `Successfully saved ${data.length} transactions`,
                data: data
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        } else {
            return new Response(JSON.stringify({
                success: true,
                message: 'No transactions to save',
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

    } catch (error) {
        console.error('Error processing receipt:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
