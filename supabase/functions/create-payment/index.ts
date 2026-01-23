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
        // Get Midtrans Server Key from environment
        const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')
        const isProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'

        if (!serverKey) {
            throw new Error('MIDTRANS_SERVER_KEY is not configured')
        }

        // Parse request body
        const { plan_id, user_id, user_email, user_name } = await req.json()

        if (!plan_id || !user_id) {
            throw new Error('plan_id and user_id are required')
        }

        // Get plan details from database
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Fetch plan info
        const planResponse = await fetch(
            `${supabaseUrl}/rest/v1/subscription_plans?id=eq.${plan_id}`,
            {
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                },
            }
        )

        const plans = await planResponse.json()
        if (!plans || plans.length === 0) {
            throw new Error('Invalid plan_id')
        }

        const plan = plans[0]

        if (plan.price === 0) {
            throw new Error('Cannot purchase free trial')
        }

        // Generate unique order ID
        const timestamp = Date.now()
        const orderId = `KARSAFIN-${plan_id.toUpperCase()}-${user_id.substring(0, 8)}-${timestamp}`

        // Midtrans Snap API endpoint
        const midtransUrl = isProduction
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

        // Prepare Midtrans request
        const midtransPayload = {
            transaction_details: {
                order_id: orderId,
                gross_amount: plan.price,
            },
            item_details: [{
                id: plan_id,
                price: plan.price,
                quantity: 1,
                name: `Karsafin ${plan.name} - 30 Hari`,
            }],
            customer_details: {
                email: user_email || '',
                first_name: user_name || 'Pengguna Karsafin',
            },
            callbacks: {
                finish: `${Deno.env.get('APP_URL') || 'https://finansial-ku.vercel.app'}/?payment_success=true`,
            },
        }

        // Call Midtrans API
        const auth = btoa(`${serverKey}:`)
        const midtransResponse = await fetch(midtransUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(midtransPayload),
        })

        const midtransData = await midtransResponse.json()

        if (!midtransResponse.ok) {
            console.error('Midtrans Error:', midtransData)
            throw new Error(midtransData.error_messages?.join(', ') || 'Failed to create payment')
        }

        // Store pending transaction in database
        const insertResponse = await fetch(
            `${supabaseUrl}/rest/v1/payment_transactions`,
            {
                method: 'POST',
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                    user_id: user_id,
                    order_id: orderId,
                    plan_id: plan_id,
                    amount: plan.price,
                    status: 'pending',
                    midtrans_response: midtransData,
                }),
            }
        )

        if (!insertResponse.ok) {
            console.error('Failed to store transaction:', await insertResponse.text())
            // Don't throw - payment token was already created
        }

        return new Response(
            JSON.stringify({
                success: true,
                token: midtransData.token,
                redirect_url: midtransData.redirect_url,
                order_id: orderId,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Create Payment Error:', error)

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
