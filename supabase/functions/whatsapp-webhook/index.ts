// Supabase Edge Function: whatsapp-webhook
// Receives parsed transactions from n8n and saves to database

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

        // Expected body from n8n:
        // {
        //   phone_number: string,      // sender's phone number
        //   sender_name: string,       // sender's name
        //   group_id?: string,         // group ID if from group
        //   group_name?: string,       // group name if from group
        //   type: 'income' | 'expense',
        //   amount: number,
        //   category: string,          // category keyword from AI
        //   description: string,
        //   original_message: string
        // }

        const {
            phone_number,
            sender_name,
            group_id,
            group_name,
            type,
            amount,
            category,
            description,
            original_message
        } = body

        if (!phone_number || !type || !amount) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Missing required fields: phone_number, type, or amount'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (Number(amount) <= 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid amount',
                message: 'Jumlah transaksi harus lebih besar dari 0.'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Normalize phone number - convert 08xxx to 628xxx and vice versa
        function normalizePhone(phone: string): string[] {
            const cleaned = phone.replace(/[\s\-\+]/g, '')
            const variants = [cleaned]

            // If starts with 62, also check 0 version
            if (cleaned.startsWith('62')) {
                variants.push('0' + cleaned.slice(2))
            }
            // If starts with 0, also check 62 version
            if (cleaned.startsWith('0')) {
                variants.push('62' + cleaned.slice(1))
            }

            return variants
        }

        // Find linked user - check by phone number first, then by group
        let userId = null
        let linkType = null

        // Check personal link with normalized phone variants
        const phoneVariants = normalizePhone(phone_number)
        const { data: userLink } = await supabase
            .from('whatsapp_user_links')
            .select('user_id')
            .in('phone_number', phoneVariants)
            .limit(1)
            .single()

        if (userLink) {
            userId = userLink.user_id
            linkType = 'personal'
        }

        // If not found by phone and has group_id, check group link
        if (!userId && group_id) {
            const { data: groupLink } = await supabase
                .from('whatsapp_group_links')
                .select('user_id')
                .eq('group_id', group_id)
                .single()

            if (groupLink) {
                userId = groupLink.user_id
                linkType = 'group'
            }
        }

        if (!userId) {
            console.log('User not linked. Phone:', phone_number, 'Group:', group_id)
            return new Response(JSON.stringify({
                success: false,
                error: 'not_linked',
                message: 'Nomor WhatsApp atau grup belum terhubung dengan akun FinansialKu.'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Find category by keyword
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, type')
            .eq('user_id', userId)

        // --- FEATURE GATING & LIMIT CHECK ---

        // Create debug info object
        const debugInfo: any = {}

        // 1. Get subscription status
        // FIX: Use correct RPC name 'get_active_subscription'
        const { data: sub } = await supabase.rpc('get_active_subscription', { p_user_id: userId })
        const subscription = sub && sub.length > 0 ? sub[0] : null

        debugInfo.plan_id = subscription?.plan_id || 'none'
        debugInfo.status = subscription?.status || 'none'

        // 2. Check if user can transact
        if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trial')) {
            return new Response(JSON.stringify({
                success: false,
                error: 'subscription_required',
                message: 'Langganan Anda tidak aktif. Silakan upgrade untuk mencatat transaksi via WhatsApp.'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 3. Check Usage Limit for Basic Plans
        // Limit is 300/month for all Basic plans (monthly, quarterly, yearly)
        if (subscription.plan_id && subscription.plan_id.startsWith('basic') && subscription.status !== 'trial') {
            const { data: usage } = await supabase.rpc('get_messaging_usage', { p_user_id: userId })
            const currentUsage = usage && usage.length > 0 ? usage[0].total_count : 0

            debugInfo.usage = currentUsage

            if (currentUsage >= 300) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'limit_exceeded',
                    message: 'Kuota transaksi bulanan terlampaui (300 transaksi). Upgrade ke Pro untuk transaksi unlimited!'
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        }
        // ------------------------------------

        const matchedCategory = findCategory(category || description, categories || [], type)

        // Insert transaction directly to main transactions table
        const { data, error } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: type,
                amount: amount,
                category_id: matchedCategory?.id || null,
                description: `${description || 'Transaksi'} (via WA)`,
                date: new Date().toISOString().split('T')[0],
                sender_name: sender_name || null,
                source: 'whatsapp'
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
            p_type: 'wa'
        })
        // -----------------------------

        return new Response(JSON.stringify({
            success: true,
            transaction: data,
            category_name: matchedCategory?.name || 'Lainnya',
            link_type: linkType,
            debug: debugInfo
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})

function findCategory(keyword: string, categories: any[], type: string) {
    if (!keyword) return null

    const lowerKeyword = keyword.toLowerCase()

    const keywordMap: { [key: string]: string[] } = {
        'makanan': ['makan', 'food', 'makanan', 'resto', 'restaurant', 'cafe', 'kopi', 'coffee', 'sarapan', 'minum', 'snack'],
        'transport': ['transport', 'transportasi', 'grab', 'gojek', 'uber', 'taxi', 'bensin', 'fuel', 'parkir', 'ojek', 'bus', 'kereta'],
        'belanja': ['belanja', 'shop', 'shopping', 'beli', 'buy', 'toko'],
        'hiburan': ['hiburan', 'entertainment', 'movie', 'film', 'game', 'nonton', 'netflix', 'spotify'],
        'kesehatan': ['kesehatan', 'health', 'dokter', 'doctor', 'obat', 'medicine', 'apotek', 'sakit'],
        'tagihan': ['tagihan', 'bill', 'listrik', 'electric', 'air', 'water', 'internet', 'pulsa', 'wifi'],
        'pendidikan': ['pendidikan', 'education', 'sekolah', 'kuliah', 'buku', 'kursus'],
        'gaji': ['gaji', 'salary', 'penghasilan'],
        'bonus': ['bonus', 'reward', 'hadiah', 'thr'],
        'investasi': ['investasi', 'investment', 'saham', 'reksadana', 'crypto'],
        'freelance': ['freelance', 'project', 'proyek', 'klien', 'client'],
    }

    // Find matching category by keyword
    for (const cat of categories) {
        const catName = cat.name.toLowerCase()

        // Direct match
        if (catName.includes(lowerKeyword) || lowerKeyword.includes(catName)) {
            return cat
        }

        // Check keyword mappings
        for (const [catKey, keywords] of Object.entries(keywordMap)) {
            if (catName.includes(catKey) && keywords.some(k => lowerKeyword.includes(k) || k.includes(lowerKeyword))) {
                return cat
            }
        }
    }

    // Return first category of matching type
    return categories.find(c => c.type === type && c.name.toLowerCase().includes('lain'))
        || categories.find(c => c.type === type)
}
