import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Konfigurasi CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Tangani preflight request (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verifikasi Keamanan (Opsional namun sangat disarankan)
    // RevenueCat bisa dikonfigurasi untuk mengirim Authorization header
    const authHeader = req.headers.get('Authorization');
    const expectedToken = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.error("Unauthorized webhook request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 2. Parse Payload dari RevenueCat
    const body = await req.json();
    const event = body.event;

    if (!event) {
      return new Response(JSON.stringify({ error: "No event found" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`Received RevenueCat event: ${event.type} for user: ${event.app_user_id}`);

    // Kita hanya memproses event pembelian atau perpanjangan
    if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') {
      const userId = event.app_user_id;
      const productId = event.product_id;
      
      // Inisialisasi Supabase Admin Client untuk bypass RLS
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // Cari paket berdasarkan ID produk (asumsinya ID di Play Store sama dengan ID di tabel kita)
      const { data: plan, error: planError } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .eq('id', productId)
        .single();

      if (planError || !plan) {
        console.error(`Plan with ID ${productId} not found`);
        return new Response(JSON.stringify({ error: "Plan not found" }), { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(now.getDate() + plan.duration_days);

      // Nonaktifkan langganan lama yang masih aktif
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'expired', updated_at: now.toISOString() })
        .eq('user_id', userId)
        .eq('status', 'active');

      // Masukkan langganan baru
      const { error: insertError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_id: plan.id,
          status: 'active',
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      // Catat juga ke tabel payment_transactions (opsional untuk histori)
      await supabaseAdmin
        .from('payment_transactions')
        .insert({
          user_id: userId,
          plan_id: plan.id,
          amount: plan.price,
          status: 'success',
          payment_method: 'google_play',
          metadata: {
            revenuecat_event: event.type,
            transaction_id: event.transaction_id,
            original_app_user_id: event.original_app_user_id
          }
        });

      console.log(`Successfully activated subscription for user ${userId}`);
    }

    // Selalu balas dengan 200 OK agar RevenueCat tahu webhook berhasil diterima
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook processing error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
