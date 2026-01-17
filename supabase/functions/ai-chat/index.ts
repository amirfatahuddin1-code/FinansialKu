
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
        const apiKey = Deno.env.get('GEMINI_API_KEY')

        // Debugging: Cek apakah API Key ada (tanpa log nilai aslinya)
        if (!apiKey) {
            console.error("CRITICAL: GEMINI_API_KEY is missing in environment variables!");
            throw new Error('Server Configuration Error: API Key not found. Please set GEMINI_API_KEY in Supabase Secrets.')
        }

        // Parse Body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error("Invalid JSON body");
        }

        const { message, context, history } = body;

        if (!message) {
            throw new Error("Message is required");
        }

        // Limit history untuk efisiensi token
        const limitHistory = Array.isArray(history) ? history.slice(-10) : [];

        const fullPrompt = `Peran: Kamu adalah Asisten Keuangan Pribadi untuk aplikasi "FinansialKu".
Konteks Keuangan User:
${context || 'Tidak ada data keuangan.'}

Instruksi:
1. Jawab ramah, singkat, memotivasi.
2. Gunakan Bahasa Indonesia santai tapi sopan.
3. Berikan saran praktis berdasarkan data di atas.
4. Jangan berikan nasihat investasi spesifik (saham/crypto).

Riwayat Chat Terakhir:
${limitHistory.map((h: any) => `${h.role}: ${h.text}`).join('\n')}

User: ${message}
Asisten:`;

        // Call Gemini API (v1beta gemini-1.5-flash)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        console.log(`Sending request to Gemini (gemini-1.5-flash)...`);

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            })
        })

        const data = await response.json()

        if (!response.ok) {
            console.error("Gemini API Error Response:", JSON.stringify(data));
            const errorMessage = data.error?.message || `Gemini API returned status ${response.status}`;
            throw new Error(`Gemini API Error: ${errorMessage}`);
        }

        if (data.error) {
            console.error("Gemini Data Error:", JSON.stringify(data.error));
            throw new Error(data.error.message || 'Unknown Gemini Error');
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak dapat memproses permintaan saat ini. (No candidate)";

        return new Response(JSON.stringify({ reply }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error("Edge Function Error:", error);

        // Return 200 with error field so client can read the message
        // instead of getting a generic "non-2xx status code" error
        return new Response(JSON.stringify({
            error: error.message,
            details: "Check Supabase Edge Function Logs for more info."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
