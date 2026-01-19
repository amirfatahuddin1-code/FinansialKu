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

        // Helper function cari category ID - FLEKSIBEL berdasarkan nama kategori user
        const findCategoryId = (catName: string, transactionType: string = 'expense', description: string = '') => {
            if (!categories) return null

            // Filter kategori berdasarkan tipe transaksi
            const relevantCategories = categories.filter(c => c.type === transactionType)

            if (!catName && !description) {
                const fallback = relevantCategories[0]
                return fallback?.id || null
            }

            const searchText = `${catName || ''} ${description || ''}`.toLowerCase()
            const catLower = (catName || '').toLowerCase()

            // 1. Coba match exact name (case insensitive)
            const exact = relevantCategories.find(c => c.name.toLowerCase() === catLower)
            if (exact) return exact.id

            // 2. Coba match jika nama kategori OpenAI MENGANDUNG nama kategori user
            // atau sebaliknya (untuk fleksibilitas maksimal)
            for (const cat of relevantCategories) {
                const catNameLower = cat.name.toLowerCase()
                // Match jika: 
                // - Nama kategori user ada di dalam searchText
                // - ATAU searchText ada di dalam nama kategori user
                if (searchText.includes(catNameLower) || catNameLower.includes(catLower)) {
                    return cat.id
                }
            }

            // 3. Coba match berdasarkan kata-kata dalam searchText vs nama kategori
            const words = searchText.split(/\s+/).filter(w => w.length > 2)
            for (const word of words) {
                for (const cat of relevantCategories) {
                    const catNameLower = cat.name.toLowerCase()
                    // Jika kata dari searchText cocok dengan nama kategori
                    if (catNameLower.includes(word) || word.includes(catNameLower)) {
                        return cat.id
                    }
                }
            }

            // 4. Fallback: category pertama yang sesuai tipe
            const fallback = relevantCategories[0]
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
            const transactionType = body.type || 'expense'
            const categoryName = body.category || body.categoryId || ''
            const description = body.description || body.originalMessage || ''
            const categoryId = findCategoryId(categoryName, transactionType, description)

            // Cari nama kategori yang digunakan untuk response
            const usedCategory = categories?.find(c => c.id === categoryId)
            const usedCategoryName = usedCategory?.name || categoryName || 'Lainnya'

            transactionsToInsert.push({
                user_id: userId,
                type: transactionType,
                amount: Number(body.amount),
                category_id: categoryId,
                description: body.description || body.originalMessage || 'Transaksi Telegram',
                // FORCE use server time (WIB) untuk chat manual, abaikan tanggal kiriman n8n yang mungkin UTC
                date: getWIBDate(),
                // Save sender name for group transactions
                sender_name: body.senderName || null,
                created_at: new Date().toISOString(),
                // Extra field for response (won't be saved but will be in transactionsToInsert)
                _categoryName: usedCategoryName
            })
        }

        // 3. Bulk Insert ke tabel transactions
        if (transactionsToInsert.length > 0) {
            // Sanitize data for insert (remove _categoryName)
            const cleanTransactions = transactionsToInsert.map(({ _categoryName, ...keep }) => keep)

            const { data, error } = await supabase
                .from('transactions')
                .insert(cleanTransactions)
                .select()

            if (error) throw error

            // Combine inserted data with category names for response
            const responseData = data.map((item, index) => ({
                ...item,
                categoryName: transactionsToInsert[index]._categoryName
            }))

            return new Response(JSON.stringify({
                success: true,
                message: `Successfully saved ${data.length} transactions`,
                data: responseData,
                // For convenience in simple single-transaction flows (n8n)
                // For convenience in simple single-transaction flows (n8n)
                categoryName: transactionsToInsert[0]?._categoryName,
                amount: transactionsToInsert[0]?.amount,
                type: transactionsToInsert[0]?.type,
                description: transactionsToInsert[0]?.description
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
