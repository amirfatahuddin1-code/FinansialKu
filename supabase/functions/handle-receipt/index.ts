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

        if (!chatId || !transactions || !Array.isArray(transactions)) {
            throw new Error('Invalid data format. Need chatId and transactions array.')
        }

        // 1. Cari User ID berdasarkan Telegram Chat ID
        const telegramId = String(chatId)
        const { data: link, error: linkError } = await supabase
            .from('telegram_user_links')
            .select('user_id')
            .eq('telegram_user_id', telegramId)
            .single()

        if (linkError || !link) {
            console.error('User link not found for chatId:', telegramId)
            return new Response(JSON.stringify({
                error: 'User not linked. Please link your Telegram account in the app first.'
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const userId = link.user_id

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
            // Coba match exact name (case insensitive)
            const exact = categories.find(c => c.name.toLowerCase() === catName.toLowerCase())
            if (exact) return exact.id

            // Coba match default categories (mapping simple)
            const map: any = {
                'food': ['makan', 'food', 'minum'],
                'transport': ['transport', 'bensin'],
                'shopping': ['belanja', 'mart', 'market'],
            }

            for (const [key, keywords] of Object.entries(map)) {
                if (keywords.includes(catName.toLowerCase())) {
                    const found = categories.find(c => c.name.toLowerCase().includes(key))
                    if (found) return found.id
                }
            }

            // Fallback: category pertama yg tipe expense
            const fallback = categories.find(c => c.type === 'expense')
            return fallback?.id || null
        }

        for (const item of transactions) {
            // Mapping category dari n8n (text) ke category_id (uuid)
            const categoryName = item.category || 'Lainnya'
            const categoryId = findCategoryId(categoryName)

            transactionsToInsert.push({
                user_id: userId,
                type: 'expense',
                amount: Number(item.price), // Pastikan number
                category_id: categoryId,
                description: `${store} - ${item.name}`,
                date: date || new Date().toISOString().split('T')[0],
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
