"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  Palette,
  CalendarDays,
  Users,
  Send,
  CreditCard,
  HelpCircle,
  FileText,
  Shield,
  Mail,
  MessageSquare,
  ChevronRight,
  Crown,
  Sparkles,
  User,
  Phone,
  Save,
  X,
  Check,
  LogOut,
  RefreshCw,
  Wallet,
  ShoppingBag,
  MessageCircle,
  Info,
} from "lucide-react";
import { useAuth, useWorkspace } from "@/providers";

const accentColors = [
  { id: "blue", label: "Biru", color: "#2563eb" },
  { id: "green", label: "Hijau", color: "#16a34a" },
  { id: "purple", label: "Ungu", color: "#9333ea" },
  { id: "orange", label: "Oranye", color: "#ea580c" },
  { id: "red", label: "Merah", color: "#dc2626" },
  { id: "pink", label: "Pink", color: "#db2777" },
  { id: "teal", label: "Teal", color: "#0d9488" },
  { id: "indigo", label: "Indigo", color: "#4f46e5" },
  { id: "amber", label: "Amber", color: "#d97706" },
  { id: "cyan", label: "Sian", color: "#0891b2" },
  { id: "rose", label: "Mawar", color: "#e11d48" },
  { id: "emerald", label: "Zamrud", color: "#059669" },
];

export default function SettingsPage() {
  const { user, api, signOut } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspace();
  const router = useRouter();

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Subscription state
  const [showSubscription, setShowSubscription] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planDurationTab, setPlanDurationTab] = useState<'Bulanan' | 'Tahunan' | 'Lifetime'>('Bulanan');

  // Workspace state
  const [showWorkspace, setShowWorkspace] = useState(false);

  // WhatsApp state
  const [waLinked, setWaLiked] = useState(false);

  // About state
  const [showAbout, setShowAbout] = useState(false);

  // Logout state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const initials = user?.user_metadata?.name
    ? (user.user_metadata.name as string).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "KA";

  useEffect(() => {
    if (user) {
      setProfileName((user.user_metadata?.name as string) || "");
      setProfilePhone((user.user_metadata?.phone as string) || "");
      
      // Load active subscription for the profile badge
      api.subscription.getSubscriptionHistory(user.id).then((res) => {
        if (res.data) {
          const activeSub = res.data.find((s: any) => s.status === "active") || null;
          setActiveSubscription(activeSub);
        }
      }).catch(err => console.error("Gagal memuat langganan awal:", err));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.whatsapp.getLinkedAccount(user.id).then((res) => {
      if (res.data) setWaLiked(true);
    }).catch(() => {});
  }, [user, api.whatsapp]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await api.profiles.update(user.id, { name: profileName, phone: profilePhone });
      setShowProfile(false);
    } catch (err) {
      console.error("Gagal menyimpan profil:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  const openSubscription = async () => {
    setShowSubscription(true);
    setLoadingPlans(true);
    try {
      const [plansRes, subsRes] = await Promise.all([
        api.subscription.getPlans(),
        user ? api.subscription.getSubscriptionHistory(user.id) : Promise.resolve({ data: null }),
      ]);
      if (plansRes.data) setSubscriptionPlans(plansRes.data);
      const activeSub = subsRes.data?.find((s: any) => s.status === "active") || null;
      setActiveSubscription(activeSub);
    } catch (err) {
      console.error("Gagal memuat data langganan:", err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-dashboard-blue/10 rounded-2xl flex items-center justify-center">
            <Settings className="h-5 w-5 text-dashboard-blue" />
          </div>
          <span className="text-xs font-bold text-dashboard-gray uppercase tracking-widest">
            Pengaturan Akun
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
          Pengaturan
        </h1>
        <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
          Kelola profil, preferensi, dan konfigurasi workspace Anda.
        </p>
      </section>

      {/* Profile Card */}
      <section className="mb-8">
        <div className="custom-card p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-2xl font-black shadow-lg transition-all ${
              !activeSubscription || activeSubscription.subscription_plans?.name?.includes('Basic')
                ? "from-dashboard-blue to-blue-400 shadow-blue-200"
                : "from-dashboard-blue to-blue-500 shadow-amber-200 border-[3px] border-amber-400 ring-4 ring-amber-50"
            }`}>
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-[3px] border-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-black text-slate-800">
              {user?.user_metadata?.name || user?.email || "Pengguna"}
            </h2>
            <p className="text-dashboard-gray text-sm mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
              <span className="text-xs font-bold bg-dashboard-blue/10 text-dashboard-blue px-3 py-1 rounded-full">
                {activeWorkspace?.type === "family" ? "Anggota" : "Owner"}
              </span>
              {!activeSubscription || activeSubscription.subscription_plans?.name?.includes('Basic') ? (
                <span className="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full flex items-center gap-1 border border-slate-200">
                  Basic Plan
                </span>
              ) : (
                <span className="text-xs font-bold bg-amber-50 text-amber-600 px-3 py-1 rounded-full flex items-center gap-1 border border-amber-100">
                  <Crown className="h-3 w-3" />
                  {activeSubscription.subscription_plans?.name || "Pro Plan"}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="text-sm font-bold text-dashboard-blue hover:underline shrink-0 cursor-pointer bg-transparent border-none"
          >
            Edit Profil
          </button>
        </div>
      </section>

      {/* Settings Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Umum */}
        <div className="custom-card p-6">
          <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-5 px-2">
            Umum
          </h3>
          <div className="space-y-1">
            <SettingsItem
              href="/dashboard/settings/theme"
              icon={<Palette className="h-5 w-5" />}
              label="Tema & Warna"
              description="Ubah tampilan dan warna aplikasi"
              iconBg="bg-purple-50"
              iconColor="text-purple-500"
            />
            <SettingsItem
              href="/dashboard/settings/income-date"
              icon={<CalendarDays className="h-5 w-5" />}
              label="Tanggal Pemasukan"
              description="Atur tanggal gajian bulanan Anda"
              iconBg="bg-green-50"
              iconColor="text-green-500"
            />
            <SettingsItem
              href="/dashboard/accounts"
              icon={<CreditCard className="h-5 w-5" />}
              label="Akun Keuangan"
              description="Kelola akun bank, e-wallet, dan investasi"
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
            />
            <SettingsItem
              href="/dashboard/settings/categories"
              icon={<ShoppingBag className="h-5 w-5" />}
              label="Kategori Transaksi"
              description="Kelola kategori pemasukan dan pengeluaran"
              iconBg="bg-orange-50"
              iconColor="text-orange-500"
            />
          </div>
        </div>

        {/* Workspace */}
        <div className="custom-card p-6">
          <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-5 px-2">
            Workspace
          </h3>
          <div className="space-y-1">
            <SettingsItem
              href="/dashboard/settings/workspace"
              icon={<Users className="h-5 w-5" />}
              label="Anggota Workspace"
              description="Kelola anggota dan peran workspace"
              iconBg="bg-blue-50"
              iconColor="text-blue-500"
            />
            <button
              onClick={() => setShowWorkspace(true)}
              className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer text-left"
            >
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">Pilih Workspace</span>
                </div>
                <p className="text-xs text-dashboard-gray mt-0.5 truncate">
                  {activeWorkspace?.name || "Pilih workspace aktif"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-dashboard-blue group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          </div>
        </div>

        {/* Integrasi */}
        <div className="custom-card p-6">
          <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-5 px-2">
            Integrasi
          </h3>
          <div className="space-y-1">
            <SettingsItem
              href="/dashboard/settings/telegram"
              icon={<Send className="h-5 w-5" />}
              label="Telegram"
              description="Hubungkan bot Telegram untuk notifikasi"
              iconBg="bg-sky-50"
              iconColor="text-sky-500"
              badge="Terhubung"
              badgeColor="bg-green-50 text-green-600"
            />
            <SettingsItem
              href="/dashboard/settings/whatsapp"
              icon={<MessageCircle className="h-5 w-5" />}
              label="WhatsApp"
              description="Hubungkan WhatsApp untuk catat transaksi"
              iconBg="bg-green-50"
              iconColor="text-green-500"
              badge={waLinked ? "Terhubung" : undefined}
              badgeColor="bg-green-50 text-green-600"
            />
          </div>
        </div>

        {/* Langganan */}
        <div className="custom-card p-6">
          <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-5 px-2">
            Langganan
          </h3>
          <div className="px-2">
            <button
              onClick={openSubscription}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-dashboard-blue/5 to-blue-50 rounded-2xl border border-blue-100 cursor-pointer text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-dashboard-blue rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Paket Pro</span>
                    <span className="text-xs font-bold bg-dashboard-blue text-white px-2.5 py-0.5 rounded-full">
                      Aktif
                    </span>
                  </div>
                  <p className="text-xs text-dashboard-gray mt-0.5">
                    Kelola langganan dan tagihan
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
            </button>
          </div>
        </div>

        {/* Tentang */}
        <div className="custom-card p-6 lg:col-span-2">
          <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-5 px-2">
            Tentang
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <SettingsItem
              href="/faq"
              icon={<HelpCircle className="h-5 w-5" />}
              label="FAQ"
              description="Pertanyaan yang sering diajukan"
              iconBg="bg-amber-50"
              iconColor="text-amber-500"
            />
            <SettingsItem
              href="/syarat-ketentuan"
              icon={<FileText className="h-5 w-5" />}
              label="Syarat & Ketentuan"
              description="Ketentuan penggunaan aplikasi"
              iconBg="bg-slate-100"
              iconColor="text-slate-500"
            />
            <SettingsItem
              href="/privacy.html"
              icon={<Shield className="h-5 w-5" />}
              label="Kebijakan Privasi"
              description="Bagaimana kami melindungi data Anda"
              iconBg="bg-emerald-50"
              iconColor="text-emerald-500"
            />
            <SettingsItem
              href="/kontak-kami"
              icon={<Mail className="h-5 w-5" />}
              label="Kontak Kami"
              description="Hubungi tim support Karsafin"
              iconBg="bg-rose-50"
              iconColor="text-rose-500"
            />
            <SettingsItem
              href="/feedback"
              icon={<MessageSquare className="h-5 w-5" />}
              label="Masukan"
              description="Kirim saran dan masukan untuk kami"
              iconBg="bg-indigo-50"
              iconColor="text-indigo-500"
            />
            <button
              onClick={() => setShowAbout(true)}
              className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer text-left"
            >
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                <Info className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">Tentang Karsafin</span>
                </div>
                <p className="text-xs text-dashboard-gray mt-0.5 truncate">
                  Info aplikasi dan versi
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-dashboard-blue group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Logout + Version */}
      <div className="mt-8 space-y-4">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-4 rounded-2xl border-2 border-red-100 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          Keluar Akun
        </button>
        <p className="text-center text-xs text-dashboard-gray">
          Karsafin v1.0.0
        </p>
      </div>

      {/* ─── MODAL: Edit Profil ─── */}
      {showProfile && (
        <ModalOverlay onClose={() => setShowProfile(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">Profil Saya</h3>
              <button onClick={() => setShowProfile(false)} className="cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue"
                  placeholder="Nama lengkap Anda"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nomor Telepon</label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue"
                  placeholder="+62812xxxx"
                />
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full mt-6 py-3.5 rounded-2xl bg-dashboard-blue text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ─── MODAL: Pilih Workspace ─── */}
      {showWorkspace && (
        <ModalOverlay onClose={() => setShowWorkspace(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">Pilih Workspace</h3>
              <button onClick={() => setShowWorkspace(false)} className="cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={async () => {
                    await switchWorkspace(ws.id);
                    setShowWorkspace(false);
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
                    activeWorkspace?.id === ws.id
                      ? "border-dashboard-blue bg-blue-50/50"
                      : "border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                    activeWorkspace?.id === ws.id ? "bg-dashboard-blue" : "bg-slate-300"
                  }`}>
                    {ws.name?.charAt(0) || "W"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{ws.name}</span>
                      {activeWorkspace?.id === ws.id && (
                        <Check className="h-4 w-4 text-dashboard-blue" />
                      )}
                    </div>
                    <p className="text-xs text-dashboard-gray">{ws.type === "family" ? "Keluarga" : "Pribadi"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── MODAL: Subscription ─── */}
      {showSubscription && (
        <ModalOverlay onClose={() => setShowSubscription(false)}>
          <div className="bg-white rounded-3xl p-0 w-full max-w-2xl mx-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header / Hero Section */}
            <div className="relative bg-gradient-to-br from-dashboard-blue via-blue-600 to-indigo-700 p-8 text-center shrink-0">
              <button 
                onClick={() => setShowSubscription(false)} 
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 ring-4 ring-white/10">
                <Crown className="h-8 w-8 text-yellow-300 drop-shadow-md" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2 tracking-wide">
                Tingkatkan Pengalaman Karsafin Anda
              </h3>
              <p className="text-blue-100 text-sm max-w-md mx-auto leading-relaxed">
                Dapatkan akses penuh ke seluruh fitur eksklusif, kelola keuangan bersama keluarga, dan capai tujuan finansial Anda lebih cepat.
              </p>
            </div>

            {/* Content Area */}
            <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
              {loadingPlans ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-dashboard-blue border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm font-bold text-dashboard-gray">Memuat paket premium...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Active Subscription Banner */}
                  {activeSubscription && (
                    <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0 backdrop-blur-sm">
                          <Check className="h-6 w-6 text-emerald-100" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-lg">Paket {activeSubscription.subscription_plans?.name || "Pro"} Aktif</span>
                          </div>
                          <p className="text-sm text-emerald-50 font-medium">
                            Berlaku hingga {new Date(activeSubscription.expires_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Free Plan Features (Only visible if no subscription or Basic) */}
                  {(!activeSubscription || activeSubscription.subscription_plans?.name?.includes('Basic')) && (
                    <div className="w-full mb-6 p-5 bg-white rounded-2xl border-2 border-slate-200">
                      <h4 className="text-sm font-black text-slate-800 mb-4">Fitur Paket Basic Saat Ini</h4>
                      <ul className="space-y-3">
                        {[
                          { label: 'Transaksi aplikasi manual tanpa batas', icon: 'check', color: 'text-emerald-500' },
                          { label: 'Transaksi aplikasi AI Asisten maksimal 20 per hari', icon: 'alert', color: 'text-amber-500' },
                          { label: 'Transaksi lewat whatsapp/telegram maksimal masing-masing 20 per hari', icon: 'alert', color: 'text-amber-500' },
                          { label: 'Kelola rencana anggaran, acara, dan tabungan', icon: 'check', color: 'text-emerald-500' },
                          { label: 'Catat hutang piutang', icon: 'check', color: 'text-emerald-500' },
                          { label: 'Laporan keuangan', icon: 'check', color: 'text-emerald-500' },
                          { label: 'Kalkulator finansial', icon: 'check', color: 'text-emerald-500' },
                          { label: 'Ubah tema aplikasi 1 kali', icon: 'alert', color: 'text-amber-500' },
                          { label: 'Fitur workspace maksimal 2', icon: 'alert', color: 'text-amber-500' }
                        ].map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              {item.icon === 'check' ? (
                                <Check className={`h-4 w-4 ${item.color}`} />
                              ) : (
                                <Info className={`h-4 w-4 ${item.color}`} />
                              )}
                            </div>
                            <span className="text-sm font-medium text-slate-600 leading-snug">{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Duration Toggle */}
                  <div className="flex justify-center mb-6">
                    <div className="inline-flex bg-slate-200/50 p-1.5 rounded-2xl">
                      {(['Bulanan', 'Tahunan', 'Lifetime'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setPlanDurationTab(t)}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                            planDurationTab === t
                              ? 'bg-white text-dashboard-blue shadow-sm'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Cards */}
                  <div className={`grid gap-4 ${
                    subscriptionPlans.filter(p => {
                      const validPlans = ['Pro - Bulanan', 'Pro - Tahunan', 'Pro - Lifetime'];
                      if (!validPlans.includes(p.name)) return false;
                      if (planDurationTab === 'Bulanan' && p.duration_days === 30) return true;
                      if (planDurationTab === 'Tahunan' && p.duration_days === 365) return true;
                      if (planDurationTab === 'Lifetime' && p.duration_days > 10000) return true;
                      return false;
                    }).length > 1 ? 'md:grid-cols-2' : 'grid-cols-1'
                  }`}>
                    {subscriptionPlans.filter(p => {
                      const validPlans = ['Pro - Bulanan', 'Pro - Tahunan', 'Pro - Lifetime'];
                      if (!validPlans.includes(p.name)) return false;
                      if (planDurationTab === 'Bulanan' && p.duration_days === 30) return true;
                      if (planDurationTab === 'Tahunan' && p.duration_days === 365) return true;
                      if (planDurationTab === 'Lifetime' && p.duration_days > 10000) return true;
                      return false;
                    }).map((plan) => {
                      const isActive = activeSubscription?.plan_id === plan.id;
                      // Highlight the most expensive/premium plan if there are multiple, or just highlight if it's the only one
                      const isPremium = plan.price > 0 || subscriptionPlans.length === 1;

                      return (
                        <div
                          key={plan.id}
                          className={`relative flex flex-col bg-white rounded-3xl p-6 transition-all duration-300 ${
                            isActive
                              ? "ring-4 ring-dashboard-blue shadow-xl shadow-blue-500/10 scale-[1.02]"
                              : isPremium 
                                ? "border-2 border-indigo-100 hover:border-indigo-300 hover:shadow-lg" 
                                : "border-2 border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          {isActive && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-dashboard-blue text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md">
                              Paket Saat Ini
                            </div>
                          )}

                          <div className="mb-6">
                            <h4 className={`text-xl font-black mb-2 ${isPremium ? 'text-indigo-900' : 'text-slate-800'}`}>
                              {plan.name}
                            </h4>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-3xl font-black ${isPremium ? 'text-dashboard-blue' : 'text-slate-700'}`}>
                                Rp {plan.price.toLocaleString("id-ID")}
                              </span>
                              <span className="text-xs font-bold text-dashboard-gray uppercase tracking-widest">
                                / {plan.duration_days >= 10000 ? "Selamanya" : `${plan.duration_days} Hari`}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 mb-8">
                            {plan.features && (
                              <ul className="space-y-3">
                                {[
                                  { label: 'Transaksi aplikasi manual tanpa batas', allowed: true },
                                  { label: `Transaksi aplikasi AI Asisten ${(plan.features as any).ai_assistant === 'unlimited' ? 'tanpa batas' : 'maksimal 20 per hari'}`, allowed: true },
                                  { label: `Transaksi lewat whatsapp/telegram ${(plan.features as any).messaging_transactions === 'unlimited' ? 'tanpa batas' : 'masing-masing maksimal 20 per hari'}`, allowed: true },
                                  { label: 'Kelola rencana anggaran, acara, dan tabungan', allowed: true },
                                  { label: 'Catat hutang piutang', allowed: true },
                                  { label: 'Laporan keuangan', allowed: true },
                                  { label: 'Kalkulator finansial', allowed: true },
                                  { label: `Ubah tema aplikasi ${(plan.features as any).theme_changes === 'unlimited' ? 'tanpa batas' : '1 kali'}`, allowed: true },
                                  { label: `Fitur workspace ${(plan.features as any).workspace_max === 'unlimited' ? 'maksimal tanpa batas' : 'maksimal 2'}`, allowed: true },
                                ].map((f, i: number) => (
                                  <li key={i} className="flex items-start gap-3">
                                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isPremium ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400'}`}>
                                      <Check className="h-3 w-3" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-600 leading-snug">
                                      {f.label}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {isActive ? (
                            <button disabled className="w-full py-3.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm cursor-not-allowed">
                              Sedang Aktif
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.subscription.createPayment(plan.id, user as { id: string; email: string; user_metadata?: { name?: string } });
                                  if (res.data?.redirect_url) {
                                    window.open(res.data.redirect_url, "_blank");
                                  }
                                } catch (err) {
                                  console.error("Gagal membuat pembayaran:", err);
                                }
                              }}
                              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                                isPremium 
                                  ? "bg-dashboard-blue text-white hover:bg-blue-700 shadow-blue-500/25" 
                                  : "bg-slate-800 text-white hover:bg-slate-900 shadow-slate-500/25"
                              }`}
                            >
                              <Sparkles className="h-4 w-4" />
                              Langganan Sekarang
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── MODAL: Logout Confirm ─── */}
      {showLogoutConfirm && (
        <ModalOverlay onClose={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm mx-4 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogOut className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">Keluar Akun</h3>
            <p className="text-sm text-dashboard-gray mb-6">
              Apakah Anda yakin ingin keluar? Anda dapat masuk kembali kapan saja.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── MODAL: Tentang Karsafin ─── */}
      {showAbout && (
        <ModalOverlay onClose={() => setShowAbout(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm mx-4 shadow-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-dashboard-blue to-blue-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <span className="text-3xl font-black text-white">K</span>
            </div>
            <h3 className="text-xl font-black text-slate-800">Karsafin</h3>
            <p className="text-xs text-dashboard-gray mt-1">v1.0.0</p>
            <p className="text-sm text-slate-600 mt-4 leading-relaxed">
              Atur Keuangan, Wujudkan Mimpi
            </p>
            <p className="text-xs text-dashboard-gray mt-2 leading-relaxed">
              Aplikasi pencatat keuangan pribadi dan keluarga yang terintegrasi dengan WhatsApp & Telegram.
            </p>
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-dashboard-gray">&copy; 2026 Karsafin</p>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}

/* ─── Sub-components ─── */

function SettingsItem({
  href,
  icon,
  label,
  description,
  iconBg,
  iconColor,
  badge,
  badgeColor,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  iconBg: string;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer"
    >
      <div
        className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center ${iconColor} group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm">{label}</span>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-dashboard-gray mt-0.5 truncate">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-dashboard-blue group-hover:translate-x-1 transition-all shrink-0" />
    </Link>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {children}
    </div>,
    document.body
  );
}
