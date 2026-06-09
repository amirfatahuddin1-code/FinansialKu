"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers";
import {
  Zap,
  Clock,
  Crown,
  Rocket,
  Star,
  CalendarClock,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  Gift,
  ChevronLeft,
  X,
  Play,
  HelpCircle,
  Loader2,
  PhoneCall,
  Send,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";

export default function AIQuotaPage() {
  const { user, api } = useAuth();
  
  const [aiQuota, setAiQuota] = useState<{ quota: number; max: number; rewardAmount: number } | null>(null);
  const [telegramQuota, setTelegramQuota] = useState<{ quota: number; max: number; rewardAmount: number } | null>(null);
  const [whatsappQuota, setWhatsappQuota] = useState<{ quota: number; max: number; rewardAmount: number } | null>(null);
  const [messagingUsage, setMessagingUsage] = useState<{ wa_count: number; telegram_count: number } | null>(null);
  
  const [isUnlimitedAi, setIsUnlimitedAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadQuota = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Load AI Quota
      try {
        const aiRes = await api.profiles.getAiQuota(user.id);
        if (aiRes.data) setAiQuota(aiRes.data);
      } catch (e) {
        console.warn("Error loading AI quota:", e);
      }

      // 2. Load Telegram Quota
      try {
        const tgRes = await api.profiles.getTelegramQuota(user.id);
        if (tgRes.data) setTelegramQuota(tgRes.data);
      } catch (e) {
        console.warn("Error loading Telegram quota:", e);
      }

      // 3. Load WhatsApp Quota
      try {
        const waRes = await api.profiles.getWhatsappQuota(user.id);
        if (waRes.data) setWhatsappQuota(waRes.data);
      } catch (e) {
        console.warn("Error loading WhatsApp quota:", e);
      }

      // 4. Load Messaging Usage
      try {
        const usageRes = await api.subscription.getMessagingUsage(user.id);
        if (usageRes.data) setMessagingUsage(usageRes.data);
      } catch (e) {
        console.warn("Error loading messaging usage:", e);
      }

      // 5. Load Subscription History
      try {
        const subRes = await api.subscription.getSubscriptionHistory(user.id);
        const activeSub = subRes.data?.find((s: any) => s.status === "active");
        const planName = activeSub?.subscription_plans?.name || "";
        setIsUnlimitedAi(planName.includes("Pro") || planName.includes("Trial"));
      } catch (e) {
        console.warn("Error loading subscription history:", e);
      }
    } catch (e) {
      console.warn("General load quota error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, api]);

  useEffect(() => {
    if (user) {
      loadQuota();
    }
  }, [user, loadQuota]);

  const handleWatchAd = () => {
    const isAiMax = (aiQuota?.quota ?? 0) >= (aiQuota?.max ?? 50);
    const isTgMax = (telegramQuota?.quota ?? 20) >= (telegramQuota?.max ?? 50);
    const isWaMax = (whatsappQuota?.quota ?? 20) >= (whatsappQuota?.max ?? 50);

    if (isAiMax && isTgMax && isWaMax) {
      alert("Mohon Maaf, semua kuota transaksi kamu sudah mencapai batas maksimal (50).");
      return;
    }
    setAdPlaying(true);
    setAdProgress(0);

    const interval = setInterval(() => {
      setAdProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setAdPlaying(false);
          setAdProgress(0);
          setShowRewardModal(true);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleClaimReward = async (type: "ai" | "telegram" | "whatsapp") => {
    if (!user) return;
    try {
      setShowRewardModal(false);
      setLoading(true);

      let res;
      let title = "";
      if (type === "ai") {
        res = await api.profiles.addAiQuota(user.id, 5);
        title = "AI Asisten";
      } else if (type === "telegram") {
        res = await api.profiles.addTelegramQuota(user.id, 5);
        title = "Transaksi Telegram";
      } else if (type === "whatsapp") {
        res = await api.profiles.addWhatsappQuota(user.id, 5);
        title = "Transaksi WhatsApp";
      }

      await loadQuota();

      if (res && res.data && res.data.applied && !res.error) {
        alert(`🎉 Selamat! Kuota ${title} Anda berhasil ditambah +5!`);
      } else {
        const errorMsg =
          (res as any)?.error?.message || (res as any)?.error || "Kuota mungkin sudah mencapai batas harian.";
        alert(`Mohon Maaf, gagal menambahkan kuota ${title}. ${errorMsg}`);
      }
    } catch (e: any) {
      console.warn("Error claiming reward:", e);
      alert(e.message || "Terjadi kesalahan sistem saat memproses reward.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !aiQuota) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="h-10 w-10 text-dashboard-blue animate-spin mb-4" />
        <p className="text-dashboard-gray font-bold">Memuat data kuota...</p>
      </div>
    );
  }

  // Quota AI calculations
  const quota = aiQuota?.quota ?? 0;
  const maxQuota = aiQuota?.max ?? 50;
  const aiRemaining = isUnlimitedAi ? maxQuota : quota;
  const aiUsed = maxQuota - aiRemaining;
  const aiPct = maxQuota > 0 ? (aiRemaining / maxQuota) * 100 : 0;
  const angle = (aiUsed / maxQuota) * 360;

  // Telegram calculations
  const tgLimit = telegramQuota?.quota ?? 20;
  const tgUsage = messagingUsage?.telegram_count ?? 0;
  const tgRemaining = isUnlimitedAi ? tgLimit : Math.max(0, tgLimit - tgUsage);
  const tgPct = tgLimit > 0 ? (tgRemaining / tgLimit) * 100 : 0;

  // WhatsApp calculations
  const waLimit = whatsappQuota?.quota ?? 20;
  const waUsage = messagingUsage?.wa_count ?? 0;
  const waRemaining = isUnlimitedAi ? waLimit : Math.max(0, waLimit - waUsage);
  const waPct = waLimit > 0 ? (waRemaining / waLimit) * 100 : 0;

  const rewardAmount = aiQuota?.rewardAmount ?? 5;

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/dashboard/ai"
          className="inline-flex items-center gap-2 text-dashboard-gray hover:text-dashboard-blue transition-colors mb-6 text-sm font-bold"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Asisten AI
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-slate-800">
          Kuota AI & Transaksi
        </h1>
        <p className="text-dashboard-gray max-w-2xl text-lg leading-relaxed">
          Kelola kuota penggunaan asisten AI, Telegram, dan WhatsApp Anda. Pantau pemakaian harian dan tonton iklan untuk kuota tambahan gratis.
        </p>
      </section>

      <div className="grid grid-cols-12 gap-8 mb-8">
        {/* Main Quota Display (AI Asisten) */}
        <div className="col-span-12 lg:col-span-5 custom-card p-8 md:p-10 flex flex-col items-center text-center">
          <h3 className="font-black text-lg text-slate-800 mb-6">Status Utama AI</h3>
          {/* Circular Progress */}
          <div className="relative w-52 h-52 mb-8">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(
                  #3b82f6 ${angle}deg,
                  #f1f5f9 ${angle}deg
                )`,
                padding: "14px",
              }}
            >
              {/* Inner circle (white) */}
              <div className="w-full h-full bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                <Zap className="h-6 w-6 text-dashboard-blue mb-2" />
                <span className="text-4xl font-black text-slate-800">
                  {isUnlimitedAi ? "∞" : aiRemaining}
                </span>
                <span className="text-sm font-bold text-slate-400">
                  dari {maxQuota}
                </span>
                <span className="text-xs text-slate-400 mt-0.5">
                  pertanyaan tersisa
                </span>
              </div>
            </div>
          </div>

          {/* Usage Summary */}
          <div className="grid grid-cols-3 gap-4 w-full mb-6">
            <div className="bg-blue-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-dashboard-blue">{isUnlimitedAi ? 0 : aiUsed}</p>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                Terpakai
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
              <p className="text-2xl font-black text-slate-800">{isUnlimitedAi ? "∞" : aiRemaining}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Tersisa
              </p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-green-600">{maxQuota}</p>
              <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">
                Batas
              </p>
            </div>
          </div>

          {/* Reset Date */}
          <div className="flex items-center gap-3 bg-amber-50 rounded-2xl px-5 py-3 w-full border border-amber-100">
            <CalendarClock className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-left">
              <p className="text-xs font-bold text-amber-700">
                Reset Kuota Harian
              </p>
              <p className="text-sm font-black text-amber-800">
                Pukul 00:00 <span className="font-semibold text-amber-500">tengah malam</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Other quotas & Ad Rewards */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
          {/* Messaging Quotas */}
          <div className="custom-card p-8 flex flex-col gap-6">
            <h3 className="font-black text-xl text-slate-800">
              Saluran Transaksi Tambahan
            </h3>

            {/* Telegram Quota Row */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✈️</span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">Telegram Bot</h4>
                    <p className="text-xs text-slate-400">Pencatatan cepat via Telegram</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-800 text-lg">
                    {isUnlimitedAi ? "∞" : tgRemaining}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/{tgLimit}</span>
                </div>
              </div>
              {!isUnlimitedAi && (
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${tgRemaining <= 5 ? "bg-red-500" : "bg-blue-600"}`}
                    style={{ width: `${tgPct}%` }}
                  />
                </div>
              )}
            </div>

            {/* WhatsApp Quota Row */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💬</span>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">WhatsApp Bot</h4>
                    <p className="text-xs text-slate-400">Pencatatan cepat via WhatsApp</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-800 text-lg">
                    {isUnlimitedAi ? "∞" : waRemaining}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">/{waLimit}</span>
                </div>
              </div>
              {!isUnlimitedAi && (
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${waRemaining <= 5 ? "bg-red-500" : "bg-blue-600"}`}
                    style={{ width: `${waPct}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Ad Reward Actions */}
          {!isUnlimitedAi && (
            <div className="custom-card p-8 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                <Gift className="h-7 w-7 text-dashboard-blue animate-bounce" />
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h4 className="font-black text-lg text-slate-800">
                  Dapatkan Kuota Gratis Tambahan!
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tonton video simulasi iklan singkat (3 detik) untuk mengisi ulang **+{rewardAmount} kuota** pada saluran pilihan Anda secara gratis.
                </p>
              </div>

              {adPlaying ? (
                <div className="w-full md:w-48 space-y-2">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${adProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-blue-600 font-bold text-center animate-pulse">Menonton Iklan...</p>
                </div>
              ) : (
                <button
                  onClick={handleWatchAd}
                  className="bg-dashboard-blue text-white font-bold px-6 py-3.5 rounded-2xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-blue-200 shrink-0 flex items-center gap-2 text-sm"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Tonton Iklan (+{rewardAmount})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Choice Modal for Claiming Reward */}
      {mounted && showRewardModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-6 relative shadow-2xl border border-slate-100 animate-fade-in-up">
            <button
              onClick={() => setShowRewardModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center py-4 space-y-4">
              <span className="text-5xl block">🎉</span>
              <h2 className="text-2xl font-black text-slate-800">Pilih Reward Kuota</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Anda berhasil menyelesaikan menonton iklan! Pilih jenis kuota yang ingin ditambahkan **+{rewardAmount}**:
              </p>

              <div className="grid grid-cols-1 gap-2 pt-2 text-left">
                {/* AI Quota Choice */}
                <button
                  onClick={() => handleClaimReward("ai")}
                  disabled={quota >= maxQuota}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-2xl p-4 transition-all flex items-center gap-4 cursor-pointer disabled:opacity-50"
                >
                  <span className="text-2xl">🤖</span>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-800">AI Asisten (+{rewardAmount})</p>
                    <p className="text-xs text-slate-400">
                      {quota >= maxQuota ? "Sudah Maksimal" : `Saat ini: ${quota}/${maxQuota}`}
                    </p>
                  </div>
                  {quota >= maxQuota && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded-full">Maks</span>}
                </button>

                {/* Telegram Quota Choice */}
                <button
                  onClick={() => handleClaimReward("telegram")}
                  disabled={tgLimit >= 50}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-2xl p-4 transition-all flex items-center gap-4 cursor-pointer disabled:opacity-50"
                >
                  <span className="text-2xl">✈️</span>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-800">Telegram Bot (+{rewardAmount})</p>
                    <p className="text-xs text-slate-400">
                      {tgLimit >= 50 ? "Sudah Maksimal" : `Limit harian saat ini: ${tgLimit}/50`}
                    </p>
                  </div>
                  {tgLimit >= 50 && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded-full">Maks</span>}
                </button>

                {/* WhatsApp Quota Choice */}
                <button
                  onClick={() => handleClaimReward("whatsapp")}
                  disabled={waLimit >= 50}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 rounded-2xl p-4 transition-all flex items-center gap-4 cursor-pointer disabled:opacity-50"
                >
                  <span className="text-2xl">💬</span>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-800">WhatsApp Bot (+{rewardAmount})</p>
                    <p className="text-xs text-slate-400">
                      {waLimit >= 50 ? "Sudah Maksimal" : `Limit harian saat ini: ${waLimit}/50`}
                    </p>
                  </div>
                  {waLimit >= 50 && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded-full">Maks</span>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Info Section / Rules */}
      <h3 className="font-black text-2xl text-slate-800 mb-6 mt-8">
        Tentang Kuota & Limit
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <InfoCard
          icon="🎯"
          title="Apa itu Kuota Transaksi?"
          description="Kuota transaksi membatasi jumlah aktivitas yang dapat dicatat menggunakan AI Asisten, Telegram, atau WhatsApp setiap hari untuk meminimalkan beban server."
        />
        <InfoCard
          icon="🔄"
          title="Kapan Kuota direset?"
          description="Setiap hari pukul 00:00 waktu setempat, kuota Anda akan direset secara otomatis kembali ke batas dasar harian."
        />
        <InfoCard
          icon="📈"
          title="Berapa maksimal kuota?"
          description="Maksimal kuota yang bisa dikumpulkan adalah 50 transaksi per hari untuk masing-masing jenis kuota melalui penayangan video reward."
        />
      </div>
    </>
  );
}

function InfoCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="custom-card p-6 flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
      <span className="text-3xl">{icon}</span>
      <h4 className="font-black text-slate-800 text-base">{title}</h4>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
