const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        console.log('Mayar Webhook Payload:', JSON.stringify(payload))

        const eventType = payload?.event?.received || payload?.event
        if (eventType !== 'payment.received') {
            return new Response(JSON.stringify({ status: 'ignored', event: eventType }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const webhookData = payload?.data || {}
        const extraData = payload?.extraData || webhookData?.extraData || {}

        const mayarId = webhookData.id || payload.id
        const userId = extraData.noCustomer
        const planId = extraData.idProd
        const isSuccess = webhookData.status === true || webhookData.status === 'true'

        if (!isSuccess) {
            return new Response(JSON.stringify({ status: 'not_success' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // FIND TRANSACTION
        let matchedTransaction = null
        if (userId && planId) {
            const searchResponse = await fetch(
                `${supabaseUrl}/rest/v1/payment_transactions?user_id=eq.${userId}&plan_id=eq.${planId}&status=eq.pending&order=created_at.desc&limit=1`,
                { headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}` } }
            )
            const txs = await searchResponse.json()
            if (txs && txs.length > 0) matchedTransaction = txs[0]
        }

        if (!matchedTransaction) {
            const recentResponse = await fetch(
                `${supabaseUrl}/rest/v1/payment_transactions?payment_gateway=eq.mayar&status=eq.pending&order=created_at.desc&limit=20`,
                { headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}` } }
            )
            const recents = await recentResponse.json()
            if (Array.isArray(recents)) {
                for (const tx of recents) {
                    const resp = tx.gateway_response
                    if (resp && (resp.mayar_invoice_id === mayarId || (resp.data && (resp.data.id === mayarId || (Array.isArray(resp.data) && resp.data[0]?.id === mayarId))))) {
                        matchedTransaction = tx
                        break
                    }
                }
            }
        }

        if (!matchedTransaction) {
            return new Response(JSON.stringify({ status: 'error', message: 'Transaction not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // ACTIVATE SUBSCRIPTION
        let activationResult = { success: false, data: null, error: null }
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

        if (activateResponse.ok) {
            activationResult.success = true
            activationResult.data = await activateResponse.json()
        } else {
            activationResult.error = await activateResponse.text()
        }

        // UPDATE TRANSACTION STATUS
        await fetch(
            `${supabaseUrl}/rest/v1/payment_transactions?order_id=eq.${matchedTransaction.order_id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'success',
                    payment_type: 'mayar',
                    gateway_response: {
                        ...matchedTransaction.gateway_response,
                        webhook_payload: payload,
                        activation_result: activationResult
                    },
                    updated_at: new Date().toISOString()
                }),
            }
        )

        return new Response(JSON.stringify({
            status: activationResult.success ? 'success' : 'activation_failed',
            order_id: matchedTransaction.order_id,
            activation: activationResult
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ status: 'error', message: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
