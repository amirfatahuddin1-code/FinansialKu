"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  AlertCircle,
  Loader2,
  CreditCard,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/providers";

const planNames: Record<string, string> = {
  basic: "Basic (Gratis Selamanya)",
  bulanan: "Pro - Bulanan",
  tahunan: "Pro - Tahunan",
  lifetime: "Pro - Lifetime",
};

const planCycleLabels: Record<string, string> = {
  gratis: "Sekali Bayar",
  bulanan: "Per Bulan",
  tahunan: "Per Tahun",
  lifetime: "Sekali Bayar (Selamanya)",
};

const loadMidtransSnap = (redirectUrl: string) => {
  return new Promise<void>((resolve, reject) => {
    const isSandbox = redirectUrl.includes("sandbox.midtrans.com");
    const scriptUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/snap.js"
      : "https://app.midtrans.com/snap/snap.js";
    const scriptId = "midtrans-snap-script";

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement;
    if (existingScript) {
      if (existingScript.src === scriptUrl) {
        resolve();
        return;
      }
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = scriptUrl;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat SDK pembayaran Midtrans."));
    document.body.appendChild(script);
  });
};

function LoginContent() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle, user, api } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const planId = searchParams.get("plan_id");
  const price = searchParams.get("price");
  const cycle = searchParams.get("cycle");
  const isActivated = searchParams.get("activated") === "true";

  // Automatically redirect if user is logged in and selected Basic plan
  useEffect(() => {
    if (user && planId === "basic") {
      router.push("/dashboard");
    }
  }, [user, planId, router]);

  // Default to register mode when plan_id is present in the URL (lock to register first)
  // But if activated=true is present, override and default to login mode with success notice
  useEffect(() => {
    if (isActivated) {
      setMode("login");
      setSuccess("Selamat, akun kamu telah aktif! Silakan lanjutkan untuk masuk (login).");
    } else if (planId) {
      setMode("register");
    }
  }, [planId, isActivated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Email dan kata sandi wajib diisi");
      return;
    }
    if (mode === "register" && !name) {
      setError("Nama lengkap wajib diisi");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err.message || "Gagal masuk. Periksa kembali email dan sandi Anda.");
        }
      } else {
        // Construct emailRedirectTo URL
        let emailRedirectTo = undefined;
        if (planId) {
          emailRedirectTo = `${window.location.origin}/login?activated=true&plan_id=${planId}&price=${price}&cycle=${cycle}`;
        } else {
          emailRedirectTo = `${window.location.origin}/login?activated=true`;
        }

        const { error: err } = await signUp(email, password, name, phone || undefined, emailRedirectTo);
        if (err) {
          setError(err.message || "Gagal melakukan pendaftaran.");
        } else {
          setSuccess("Pendaftaran berhasil! Silakan periksa email kamu untuk verifikasi atau coba masuk langsung.");
          setMode("login");
          setPassword("");
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    let redirectTo = undefined;
    if (planId) {
      redirectTo = `${window.location.origin}/login?plan_id=${planId}&price=${price}&cycle=${cycle}`;
    }
    const { error: err } = await signInWithGoogle(redirectTo);
    if (err) {
      setError(err.message || "Gagal login dengan Google.");
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user || !planId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await api.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const res = await api.subscription.createPayment(
        planId,
        {
          id: user.id,
          email: user.email || "",
          user_metadata: user.user_metadata || {},
        },
        token
      );

      if (res.error) {
        throw new Error(res.error.message || "Gagal membuat invoice pembayaran.");
      }

      if (!res.data || !res.data.token || !res.data.redirect_url) {
        throw new Error("Gagal memperoleh token pembayaran dari server.");
      }

      await loadMidtransSnap(res.data.redirect_url);

      const snap = (window as any).snap;
      if (!snap) {
        throw new Error("SDK pembayaran Midtrans tidak termuat dengan benar.");
      }

      snap.pay(res.data.token, {
        onSuccess: () => {
          router.push("/dashboard");
        },
        onPending: () => {
          setError("Pembayaran pending. Silakan selesaikan pembayaran di aplikasi dompet Anda.");
          setLoading(false);
        },
        onError: () => {
          setError("Pembayaran gagal. Silakan coba kembali.");
          setLoading(false);
        },
        onClose: () => {
          setError("Pembayaran dibatalkan.");
          setLoading(false);
        },
      });
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses pembayaran.");
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    router.push("/");
  };

  // Decide if we should render checkout flow
  const isCheckoutFlow = !!(planId && planId !== "basic" && user);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-dashboard-blue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-400/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/karsafin-logo.png"
            alt="Karsafin Logo"
            className="h-16 w-auto object-contain mx-auto mb-4 drop-shadow-sm"
          />
          <h1 className="text-3xl font-extrabold text-slate-800 mb-1">
            {isCheckoutFlow
              ? "Pembayaran Paket"
              : mode === "login"
              ? "Selamat Datang"
              : "Buat Akun Baru"}
          </h1>
          <p className="text-dashboard-gray text-sm">
            {isCheckoutFlow
              ? "Langkah terakhir untuk menikmati seluruh fitur Pro"
              : mode === "login"
              ? "Masuk ke dasbor keuangan pribadi kamu"
              : "Mulai rapikan keuangan dan kejar target impian kamu"}
          </p>
        </div>

        {/* Selected Plan Summary Banner (Shown only when plan query exists and NOT logged in yet) */}
        {planId && !user && (
          <div className="mb-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-3xl shadow-lg flex items-center justify-between border border-blue-500/20">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">Paket yang dipilih</span>
              <span className="font-extrabold text-base block mt-0.5">{planNames[planId] || planId}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">Total Pembayaran</span>
              <span className="font-black text-lg block mt-0.5">
                Rp {price ? Number(price).toLocaleString("id-ID") : "0"}
              </span>
            </div>
          </div>
        )}

        {/* Login/Register or Checkout Card */}
        <div className="custom-card p-8 shadow-xl">
          {isCheckoutFlow ? (
            /* Checkout Flow UI */
            <div className="space-y-6">
              {/* Package Detail */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-bold block leading-none">Paket Langganan</span>
                      <span className="font-extrabold text-sm text-slate-800 mt-1 block">
                        {planNames[planId] || planId}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100/50 uppercase">
                    PRO
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Harga Paket</span>
                    <span>Rp {price ? Number(price).toLocaleString("id-ID") : "0"}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Siklus Penagihan</span>
                    <span>{planCycleLabels[cycle || ""] || "Sekali Bayar"}</span>
                  </div>
                  <div className="border-t border-slate-200/60 pt-3 flex justify-between items-center text-sm font-black text-slate-800">
                    <span>Total Pembayaran</span>
                    <span className="text-blue-600 text-base">
                      Rp {price ? Number(price).toLocaleString("id-ID") : "0"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security info */}
              <div className="flex gap-2.5 items-start text-slate-400 text-xs font-semibold">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Pembayaran diproses dengan aman melalui payment gateway berlisensi resmi Midtrans.
                </span>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs font-semibold animate-fade-in">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Checkout Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-dashboard-blue text-white rounded-2xl py-4 font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menghubungkan Midtrans...</span>
                    </>
                  ) : (
                    <span>Bayar Sekarang</span>
                  )}
                </button>
                <button
                  onClick={handleCancelPayment}
                  disabled={loading}
                  className="w-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl py-3.5 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Batal & Kembali
                </button>
              </div>
            </div>
          ) : (
            /* Auth Flow UI (Login or Register) */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs font-semibold">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Alert */}
              {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-600 text-xs font-semibold">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              {/* Name Input (Register mode only) */}
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Lengkap Kamu"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/20 focus:border-dashboard-blue transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Phone Input (Register mode only) */}
              {mode === "register" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    No. Telepon (Opsional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/20 focus:border-dashboard-blue transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/20 focus:border-dashboard-blue transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/20 focus:border-dashboard-blue transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              {mode === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-semibold text-dashboard-blue hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-dashboard-blue text-white rounded-2xl py-4 font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>{mode === "login" ? "Masuk" : "Daftar"}</span>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs font-semibold text-slate-400">atau</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Google login */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-slate-50 text-slate-800 border border-slate-100 rounded-2xl py-3.5 font-semibold text-sm hover:bg-slate-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Masuk dengan Google
              </button>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="text-center mt-6 space-y-3">
          {!isCheckoutFlow && (
            <p className="text-xs text-dashboard-gray">
              {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                  setSuccess(null);
                }}
                className="font-bold text-dashboard-blue hover:text-blue-700 cursor-pointer"
              >
                {mode === "login" ? "Daftar sekarang" : "Masuk sekarang"}
              </button>
            </p>
          )}
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
            <Link href="/syarat-ketentuan" className="hover:text-slate-600 transition-colors">
              Syarat & Ketentuan
            </Link>
            <span>•</span>
            <a href="/privacy.html" className="hover:text-slate-600 transition-colors">
              Kebijakan Privasi
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-dashboard-blue" />
          <span className="text-sm font-bold text-slate-500">Memuat halaman...</span>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
