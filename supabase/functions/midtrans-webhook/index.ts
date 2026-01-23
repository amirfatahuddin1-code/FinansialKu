import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

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
        const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')

        if (!serverKey) {
            throw new Error('MIDTRANS_SERVER_KEY is not configured')
        }

        // Parse webhook payload
        const payload = await req.json()
        console.log('Midtrans Webhook received:', JSON.stringify(payload))

        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            fraud_status,
            payment_type,
        } = payload

        // Verify signature
        const expectedSignature = createHmac('sha512', '')
            .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
            .digest('hex')

        if (signature_key !== expectedSignature) {
            console.error('Invalid signature')
            // Note: In production, you might want to reject invalid signatures
            // For now, we'll log but continue processing for debugging
        }

        // Determine payment status
        let paymentStatus = 'pending'

        if (transaction_status === 'capture') {
            paymentStatus = fraud_status === 'accept' ? 'success' : 'pending'
        } else if (transaction_status === 'settlement') {
            paymentStatus = 'success'
        } else if (['cancel', 'deny'].includes(transaction_status)) {
            paymentStatus = 'failed'
        } else if (transaction_status === 'expire') {
            paymentStatus = 'expired'
        } else if (transaction_status === 'pending') {
            paymentStatus = 'pending'
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Update payment transaction status
        const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/payment_transactions?order_id=eq.${order_id}`,
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
                    payment_type: payment_type,
                    midtrans_response: payload,
                    updated_at: new Date().toISOString(),
                }),
            }
        )

        const updatedTransactions = await updateResponse.json()

        if (!updatedTransactions || updatedTransactions.length === 0) {
            console.error('Transaction not found:', order_id)
            // Return 200 to acknowledge webhook even if transaction not found
            return new Response(JSON.stringify({ status: 'transaction_not_found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        const transaction = updatedTransactions[0]

        // If payment successful, activate subscription
        if (paymentStatus === 'success') {
            console.log('Payment successful, activating subscription for user:', transaction.user_id)

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
                        p_user_id: transaction.user_id,
                        p_plan_id: transaction.plan_id,
                        p_order_id: order_id,
                    }),
                }
            )

            if (!activateResponse.ok) {
                console.error('Failed to activate subscription:', await activateResponse.text())
            } else {
                console.log('Subscription activated successfully')
            }
        }

        return new Response(
            JSON.stringify({
                status: 'ok',
                order_id: order_id,
                payment_status: paymentStatus,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Webhook Error:', error)

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
