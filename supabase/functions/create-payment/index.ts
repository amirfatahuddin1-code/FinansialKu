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
        // Parse request body once
        const { plan_id, user_id, user_email, user_name } = await req.json()

        if (!plan_id || !user_id) {
            throw new Error('plan_id and user_id are required')
        }

        // Get gateway configuration
        const activeGateway = Deno.env.get('PAYMENT_GATEWAY') || 'midtrans'
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Fetch plan info from database
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
            throw new Error(`Plan not found: ${plan_id}`)
        }

        const plan = plans[0]

        if (plan.price === 0) {
            throw new Error('Cannot purchase free trial')
        }

        // Generate unique order ID
        const timestamp = Date.now()
        const orderId = `KARSAFIN-${plan_id.toUpperCase()}-${user_id.substring(0, 8)}-${timestamp}`

        // APP URL for redirects
        const appUrl = Deno.env.get('APP_URL') || 'https://finansial-ku.vercel.app'

        // ==========================================
        // GATEWAY: MAYAR
        // ==========================================
        if (activeGateway === 'mayar') {
            const mayarApiKey = Deno.env.get('MAYAR_API_KEY')
            const isProduction = Deno.env.get('MAYAR_IS_PRODUCTION') === 'true'

            if (!mayarApiKey) {
                throw new Error('MAYAR_API_KEY is not configured')
            }

            const mayarUrl = isProduction
                ? 'https://api.mayar.id/hl/v1/invoice/create'
                : 'https://api.mayar.club/hl/v1/invoice/create'

            const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

            const mayarPayload = {
                name: user_name || 'Pengguna Karsafin',
                email: user_email || '',
                mobile: '08000000000',
                redirectUrl: `${appUrl}/?payment_success=true`,
                description: `Pembayaran Karsafin ${plan.name} - Order ${orderId}`,
                expiredAt: expiredAt,
                items: [{
                    quantity: 1,
                    rate: plan.price,
                    description: `Karsafin ${plan.name}`,
                }],
                extraData: {
                    noCustomer: user_id,
                    idProd: plan_id,
                },
            }

            const mayarResponse = await fetch(mayarUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mayarApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mayarPayload),
            })

            const mayarData = await mayarResponse.json()

            if (!mayarResponse.ok || mayarData.statusCode !== 200) {
                console.error('Mayar Error:', mayarData)
                throw new Error(mayarData.messages || 'Failed to create Mayar invoice')
            }

            const invoiceData = Array.isArray(mayarData.data) ? mayarData.data[0] : mayarData.data
            const paymentLink = invoiceData?.link

            if (!paymentLink) {
                throw new Error('No payment link returned from Mayar')
            }

            // Store pending transaction
            await fetch(`${supabaseUrl}/rest/v1/payment_transactions`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user_id,
                    order_id: orderId,
                    plan_id: plan_id,
                    amount: plan.price,
                    status: 'pending',
                    payment_gateway: 'mayar',
                    gateway_response: mayarData,
                }),
            })

            return new Response(JSON.stringify({
                success: true,
                redirect_url: paymentLink,
                order_id: orderId,
                gateway: 'mayar',
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // ==========================================
        // GATEWAY: MIDTRANS
        // ==========================================
        const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')
        const midtransIsProd = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'

        if (!serverKey) {
            throw new Error('MIDTRANS_SERVER_KEY is not configured')
        }

        const midtransUrl = midtransIsProd
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

        const midtransPayload = {
            transaction_details: {
                order_id: orderId,
                gross_amount: plan.price,
            },
            item_details: [{
                id: plan_id,
                price: plan.price,
                quantity: 1,
                name: `Karsafin ${plan.name}`,
            }],
            customer_details: {
                email: user_email || '',
                first_name: user_name || 'Pengguna Karsafin',
            },
            callbacks: {
                finish: `${appUrl}/?payment_success=true`,
            },
        }

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

        // Store pending transaction
        await fetch(`${supabaseUrl}/rest/v1/payment_transactions`, {
            method: 'POST',
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user_id,
                order_id: orderId,
                plan_id: plan_id,
                amount: plan.price,
                status: 'pending',
                payment_gateway: 'midtrans',
                gateway_response: midtransData,
            }),
        })

        return new Response(JSON.stringify({
            success: true,
            token: midtransData.token,
            redirect_url: midtransData.redirect_url,
            order_id: orderId,
            gateway: 'midtrans',
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Payment Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
