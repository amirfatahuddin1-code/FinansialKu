import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const groqApiKey = Deno.env.get('GROQ_API_KEY')
        if (!groqApiKey) {
            throw new Error('GROQ_API_KEY not configured')
        }

        const { message, history, context } = await req.json()

        if (!message) {
            return new Response(
                JSON.stringify({ error: 'No message provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const systemPrompt = `Kamu adalah Karsafin AI, asisten keuangan pribadi yang membantu pengguna mengelola keuangan mereka dalam Bahasa Indonesia.

Kamu memiliki akses ke data keuangan pengguna berikut:
- Total pemasukan bulan ini: Rp ${context?.monthlyIncome || 0}
- Total pengeluaran bulan ini: Rp ${context?.monthlyExpense || 0}
- Kategori pengeluaran: ${context?.categories || 'Tidak ada data'}
- Budget yang telah diatur: ${context?.budgets || 'Tidak ada data'}
- Jumlah transaksi bulan ini: ${context?.transactionCount || 0}
- Nama pengguna: ${context?.userName || 'Pengguna'}

Panduan merespon:
1. Gunakan Bahasa Indonesia yang ramah dan mudah dipahami
2. Jika ditanya tentang data spesifik pengguna, gunakan konteks yang diberikan
3. Jika pengguna ingin mencatat transaksi, arahkan mereka ke fitur "Catat transaksi"
4. Jika pengguna ingin scan struk, arahkan ke fitur "Scan struk"
5. Berikan saran keuangan yang bertanggung jawab
6. Jika ada pertanyaan di luar pengetahuanmu, akui dengan jujur
7. Jangan membuat klaim investasi yang tidak realistis
8. Respons harus informatif dan membantu, seperti asisten keuangan profesional
9. Gunakan format teks dengan emoji secukupnya agar mudah dibaca
10. Jika pengguna bertanya tentang data yang tidak tersedia di konteks, sarankan mereka untuk menggunakan fitur yang sesuai di aplikasi Karsafin
11. Jika ada yang ingin ditanyakan lebih lanjut, persilakan pengguna untuk bertanya`

        const messages = [
            { role: 'system', content: systemPrompt },
            ...(history || []).slice(-20).map((m: { role: string; content: string }) => ({
                role: m.role,
                content: m.content
            })),
            { role: 'user', content: message }
        ]

        const chatCompletion = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
                temperature: 0.7,
                max_tokens: 2048,
            }),
        })

        if (!chatCompletion.ok) {
            const errorText = await chatCompletion.text()
            console.error('Groq API error:', chatCompletion.status, errorText)
            return new Response(
                JSON.stringify({
                    response: JSON.stringify([
                        { title: "Pantau Arus Kas", description: `Pengeluaran Rp${(context?.monthlyExpense || 0).toLocaleString('id-ID')} dari pendapatan Rp${(context?.monthlyIncome || 0).toLocaleString('id-ID')}. Catat setiap pengeluaran untuk identifikasi pos yang bisa dihemat.`, tag: "Penghematan", tagColor: "blue" },
                        { title: "Bangun Dana Darurat", description: "Idealnya dana darurat 3-6 bulan pengeluaran. Mulai sisihkan sebagian pendapatan setiap bulan.", tag: "Dana Darurat", tagColor: "purple" },
                        { title: "Evaluasi Budget", description: "Review anggaran bulanan. Pastikan alokasi 50% kebutuhan, 30% keinginan, 20% tabungan/investasi.", tag: "Tabungan", tagColor: "green" }
                    ]),
                    fromCache: true,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const result = await chatCompletion.json()
        const responseText = result.choices?.[0]?.message?.content || 'Maaf, saya tidak bisa memproses pertanyaan Anda saat ini.'

        return new Response(
            JSON.stringify({ response: responseText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (err) {
        console.error('ai-chat error:', err)
        return new Response(
            JSON.stringify({ error: err.message || 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
