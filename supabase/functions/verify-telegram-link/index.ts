import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { code, telegramUserId, telegramUsername } = await req.json()

        // Validasi input
        if (!code || !telegramUserId) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: code, telegramUserId' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Cek kode di database
        const { data: linkCode, error: codeError } = await supabase
            .from('telegram_link_codes')
            .select('*')
            .eq('code', code.toUpperCase())
            .eq('used', false)
            .gte('expires_at', new Date().toISOString())
            .single()

        if (codeError || !linkCode) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Kode tidak valid atau sudah kadaluarsa. Minta kode baru di Web App.'
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const userId = linkCode.user_id

        // 2. Link Telegram account
        const { data: linked, error: linkError } = await supabase
            .from('telegram_user_links')
            .upsert({
                user_id: userId,
                telegram_user_id: telegramUserId.toString(),
                telegram_username: telegramUsername || null,
            }, { onConflict: 'telegram_user_id' }) // Changed from 'user_id'
            .select()
            .single()

        if (linkError) {
            throw linkError
        }

        // 3. Mark code as used
        await supabase
            .from('telegram_link_codes')
            .update({ used: true })
            .eq('id', linkCode.id)

        return new Response(
            JSON.stringify({
                success: true,
                message: `✅ Berhasil terhubung!\n\nAkun Telegram Anda sekarang terhubung dengan Karsafin.\n\nKirim transaksi langsung via chat. Contoh:\n• makan 50rb\n• gaji 5jt\n• parkir 10k`,
                data: {
                    telegramUserId,
                    telegramUsername,
                    linkedAt: linked.linked_at
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
