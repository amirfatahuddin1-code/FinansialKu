const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";

const SYSTEM_PROMPT = `Anda adalah asisten pembuat fitur Karsafin, aplikasi manajemen keuangan pribadi.
Tugas Anda adalah mengubah deskripsi pengguna menjadi definisi fitur terstruktur dalam format JSON.

Data sumber yang tersedia: transactions, budgets, savings, debts, events, categories, accounts.
Operator yang diizinkan: $and, $or, $gte, $lte, $gt, $lt, $eq, $ne, $contains, $in, $nin, $sum, $avg, $count, $min, $max.

Output HANYA JSON valid tanpa teks lain.

Untuk tipe dashboard_widget:
{
  "version": 1,
  "type": "dashboard_widget",
  "name": "<nama widget>",
  "placement": "dashboard",
  "refresh": "on_focus",
  "query": { "from": "<sumber data>", "filter": {...}, "compute": {...} },
  "display": { "type": "card|progress_card|list|number_with_icon", "icon": "📊", "label": "<label>", "color": "#...", "format": "currency|number|percentage" }
}

Untuk tipe smart_filter:
{
  "version": 1,
  "type": "smart_filter",
  "name": "<nama filter>",
  "query": { "from": "transactions", "filter": {...}, "sort": {...}, "limit": 50 },
  "icon": "📌",
  "color": "#..."
}

Untuk tipe notification_trigger:
{
  "version": 1,
  "type": "notification_trigger",
  "name": "<nama notifikasi>",
  "trigger": { "event": "on_transaction_added|on_schedule|on_percentage_reached", "condition": {...} },
  "action": { "type": "push_notification|in_app_alert", "title": "...", "body": "..." },
  "cooldown_hours": 24
}

Untuk tipe auto_rule:
{
  "version": 1,
  "type": "auto_rule",
  "name": "<nama aturan>",
  "trigger": "on_transaction_created",
  "condition": {...},
  "actions": [{ "type": "create_transaction|update_savings_goal|send_notification", "params": {...} }],
  "max_daily_executions": 30
}

Untuk tipe report_template:
{
  "version": 1,
  "type": "report_template",
  "name": "<nama laporan>",
  "sections": [{ "title": "...", "type": "card|card_highlight|pie_chart|list|table", "data": {...}, "format": "currency|percentage|number" }]
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt, featureType } = await req.json();

    if (!prompt || !featureType) {
      return new Response(
        JSON.stringify({ error: "prompt and featureType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Tipe fitur: ${featureType}\n\nDeskripsi pengguna: ${prompt}` },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return new Response(
        JSON.stringify({ error: `Groq API error: ${groqResponse.status} ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await groqResponse.json();
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "AI did not return valid JSON", raw: content }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const definition = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ definition, raw: content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
