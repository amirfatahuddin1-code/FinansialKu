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
        // Parse webhook payload from Mayar
        const payload = await req.json()
        console.log('Mayar Webhook received:', JSON.stringify(payload))

        // Mayar webhook payload structure:
        // event.received: "payment.received" | "payment.reminder"
        // data.id: webhook unique id
        // data.status: boolean (transaction status)
        // data.createdAt: timestamp
        // data.updatedAt: timestamp
        // data.merchantId: string
        // data.merchantEmail: string

        const eventType = payload?.event?.received || payload?.event
        console.log('Event type:', eventType)

        // Only process payment.received events
        if (eventType !== 'payment.received') {
            console.log('Ignoring non-payment event:', eventType)
            return new Response(
                JSON.stringify({ status: 'ignored', event: eventType }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        const webhookData = payload?.data
        if (!webhookData) {
            console.error('No data in webhook payload')
            return new Response(
                JSON.stringify({ status: 'error', message: 'No data in payload' }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Try to find matching transaction by:
        // 1. Looking for Mayar invoice ID in gateway_response
        // 2. Looking for user_id from extraData

        // First, try to find transaction with matching mayar_invoice_id or mayar_transaction_id
        const mayarId = webhookData.id || ''
        const transactionId = webhookData.transactionId || ''

        // Search by gateway_response containing the Mayar IDs
        // We search for pending mayar transactions and match by gateway_response fields
        let matchQuery = `${supabaseUrl}/rest/v1/payment_transactions?payment_gateway=eq.mayar&status=eq.pending&order=created_at.desc&limit=50`

        const searchResponse = await fetch(matchQuery, {
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
            },
        })

        const pendingTransactions = await searchResponse.json()
        console.log('Found pending Mayar transactions:', pendingTransactions?.length || 0)

        // Find matching transaction by Mayar invoice/transaction ID stored in gateway_response
        let matchedTransaction = null
        if (Array.isArray(pendingTransactions)) {
            for (const tx of pendingTransactions) {
                const resp = tx.gateway_response
                if (resp) {
                    if (
                        resp.mayar_invoice_id === mayarId ||
                        resp.mayar_transaction_id === transactionId ||
                        (resp.data && Array.isArray(resp.data) && resp.data[0]?.id === mayarId) ||
                        (resp.data && resp.data.id === mayarId)
                    ) {
                        matchedTransaction = tx
                        break
                    }
                }
            }
        }

        if (!matchedTransaction) {
            console.error('No matching transaction found for Mayar webhook:', mayarId)
            return new Response(
                JSON.stringify({ status: 'transaction_not_found', mayar_id: mayarId }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

        console.log('Matched transaction:', matchedTransaction.order_id, 'for user:', matchedTransaction.user_id)

        // Determine payment status from Mayar webhook
        const isSuccess = webhookData.status === true || webhookData.status === 'true'
        const paymentStatus = isSuccess ? 'success' : 'pending'

        // Update payment transaction status
        const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/payment_transactions?order_id=eq.${matchedTransaction.order_id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify({
                    status: paymentStatus,
                    payment_type: 'mayar',
                    gateway_response: {
                        ...matchedTransaction.gateway_response,
                        webhook_payload: payload,
                    },
                    updated_at: new Date().toISOString(),
                }),
            }
        )

        const updatedTransactions = await updateResponse.json()

        // If payment successful, activate subscription
        if (paymentStatus === 'success') {
            console.log('Mayar payment successful, activating subscription for user:', matchedTransaction.user_id)

            // Call activate_subscription function
            const activateResponse = await fetch(
                `${supabaseUrl}/rest/v1/rpc/activate_subscription`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        p_user_id: matchedTransaction.user_id,
                        p_plan_id: matchedTransaction.plan_id,
                        p_order_id: matchedTransaction.order_id,
                    }),
                }
            )

            if (!activateResponse.ok) {
                console.error('Failed to activate subscription:', await activateResponse.text())
            } else {
                console.log('Subscription activated successfully via Mayar')
            }
        }

        return new Response(
            JSON.stringify({
                status: 'ok',
                order_id: matchedTransaction.order_id,
                payment_status: paymentStatus,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Mayar Webhook Error:', error)

        // Always return 200 to acknowledge webhook receipt
        return new Response(
            JSON.stringify({ status: 'error', message: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    }
})
