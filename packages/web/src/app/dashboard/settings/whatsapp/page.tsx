"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Check, X, Phone, Link2, Unlink, Loader } from "lucide-react";
import { useAuth } from "@/providers";

export default function WhatsAppPage() {
  const { user, api } = useAuth();

  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await api.whatsapp.getLinkedAccount(user.id);
        if (res.data) {
          setLinkedPhone(res.data.phone_number);
          setPhoneInput(res.data.phone_number);
        }
      } catch (err) {
        console.error("Gagal memuat status WhatsApp:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, api.whatsapp]);

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleLink = async () => {
    if (!user || !phoneInput.trim()) return;
    setConnecting(true);
    try {
      const normalized = phoneInput.trim().replace(/[\s\-\+]/g, "");
      const res = await api.whatsapp.linkPhone(user.id, normalized);
      if (res.error) throw res.error;
      if (res.data) {
        setLinkedPhone(res.data.phone_number);
        showAlert("success", "WhatsApp berhasil dihubungkan!");
      }
    } catch (err: any) {
      showAlert("error", err?.message || "Gagal menghubungkan WhatsApp");
    } finally {
      setConnecting(false);
    }
  };

  const handleUnlink = async () => {
    if (!user || !confirm("Putuskan koneksi WhatsApp?")) return;
    setConnecting(true);
    try {
      const res = await api.whatsapp.unlinkPhone(user.id);
      if (res.error) throw res.error;
      setLinkedPhone(null);
      setPhoneInput("");
      showAlert("success", "Koneksi WhatsApp berhasil diputuskan");
    } catch (err: any) {
      showAlert("error", err?.message || "Gagal memutuskan koneksi");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <>
      {/* Alert Toast */}
      {alert && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-3 transition-all animate-slide-down ${
            alert.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {alert.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <X className="h-4 w-4 shrink-0" />
          )}
          {alert.message}
        </div>
      )}

      {/* Header */}
      <section className="mb-8">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-bold text-dashboard-gray hover:text-dashboard-blue transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Pengaturan
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-green-500" />
          </div>
          <span className="text-xs font-bold text-dashboard-gray uppercase tracking-widest">
            Integrasi
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
          Chat Bot Transaksi
        </h1>
        <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
          Catat pemasukan dan pengeluaran cukup lewat chat WhatsApp — otomatis tersimpan.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Status + Connection */}
        <div className="flex flex-col gap-6">
          {/* Status Card */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
              Status Koneksi
            </h3>

            {loading ? (
              <div className="flex items-center gap-3 text-sm text-dashboard-gray">
                <Loader className="h-4 w-4 animate-spin" />
                Memuat status...
              </div>
            ) : linkedPhone ? (
              <div>
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-200 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Check className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-emerald-800">Tersambung</span>
                    <p className="text-xs text-emerald-600 mt-0.5">{linkedPhone}</p>
                  </div>
                </div>
                <button
                  onClick={handleUnlink}
                  disabled={connecting}
                  className="w-full py-3.5 rounded-2xl border-2 border-red-200 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {connecting ? (
                    <><Loader className="h-4 w-4 animate-spin" />Memproses...</>
                  ) : (
                    <><Unlink className="h-4 w-4" />Putuskan Koneksi</>
                  )}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-200 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <X className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-red-800">Belum tersambung</span>
                    <p className="text-xs text-red-600 mt-0.5">
                      Hubungkan nomor WhatsApp Anda untuk mulai mencatat transaksi via chat
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connect Card */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
              {linkedPhone ? "Nomor Terhubung" : "Hubungkan Nomor"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue"
                  placeholder="+62812xxxx"
                  disabled={!!linkedPhone}
                />
                <p className="text-xs text-dashboard-gray mt-1.5">
                  Masukkan nomor WhatsApp aktif dengan kode negara (contoh: +62812xxxx)
                </p>
              </div>

              {!linkedPhone && (
                <button
                  onClick={handleLink}
                  disabled={connecting || !phoneInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-green-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {connecting ? (
                    <><Loader className="h-4 w-4 animate-spin" />Menghubungkan...</>
                  ) : (
                    <><Link2 className="h-4 w-4" />Hubungkan</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Instructions + Examples */}
        <div className="flex flex-col gap-6">
          {/* How it works */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
              Cara Kerja
            </h3>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-600">1</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Hubungkan nomor Anda</p>
                  <p className="text-xs text-dashboard-gray mt-0.5">
                    Masukkan nomor WhatsApp aktif di kolom sebelah kiri
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-600">2</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Simpan kontak bot</p>
                  <p className="text-xs text-dashboard-gray mt-0.5">
                    Simpan nomor <span className="font-bold text-blue-600">+62 813-9359-1050</span> ke kontak Anda dengan nama "Karsafin Bot"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-600">3</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Chat transaksi</p>
                  <p className="text-xs text-dashboard-gray mt-0.5">
                    Kirim pesan transaksi ke nomor Karsafin Bot. AI akan otomatis mengenali dan mencatatnya
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-blue-600">4</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Transaksi tercatat otomatis</p>
                  <p className="text-xs text-dashboard-gray mt-0.5">
                    Transaksi langsung muncul di aplikasi dan akan ditandai dengan badge 💬
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Example Messages */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
              Contoh Chat Transaksi
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs text-dashboard-gray mb-1">Kamu kirim:</p>
                <div className="bg-white rounded-xl p-3 border border-slate-200 inline-block max-w-xs">
                  <p className="text-sm text-slate-800">"<span className="font-medium">beli nasi padang 25rb</span>"</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Pengeluaran</span>
                  <span className="text-xs text-slate-500">Rp25.000 · Makanan</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs text-dashboard-gray mb-1">Kamu kirim:</p>
                <div className="bg-white rounded-xl p-3 border border-slate-200 inline-block max-w-xs">
                  <p className="text-sm text-slate-800">"<span className="font-medium">gaji 5jt</span>"</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">Pemasukan</span>
                  <span className="text-xs text-slate-500">Rp5.000.000 · Gaji</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs text-dashboard-gray mb-1">Kamu kirim:</p>
                <div className="bg-white rounded-xl p-3 border border-slate-200 inline-block max-w-xs">
                  <p className="text-sm text-slate-800">"<span className="font-medium">bensin 100rb kemarin</span>"</p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Pengeluaran</span>
                  <span className="text-xs text-slate-500">Rp100.000 · Transportasi (kemarin)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
