// Supabase Edge Function: whatsapp-webhook (Evolution API Version)
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
        console.log('--- NEW WEBHOOK RECEIVED (Evolution API) ---')
        const body = await req.json()
        console.log('Raw Body:', JSON.stringify(body))

        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        const evoApiUrl = Deno.env.get('EVOLUTION_API_URL')
        const evoApiKey = Deno.env.get('EVOLUTION_API_KEY')
        const groqApiKey = Deno.env.get('GROQ_API_KEY')

        if (!supabaseUrl || !supabaseServiceKey || !evoApiUrl || !evoApiKey) {
            console.error('Critical Error: Missing configuration (SUPABASE/EVOLUTION ENV variables)')
            return new Response(JSON.stringify({ error: 'Configuration Missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Evolution API Webhook Payload Structure
        // Event: messages.upsert
        const eventType = body.event || body.type
        const messageData = body.data

        if (eventType !== 'messages.upsert' && eventType !== 'MESSAGES_UPSERT') {
            console.log(`Ignoring event type: ${eventType}`)
            return new Response('ok', { headers: corsHeaders })
        }

        if (!messageData || !messageData.key) {
            console.log('Invalid message data structure')
            return new Response('ok', { headers: corsHeaders })
        }

        const key = messageData.key
        const fromMe = key.fromMe
        const remoteJid = key.remoteJid // e.g. "628xxx@s.whatsapp.net" or "xxx@g.us"
        const isGroup = remoteJid.endsWith('@g.us')
        const participant = key.participant || messageData.participant // Sender in group

        // Determine actual sender number
        // If individual chat: remoteJid
        // If group chat: participant (who sent it)
        const senderJid = isGroup ? participant : remoteJid

        if (!senderJid) {
            console.log('Could not determine sender JID')
            return new Response('ok', { headers: corsHeaders })
        }

        const senderNumber = senderJid.split('@')[0]
        const pushName = messageData.pushName || 'User'

        console.log(`From: ${senderNumber}, Group: ${isGroup}, FromMe: ${fromMe}`)

        if (fromMe) {
            console.log('Message is from ME. Ignoring to prevent loops.')
            return new Response('ok', { headers: corsHeaders })
        }

        // Extract Message Content
        const messageContent = messageData.message
        if (!messageContent) {
            console.log('No message content found')
            return new Response('ok', { headers: corsHeaders })
        }

        let text = ''
        // Handle various common message types
        if (messageContent.conversation) {
            text = messageContent.conversation
        } else if (messageContent.extendedTextMessage?.text) {
            text = messageContent.extendedTextMessage.text
        } else if (messageContent.imageMessage?.caption) {
            text = messageContent.imageMessage.caption
        }

        const hasMedia = !!(messageContent.imageMessage || messageContent.documentMessage)

        console.log(`Text: "${text}", HasMedia: ${hasMedia}`)

        // --- 1. HANDLE COMMANDS ---
        const commandRegex = /^\/(start|id|info|help)(?:@\w+)?$/i

        if (commandRegex.test(text.trim())) {
            console.log('Command detected!')
            let replyText = ''
            const command = text.trim().match(commandRegex)[1].toLowerCase()

            if (command === 'start' || command === 'help') {
                replyText = `👋 Halo! Saya asisten pencatat keuangan finansialku.\n\n` +
                    `*Perintah:*\n` +
                    `/id - Cek ID Telegram/WA Anda\n` +
                    `/info - Cek ID Grup (jika di grup)\n\n` +
                    `*Cara Catat:*\n` +
                    `Ketik: "Makan nasi goreng 25rb"\n` +
                    `Atau kirim foto struk belanjaan.`
            } else if (command === 'id') {
                replyText = `🆔 ID Anda: \`${senderNumber}\`\n\nSilakan masukkan nomor ini di menu *Pengaturan > WhatsApp* aplikasi FinansialKu.`
            } else if (command === 'info' && isGroup) {
                const groupId = remoteJid.split('@')[0]
                replyText = `👥 *Info Grup*\nID Grup: \`${groupId}\`\n\nMasukkan ID ini di menu *Pengaturan > Grup WhatsApp* aplikasi FinansialKu.`
            } else if (command === 'info' && !isGroup) {
                replyText = `Perintah /info hanya untuk grup. Gunakan /id untuk info personal.`
            }

            console.log(`Sending reply: ${replyText}`)
            await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, replyText)
            return new Response('ok', { headers: corsHeaders })
        }

        // --- 2. IDENTIFY USER ---
        console.log('Checking user link...')
        let link = null
        let linkType = 'personal'

        if (isGroup) {
            const groupId = remoteJid.split('@')[0]
            const { data: groupLink, error: glError } = await supabase
                .from('whatsapp_group_links')
                .select('user_id')
                .eq('group_id', groupId)
                .maybeSingle()

            if (glError) console.error('Error checking group link:', glError)

            if (groupLink) {
                console.log('Found Group Link:', groupLink)
                link = groupLink
                linkType = 'group'
            }
        }

        if (!link) {
            const variants = [senderNumber, senderNumber.replace(/^62/, '0')]
            console.log('Checking personal link variants:', variants)

            const { data: userLink, error: ulError } = await supabase
                .from('whatsapp_user_links')
                .select('user_id')
                .in('phone_number', variants)
                .limit(1)
                .maybeSingle()

            if (ulError) console.error('Error checking user link:', ulError)

            if (userLink) {
                console.log('Found User Link:', userLink)
                link = userLink
            }
        }

        if (!link) {
            console.log('User NOT linked.')
            // Only send instructions if it looks like a transaction attempt (text or media)
            if (text.length > 0 || hasMedia) {
                const idInfo = isGroup
                    ? `ID Grup: \`${remoteJid.split('@')[0]}\``
                    : `ID Anda: \`${senderNumber}\``

                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Belum terhubung.\n\n${idInfo}\nSilakan hubungkan di aplikasi FinansialKu.`)
            }
            return new Response('ok', { headers: corsHeaders })
        }

        const userId = link.user_id
        console.log('Identified User ID:', userId)

        // --- 3. CHECK SUBSCRIPTION & LIMITS ---
        console.log('Checking subscription...')
        const { data: sub } = await supabase.rpc('get_active_subscription', { p_user_id: userId })
        const subscription = sub && sub.length > 0 ? sub[0] : null

        if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trial')) {
            await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, '❌ Langganan Anda tidak aktif/habis.')
            return new Response('ok', { headers: corsHeaders })
        }

        if (subscription.plan_id && subscription.plan_id.startsWith('basic') && subscription.status !== 'trial') {
            const { data: usage } = await supabase.rpc('get_messaging_usage', { p_user_id: userId })
            const currentUsage = usage && usage.length > 0 ? usage[0].total_count : 0
            if (currentUsage >= 300) {
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⛔ Kuota bulanan habis (${currentUsage}/300). Upgrade ke Pro untuk unlimited!`)
                return new Response('ok', { headers: corsHeaders })
            }
        }

        // --- 4. PREPARE DATA ---
        let transactionsToSave = []
        let replyMessage = ''
        const { data: categories } = await supabase.from('categories').select('id, name, type').eq('user_id', userId)

        // --- 5. PROCESS AI (TEXT or IMAGE) ---
        // TODO: Evolution API Media Handling requires fetching the media buffer.
        // For now, focusing on TEXT ONLY as per plan, or implementing Placeholder for media.

        if (hasMedia) {
            console.log('Media detected (Image/Document).')
            // For Evolution API, media handling is more complex (need to fetch buffer).
            // Placeholder logic for now
            await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, '⚠️ Fitur baca gambar sedang dalam perbaikan untuk sistem baru ini. Silakan ketik manual dulu ya.')
            return new Response('ok', { headers: corsHeaders })
        } else if (text.length > 0) {
            console.log('Processing Text:', text)
            // Use existing Groq Text Logic
            const aiRes = await runGroqText(groqApiKey, text)
            console.log('AI Text Result:', JSON.stringify(aiRes))

            if (aiRes.error || !aiRes.data) {
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Maaf, saya tidak mengerti: "${text}"`)
                return new Response('ok', { headers: corsHeaders })
            }

            const parsed = aiRes.data
            const senderDisplayName = pushName || senderNumber

            if (parsed.amount > 0) {
                const category = findCategory(parsed.category || parsed.description, categories || [], parsed.type)
                transactionsToSave.push({
                    user_id: userId,
                    type: parsed.type,
                    amount: parsed.amount,
                    category_id: category?.id || null,
                    description: parsed.description,
                    date: new Date().toISOString().split('T')[0],
                    source: 'whatsapp',
                    sender_name: senderDisplayName
                })

                const typeEmoji = parsed.type === 'income' ? '💰' : '💸'
                const catName = category?.name || 'Lainnya'
                replyMessage = `✅ *Tercatat!*\n${typeEmoji} ${parsed.description}\nRp ${formatRupiah(parsed.amount)}\n📂 ${catName}`
            } else {
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Tidak ditemukan nominal transaksi.`)
                return new Response('ok', { headers: corsHeaders })
            }
        }

        // --- 6. SAVE TRANSACTIONS ---
        if (transactionsToSave.length > 0) {
            console.log('Saving transactions:', JSON.stringify(transactionsToSave))
            const { error: insertError } = await supabase.from('transactions').insert(transactionsToSave)

            if (insertError) {
                console.error('DB Insert Error:', insertError)
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Gagal menyimpan ke database.`)
            } else {
                console.log('Transactions saved successfully.')
                await supabase.rpc('increment_messaging_count', { p_user_id: userId, p_type: 'wa' })
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, replyMessage)
            }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error('Unhandled Error in Webhook:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})

// --- HELPERS ---

async function sendEvolutionMessage(baseUrl: string, apiKey: string, remoteJid: string, text: string) {
    // Evolution API: /message/sendText
    // Instance name is usually required in URL or handled via BaseURL if it includes /instance/
    // Assuming baseUrl is something like 'https://api.wa.my.id' and we need to append '/message/sendText/{instance}' 
    // OR the user provides the full base url including instance like 'https://api.wa.my.id/message/sendText/finansialku'
    // BUT usually env var is BASE URL. Let's assume standard Evolution API structure.
    // Documentation: POST /message/sendText/{instance}
    // We need 'EVOLUTION_INSTANCE' env var or assume it's part of the config.
    // Let's grab instance from ENV or defaults.

    // Better strategy: Let's assume standard Evolution API v2 structure:
    // POST /message/sendText/instanceName

    const instanceName = Deno.env.get('EVOLUTION_INSTANCE') || 'finansialku'

    // Clean base URL (remove trailing slash)
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    const url = `${cleanBaseUrl}/message/sendText/${instanceName}`

    console.log(`Sending to Evolution API: ${url} for ${remoteJid}`)

    try {
        const body = {
            number: remoteJid, // Evolution API uses 'number' which can be the full JID
            text: text
        }

        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify(body)
        })
    } catch (e) {
        console.error('Failed to send Evolution message:', e)
    }
}

async function runGroqText(apiKey: string | undefined, text: string) {
    if (!apiKey) return { error: 'API Key missing' }

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "model": "llama3-70b-8192",
                "messages": [
                    {
                        "role": "system",
                        "content": `You are a financial parsing assistant. Extract transaction details from the user text (Indonesian).
Return ONLY JSON: {"type": "expense" | "income", "amount": number, "description": "string", "category": "string keyword"}.
Rules: 
- "makan 50k" -> type: expense, amount: 50000, description: "Makan", category: "makanan"
- "gaji 5jt" -> type: income, amount: 5000000, description: "Gaji", category: "gaji"
- If unclear, guess type expense. Handle 'k' (thousand), 'jt' (million).`
                    },
                    { "role": "user", "content": text }
                ],
                "temperature": 0.1,
                "response_format": { "type": "json_object" }
            })
        })
        const json = await res.json()
        const content = json.choices[0].message.content
        return { data: JSON.parse(content) }
    } catch (e) {
        return { error: e.message }
    }
}

function findCategory(keyword: string, categories: any[], type: string) {
    if (!keyword) return categories.find(c => c.type === type)
    const lower = keyword.toLowerCase()

    // 1. Direct Name Match
    const match = categories.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()))
    if (match) return match

    // 2. Map Keywords (Simplified common ones)
    const maps: any = {
        'makan': ['food', 'resto', 'cafe', 'warung', 'snack', 'minum'],
        'transport': ['bensin', 'parkir', 'grab', 'gojek', 'tol'],
        'belanja': ['mart', 'shop', 'beli', 'superindo', 'indo', 'alfa'],
        'kesehatan': ['obat', 'dokter', 'rumahsakit', 'apotek'],
        'tagihan': ['listrik', 'air', 'internet', 'pulsa', 'pln']
    }

    for (const [catName, keys] of Object.entries(maps)) {
        if (keys.some((k: string) => lower.includes(k))) {
            const found = categories.find(c => c.name.toLowerCase().includes(catName))
            if (found) return found
        }
    }

    return categories.find(c => c.type === type)
}

function formatRupiah(num: number) {
    return num.toLocaleString('id-ID')
}
