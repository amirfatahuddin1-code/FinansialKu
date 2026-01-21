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

        // Find linked user - check by phone number first, then by group
        let userId = null
        let linkType = null

        // Check personal link
        const { data: userLink } = await supabase
            .from('whatsapp_user_links')
            .select('user_id')
            .eq('phone_number', phone_number)
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

        const matchedCategory = findCategory(category || description, categories || [], type)

        // Insert transaction
        const { data, error } = await supabase
            .from('whatsapp_transactions')
            .insert({
                user_id: userId,
                phone_number: phone_number,
                sender_name: sender_name || null,
                group_id: group_id || null,
                group_name: group_name || null,
                type: type,
                amount: amount,
                category_id: matchedCategory?.id || null,
                description: description,
                original_message: original_message,
                synced: false
            })
            .select()
            .single()

        if (error) {
            console.error('Insert error:', error)
            throw error
        }

        return new Response(JSON.stringify({
            success: true,
            transaction: data,
            category_name: matchedCategory?.name || 'Lainnya',
            link_type: linkType
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
