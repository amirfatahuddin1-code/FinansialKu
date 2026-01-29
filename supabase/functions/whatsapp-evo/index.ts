// Supabase Edge Function: whatsapp-evo (Evolution API Version)
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
        const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')

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

        const instanceName = body.instance || Deno.env.get('EVOLUTION_INSTANCE') || 'Karsafin'

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

        console.log(`From: ${senderNumber}, Group: ${isGroup}, FromMe: ${fromMe}, Instance: ${instanceName}`)

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
                replyText = `Hai! Aku Karsafin AI, temen setia buat urusan duitmu! 😊\n` +
                    `Aku bantu catat transaksi, cek pengeluaran, dan pantau budget. Pencatatan terintegrasi dengan aplikasi Karsafin!\n` +
                    `📱 Cek aplikasi untuk edit transaksi, atur anggaran, dan lihat laporan lengkap\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `🔥 FITUR BARU: SCAN STRUK\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `Ambil foto struk, dan Karsafin akan deteksi transaksi secara otomatis!\n` +
                    `Nih, panduan simpel biar kamu langsung jago:\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `1️⃣ CATAT TRANSAKSI\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `Cukup ketik apa yang kamu keluarin atau masuk, contohnya:\n` +
                    `• makan siang 25rb\n` +
                    `• gaji 2jt\n` +
                    `• tabungan 100k\n` +
                    `• parkir 10rb dana\n` +
                    `• bakso 10rb restoran\n` +
                    `💡 Tips: Kasih tahu kategori (contoh: hiburan), atau waktu (contoh: kemarin) biar aku lebih akurat!\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `2️⃣ CEK UANGMU\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `Mau lihat totalnya? Tulis aja:\n` +
                    `• total pengeluaran\n` +
                    `• total pemasukan\n` +
                    `• pengeluaran hari ini\n` +
                    `• pengeluaran minggu ini\n` +
                    `• pengeluaran bulan ini\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `3️⃣ PANTAU BUDGET\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `Ketik "sisa anggaran" buat tahu berapa yang masih bisa dipake bulan ini.\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `📝 CATATAN KECIL\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `• Tulis santai, aku fleksibel ngikutin gayamu!\n` +
                    `• Tambah detail kalo mau hasil maksimal.\n` +
                    `Selamat mencatat! 🚀`
            } else if (command === 'id') {
                replyText = `🆔 ID Anda: \`${senderNumber}\`\n\nSilakan masukkan nomor ini di menu *Pengaturan > WhatsApp* aplikasi Karsafin.`
            } else if (command === 'info' && isGroup) {
                const groupId = remoteJid.split('@')[0]
                replyText = `👥 *Info Grup*\nID Grup: \`${groupId}\`\n\nMasukkan ID ini di menu *Pengaturan > Grup WhatsApp* aplikasi Karsafin.`
            } else if (command === 'info' && !isGroup) {
                replyText = `Perintah /info hanya untuk grup. Gunakan /id untuk info personal.`
            }

            console.log(`Sending reply: ${replyText}`)
            await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, replyText, instanceName)
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

                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Belum terhubung.\n\n${idInfo}\nSilakan hubungkan di aplikasi Karsafin.`, instanceName)
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
            await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, '❌ Langganan Anda tidak aktif/habis.', instanceName)
            return new Response('ok', { headers: corsHeaders })
        }

        if (subscription.plan_id && subscription.plan_id.startsWith('basic') && subscription.status !== 'trial') {
            const { data: usage } = await supabase.rpc('get_messaging_usage', { p_user_id: userId })
            const currentUsage = usage && usage.length > 0 ? usage[0].total_count : 0
            if (currentUsage >= 300) {
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⛔ Kuota bulanan habis (${currentUsage}/300). Upgrade ke Pro untuk unlimited!`, instanceName)
                return new Response('ok', { headers: corsHeaders })
            }
        }

        // --- 4. HANDLE REPORT REQUESTS ---
        const lowerText = text.toLowerCase().trim()
        const reportKeywords = ['total pengeluaran', 'total pemasukan', 'pengeluaran hari ini', 'pengeluaran minggu ini', 'pengeluaran bulan ini', 'sisa anggaran']

        if (reportKeywords.some(k => lowerText.includes(k))) {
            console.log('Report request detected:', lowerText)
            let reportReply = ''
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            const today = now.toISOString().split('T')[0]

            // Helper for start of week (Monday)
            const d = new Date(now)
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
            const startOfWeek = new Date(d.setDate(diff)).toISOString().split('T')[0]

            if (lowerText.includes('sisa anggaran')) {
                // Fetch Budgets (Current Month)
                const { data: budgets } = await supabase.from('budgets')
                    .select('amount')
                    .eq('user_id', userId)
                    .eq('month', now.getMonth() + 1)
                    .eq('year', now.getFullYear())

                const totalBudget = budgets?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0

                // Fetch Expenses (Current Month)
                const { data: expenses } = await supabase.from('transactions')
                    .select('amount')
                    .eq('user_id', userId)
                    .eq('type', 'expense')
                    .gte('date', startOfMonth)

                const totalExpense = expenses?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                const remaining = totalBudget - totalExpense

                reportReply = `📊 *Laporan Anggaran (Bulan Ini)*\n\n` +
                    `💰 Total Anggaran: Rp ${formatRupiah(totalBudget)}\n` +
                    `💸 Terpakai: Rp ${formatRupiah(totalExpense)}\n` +
                    `---------------------------\n` +
                    `💡 Sisa: *Rp ${formatRupiah(remaining)}*`

            } else if (lowerText.includes('pengeluaran bulan ini')) {
                const { data: expenses } = await supabase.from('transactions')
                    .select('amount')
                    .eq('user_id', userId)
                    .eq('type', 'expense')
                    .gte('date', startOfMonth)
                const total = expenses?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                reportReply = `💸 *Pengeluaran Bulan Ini*\nTotal: Rp ${formatRupiah(total)}`

            } else if (lowerText.includes('total pengeluaran')) {
                const { data: expenses } = await supabase.from('transactions')
                    .select('amount')
                    .eq('user_id', userId)
                    .eq('type', 'expense')
                const total = expenses?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                reportReply = `💸 *Total Pengeluaran (Semua)*\nTotal: Rp ${formatRupiah(total)}`

            } else if (lowerText.includes('total pemasukan')) {
                const { data: incomes } = await supabase.from('transactions')
                    .select('amount')
                    .eq('user_id', userId)
                    .eq('type', 'income')
                const total = incomes?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                reportReply = `💰 *Total Pemasukan (Semua)*\nTotal: Rp ${formatRupiah(total)}`

            } else if (lowerText.includes('pengeluaran hari ini')) {
                const { data: expenses } = await supabase.from('transactions')
                    .select('amount')
                    .eq('user_id', userId)
                    .eq('type', 'expense')
                    .eq('date', today)
                const total = expenses?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                reportReply = `💸 *Pengeluaran Hari Ini*\nTotal: Rp ${formatRupiah(total)}`

            } else if (lowerText.includes('pengeluaran minggu ini')) {
                const { data: expenses } = await supabase.from('transactions')
                    .select('amount')
                    .eq('user_id', userId)
                    .eq('type', 'expense')
                    .gte('date', startOfWeek)
                const total = expenses?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
                reportReply = `💸 *Pengeluaran Minggu Ini*\n(Sejak Senin, ${startOfWeek})\nTotal: Rp ${formatRupiah(total)}`
            }

            await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, reportReply, instanceName)
            return new Response('ok', { headers: corsHeaders })
        }

        // --- 5. PREPARE DATA ---
        let transactionsToSave = []
        let replyMessage = ''
        const { data: categories } = await supabase.from('categories').select('id, name, type').eq('user_id', userId)

        // --- 5. PROCESS AI (TEXT or IMAGE) ---
        // TODO: Evolution API Media Handling requires fetching the media buffer.
        // For now, focusing on TEXT ONLY as per plan, or implementing Placeholder for media.

        if (hasMedia) {
            console.log('Media detected. Fetching base64...')
            // 1. Get Buffer/Base64 from Evolution API
            const mediaRes = await getEvolutionMediaBase64(evoApiUrl, evoApiKey, messageData, instanceName)

            if (mediaRes.error || !mediaRes.base64) {
                console.error('Media Fetch Error:', mediaRes.error)
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Gagal mengambil gambar: ${mediaRes.error || 'Unknown error'}`, instanceName)
                return new Response('ok', { headers: corsHeaders })
            }

            console.log('Processing Image with Groq Llama 4 Scout...')
            const aiRes = await runGroqImage(groqApiKey, mediaRes.base64, text) // Pass caption if any
            console.log('AI Image Result:', JSON.stringify(aiRes))

            if (aiRes.error || !aiRes.data) {
                const debugMsg = aiRes.error ? `Error: ${aiRes.error}` : 'No Data Returned'
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Debug AI Image Error: ${debugMsg}`, instanceName)
                return new Response('ok', { headers: corsHeaders })
            }

            // Normalize response: ensure we have an array of items
            const items = aiRes.data.items || (aiRes.data.amount ? [aiRes.data] : [])
            const extractedDate = aiRes.data.date ? new Date(aiRes.data.date) : new Date()
            // Validate date: if invalid, fallback to today
            const validDate = isNaN(extractedDate.getTime()) ? new Date() : extractedDate
            const dateStr = validDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
            const dateIso = validDate.toISOString().split('T')[0]

            console.log('Parsed Items:', JSON.stringify(items))
            const senderDisplayName = pushName || senderNumber

            if (items.length > 0) {
                let totalAmount = 0
                let itemsListText = ''

                for (const item of items) {
                    if (item.amount > 0) {
                        const category = findCategory(item.category || item.description, categories || [], item.type || 'expense')

                        transactionsToSave.push({
                            user_id: userId,
                            type: item.type || 'expense',
                            amount: item.amount,
                            category_id: category?.id || null,
                            description: item.description,
                            date: dateIso,
                            source: 'whatsapp',
                            sender_name: senderDisplayName
                        })

                        totalAmount += item.amount
                        itemsListText += `▪️ ${item.description} (${formatRupiah(item.amount)})\n`
                    }
                }

                if (transactionsToSave.length > 0) {
                    replyMessage = `✅ *Tercatat (${transactionsToSave.length} item)*\n` +
                        `📅 ${dateStr}\n` +
                        `💵 Total: Rp ${formatRupiah(totalAmount)}\n` +
                        `------------------\n` +
                        `${itemsListText}`.trim()
                } else {
                    await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Tidak ada item valid ditemukan dalam struk.`, instanceName)
                    return new Response('ok', { headers: corsHeaders })
                }
            } else {
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Tidak dapat membaca item transaksi.`, instanceName)
                return new Response('ok', { headers: corsHeaders })
            }

        } else if (text.length > 0) {
            console.log('Processing Text:', text)
            // Use DeepSeek for Text (Switching from Groq)
            const aiRes = await runDeepSeekText(deepseekApiKey, text)
            console.log('AI Text Result:', JSON.stringify(aiRes))

            if (aiRes.error || !aiRes.data) {
                const debugMsg = aiRes.error ? `Error: ${aiRes.error}` : 'No Data Returned'
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Debug AI Error: ${debugMsg}`, instanceName)
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
                const typeLabel = parsed.type === 'income' ? 'Pemasukan' : 'Pengeluaran'
                const catName = category?.name || 'Lainnya'
                const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

                replyMessage = `✅ *Tercatat!*\n` +
                    `📅 ${dateStr}\n` +
                    `${typeEmoji} ${typeLabel}\n` +
                    `💵 Rp ${formatRupiah(parsed.amount)}\n` +
                    `📂 ${catName}\n` +
                    `📝 ${parsed.description}`
            } else {
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Tidak ditemukan nominal transaksi.`, instanceName)
                return new Response('ok', { headers: corsHeaders })
            }
        }

        // --- 6. SAVE TRANSACTIONS ---
        if (transactionsToSave.length > 0) {
            console.log('Saving transactions:', JSON.stringify(transactionsToSave))
            const { error: insertError } = await supabase.from('transactions').insert(transactionsToSave)

            if (insertError) {
                console.error('DB Insert Error:', insertError)
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Gagal menyimpan ke database.`, instanceName)
            } else {
                console.log('Transactions saved successfully.')
                await supabase.rpc('increment_messaging_count', { p_user_id: userId, p_type: 'wa' })
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, replyMessage, instanceName)
            }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error) {
        console.error('Unhandled Error in Webhook:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})

// --- HELPERS ---

async function sendEvolutionMessage(baseUrl: string, apiKey: string, remoteJid: string, text: string, instanceName: string) {
    // Evolution API: /message/sendText
    // We use the Dynamic 'instanceName' passed from the payload/Logic

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

async function runDeepSeekText(apiKey: string | undefined, text: string) {
    if (!apiKey) return { error: 'DeepSeek API Key missing' }

    try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "model": "deepseek-chat",
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
                "response_format": { "type": "json_object" }
            })
        })
        const json = await res.json()
        console.log('DeepSeek Raw Response:', JSON.stringify(json))

        if (!json.choices || !json.choices.length) {
            return { error: `Invalid DeepSeek Response: ${JSON.stringify(json)}` }
        }

        const content = json.choices[0].message.content
        return { data: JSON.parse(content) }
    } catch (e) {
        return { error: `DeepSeek Error: ${e.message}` }
    }
}

async function getEvolutionMediaBase64(baseUrl: string, apiKey: string, messageData: any, instanceName: string) {
    // Endpoint: /chat/getBase64FromMediaMessage/{instance}
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    const url = `${cleanBaseUrl}/chat/getBase64FromMediaMessage/${instanceName}`

    console.log(`Fetching media from: ${url}`)

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
                message: messageData, // Pass the full message object
                convertToMp4: false
            })
        })

        if (!res.ok) {
            const errText = await res.text()
            return { error: `API Error ${res.status}: ${errText}` }
        }

        const json = await res.json()
        if (!json.base64) return { error: 'No base64 returned in response' }

        return { base64: json.base64 }
    } catch (e) {
        return { error: `Fetch Error: ${e.message}` }
    }
}

async function runGroqImage(apiKey: string | undefined, base64Image: string, caption: string) {
    if (!apiKey) return { error: 'Groq API Key missing' }

    try {
        // Construct the messages payload
        const messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", "text": `Parse this receipt image. Extract items individually. Caption context: "${caption}". 
Return JSON: { "items": [{ "type": "expense", "amount": number, "description": "string (in Indonesian)", "category": "string (guess based on item)" }] }.
Rules:
1. Translate descriptions to Indonesian if needed (e.g. 'Sugar' -> 'Gula').
2. Keep it concise.
3. If total is available but individual items are unclear, return one item with total.` },
                    {
                        "type": "image_url",
                        "image_url": { "url": `data:image/jpeg;base64,${base64Image}` }
                    }
                ]
            }
        ]

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": messages,
                "temperature": 0.1,
                "response_format": { "type": "json_object" }
            })
        })

        const json = await res.json()
        console.log('Groq Image Raw Response:', JSON.stringify(json)) // Debug log

        if (!json.choices || !json.choices.length) {
            return { error: `Invalid Groq Image Response: ${JSON.stringify(json)}` }
        }

        const content = json.choices[0].message.content
        return { data: JSON.parse(content) }
    } catch (e) {
        return { error: `Groq Image Error: ${e.message}` }
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
        console.log('Groq Raw Response:', JSON.stringify(json))

        if (!json.choices || !json.choices.length) {
            return { error: `Invalid AI Response: ${JSON.stringify(json)}` }
        }

        const content = json.choices[0].message.content
        return { data: JSON.parse(content) }
    } catch (e) {
        return { error: `Fetch/Parse Error: ${e.message}` }
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
