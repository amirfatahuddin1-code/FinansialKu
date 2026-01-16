import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { message, context, history } = await req.json()
        const apiKey = Deno.env.get('GEMINI_API_KEY')

        if (!apiKey) {
            throw new Error('Gemini API Key not configured on server')
        }

        // Construct prompt with context
        const limitHistory = history ? history.slice(-10) : []; // Ambil 10 chat terakhir

        // Format history for Gemini API is generic content generation
        // Simple prompt construction
        let fullPrompt = `Peran: Kamu adalah Asisten Keuangan Pribadi untuk aplikasi "FinansialKu".
Konteks Keuangan User Saat Ini:
${context}

Instruksi:
1. Jawab pertanyaan user dengan ramah, singkat, dan memotivasi.
2. Gunakan data konteks di atas untuk memberikan saran spesifik jika relevan.
3. Jangan berikan saran investasi yang spesifik (saham X, crypto Y), tapi saran umum boleh.
4. Gunakan Bahasa Indonesia yang luwes (baku tapi santai).
5. Jika user meminta rekap/analisis, gunakan data yang tersedia.

Riwayat Chat:
${limitHistory.map((h: any) => `${h.role}: ${h.text}`).join('\n')}

User: ${message}
Asisten:`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }]
            })
        })

        const data = await response.json()

        if (data.error) {
            throw new Error(data.error.message || 'Gemini API Error')
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak dapat memproses permintaan saat ini.";

        return new Response(JSON.stringify({ reply }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
