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

        const { chatId, type, period } = await req.json()

        // Validasi input
        if (!chatId || !type || !period) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: chatId, type, period' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Get user_id - Check if personal chat or group chat
        const chatIdNum = parseInt(chatId.toString())
        const isGroup = chatIdNum < 0 // Negative ID = group

        let userId: string | null = null

        if (isGroup) {
            // Query telegram_group_links for group
            const { data: groupLink, error: groupError } = await supabase
                .from('telegram_group_links')
                .select('user_id')
                .eq('telegram_group_id', chatId.toString())
                .single()

            if (!groupError && groupLink) {
                userId = groupLink.user_id
            }
        } else {
            // Query telegram_user_links for personal chat
            const { data: userLink, error: userError } = await supabase
                .from('telegram_user_links')
                .select('user_id')
                .eq('telegram_user_id', chatId.toString())
                .single()

            if (!userError && userLink) {
                userId = userLink.user_id
            }
        }

        // If no link found in either table
        if (!userId) {
            return new Response(
                JSON.stringify({
                    error: isGroup
                        ? 'Grup belum terhubung. Buka Web App → Pengaturan → Grup Telegram untuk connect grup ini.'
                        : 'User belum terhubung. Ketik /start untuk connect Telegram ke akun Anda.',
                    needsLink: true
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Calculate date range
        const now = new Date()
        let startDate: Date, endDate: Date

        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        } else if (period === 'week') {
            const weekAgo = new Date(now)
            weekAgo.setDate(now.getDate() - 7)
            startDate = weekAgo
            endDate = now
        } else if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            endDate = now
        } else {
            // all
            startDate = new Date('2000-01-01')
            endDate = now
        }

        const startDateStr = startDate.toISOString().split('T')[0]
        const endDateStr = endDate.toISOString().split('T')[0]

        // 3. Query transactions
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('type, amount')
            .eq('user_id', userId)
            .gte('date', startDateStr)
            .lte('date', endDateStr)

        if (txError) {
            throw txError
        }

        // 4. Calculate totals
        let totalIncome = 0
        let totalExpense = 0

        transactions?.forEach((t: any) => {
            if (t.type === 'income') totalIncome += t.amount
            if (t.type === 'expense') totalExpense += t.amount
        })

        const balance = totalIncome - totalExpense

        // 5. Format response message
        const periodText: Record<string, string> = {
            today: 'Hari Ini',
            week: 'Minggu Ini (7 Hari Terakhir)',
            month: 'Bulan Ini',
            all: 'Semua Waktu'
        }

        let message = ''

        if (type === 'expense') {
            message = `💸 Total Pengeluaran ${periodText[period]}:\n\nRp ${totalExpense.toLocaleString('id-ID')}`
        } else if (type === 'income') {
            message = `💰 Total Pemasukan ${periodText[period]}:\n\nRp ${totalIncome.toLocaleString('id-ID')}`
        } else if (type === 'balance') {
            message = `📊 Laporan Keuangan ${periodText[period]}:\n\n💰 Pemasukan: Rp ${totalIncome.toLocaleString('id-ID')}\n💸 Pengeluaran: Rp ${totalExpense.toLocaleString('id-ID')}\n━━━━━━━━━━━━━━━━\n${balance >= 0 ? '✅' : '⚠️'} Saldo: Rp ${balance.toLocaleString('id-ID')}`
        } else if (type === 'budget') {
            // Query budgets for current month
            const currentMonth = now.getMonth() + 1 // 1-12
            const currentYear = now.getFullYear()

            const { data: budgets, error: budgetError } = await supabase
                .from('budgets')
                .select('amount, category_id')
                .eq('user_id', userId)
                .eq('month', currentMonth)
                .eq('year', currentYear)

            if (budgetError) {
                throw budgetError
            }

            // Calculate total budget
            let totalBudget = 0
            budgets?.forEach((b: any) => {
                totalBudget += b.amount
            })

            // Get expenses for current month (reuse transactions query with month period)
            const monthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
            const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString().split('T')[0]

            const { data: monthExpenses, error: expenseError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'expense')
                .gte('date', monthStart)
                .lte('date', monthEnd)

            if (expenseError) {
                throw expenseError
            }

            let monthlyExpense = 0
            monthExpenses?.forEach((e: any) => {
                monthlyExpense += e.amount
            })

            const remaining = totalBudget - monthlyExpense
            const percentage = totalBudget > 0 ? Math.round((monthlyExpense / totalBudget) * 100) : 0

            if (totalBudget === 0) {
                message = `⚠️ Kamu belum set budget untuk bulan ini.\n\nBuka Web App → Anggaran untuk set budget bulanan.`
            } else {
                const status = remaining >= 0
                    ? `✅ Masih aman!`
                    : `🚨 OVER BUDGET!`

                message = `💰 Pantau Budget Bulan Ini:\n\n📊 Budget: Rp ${totalBudget.toLocaleString('id-ID')}\n💸 Pengeluaran: Rp ${monthlyExpense.toLocaleString('id-ID')} (${percentage}%)\n━━━━━━━━━━━━━━━━\n${remaining >= 0 ? '✅' : '⚠️'} Sisa: Rp ${Math.abs(remaining).toLocaleString('id-ID')}\n\n${status}`
            }
        } else {
            message = `❌ Tipe laporan tidak valid: ${type}`
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: message,
                data: {
                    totalIncome,
                    totalExpense,
                    balance,
                    count: transactions?.length || 0,
                    period: periodText[period]
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
