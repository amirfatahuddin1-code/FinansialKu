"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Check,
  Circle,
  Wifi,
  WifiOff,
  ExternalLink,
  Copy,
  Users,
  Plus,
  Trash2,
  MessageCircle,
  Zap,
} from "lucide-react";

const linkedGroups = [
  {
    id: 1,
    name: "Keuangan Keluarga",
    members: 4,
    lastSync: "2 jam lalu",
  },
  {
    id: 2,
    name: "Tabungan Bersama",
    members: 3,
    lastSync: "5 jam lalu",
  },
];

export default function TelegramPage() {
  const [isConnected, setIsConnected] = useState(true);
  const [telegramId, setTelegramId] = useState("812345678");
  const [copied, setCopied] = useState(false);

  const handleCopyBot = () => {
    navigator.clipboard.writeText("@FinanzaidBot");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-bold text-dashboard-gray hover:text-dashboard-blue transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Pengaturan
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-sky-50 rounded-2xl flex items-center justify-center">
            <Send className="h-5 w-5 text-sky-500" />
          </div>
          <span className="text-xs font-bold text-dashboard-gray uppercase tracking-widest">
            Integrasi
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
          Integrasi Telegram
        </h1>
        <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
          Hubungkan akun Telegram Anda untuk menerima notifikasi dan input transaksi.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Status + Setup */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Connection Status Card */}
          <div
            className={`custom-card p-8 border-2 transition-colors ${
              isConnected ? "border-green-200" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                    isConnected
                      ? "bg-gradient-to-br from-green-400 to-emerald-500 shadow-green-200"
                      : "bg-slate-200 shadow-slate-100"
                  }`}
                >
                  {isConnected ? (
                    <Wifi className="h-8 w-8 text-white" />
                  ) : (
                    <WifiOff className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-800">
                      {isConnected ? "Terhubung" : "Tidak Terhubung"}
                    </h2>
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isConnected ? "bg-green-400 animate-pulse" : "bg-slate-300"
                      }`}
                    />
                  </div>
                  {isConnected ? (
                    <p className="text-sm text-dashboard-gray mt-0.5">
                      Telegram ID:{" "}
                      <span className="font-mono font-bold text-slate-600">
                        {telegramId}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-dashboard-gray mt-0.5">
                      Ikuti langkah di bawah untuk menghubungkan
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsConnected(!isConnected)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer shadow-md ${
                  isConnected
                    ? "bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 shadow-red-100"
                    : "bg-dashboard-blue text-white hover:bg-blue-700 shadow-blue-200"
                }`}
              >
                {isConnected ? "Putuskan" : "Hubungkan"}
              </button>
            </div>

            {/* Stats when connected */}
            {isConnected && (
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-800">142</p>
                  <p className="text-[10px] font-bold text-dashboard-gray uppercase tracking-widest mt-1">
                    Pesan Terkirim
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-800">38</p>
                  <p className="text-[10px] font-bold text-dashboard-gray uppercase tracking-widest mt-1">
                    Transaksi via Bot
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-green-500">Aktif</p>
                  <p className="text-[10px] font-bold text-dashboard-gray uppercase tracking-widest mt-1">
                    Status Notifikasi
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Setup Steps */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2">
              Cara Menghubungkan
            </h3>
            <p className="text-sm text-dashboard-gray mb-8">
              Ikuti 3 langkah berikut untuk menghubungkan akun Telegram Anda.
            </p>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                      isConnected
                        ? "bg-green-500 text-white"
                        : "bg-dashboard-blue text-white"
                    }`}
                  >
                    {isConnected ? <Check className="h-5 w-5" /> : "1"}
                  </div>
                  <div className="w-0.5 flex-1 bg-slate-100 mt-2" />
                </div>
                <div className="pb-6">
                  <h4 className="font-bold text-slate-800 mb-1">
                    Buka Bot @FinanzaidBot di Telegram
                  </h4>
                  <p className="text-sm text-dashboard-gray mb-3">
                    Klik tombol di bawah atau cari &quot;FinanzaidBot&quot; di aplikasi Telegram Anda.
                  </p>
                  <div className="flex gap-2">
                    <a
                      href="https://t.me/FinanzaidBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 rounded-xl text-sm font-bold hover:bg-sky-100 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Buka di Telegram
                    </a>
                    <button
                      onClick={handleCopyBot}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? "Tersalin!" : "@FinanzaidBot"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                      isConnected
                        ? "bg-green-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isConnected ? <Check className="h-5 w-5" /> : "2"}
                  </div>
                  <div className="w-0.5 flex-1 bg-slate-100 mt-2" />
                </div>
                <div className="pb-6">
                  <h4 className="font-bold text-slate-800 mb-1">
                    Kirim /start untuk mendapatkan kode verifikasi
                  </h4>
                  <p className="text-sm text-dashboard-gray mb-3">
                    Bot akan mengirimkan Telegram ID Anda. Salin ID tersebut.
                  </p>
                  <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm">
                    <p className="text-slate-400">
                      <span className="text-green-400">Anda:</span>{" "}
                      <span className="text-white">/start</span>
                    </p>
                    <p className="text-slate-400 mt-2">
                      <span className="text-sky-400">Bot:</span>{" "}
                      <span className="text-white">
                        Selamat datang! 👋 Telegram ID Anda:{" "}
                      </span>
                      <span className="text-amber-300 font-bold">812345678</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                      isConnected
                        ? "bg-green-500 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isConnected ? <Check className="h-5 w-5" /> : "3"}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">
                    Masukkan Telegram ID Anda
                  </h4>
                  <p className="text-sm text-dashboard-gray mb-3">
                    Tempelkan ID yang diberikan bot ke kolom di bawah dan klik
                    &quot;Hubungkan&quot;.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={telegramId}
                      onChange={(e) => setTelegramId(e.target.value)}
                      placeholder="Masukkan Telegram ID"
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all placeholder:text-slate-300"
                    />
                    <button className="px-6 py-3 bg-dashboard-blue text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-md shadow-blue-200">
                      Verifikasi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Groups + Features */}
        <div className="flex flex-col gap-6">
          {/* Linked Groups */}
          <div className="custom-card p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest">
                Grup Tertaut
              </h3>
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                {linkedGroups.length}
              </span>
            </div>

            <div className="space-y-3 mb-5">
              {linkedGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {group.name}
                    </p>
                    <p className="text-[10px] text-dashboard-gray">
                      {group.members} anggota · Sync {group.lastSync}
                    </p>
                  </div>
                  <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-slate-300 hover:text-red-500 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-slate-50 text-slate-600 border border-dashed border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-colors cursor-pointer">
              <Plus className="h-4 w-4" />
              Tambah Grup Baru
            </button>
          </div>

          {/* Features */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-5">
              Fitur Bot
            </h3>
            <div className="space-y-4">
              {[
                {
                  icon: Zap,
                  label: "Input Cepat",
                  desc: "Catat transaksi langsung dari chat",
                  color: "text-amber-500 bg-amber-50",
                },
                {
                  icon: MessageCircle,
                  label: "Notifikasi",
                  desc: "Pengingat tagihan & laporan harian",
                  color: "text-blue-500 bg-blue-50",
                },
                {
                  icon: Users,
                  label: "Grup",
                  desc: "Pantau keuangan bersama keluarga",
                  color: "text-emerald-500 bg-emerald-50",
                },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.label} className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${feature.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {feature.label}
                      </p>
                      <p className="text-xs text-dashboard-gray">{feature.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
