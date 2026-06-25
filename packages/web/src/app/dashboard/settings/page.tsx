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
  AlertCircle,
  CheckCircle,
  Plus,
  Loader2,
  FolderOpen,
  UserPlus,
  Tag,
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
  // Kelola Workspace — pilih workspace untuk dikelola
  const [showManageWorkspace, setShowManageWorkspace] = useState(false);
  // Buat Workspace Baru
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);
  const [createWsError, setCreateWsError] = useState<string | null>(null);

  // Join Workspace state
  const [showJoinWorkspace, setShowJoinWorkspace] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joiningWs, setJoiningWs] = useState(false);
  const [joinWsError, setJoinWsError] = useState<string | null>(null);

  // WhatsApp state
  const [waLinked, setWaLiked] = useState(false);

  // About state
  const [showAbout, setShowAbout] = useState(false);

  // Logout state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Email confirmation state
  const [resendingEmail, setResendingEmail] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isEmailVerifiedParam, setIsEmailVerifiedParam] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "true") {
        setIsEmailVerifiedParam(true);
      }
    }
  }, []);

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

  const handleResendConfirmation = async () => {
    if (!user?.email) return;
    setResendingEmail(true);
    setVerificationSent(false);
    setVerificationError(null);
    try {
      const emailRedirectTo = `${window.location.origin}/dashboard/settings?verified=true`;
      const { error } = await api.auth.resendConfirmation(user.email, emailRedirectTo);
      if (error) {
        setVerificationError(error.message || "Gagal mengirim email verifikasi. Coba beberapa saat lagi.");
      } else {
        setVerificationSent(true);
      }
    } catch (err: any) {
      setVerificationError(err.message || "Terjadi kesalahan.");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!user || !newWsName.trim()) return;
    setCreatingWs(true);
    setCreateWsError(null);
    try {
      const { data, error } = await api.workspaces.create(user.id, newWsName.trim(), "family");
      if (error) throw error;
      await refreshWorkspaces();
      setShowCreateWorkspace(false);
      setNewWsName("");
      if (data?.id) {
        router.push(`/dashboard/settings/workspace?id=${data.id}`);
      }
    } catch (err: any) {
      setCreateWsError(err.message || "Gagal membuat workspace. Coba lagi.");
    } finally {
      setCreatingWs(false);
    }
  };

  const handleJoinWorkspace = async () => {
    if (!user || !inviteCode.trim()) return;
    setJoiningWs(true);
    setJoinWsError(null);
    try {
      const { data, error } = await api.workspaces.join(user.id, inviteCode.trim());
      if (error) throw error;
      await refreshWorkspaces();
      setShowJoinWorkspace(false);
      setInviteCode("");
      if (data?.id) {
        router.push(`/dashboard/settings/workspace?id=${data.id}`);
      }
    } catch (err: any) {
      setJoinWsError(err.message || "Gagal bergabung ke workspace. Pastikan kode benar.");
    } finally {
      setJoiningWs(false);
    }
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

      {/* Email Verification Banner */}
      {isEmailVerifiedParam && (
        <section className="mb-8 animate-fade-in">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-6 flex items-start gap-4 relative overflow-hidden backdrop-blur-sm">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-emerald-800">Email Berhasil Dikonfirmasi!</h4>
              <p className="text-xs text-emerald-600 font-semibold mt-1">
                Terima kasih! Email kamu telah dikonfirmasi secara aman. Sekarang kamu memiliki akses penuh ke seluruh fitur Karsafin.
              </p>
            </div>
            <button
              onClick={() => setIsEmailVerifiedParam(false)}
              className="absolute top-4 right-4 p-1 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer text-emerald-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {user && !user.email_confirmed_at && !isEmailVerifiedParam && (
        <section className="mb-8 animate-fade-in">
          <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start backdrop-blur-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 animate-pulse">
              <AlertCircle className="h-6 w-6" />
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-base font-black text-amber-900">Konfirmasi Email Kamu</h4>
                <p className="text-xs font-semibold text-amber-700/80 mt-1 leading-relaxed">
                  Email kamu belum terkonfirmasi. Segera verifikasi email kamu agar akun tetap aman dan seluruh fitur Karsafin dapat diakses dengan lancar.
                </p>
              </div>

              {/* Kenapa harus konfirmasi email */}
              <div className="bg-white/60 rounded-2xl p-4 border border-amber-100/50 space-y-3">
                <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Mengapa verifikasi email penting?
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="flex gap-2.5 items-start">
                    <div className="mt-0.5 p-1 bg-amber-500/10 text-amber-700 rounded-lg shrink-0">
                      <Shield className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-800 block">Keamanan Akun</span>
                      <span className="text-[10px] text-amber-700 font-medium leading-relaxed block mt-0.5">
                        Memastikan email ini milik kamu untuk melindunginya dari akses yang tidak sah.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <div className="mt-0.5 p-1 bg-amber-500/10 text-amber-700 rounded-lg shrink-0">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-800 block">Pemulihan Akun</span>
                      <span className="text-[10px] text-amber-700 font-medium leading-relaxed block mt-0.5">
                        Memudahkan kamu memulihkan kata sandi secara aman jika suatu saat kamu lupa.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <div className="mt-0.5 p-1 bg-amber-500/10 text-amber-700 rounded-lg shrink-0">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-800 block">Laporan & Tagihan</span>
                      <span className="text-[10px] text-amber-700 font-medium leading-relaxed block mt-0.5">
                        Mengirimkan ringkasan laporan keuangan bulanan dan notifikasi tagihan Midtrans.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback and Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
                {verificationSent ? (
                  <div className="bg-emerald-500/10 border border-emerald-200/50 rounded-xl px-4 py-2.5 flex items-center gap-2 text-emerald-700 text-xs font-bold w-full">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Tautan konfirmasi telah dikirim ke {user?.email}. Silakan periksa kotak masuk atau spam kamu.</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleResendConfirmation}
                      disabled={resendingEmail}
                      className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-5 py-3 font-bold text-xs shadow-md shadow-amber-600/10 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
                    >
                      {resendingEmail ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Mengirim...</span>
                        </>
                      ) : (
                        <span>Kirim Ulang Email Konfirmasi</span>
                      )}
                    </button>
                    {verificationError && (
                      <span className="text-xs font-bold text-red-500 flex items-center gap-1.5 animate-fade-in">
                        <AlertCircle className="h-4 w-4" />
                        {verificationError}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

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
            <SettingsItem
              href="/dashboard/settings/labels"
              icon={<Tag className="h-5 w-5" />}
              label="Kelola Label (Tag)"
              description="Atur daftar label transaksi kustom Anda"
              iconBg="bg-rose-50"
              iconColor="text-rose-500"
            />
            <button
              onClick={() => {
                setVerificationSent(false);
                setVerificationError(null);
                setShowEmailVerification(true);
              }}
              className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer text-left"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                  user?.email_confirmed_at
                    ? "bg-emerald-50 text-emerald-500"
                    : "bg-amber-50 text-amber-500"
                }`}
              >
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">Status Email</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      user?.email_confirmed_at
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-amber-50 text-amber-600 border border-amber-100"
                    }`}
                  >
                    {user?.email_confirmed_at ? "Terverifikasi" : "Belum Diverifikasi"}
                  </span>
                </div>
                <p className="text-xs text-dashboard-gray mt-0.5 truncate">
                  {user?.email_confirmed_at
                    ? "Email Anda telah terverifikasi dengan aman"
                    : "Verifikasi email Anda untuk mengamankan akun"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-dashboard-blue group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="custom-card p-6">
          <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-5 px-2">
            Workspace
          </h3>
          <div className="space-y-1">
            {/* Kelola Workspace */}
            <button
              onClick={() => setShowManageWorkspace(true)}
              className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer text-left"
            >
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">Kelola Workspace</span>
                </div>
                <p className="text-xs text-dashboard-gray mt-0.5 truncate">
                  Kelola anggota dan peran workspace
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-dashboard-blue group-hover:translate-x-1 transition-all shrink-0" />
            </button>

            {/* Pilih Workspace Aktif */}
            <button
              onClick={() => setShowWorkspace(true)}
              className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer text-left"
            >
              <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">Pilih Workspace Aktif</span>
                </div>
                <p className="text-xs text-dashboard-gray mt-0.5 truncate">
                  {activeWorkspace?.name || "Pilih workspace aktif"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-dashboard-blue group-hover:translate-x-1 transition-all shrink-0" />
            </button>

            {/* Tambah Workspace Baru */}
            <button
              onClick={() => { setNewWsName(""); setCreateWsError(null); setShowCreateWorkspace(true); }}
              className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer text-left"
            >
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Plus className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">Tambah Workspace Baru</span>
                </div>
                <p className="text-xs text-dashboard-gray mt-0.5 truncate">
                  Buat workspace keluarga atau kolaborasi baru
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-dashboard-blue group-hover:translate-x-1 transition-all shrink-0" />
            </button>

            {/* Gabung Workspace */}
            <button
              onClick={() => { setInviteCode(""); setJoinWsError(null); setShowJoinWorkspace(true); }}
              className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group cursor-pointer text-left"
            >
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <UserPlus className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-sm">Gabung Workspace</span>
                </div>
                <p className="text-xs text-dashboard-gray mt-0.5 truncate">
                  Gabung ke workspace lain dengan kode undangan
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

      {/* ─── MODAL: Pilih Workspace Aktif ─── */}
      {showWorkspace && (
        <ModalOverlay onClose={() => setShowWorkspace(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">Pilih Workspace Aktif</h3>
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

      {/* ─── MODAL: Kelola Workspace (pilih workspace) ─── */}
      {showManageWorkspace && (
        <ModalOverlay onClose={() => setShowManageWorkspace(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black text-slate-800">Kelola Workspace</h3>
              <button onClick={() => setShowManageWorkspace(false)} className="cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-dashboard-gray mb-6">Pilih workspace yang ingin kamu kelola anggota dan perannya.</p>
            <div className="space-y-2">
              {workspaces.filter((ws) => ws.type !== "personal").length === 0 ? (
                <div className="text-center py-10">
                  <FolderOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">Belum ada workspace keluarga.</p>
                  <p className="text-xs text-slate-300 mt-1">Buat workspace baru untuk mengelola anggota.</p>
                  <button
                    onClick={() => { setShowManageWorkspace(false); setNewWsName(""); setCreateWsError(null); setShowCreateWorkspace(true); }}
                    className="mt-4 px-5 py-2.5 bg-dashboard-blue text-white text-sm font-bold rounded-2xl hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Buat Workspace Baru
                  </button>
                </div>
              ) : (
                workspaces
                  .filter((ws) => ws.type !== "personal")
                  .map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setShowManageWorkspace(false);
                        router.push(`/dashboard/settings/workspace?id=${ws.id}`);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-dashboard-blue hover:bg-blue-50/30 transition-all cursor-pointer text-left group"
                    >
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-dashboard-blue to-blue-400 flex items-center justify-center font-bold text-white text-lg shadow-sm">
                        {ws.name?.charAt(0)?.toUpperCase() || "W"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm text-slate-800 block truncate">{ws.name}</span>
                        <p className="text-xs text-dashboard-gray mt-0.5">Workspace Keluarga</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-dashboard-blue group-hover:translate-x-1 transition-all shrink-0" />
                    </button>
                  ))
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── MODAL: Tambah Workspace Baru ─── */}
      {showCreateWorkspace && (
        <ModalOverlay onClose={() => setShowCreateWorkspace(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Plus className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800">Workspace Baru</h3>
              </div>
              <button onClick={() => setShowCreateWorkspace(false)} className="cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-dashboard-gray mb-6 leading-relaxed">
              Buat workspace keluarga atau kolaborasi untuk berbagi catatan keuangan bersama anggota lainnya.
            </p>

            {createWsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {createWsError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                Nama Workspace
              </label>
              <input
                type="text"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="Contoh: Keluarga Amirullah, Tim Usaha"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all"
                maxLength={50}
                onKeyDown={(e) => e.key === "Enter" && !creatingWs && newWsName.trim() && handleCreateWorkspace()}
              />
              <p className="text-[11px] text-slate-400 mt-1.5">{newWsName.length}/50 karakter</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateWorkspace(false)}
                className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={creatingWs || !newWsName.trim()}
                className="flex-1 py-3.5 bg-dashboard-blue text-white rounded-2xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200"
              >
                {creatingWs ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Membuat...</>
                ) : (
                  <><Plus className="h-4 w-4" />Buat Workspace</>
                )}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ─── MODAL: Gabung Workspace ─── */}
      {showJoinWorkspace && (
        <ModalOverlay onClose={() => setShowJoinWorkspace(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800">Gabung Workspace</h3>
              </div>
              <button onClick={() => setShowJoinWorkspace(false)} className="cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-dashboard-gray mb-6 leading-relaxed">
              Masukkan kode undangan unik (invite code) untuk bergabung ke workspace keluarga atau kolaborasi yang sudah ada.
            </p>

            {joinWsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {joinWsError}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">
                Kode Undangan
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Contoh: A1B2C3"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all font-mono uppercase tracking-[0.1em]"
                maxLength={20}
                onKeyDown={(e) => e.key === "Enter" && !joiningWs && inviteCode.trim() && handleJoinWorkspace()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinWorkspace(false)}
                className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleJoinWorkspace}
                disabled={joiningWs || !inviteCode.trim()}
                className="flex-1 py-3.5 bg-dashboard-blue text-white rounded-2xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200"
              >
                {joiningWs ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Bergabung...</>
                ) : (
                  <><UserPlus className="h-4 w-4" />Gabung</>
                )}
              </button>
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

      {/* ─── MODAL: Verifikasi Email ─── */}
      {showEmailVerification && (
        <ModalOverlay onClose={() => setShowEmailVerification(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute right-0 top-0 w-32 h-32 bg-dashboard-blue/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  user?.email_confirmed_at ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                }`}>
                  {user?.email_confirmed_at ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                </div>
                <h3 className="text-lg font-black text-slate-800">Status Verifikasi Email</h3>
              </div>
              <button onClick={() => setShowEmailVerification(false)} className="cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Header */}
              <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-dashboard-gray uppercase tracking-widest">Alamat Email</p>
                <p className="text-base font-extrabold text-slate-800 mt-1">{user?.email}</p>
                <div className="mt-3 flex justify-center">
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                    user?.email_confirmed_at
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-amber-50 text-amber-600 border border-amber-100"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user?.email_confirmed_at ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {user?.email_confirmed_at ? "Terverifikasi" : "Belum Diverifikasi"}
                  </span>
                </div>
              </div>

              {/* Detail Penjelasan */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Mengapa verifikasi email penting?
                </h4>
                <div className="space-y-3.5">
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5 p-1 bg-blue-50 text-blue-500 rounded-lg shrink-0">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Keamanan Akun</span>
                      <span className="text-[11px] text-dashboard-gray leading-relaxed block mt-0.5">
                        Melindungi akun Anda dari upaya akses ilegal oleh pihak ketiga.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5 p-1 bg-blue-50 text-blue-500 rounded-lg shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Pemulihan Akun & Reset Sandi</span>
                      <span className="text-[11px] text-dashboard-gray leading-relaxed block mt-0.5">
                        Memastikan Anda dapat memulihkan akses akun dengan mudah jika lupa password.
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5 p-1 bg-blue-50 text-blue-500 rounded-lg shrink-0">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Notifikasi Laporan & Tagihan</span>
                      <span className="text-[11px] text-dashboard-gray leading-relaxed block mt-0.5">
                        Mendapatkan rangkuman laporan finansial bulanan serta tagihan Midtrans.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aksi */}
              {!user?.email_confirmed_at && (
                <div className="pt-2 border-t border-slate-100">
                  {verificationSent ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3 text-emerald-700 text-xs font-bold leading-relaxed">
                      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                      <div>
                        <span>Tautan konfirmasi telah dikirim!</span>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                          Periksa kotak masuk atau folder spam email Anda.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleResendConfirmation}
                        disabled={resendingEmail}
                        className="w-full py-3.5 bg-dashboard-blue text-white rounded-2xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200"
                      >
                        {resendingEmail ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Mengirim Ulang...</span>
                          </>
                        ) : (
                          <span>Kirim Ulang Email Konfirmasi</span>
                        )}
                      </button>
                      {verificationError && (
                        <p className="text-xs font-bold text-red-500 text-center mt-2 flex items-center justify-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {verificationError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
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
