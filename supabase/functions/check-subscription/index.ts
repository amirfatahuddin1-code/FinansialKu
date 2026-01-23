import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: { Authorization: authHeader },
            },
        })

        // Get user from JWT
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        const userId = user.id

        // Get active subscription using database function
        const { data: subscription, error: subError } = await supabase
            .rpc('get_active_subscription', { p_user_id: userId })

        if (subError) {
            console.error('Error getting subscription:', subError)
        }

        // Get messaging usage
        const { data: usage, error: usageError } = await supabase
            .rpc('get_messaging_usage', { p_user_id: userId })

        if (usageError) {
            console.error('Error getting usage:', usageError)
        }

        // Determine subscription status
        let status = 'expired'
        let planId = null
        let planName = 'Tidak Aktif'
        let expiresAt = null
        let features = {
            app_transactions: 'unlimited',
            messaging_transactions: 0,
            budget: true,
            savings: true,
            reports: true,
            debts: true,
            calculator: true,
            ai_assistant: false,
            export_reports: false,
        }

        if (subscription && subscription.length > 0) {
            const sub = subscription[0]
            status = sub.status
            planId = sub.plan_id
            planName = sub.plan_name
            expiresAt = sub.expires_at
            features = sub.features
        }

        // Get messaging limit and current usage
        const messagingLimit = typeof features.messaging_transactions === 'number'
            ? features.messaging_transactions
            : null // null means unlimited

        const currentUsage = usage && usage.length > 0 ? usage[0] : { wa_count: 0, telegram_count: 0, total_count: 0 }

        // Calculate remaining messaging quota
        const messagingRemaining = messagingLimit !== null
            ? Math.max(0, messagingLimit - currentUsage.total_count)
            : null // null means unlimited

        // Calculate days until expiry
        let daysRemaining = 0
        if (expiresAt) {
            const now = new Date()
            const expiry = new Date(expiresAt)
            daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        }

        return new Response(
            JSON.stringify({
                status: status,
                plan_id: planId,
                plan_name: planName,
                expires_at: expiresAt,
                days_remaining: daysRemaining,
                features: features,
                messaging: {
                    limit: messagingLimit,
                    used: currentUsage.total_count,
                    remaining: messagingRemaining,
                    wa_count: currentUsage.wa_count,
                    telegram_count: currentUsage.telegram_count,
                },
                is_active: ['trial', 'active'].includes(status),
                can_use_ai: features.ai_assistant === true,
                can_export: features.export_reports === true,
                can_message: messagingRemaining === null || messagingRemaining > 0,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Check Subscription Error:', error)

        return new Response(
            JSON.stringify({
                error: error.message,
                status: 'expired',
                is_active: false,
                can_use_ai: false,
                can_export: false,
                can_message: false,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: error.message === 'Unauthorized' ? 401 : 400,
            }
        )
    }
})
