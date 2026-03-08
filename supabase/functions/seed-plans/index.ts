const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const plans = [
            {
                id: 'trial',
                name: 'Trial',
                price: 0,
                duration_days: 3,
                features: {
                    app_transactions: "unlimited",
                    messaging_transactions: "unlimited",
                    budget: true,
                    savings: true,
                    reports: true,
                    debts: true,
                    calculator: true,
                    ai_assistant: true,
                    export_reports: true
                }
            },
            {
                id: 'basic',
                name: 'Basic',
                price: 15000,
                duration_days: 30,
                features: {
                    app_transactions: "unlimited",
                    messaging_transactions: 300,
                    budget: true,
                    savings: true,
                    reports: true,
                    debts: true,
                    calculator: true,
                    ai_assistant: false,
                    export_reports: false
                }
            },
            {
                id: 'pro',
                name: 'Pro',
                price: 30000,
                duration_days: 30,
                features: {
                    app_transactions: "unlimited",
                    messaging_transactions: "unlimited",
                    budget: true,
                    savings: true,
                    reports: true,
                    debts: true,
                    calculator: true,
                    ai_assistant: true,
                    export_reports: true
                }
            },
            {
                id: 'basic_3m',
                name: 'Basic (3 Bulan)',
                price: 40500,
                duration_days: 90,
                features: {
                    app_transactions: "unlimited",
                    messaging_transactions: 900,
                    budget: true,
                    savings: true,
                    reports: true,
                    debts: true,
                    calculator: true,
                    ai_assistant: false,
                    export_reports: false
                }
            },
            {
                id: 'pro_3m',
                name: 'Pro (3 Bulan)',
                price: 81000,
                duration_days: 90,
                features: {
                    app_transactions: "unlimited",
                    messaging_transactions: "unlimited",
                    budget: true,
                    savings: true,
                    reports: true,
                    debts: true,
                    calculator: true,
                    ai_assistant: true,
                    export_reports: true
                }
            },
            {
                id: 'basic_1y',
                name: 'Basic (1 Tahun)',
                price: 144000,
                duration_days: 365,
                features: {
                    app_transactions: "unlimited",
                    messaging_transactions: 3600,
                    budget: true,
                    savings: true,
                    reports: true,
                    debts: true,
                    calculator: true,
                    ai_assistant: false,
                    export_reports: false
                }
            },
            {
                id: 'pro_1y',
                name: 'Pro (1 Tahun)',
                price: 288000,
                duration_days: 365,
                features: {
                    app_transactions: "unlimited",
                    messaging_transactions: "unlimited",
                    budget: true,
                    savings: true,
                    reports: true,
                    debts: true,
                    calculator: true,
                    ai_assistant: true,
                    export_reports: true
                }
            }
        ];

        // Upsert plans
        const response = await fetch(
            `${supabaseUrl}/rest/v1/subscription_plans`,
            {
                method: 'POST',
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(plans)
            }
        )

        if (!response.ok) {
            throw new Error(await response.text())
        }

        return new Response(JSON.stringify({ success: true, message: 'Plans seeded successfully' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
