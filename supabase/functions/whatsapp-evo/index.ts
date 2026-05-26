// Supabase Edge Function: whatsapp-evo (Evolution API Version)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WIB_OFFSET = 7 * 60 * 60 * 1000;

function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getWibToday(): string {
    return toLocalDateStr(new Date(Date.now() + WIB_OFFSET));
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

        if (eventType !== 'messages.upsert' && eventType !== 'MESSAGES_UPSERT') {
            console.log(`Ignoring event type: ${eventType}`)
            return new Response('ok', { headers: corsHeaders })
        }

        const instanceName = body.instance || Deno.env.get('EVOLUTION_INSTANCE') || 'Karsafin'

        // Robust parsing for different Evolution API versions (v1 vs v2)
        let messageData = body.data
        if (body.data?.message?.key) {
            messageData = body.data.message
        } else if (Array.isArray(body.data) && body.data.length > 0) {
            messageData = body.data[0].message || body.data[0]
        } else if (body.data?.messages && Array.isArray(body.data.messages) && body.data.messages.length > 0) {
            messageData = body.data.messages[0]
        }

        if (!messageData || !messageData.key) {
            console.log('Invalid message data structure', JSON.stringify(body))
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
        // In some versions, the message itself might be wrapped again.
        const messageContent = messageData.message || messageData
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
                replyText = `🆔 ID Anda: \`${senderNumber}\`\n\nSilakan masukkan nomor ini di menu *Pengaturan > WhatsApp/Telegram* aplikasi Karsafin.`
            } else if (command === 'info' && isGroup) {
                const groupId = remoteJid.split('@')[0]
                replyText = `👥 *Info Grup*\nID Grup: \`${groupId}\`\n\nMasukkan ID ini di menu *Pengaturan > Grup Chat* aplikasi Karsafin.`
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

                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Belum terhubung.\n\n${idInfo}\nSilakan hubungkan di menu Pengaturan aplikasi Karsafin agar bot ini bisa mencatat transaksi Anda.`, instanceName)
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
            await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, '❌ Langganan Anda tidak aktif/habis. Silakan perbarui di aplikasi.', instanceName)
            return new Response('ok', { headers: corsHeaders })
        }

        // Helper: Check Usage Limit (Basic Plan: Dynamic WhatsApp quota)
        if (subscription.plan_id && subscription.plan_id.startsWith('basic') && subscription.status !== 'trial') {
            const { data: profile } = await supabase
                .from('profiles')
                .select('whatsapp_quota, last_whatsapp_reset')
                .eq('id', userId)
                .single();

            const todayStr = getWibToday();
            let limit = 20;

            if (profile) {
                limit = profile.whatsapp_quota ?? 20;
                if (profile.last_whatsapp_reset !== todayStr) {
                    limit = 20;
                    await supabase
                        .from('profiles')
                        .update({ whatsapp_quota: 20, last_whatsapp_reset: todayStr })
                        .eq('id', userId);
                }
            }

            const { data: usage } = await supabase.rpc('get_messaging_usage', { p_user_id: userId })
            const waUsage = usage && usage.length > 0 ? usage[0].wa_count : 0
            if (waUsage >= limit) {
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⛔ Batas harian tercapai. Pengguna paket Basic hanya dapat mencatat maksimal ${limit} transaksi per hari lewat WhatsApp. Silakan upgrade ke Pro atau tonton video di menu Kuota AI untuk menambah kuota!`, instanceName)
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

        // Get user's active workspace and default account
        const { data: profile } = await supabase.from('profiles').select('active_workspace_id').eq('id', userId).maybeSingle()
        const workspaceId = profile?.active_workspace_id

        const { data: allAccounts } = await supabase.from('accounts').select('id, name').eq('workspace_id', workspaceId)
        
        // Find default account (Cash / Tunai) or first account
        let accountId = null
        if (allAccounts && allAccounts.length > 0) {
            const defaultAcc = allAccounts.find(a => a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('tunai') || a.name.toLowerCase().includes('dompet'))
            accountId = defaultAcc ? defaultAcc.id : allAccounts[0].id
        }

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
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Debug AI Image Error: ${debugMsg}\nPastikan gambar cukup jelas.`, instanceName)
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
                            workspace_id: workspaceId,
                            account_id: accountId,
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
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Tidak dapat membaca item transaksi pada foto.`, instanceName)
                return new Response('ok', { headers: corsHeaders })
            }

        } else if (text.length > 0) {
            console.log('Processing Text:', text)
            const todayStr = getWibToday();

            // 1. Extract transaction date & clean time words from text locally
            const { date: parsedDate, cleanedText } = parseLocalTimeAndClean(text, todayStr);
            let txDate = parsedDate;
            let parsed: any = null;

            // 2. Try DeepSeek for Text (passing cleanedText)
            if (deepseekApiKey) {
                const aiRes = await runDeepSeekText(deepseekApiKey, cleanedText)
                console.log('AI Text Result:', JSON.stringify(aiRes))
                if (aiRes.data && aiRes.data.amount > 0) {
                    parsed = aiRes.data
                    txDate = aiRes.data.date || parsedDate;
                }
            }

            // 3. Fallback to local regex-based parsing
            if (!parsed) {
                const localParsed = parseTransaction(cleanedText);
                if (localParsed) {
                    parsed = localParsed;
                }
            }

            const senderDisplayName = pushName || senderNumber

            if (parsed && parsed.amount > 0) {
                const category = findCategory(parsed.category || parsed.description || 'Transaksi', categories || [], parsed.type)
                let txAccountId = accountId
                let txDescription = parsed.description

                const matchedAccount = findAccount(text, allAccounts || [])
                if (matchedAccount) {
                    txAccountId = matchedAccount.id
                    const nameLower = matchedAccount.name.toLowerCase()
                    const cleanNameLower = nameLower.replace(/\bbank\b|\bdompet\b|\bakun\b/g, '').trim()
                    
                    const descLower = txDescription.toLowerCase()
                    if (descLower.includes(nameLower)) {
                        const regex = new RegExp('\\b' + nameLower + '\\b', 'gi')
                        txDescription = txDescription.replace(regex, '').replace(/\s+/g, ' ').trim()
                    } else if (cleanNameLower.length >= 3 && descLower.includes(cleanNameLower)) {
                        const regex = new RegExp('\\b' + cleanNameLower + '\\b', 'gi')
                        txDescription = txDescription.replace(regex, '').replace(/\s+/g, ' ').trim()
                    }
                    
                    if (txDescription.toLowerCase().includes('cash')) {
                        txDescription = txDescription.replace(/\bcash\b/gi, '').replace(/\s+/g, ' ').trim()
                    } else if (txDescription.toLowerCase().includes('tunai')) {
                        txDescription = txDescription.replace(/\btunai\b/gi, '').replace(/\s+/g, ' ').trim()
                    }
                }

                txDescription = txDescription.replace(/^[,.\s\-]+|[,.\s\-]+$/g, '').trim();
                if (!txDescription) txDescription = 'Transaksi'

                transactionsToSave.push({
                    user_id: userId,
                    workspace_id: workspaceId,
                    account_id: txAccountId,
                    type: parsed.type,
                    amount: parsed.amount,
                    category_id: category?.id || null,
                    description: txDescription,
                    date: txDate,
                    source: 'whatsapp',
                    sender_name: senderDisplayName
                })

                const typeEmoji = parsed.type === 'income' ? '💰' : '💸'
                const typeLabel = parsed.type === 'income' ? 'Pemasukan' : 'Pengeluaran'
                const catName = category?.name || 'Lainnya'
                
                const dateParts = txDate.split('-')
                const displayYear = dateParts[0]
                const displayMonth = dateParts[1]
                const displayDay = dateParts[2]
                
                const monthNamesIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
                const monthIndex = parseInt(displayMonth, 10) - 1
                const displayMonthStr = monthNamesIndo[monthIndex] || displayMonth
                const dateStr = `${parseInt(displayDay, 10)} ${displayMonthStr} ${displayYear}`

                const matchedAcc = allAccounts?.find(a => a.id === txAccountId)
                const accLabel = matchedAcc ? `💳 Akun: *${matchedAcc.name}*\n` : ''

                replyMessage = `✅ *Tercatat!*\n` +
                    `📅 ${dateStr}\n` +
                    `${typeEmoji} ${typeLabel}\n` +
                    `💵 Rp ${formatRupiah(parsed.amount)}\n` +
                    `${accLabel}` +
                    `📂 ${catName}\n` +
                    `📝 ${txDescription}`
            } else {
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Tidak ditemukan nominal transaksi yang valid.`, instanceName)
                return new Response('ok', { headers: corsHeaders })
            }
        }

        // --- 6. SAVE TRANSACTIONS ---
        if (transactionsToSave.length > 0) {
            console.log('Saving transactions:', JSON.stringify(transactionsToSave))
            const { error: insertError } = await supabase.from('transactions').insert(transactionsToSave)

            if (insertError) {
                console.error('DB Insert Error:', insertError)
                await sendEvolutionMessage(evoApiUrl, evoApiKey, remoteJid, `⚠️ Gagal menyimpan ke database Supabase.`, instanceName)
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
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    const url = `${cleanBaseUrl}/message/sendText/${instanceName}`

    console.log(`Sending to Evolution API: ${url} for ${remoteJid}`)

    try {
        const body = {
            number: remoteJid,
            textMessage: {
                text: text
            },
            text: text, // Provide both formats to ensure compatibility with Evolution v1 and v2
            options: {
                delay: 0,
                presence: "composing"
            }
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        })
        
        if (!response.ok) {
           const errText = await response.text();
           console.error(`Evolution API Send Error (${response.status}):`, errText)
        }
    } catch (e) {
        console.error('Failed to send Evolution message fetch error:', e)
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

function findAccount(text: string, accounts: any[]) {
    if (!accounts || accounts.length === 0) return null;
    const lowerText = text.toLowerCase();
    
    const sortedAccounts = [...accounts].sort((a, b) => b.name.length - a.name.length);
    
    for (const acc of sortedAccounts) {
        const name = acc.name.toLowerCase();
        
        if (lowerText.includes(name)) {
            return acc;
        }
        
        const cleanName = name.replace(/\bbank\b|\bdompet\b|\bakun\b/g, '').trim();
        if (cleanName.length >= 3 && lowerText.includes(cleanName)) {
            return acc;
        }
    }
    
    if (lowerText.includes('cash') || lowerText.includes('tunai') || lowerText.includes('dompet')) {
        const cashAcc = accounts.find(a => {
            const n = a.name.toLowerCase();
            return n.includes('cash') || n.includes('tunai') || n.includes('kas');
        });
        if (cashAcc) return cashAcc;
    }
    
    return null;
}

function parseTransaction(text: string) {
    const cleanText = text.trim()
    
    // Amount Regex matching:
    // - sign: ([+-]?)
    // - number block: (\d+(?:[.,]\d+)*)
    // - suffix: \s*(rb|ribu|k|jt|juta)?\b
    const amountRegex = /([+-]?)\s*(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta)?\b/i
    const match = cleanText.match(amountRegex)
    if (!match) return null

    const sign = match[1] || ''
    let numberStr = match[2]
    const suffix = match[3]?.toLowerCase()

    let amount = 0

    if (suffix) {
        numberStr = numberStr.replace(',', '.')
        amount = parseFloat(numberStr)
        
        if (suffix === 'rb' || suffix === 'ribu' || suffix === 'k') amount *= 1000
        else if (suffix === 'jt' || suffix === 'juta') amount *= 1000000
    } else {
        numberStr = numberStr.replace(/[.,]/g, '')
        amount = parseInt(numberStr, 10)
    }

    if (isNaN(amount) || amount <= 0) return null

    let description = cleanText.replace(match[0], '').trim()
    description = description.replace(/^[,.\s\-]+|[,.\s\-]+$/g, '').trim();
    if (!description) description = 'Transaksi'
    description = description.replace(/\s+/g, ' ')

    let type = 'expense'
    if (sign === '+') type = 'income'
    else {
        const incomeKeywords = ['gaji', 'terima', 'dapat', 'income', 'pemasukan', 'deposit', 'transfer masuk']
        if (incomeKeywords.some(k => description.toLowerCase().includes(k))) type = 'income'
    }

    const keyword = description.split(' ')[0].toLowerCase()
    return { keyword, amount, type, description }
}

function parseLocalTimeAndClean(text: string, todayStr: string): { date: string, cleanedText: string } {
    let transactionDate = todayStr;
    let cleanedText = text;

    const parts = todayStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);

    // 1. Handle relative time patterns (case-insensitive, stateless without /g global flag)
    const relativePatterns = [
        { regex: /\bkemarin\s+lusa\b|\b2\s+hari\s+lalu\b/i, adjustDays: -2 },
        { regex: /\bkemarin\b/i, adjustDays: -1 },
        { regex: /\bhari\s+ini\b/i, adjustDays: 0 },
        { regex: /\bbesok\b/i, adjustDays: 1 },
        { regex: /\blusa\b/i, adjustDays: 2 }
    ];

    for (const pattern of relativePatterns) {
        if (pattern.regex.test(cleanedText)) {
            const adjustedDate = new Date(dateObj);
            adjustedDate.setDate(adjustedDate.getDate() + pattern.adjustDays);
            
            const y = adjustedDate.getFullYear();
            const m = String(adjustedDate.getMonth() + 1).padStart(2, '0');
            const d = String(adjustedDate.getDate()).padStart(2, '0');
            transactionDate = `${y}-${m}-${d}`;
            
            cleanedText = cleanedText.replace(pattern.regex, '').trim();
            break;
        }
    }

    // 2. Handle absolute dates (e.g. "18 mei 2026", "18/05/2026", "18 mei", "18/05")
    const monthNames = [
        'januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember',
        'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'ags', 'agu', 'sep', 'okt', 'nov', 'des',
        'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
        'may', 'oct', 'dec'
    ];
    const monthRegexStr = monthNames.join('|');

    // Pattern A: DD [Month] YYYY or DD [Month] (e.g., "18 mei 2026", "18 mei")
    const absDateRegexText = new RegExp(`\\b(\\d{1,2})\\s+(${monthRegexStr})\\s*(\\d{4})?\\b`, 'i');
    const matchText = cleanedText.match(absDateRegexText);

    if (matchText) {
        const matchDay = parseInt(matchText[1], 10);
        const matchMonthStr = matchText[2].toLowerCase();
        let matchYear = matchText[3] ? parseInt(matchText[3], 10) : year;

        // Map month name to index (0-11)
        let matchMonth = -1;
        const indonesianMonths = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'ag', 'sep', 'okt', 'nov', 'des'];
        const englishMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        for (let i = 0; i < 12; i++) {
            if (matchMonthStr.startsWith(indonesianMonths[i]) || matchMonthStr.startsWith(englishMonths[i])) {
                matchMonth = i;
                break;
            }
        }

        if (matchMonth !== -1 && matchDay >= 1 && matchDay <= 31) {
            const targetDate = new Date(matchYear, matchMonth, matchDay);
            const y = targetDate.getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            const d = String(targetDate.getDate()).padStart(2, '0');
            transactionDate = `${y}-${m}-${d}`;
            cleanedText = cleanedText.replace(matchText[0], '').trim();
        }
    } else {
        // Pattern B: DD/MM/YYYY or DD-MM-YYYY or DD/MM or DD-MM (numeric formats)
        const numericDateRegex = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;
        const matchNum = cleanedText.match(numericDateRegex);

        if (matchNum) {
            const matchDay = parseInt(matchNum[1], 10);
            const matchMonth = parseInt(matchNum[2], 10) - 1; // 0-indexed
            let matchYear = matchNum[3] ? parseInt(matchNum[3], 10) : year;
            if (matchNum[3] && matchNum[3].length === 2) {
                matchYear = 2000 + matchYear;
            }

            if (matchMonth >= 0 && matchMonth <= 11 && matchDay >= 1 && matchDay <= 31) {
                const targetDate = new Date(matchYear, matchMonth, matchDay);
                const y = targetDate.getFullYear();
                const m = String(targetDate.getMonth() + 1).padStart(2, '0');
                const d = String(targetDate.getDate()).padStart(2, '0');
                transactionDate = `${y}-${m}-${d}`;
                cleanedText = cleanedText.replace(matchNum[0], '').trim();
            }
        }
    }

    // 3. Handle generic "tanggal \d+" patterns
    const dateMatch = cleanedText.match(/\btanggal\s+(\d+)\b/i);
    if (dateMatch) {
        const targetDay = parseInt(dateMatch[1], 10);
        if (targetDay >= 1 && targetDay <= 31) {
            const targetDate = new Date(dateObj);
            targetDate.setDate(targetDay);
            
            const y = targetDate.getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            const d = String(targetDate.getDate()).padStart(2, '0');
            transactionDate = `${y}-${m}-${d}`;
            
            cleanedText = cleanedText.replace(dateMatch[0], '').trim();
        }
    }

    return { date: transactionDate, cleanedText };
}
