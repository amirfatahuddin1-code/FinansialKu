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
        // Get Mayar API Key from environment
        const mayarApiKey = Deno.env.get('MAYAR_API_KEY')
        const isProduction = Deno.env.get('MAYAR_IS_PRODUCTION') === 'true'

        if (!mayarApiKey) {
            throw new Error('MAYAR_API_KEY is not configured')
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

        // Mayar API endpoint
        const mayarUrl = isProduction
            ? 'https://api.mayar.id/hl/v1/invoice'
            : 'https://api.mayar.club/hl/v1/invoice'

        // Redirect URL after payment
        const appUrl = Deno.env.get('APP_URL') || 'https://finansial-ku.vercel.app'

        // Expiration: 24 hours from now
        const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

        // Prepare Mayar invoice request
        const mayarPayload = {
            name: user_name || 'Pengguna Karsafin',
            email: user_email || '',
            mobile: '08000000000', // Default, as mobile is required by Mayar
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

        console.log('Mayar Request:', JSON.stringify(mayarPayload))

        // Call Mayar API
        const mayarResponse = await fetch(mayarUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mayarApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mayarPayload),
        })

        const mayarData = await mayarResponse.json()
        console.log('Mayar Response:', JSON.stringify(mayarData))

        if (!mayarResponse.ok || mayarData.statusCode !== 200) {
            console.error('Mayar Error:', mayarData)
            throw new Error(mayarData.messages || 'Failed to create Mayar invoice')
        }

        // Extract payment link from response
        const invoiceData = Array.isArray(mayarData.data) ? mayarData.data[0] : mayarData.data
        const paymentLink = invoiceData?.link
        const mayarInvoiceId = invoiceData?.id
        const mayarTransactionId = invoiceData?.transactionId

        if (!paymentLink) {
            throw new Error('No payment link returned from Mayar')
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
                    payment_gateway: 'mayar',
                    gateway_response: {
                        ...mayarData,
                        mayar_invoice_id: mayarInvoiceId,
                        mayar_transaction_id: mayarTransactionId,
                    },
                }),
            }
        )

        if (!insertResponse.ok) {
            console.error('Failed to store transaction:', await insertResponse.text())
            // Don't throw - payment link was already created
        }

        return new Response(
            JSON.stringify({
                success: true,
                redirect_url: paymentLink,
                order_id: orderId,
                gateway: 'mayar',
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Create Payment (Mayar) Error:', error)

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
