import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')!

        if (!supabaseUrl || !supabaseServiceKey || !serverKey) {
            throw new Error('Server environment is not fully configured')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Parse body
        const body = await req.json()
        console.log('Midtrans Webhook Received Body:', JSON.stringify(body))

        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            payment_type,
            fraud_status
        } = body

        if (!order_id || !status_code || !gross_amount || !signature_key) {
            throw new Error('Invalid webhook payload structure')
        }

        // Verify Midtrans Signature Key
        // signature_key = SHA512(order_id + status_code + gross_amount + serverKey)
        const payload = order_id + status_code + gross_amount + serverKey
        const encoder = new TextEncoder()
        const data = encoder.encode(payload)
        const hashBuffer = await crypto.subtle.digest("SHA-512", data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")

        if (hashHex !== signature_key) {
            console.error('Signature Mismatch!', { calculated: hashHex, received: signature_key })
            return new Response(JSON.stringify({ success: false, error: 'Signature mismatch' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            })
        }

        console.log(`Signature verified successfully for Order: ${order_id}`)

        // Get matching payment transaction
        const { data: transaction, error: txError } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('order_id', order_id)
            .maybeSingle()

        if (txError) {
            throw txError
        }

        if (!transaction) {
            console.error(`Transaction not found in database for order_id: ${order_id}`)
            // Return 200 to Midtrans so they don't keep retrying an unresolvable transaction
            return new Response(JSON.stringify({ success: false, error: 'Transaction not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })
        }

        // Determine target status
        let targetStatus: 'success' | 'failed' | 'pending' = 'pending'
        const isSuccess = transaction_status === 'settlement' || 
            (transaction_status === 'capture' && fraud_status === 'accept')
        const isFailed = ['deny', 'cancel', 'expire'].includes(transaction_status)

        if (isSuccess) {
            targetStatus = 'success'
        } else if (isFailed) {
            targetStatus = 'failed'
        }

        console.log(`Transaction status determined: ${targetStatus} (original: ${transaction.status})`)

        if (targetStatus === 'success' && transaction.status !== 'success') {
            // Update transaction status
            const { error: updateTxErr } = await supabase
                .from('payment_transactions')
                .update({
                    status: 'success',
                    payment_type: payment_type || transaction.payment_type,
                    midtrans_response: body,
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', order_id)

            if (updateTxErr) throw updateTxErr

            // Fetch Subscription Plan to get duration
            const { data: plan, error: planError } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('id', transaction.plan_id)
                .maybeSingle()

            if (planError) throw planError
            if (!plan) {
                throw new Error(`Subscription plan not found for ID: ${transaction.plan_id}`)
            }

            const durationDays = plan.duration_days || 30
            const startsAt = new Date()
            const expiresAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000)

            console.log(`Activating subscription for user: ${transaction.user_id}, plan: ${transaction.plan_id}, duration: ${durationDays} days`)

            // 1. Deactivate existing active subscriptions
            const { error: deactivateError } = await supabase
                .from('subscriptions')
                .update({
                    status: 'expired',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', transaction.user_id)
                .eq('status', 'active')

            if (deactivateError) throw deactivateError

            // 2. Insert new active subscription
            const { error: insertError } = await supabase
                .from('subscriptions')
                .insert({
                    user_id: transaction.user_id,
                    plan_id: transaction.plan_id,
                    status: 'active',
                    starts_at: startsAt.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    updated_at: new Date().toISOString()
                })

            if (insertError) throw insertError

            console.log(`Subscription successfully activated for user: ${transaction.user_id}`)
        } else if (targetStatus === 'failed' && transaction.status !== 'failed') {
            const { error: updateTxErr } = await supabase
                .from('payment_transactions')
                .update({
                    status: 'failed',
                    midtrans_response: body,
                    updated_at: new Date().toISOString()
                })
                .eq('order_id', order_id)

            if (updateTxErr) throw updateTxErr
            console.log(`Transaction marked as failed for order: ${order_id}`)
        } else {
            console.log(`No updates needed. Transaction is already in status: ${transaction.status}`)
        }

        return new Response(JSON.stringify({ success: true, status: targetStatus }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (error: any) {
        console.error('Webhook processing error:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        })
    }
})
