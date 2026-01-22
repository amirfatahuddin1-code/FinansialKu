
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
        // Use DEEPSEEK_API_KEY
        const apiKey = Deno.env.get('DEEPSEEK_API_KEY')

        if (!apiKey) {
            console.error("CRITICAL: DEEPSEEK_API_KEY is missing in environment variables!");
            throw new Error('Server Configuration Error: API Key not found. Please set DEEPSEEK_API_KEY in Supabase Secrets.')
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

        // Construct Messages for DeepSeek (OpenAI compatible)
        const systemPrompt = `Peran: Kamu adalah Asisten Keuangan Pribadi untuk aplikasi "Karsafin".
Konteks Keuangan User:
${context || 'Tidak ada data keuangan.'}

Instruksi:
1. Jawab ramah, singkat, memotivasi.
2. Gunakan Bahasa Indonesia santai tapi sopan.
3. Berikan saran praktis berdasarkan data di atas.
4. Jangan berikan nasihat investasi spesifik (saham/crypto).
5. Format jawaban dengan rapi (gunakan unnumbered list atau bold jika perlu).`;

        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Add history
        if (Array.isArray(history)) {
            history.slice(-10).forEach((h: any) => {
                const role = (h.role === 'ai') ? 'assistant' : 'user';
                messages.push({ role, content: h.text || '' });
            });
        }

        // Add current user message
        messages.push({ role: 'user', content: message });

        // Call DeepSeek API
        const deepseekUrl = 'https://api.deepseek.com/chat/completions';

        console.log(`Sending request to DeepSeek (deepseek-chat)...`);

        const response = await fetch(deepseekUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000,
            })
        })

        const data = await response.json()

        if (!response.ok) {
            console.error("DeepSeek API Error Response:", JSON.stringify(data));
            const errorMessage = data.error?.message || `DeepSeek API returned status ${response.status}`;
            throw new Error(`DeepSeek API Error: ${errorMessage}`);
        }

        const reply = data.choices?.[0]?.message?.content || "Maaf, saya tidak dapat memproses permintaan saat ini.";

        return new Response(JSON.stringify({ reply }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error("Edge Function Error:", error);

        return new Response(JSON.stringify({
            error: error.message,
            details: "Check Supabase Edge Function Logs for more info."
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
