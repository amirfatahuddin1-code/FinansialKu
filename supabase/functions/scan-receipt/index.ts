// Supabase Edge Function: scan-receipt
// Scans receipt/struk images using Groq Vision API and extracts transactions

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
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const groqApiKey = Deno.env.get('GROQ_API_KEY')

        if (!groqApiKey) {
            throw new Error('GROQ_API_KEY not configured')
        }

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase configuration')
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { image, mimeType } = await req.json()

        if (!image) {
            return new Response(
                JSON.stringify({ error: 'No image data provided' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const actualMimeType = mimeType || 'image/jpeg'
        const dataUrl = `data:${actualMimeType};base64,${image}`

        const chatCompletion = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${groqApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `You are a receipt scanner. Extract all transactions from this receipt/struk image.

Return ONLY valid JSON with this exact structure:
{
  "transactions": [
    {
      "type": "expense",
      "amount": number,
      "qty": number,
      "unit_price": number,
      "description": "item description",
      "category": "Makanan|Transport|Belanja|Tagihan|Hiburan|Kesehatan|Lainnya",
      "account": "optional account name if visible",
      "date": "YYYY-MM-DD"
    }
  ],
  "store": "store name if visible",
  "notes": "any additional notes"
}

Rules:
- Always use type "expense" for purchases.
- amount must be the total cost of this item group in Indonesian Rupiah (integer).
- qty must be the quantity/number of items purchased (integer).
  - Look for numbers preceding or succeeding units like "box", "pack", "pak", "pcs", "pc", "bks", "bungkus", "botol", "btl", "kaleng", "can", "biji", "kg", "gr", "l", "lembar", "lbr", "pasang", "psg", "set", "sack", "bag", "roll", "slop", "x", or similar.
  - For example: "2 Box Indomie" -> qty: 2; "Indomie 3 pcs" -> qty: 3; "Indomie 2x" -> qty: 2; "3 bungkus kopi" -> qty: 3.
  - If no quantity/unit is mentioned, default qty to 1.
- unit_price must be the price of a single item/unit in Indonesian Rupiah (integer).
  - Look for unit prices explicitly written in formats like "@ [price]" or "[qty] x [price]" or similar on the receipt.
  - If not explicitly written on the receipt, you must calculate it as amount / qty.
- description must be the clean name of the item.
  - Crucial: Strip the quantity and unit prefix/suffix from the description so it only contains the item name itself (e.g. convert "2 Box Indomie Goreng" or "Indomie Goreng 2 pcs" to "Indomie Goreng"). Do not include the qty or unit name in the description itself.
- category must match existing categories as closely as possible.
- If the receipt doesn't have a clear date, use today's date.
- If multiple items on the receipt, create separate transactions for each logical group.
- Return ONLY the JSON, no other text`,
                            },
                            { type: 'image_url', image_url: { url: dataUrl } },
                        ],
                    },
                ],
                temperature: 0.1,
                max_tokens: 2048,
                response_format: { type: 'json_object' },
            }),
        })

        if (!chatCompletion.ok) {
            const errorText = await chatCompletion.text()
            console.error('Groq API error:', chatCompletion.status, errorText)
            throw new Error(`Groq API error: ${chatCompletion.status} - ${errorText}`)
        }

        const result = await chatCompletion.json()
        const rawContent = result.choices?.[0]?.message?.content || ''
        
        let cleanJson = rawContent.trim()
        if (cleanJson.startsWith('```')) {
            const firstBrace = cleanJson.indexOf('{')
            const lastBrace = cleanJson.lastIndexOf('}')
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1)
            }
        }

        const content = JSON.parse(cleanJson)

        return new Response(
            JSON.stringify(content),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (err) {
        console.error('scan-receipt error:', err)
        return new Response(
            JSON.stringify({ error: err.message || 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
