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

            const catLower = (catName || '').toLowerCase()
            const descLower = (description || '').toLowerCase()

            // Keyword Mapping: OpenAI Category -> Indonesian Keywords
            const keywordMap: Record<string, string[]> = {
                'entertainment': ['hiburan', 'nonton', 'bioskop', 'game', 'rekreasi', 'hobi', 'wisata'],
                'food': ['makan', 'minum', 'jajan', 'pangan', 'konsumsi'],
                'transport': ['transport', 'bensin', 'parkir', 'kendaraan', 'ojek', 'grab', 'gojek'],
                'shopping': ['belanja', 'shopping', 'mart', 'baju', 'pakaian'],
                'bills': ['tagihan', 'listrik', 'air', 'internet', 'telpon', 'pulsa'],
                'health': ['kesehatan', 'obat', 'dokter', 'medis'],
                'education': ['pendidikan', 'sekolah', 'kuliah', 'kursus', 'buku'],
                'debt': ['cicilan', 'hutang', 'kredit', 'pinjaman'],
                'salary': ['gaji', 'upah', 'pendapatan', 'honor'],
                'bonus': ['bonus', 'thr', 'hadiah', 'dividen']
            }

            // 1. Matched based on Mapped Keywords (High Priority)
            // Jika catName adalah kategori umum (misal 'entertainment'), cari kategori user yang mengandung keyword relevan
            const targetKeywords = keywordMap[catLower]
            if (targetKeywords) {
                for (const keyword of targetKeywords) {
                    const match = relevantCategories.find(c => c.name.toLowerCase().includes(keyword))
                    if (match) return match.id
                }
            }

            // 2. Exact Match Name
            const exact = relevantCategories.find(c => c.name.toLowerCase() === catLower)
            if (exact) return exact.id

            // 3. Partial Match: Category Name matches Description Keywords (Medium Priority)
            // Hanya mencari nama kategori DI DALAM deskripsi, BUKAN sebaliknya.
            // Agar "Bayar Bioskop" (desc) tidak match "Bayar Hutang" (cat) hanya karena kata "Bayar".
            // Tapi "Uang Makan" (cat) bisa match "Makan siang" (desc).
            for (const cat of relevantCategories) {
                const catNameLower = cat.name.toLowerCase()

                // Strict check: Nama kategori harus ada di deskripsi ATAU OpenAI category
                // Hindari match kata umum pendek (<=3 huruf) kecuali exact
                if (catNameLower.length > 3) {
                    if (descLower.includes(catNameLower) || catLower.includes(catNameLower)) {
                        return cat.id
                    }
                }
            }

            // 4. Fallback: Word by Word Match (Low Priority - Last Resort)
            // Hati-hati dengan kata umum "Bayar", "Beli"
            const blacklistWords = ['bayar', 'beli', 'uang', 'transaksi']
            const words = descLower.split(/\s+/).filter(w => w.length > 3 && !blacklistWords.includes(w))

            for (const word of words) {
                for (const cat of relevantCategories) {
                    if (cat.name.toLowerCase().includes(word)) {
                        return cat.id
                    }
                }
            }

            // 5. Absolute Fallback: category pertama yang sesuai tipe
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
                const itemName = item.name || item.description || 'Item'

                transactionsToInsert.push({
                    user_id: userId,
                    type: 'expense',
                    amount: Number(item.amount || item.price),
                    category_id: categoryId,
                    description: store ? `${store} - ${itemName}` : itemName,
                    date: date || getWIBDate(), // Prioritize tanggal struk, fallback ke NOW
                    sender_name: body.senderName || null,
                    created_at: new Date().toISOString(),
                    _categoryName: categoryName,
                    _originalName: itemName
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
            // Sanitize data for insert (remove _categoryName and _originalName)
            const cleanTransactions = transactionsToInsert.map(({ _categoryName, _originalName, ...keep }) => keep)

            const { data, error } = await supabase
                .from('transactions')
                .insert(cleanTransactions)
                .select()

            if (error) throw error

            // Combine inserted data with category names for response
            const responseData = data.map((item, index) => ({
                ...item,
                categoryName: transactionsToInsert[index]._categoryName,
                name: transactionsToInsert[index]._originalName
            }))

            return new Response(JSON.stringify({
                success: true,
                message: `Successfully saved ${data.length} transactions`,
                data: responseData,
                // Debugging Info
                receivedSenderName: body.senderName || 'UNDEFINED IN BODY',
                receivedBodyKeys: Object.keys(body),

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
