"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Sparkles,
  Zap,
  TrendingUp,
  Wallet,
  PieChart,
  Target,
  Calculator,
  MessageSquare,
  Clock,
  Play,
  HelpCircle,
  Menu,
  X,
  FileText,
  UserCheck,
  Shield,
  Smartphone,
  Calendar,
  Handshake,
  BarChart3,
  Brain,
  Users,
  Briefcase,
  Laptop,
  Home,
  GraduationCap,
} from "lucide-react";

export default function LandingPage() {
  const colorMap: Record<string, string> = {
    "bg-blue-500": "bg-blue-50/80 text-blue-600 border border-blue-100/60",
    "bg-indigo-600": "bg-indigo-50/80 text-indigo-600 border border-indigo-100/60",
    "bg-sky-500": "bg-sky-50/80 text-sky-600 border border-sky-100/60",
    "bg-orange-500": "bg-orange-50/80 text-orange-600 border border-orange-100/60",
    "bg-red-500": "bg-red-50/80 text-red-600 border border-red-100/60",
    "bg-emerald-500": "bg-emerald-50/80 text-emerald-600 border border-emerald-100/60",
    "bg-teal-500": "bg-teal-50/80 text-teal-600 border border-teal-100/60",
    "bg-purple-500": "bg-purple-50/80 text-purple-600 border border-purple-100/60",
    "bg-amber-500": "bg-amber-50/80 text-amber-600 border border-amber-100/60",
    "bg-fuchsia-600": "bg-fuchsia-50/80 text-fuchsia-600 border border-fuchsia-100/60",
    "bg-rose-500": "bg-rose-50/80 text-rose-600 border border-rose-100/60",
    "bg-blue-600": "bg-blue-50/80 text-blue-600 border border-blue-100/60",
  };

  // Rotating headline words
  const words = ["OTOMATIS", "CERDAS", "TERKONTROL", "LEBIH MUDAH", "REAL-TIME"];
  const [wordIndex, setWordIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
        setFade(true);
      }, 300); // match transition duration
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // FAQ Accordion State
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59,
  });

  const [proCycle, setProCycle] = useState<'bulanan' | 'tahunan' | 'lifetime'>('tahunan');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 }; // Reset
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scroll reveal animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px 100px 0px" }
    );

    const revealElements = document.querySelectorAll(".reveal-on-scroll");
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);


  const features = [
    {
      title: "Atur Anggaran Harian",
      desc: "Bagi pendapatan kamu secara pintar ke dalam pos anggaran belanja, investasi, dan tabungan harian.",
      icon: PieChart,
      color: "bg-blue-500",
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Target Tabungan",
      desc: "Visualisasikan dan pantau progres dana darurat, DP rumah, atau liburan keluarga secara berkala.",
      icon: Target,
      color: "bg-indigo-600",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Kalkulator Finansial",
      desc: "Simulasikan rencana masa depan kamu dengan kalkulator investasi, inflasi, dan dana pensiun.",
      icon: Calculator,
      color: "bg-sky-500",
      image: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Perencana Kegiatan",
      desc: "Rencanakan alokasi dana khusus untuk agenda tertentu seperti liburan, pernikahan, atau renovasi.",
      icon: Calendar,
      color: "bg-orange-500",
      image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Catatan Hutang & Piutang",
      desc: "Pantau daftar pinjaman dan piutang kamu lengkap dengan pencatatan jatuh tempo agar tidak terlupa.",
      icon: Handshake,
      color: "bg-red-500",
      image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Analisis & Grafik Laporan",
      desc: "Visualisasikan data pengeluaran kamu dalam bentuk grafik persentase interaktif yang informatif.",
      icon: BarChart3,
      color: "bg-emerald-500",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Pencatatan Instan dengan Bantuan AI",
      desc: "Catat pengeluaran harian dalam 5 detik via integrasi chat messenger Telegram Bot & WhatsApp.",
      icon: MessageSquare,
      color: "bg-teal-500",
      image: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Pengeluaran Rutin (Tagihan dan Langganan)",
      desc: "Kelola tagihan berulang bulanan seperti biaya listrik, asuransi, dan internet tepat waktu.",
      icon: Clock,
      color: "bg-purple-500",
      image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Kelola Rekening & Dompet",
      desc: "Pantau saldo berbagai rekening bank, kartu kredit, dan dompet digital dalam satu tempat terpusat.",
      icon: Wallet,
      color: "bg-amber-500",
      image: "https://images.unsplash.com/photo-1613243555988-441166d4d6fd?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Asisten AI",
      desc: "Dapatkan analisis cerdas, saran anggaran, dan jawaban instan seputar keuangan pribadi langsung dari asisten AI.",
      icon: Brain,
      color: "bg-fuchsia-600",
      image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Profil Kesehatan Finansial",
      desc: "Lakukan diagnosis menyeluruh dan dapatkan skor kesehatan keuangan kamu berdasarkan profil risiko.",
      icon: UserCheck,
      color: "bg-rose-500",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
    },
    {
      title: "Kolaborasi Multi-Workspace",
      desc: "Undang keluarga atau partner untuk mencatat transaksi dan memantau anggaran dalam satu workspace.",
      icon: Users,
      color: "bg-blue-600",
      image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=80",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-blue-100 overflow-x-hidden">
      {/* Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-blue-600 z-50 origin-left transition-all duration-300" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/karsafin-logo.png"
              alt="Karsafin Logo"
              className="h-9 w-auto object-contain"
            />
            <span className="font-extrabold text-xl tracking-wider text-blue-600">Karsafin</span>
          </div>

          <nav className="hidden md:flex space-x-8 text-sm font-semibold text-slate-600">
            <a href="#fitur" className="hover:text-blue-600 transition-colors">Fitur Utama</a>
            <a href="#perbandingan" className="hover:text-blue-600 transition-colors">Perbandingan</a>
            <a href="#cara-kerja" className="hover:text-blue-600 transition-colors">Cara Kerja</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors">
              Masuk
            </Link>
            <Link href="/login?mode=register" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
              Mulai Gratis
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-18 left-0 right-0 bg-white border-b border-slate-200 shadow-xl px-4 py-6 space-y-4 flex flex-col z-30">
            <a
              href="#fitur"
              onClick={() => setMobileMenuOpen(false)}
              className="font-bold text-slate-600 hover:text-blue-600 transition-colors py-2 border-b border-slate-50"
            >
              Fitur Utama
            </a>
            <a
              href="#perbandingan"
              onClick={() => setMobileMenuOpen(false)}
              className="font-bold text-slate-600 hover:text-blue-600 transition-colors py-2 border-b border-slate-50"
            >
              Perbandingan
            </a>
            <a
              href="#cara-kerja"
              onClick={() => setMobileMenuOpen(false)}
              className="font-bold text-slate-600 hover:text-blue-600 transition-colors py-2 border-b border-slate-50"
            >
              Cara Kerja
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="font-bold text-slate-600 hover:text-blue-600 transition-colors py-2 border-b border-slate-50"
            >
              FAQ
            </a>
            <div className="pt-4 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 border border-slate-200 rounded-full font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/login?mode=register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-500/10 transition-colors"
              >
                Daftar Gratis
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:py-28 overflow-hidden bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">

            {/* Hero Left Content */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left reveal-on-scroll">
              <span className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm mb-6 animate-fade-in-up">
                <Sparkles className="w-3.5 h-3.5" />
                Aplikasi Keuangan Pribadi Cerdas
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-none mb-6">
                Kelola Finansial Kamu<br />
                Secara{" "}
                <span className="inline-block relative min-w-[240px] text-center lg:text-left h-[1.2em] overflow-hidden">
                  <span
                    className={`inline-block bg-blue-600 text-white px-4 py-1.5 rounded-2xl transform -rotate-1.5 shadow-lg shadow-blue-500/20 font-black tracking-normal transition-all duration-300 ${fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                      }`}
                  >
                    {words[wordIndex]}
                  </span>
                </span>
              </h1>

              <p className="text-lg text-slate-600 max-w-xl mb-8 leading-relaxed">
                Berhenti menebak kondisi keuanganmu. Saatnya kontrol penuh keuanganmu dan capai target finansial lebih cepat.
              </p>

              {/* Checklist */}
              <div className="w-full max-w-lg mb-8">
                <p className="text-sm font-extrabold uppercase text-slate-400 tracking-widest mb-4">
                  Mengapa Memilih Karsafin?
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {[
                    "Catat instan dengan bantuan AI",
                    "Simulasi rencana masa depan",
                    "Grafik analisis real-time",
                    "Atur target tabungan",
                    "Kelola hutang & piutang",
                    "Workspace bersama keluarga",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link
                  href="/login?mode=register"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-base font-bold px-8 py-4 rounded-full shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all flex items-center justify-center gap-2 group hover:-translate-y-0.5 active:translate-y-0"
                >
                  Mulai Sekarang Gratis
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#fitur"
                  className="border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-base font-bold px-8 py-4 rounded-full transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Pelajari Fitur
                </a>
              </div>
            </div>

            {/* Hero Right Content Mockup */}
            <div className="lg:col-span-5 relative w-full max-w-md mx-auto lg:max-w-none reveal-on-scroll" style={{ transitionDelay: "150ms" }}>
              {/* Background Accent Card */}
              <div className="absolute top-8 left-8 right-0 bottom-0 bg-blue-600 rounded-3xl shadow-xl -rotate-2 transform translate-x-2 translate-y-2 pointer-events-none opacity-90" />

              {/* Device/Mockup Window */}
              <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 overflow-hidden">
                {/* Header Window Buttons */}
                <div className="flex items-center gap-1.5 mb-6 border-b border-slate-50 pb-4">
                  <span className="w-3 h-3 bg-red-400 rounded-full" />
                  <span className="w-3 h-3 bg-amber-400 rounded-full" />
                  <span className="w-3 h-3 bg-emerald-400 rounded-full" />
                  <span className="text-xs font-bold text-slate-400 ml-2">Dasbor Keuangan Karsafin</span>
                </div>

                {/* Dashboard Mockup Content */}
                <div className="space-y-6">
                  {/* Balance Widget */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-600/15">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Total Saldo Bulan Ini</span>
                    <h3 className="text-2xl font-black mt-1">Rp 4.750.000</h3>
                    <div className="flex justify-between mt-4 pt-4 border-t border-white/10 text-xs">
                      <div>
                        <span className="text-blue-200 block text-[9px] uppercase tracking-wider">Pemasukan</span>
                        <span className="font-bold">Rp 8.500.000</span>
                      </div>
                      <div className="text-right">
                        <span className="text-blue-200 block text-[9px] uppercase tracking-wider">Pengeluaran</span>
                        <span className="font-bold">Rp 3.750.000</span>
                      </div>
                    </div>
                  </div>

                  {/* Savings Goals Widget */}
                  <div className="border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm bg-slate-50/50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">Target: Dana Darurat</span>
                      <span className="font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">65%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: "65%" }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>Rp 32.500.000</span>
                      <span>Target Rp 50.000.000</span>
                    </div>
                  </div>

                  {/* Transactions list */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transaksi Terakhir</span>
                    {[
                      { title: "Gaji Bulanan", amount: "+Rp8.500.000", type: "in", icon: "💰" },
                      { title: "Makan Siang", amount: "-Rp35.000", type: "out", icon: "🍔" },
                    ].map((tx, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 border border-slate-50 rounded-xl bg-white shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-sm">{tx.icon}</span>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">{tx.title}</span>
                            <span className="text-[9px] text-slate-400">Baru Saja</span>
                          </div>
                        </div>
                        <span className={`text-xs font-extrabold ${tx.type === "in" ? "text-emerald-500" : "text-red-500"}`}>{tx.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Badge */}
                <div className="absolute top-24 right-4 bg-emerald-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-full shadow-lg shadow-emerald-500/20 rotate-3 transform">
                  Rp 0 / 100% Gratis
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust & Static Features Strip */}
      <div className="bg-white border-y border-slate-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Selesai Setup Dalam 2 Menit
            </span>
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-500" />
              Bisa Catat Lewat Telegram & Whatsapp
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              Enkripsi Aman & Privat
            </span>
          </div>
        </div>
      </div>

      {/* Infinite Scrolling Feature Cards (Horizontal Marquee) */}
      <section className="py-20 bg-slate-50/50 overflow-hidden animate-fade-in-up" id="fitur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center reveal-on-scroll">
          <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full tracking-wider">
            Eksplorasi Fitur
          </span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-4 mb-2">
            Segala Yang Kamu Butuhkan Untuk Mengelola Finansial
          </h2>
          <p className="text-slate-500 text-base max-w-xl mx-auto">
            Gunakan fitur-fitur modern kami untuk menyusun, memantau, dan menganalisis kesehatan keuangan pribadi kamu secara instan.
          </p>
        </div>

        {/* Feature grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
            {features.map((feat, idx) => {
              const Icon = feat.icon;
              const isHorizontal = [3, 4, 8, 9, 10, 11].includes(idx);
              const softColor = colorMap[feat.color] || "bg-slate-50 text-slate-600 border border-slate-100";

              return (
                <div
                  key={idx}
                  className={`bg-white border border-slate-100/85 rounded-3xl p-8 shadow-xs hover:shadow-xl hover:border-slate-200/80 transition-all duration-300 group hover:-translate-y-1 reveal-on-scroll flex flex-col ${isHorizontal
                    ? "lg:flex-row lg:items-start lg:gap-6 lg:col-span-6"
                    : "lg:col-span-4"
                    }`}
                  style={{ transitionDelay: `${(idx % 4) * 100}ms` }}
                >
                  <div className={`w-12 h-12 ${softColor} rounded-2xl flex items-center justify-center shrink-0 mb-6 ${isHorizontal ? "lg:mb-0" : ""
                    } group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 leading-snug">{feat.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Perbandingan Section (Dulu vs Sekarang) */}
      <section className="py-20 bg-white" id="perbandingan">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
            <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full tracking-wider">
              Sebelum &amp; Sesudah
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-4 mb-2">
              Tinggalkan cara lama dan mulai beralih ke aplikasi yang lebih modern dan cerdas
            </h2>
            <p className="text-slate-500 text-base">
              Lihat bagaimana Karsafin memodernisasi cara kamu melacak dan merencanakan keuangan pribadi kamu.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
            {/* DULU */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 lg:scale-95 opacity-80 transition-all reveal-on-scroll" style={{ transitionDelay: "100ms" }}>
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-4">
                <span className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">✕</span>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-500 uppercase tracking-widest">DULU</h4>
                  <span className="text-xs font-semibold text-slate-400">Metode Konvensional</span>
                </div>
              </div>
              <ul className="space-y-4 text-xs font-medium text-slate-500">
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <span>Mencatat transaksi manual di buku atau excel yang sering terlupa</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <span>Gaji habis entah ke mana tanpa pembagian anggaran yang jelas</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <span>Bingung menghitung target dana darurat dan inflasi di masa depan</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <span>Catatan hutang piutang tercecer hingga sering lupa ditagih</span>
                </li>
              </ul>
            </div>

            {/* SEKARANG (Spotlight) */}
            <div className="lg:col-span-7 bg-white border-2 border-blue-600 rounded-3xl p-8 shadow-2xl relative z-10 transition-all reveal-on-scroll" style={{ transitionDelay: "250ms" }}>
              <div className="absolute top-0 right-6 bg-blue-600 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-b-xl uppercase tracking-widest shadow-md shadow-blue-500/10">
                Direkomendasikan
              </div>
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">✓</span>
                <div>
                  <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest">SEKARANG</h4>
                  <span className="text-xs font-semibold text-blue-600">Dengan Karsafin</span>
                </div>
              </div>
              <ul className="space-y-4 text-sm font-semibold text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                  <span>Catat instan dalam 5 detik via Telegram/WhatsApp Bot</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                  <span>Alokasi anggaran bulanan otomatis secara real-time</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                  <span>Kalkulator finansial pintar untuk merencanakan masa depan</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                  <span>Sistem pelacak hutang &amp; piutang lengkap dengan tanggal jatuh tempo</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
                  <span>Workspace bersama pasangan atau keluarga yang terintegrasi</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja (Step by Step Timeline) */}
      <section className="py-20 bg-slate-50/50" id="cara-kerja">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
            <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full tracking-wider">
              Langkah Sederhana
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-4 mb-2">
              5 Langkah Mudah Menuju Kebebasan Finansial
            </h2>
            <p className="text-slate-500 text-base">
              Proses setup yang sangat cepat dan intuitif agar kamu bisa fokus merapikan keuangan kamu.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Timeline Line */}
            <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 transform lg:-translate-x-1/2" />

            {/* Step 1 */}
            <div className="relative flex flex-col lg:flex-row items-stretch gap-8 mb-6 lg:mb-8 reveal-on-scroll" style={{ transitionDelay: "100ms" }}>
              <div className="lg:w-1/2 flex flex-col justify-center items-start lg:items-end pl-16 lg:pl-0 lg:pr-12">
                <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group hover:-translate-y-0.5 w-full text-left lg:text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg inline-block mb-3">
                    Langkah 01
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    Buat Akun Karsafin
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-sm lg:ml-auto">
                    Daftarkan diri kamu dalam waktu kurang dari 1 menit, gratis.
                  </p>
                </div>
              </div>
              <div className="absolute left-4 lg:left-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-blue-500/20 transform lg:-translate-x-1/2 z-10">
                1
              </div>
              <div className="lg:w-1/2" />
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col lg:flex-row items-stretch gap-8 mb-6 lg:mb-8 reveal-on-scroll" style={{ transitionDelay: "200ms" }}>
              <div className="lg:w-1/2" />
              <div className="absolute left-4 lg:left-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-blue-500/20 transform lg:-translate-x-1/2 z-10">
                2
              </div>
              <div className="lg:w-1/2 flex flex-col justify-center items-start pl-16 lg:pl-12">
                <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group hover:-translate-y-0.5 w-full text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg inline-block mb-3">
                    Langkah 02
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    Atur Akun Keuangan
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
                    Masukkan semua akun keuangan, rekening bank, e-wallet, hingga kartu kredit.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col lg:flex-row items-stretch gap-8 mb-6 lg:mb-8 reveal-on-scroll" style={{ transitionDelay: "300ms" }}>
              <div className="lg:w-1/2 flex flex-col justify-center items-start lg:items-end pl-16 lg:pl-0 lg:pr-12">
                <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group hover:-translate-y-0.5 w-full text-left lg:text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg inline-block mb-3">
                    Langkah 03
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    Tentukan Anggaran &amp; Target
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-sm lg:ml-auto">
                    Masukkan target-target tabungan (Dana Darurat, Rumah Impian) dan tetapkan batas pengeluaran untuk setiap kategori belanja.
                  </p>
                </div>
              </div>
              <div className="absolute left-4 lg:left-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-blue-500/20 transform lg:-translate-x-1/2 z-10">
                3
              </div>
              <div className="lg:w-1/2" />
            </div>

            {/* Step 4 */}
            <div className="relative flex flex-col lg:flex-row items-stretch gap-8 mb-6 lg:mb-8 reveal-on-scroll" style={{ transitionDelay: "400ms" }}>
              <div className="lg:w-1/2" />
              <div className="absolute left-4 lg:left-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-blue-500/20 transform lg:-translate-x-1/2 z-10">
                4
              </div>
              <div className="lg:w-1/2 flex flex-col justify-center items-start pl-16 lg:pl-12">
                <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group hover:-translate-y-0.5 w-full text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg inline-block mb-3">
                    Langkah 04
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    Catat Pengeluaran
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
                    Setiap kali belanja, catat. Di akhir bulan, kamu bisa lihat uang kamu kemana aja.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="relative flex flex-col lg:flex-row items-stretch gap-8 reveal-on-scroll" style={{ transitionDelay: "500ms" }}>
              <div className="lg:w-1/2 flex flex-col justify-center items-start lg:items-end pl-16 lg:pl-0 lg:pr-12">
                <div className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group hover:-translate-y-0.5 w-full text-left lg:text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg inline-block mb-3">
                    Langkah 05
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    Analisis &amp; Dapatkan Insight
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed max-w-sm lg:ml-auto">
                    Lihat dasbor kamu terisi otomatis, pelajari pola pengeluaran harian, dan optimalkan strategi menabung dengan aman.
                  </p>
                </div>
              </div>
              <div className="absolute left-4 lg:left-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-blue-500/20 transform lg:-translate-x-1/2 z-10">
                5
              </div>
              <div className="lg:w-1/2" />
            </div>

          </div>
        </div>
      </section>

      {/* Cocok Untuk Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
            <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full tracking-wider">
              Siapa Pengguna Kami?
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-4 mb-2">
              Solusi Keuangan Pintar untuk Semua Orang
            </h2>
            <p className="text-slate-500 text-base">
              Apapun profil keuangan kamu, Karsafin didesain fleksibel untuk mengakomodasi kebutuhan unik kamu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              {
                title: "Pekerja Kantoran",
                desc: "Kelola alokasi gaji bulanan secara konsisten agar tidak habis begitu saja di awal bulan.",
                icon: Briefcase,
                color: "bg-blue-50/80 text-blue-600 border border-blue-100/60",
              },
              {
                title: "Freelancer & Kreator",
                desc: "Atur pendapatan bulanan tidak tetap dengan kalkulator target tabungan yang fleksibel.",
                icon: Laptop,
                color: "bg-emerald-50/80 text-emerald-600 border border-emerald-100/60",
              },
              {
                title: "Keluarga Muda",
                desc: "Workspace kolaboratif untuk mencatat pengeluaran rumah tangga bersama pasangan.",
                icon: Home,
                color: "bg-indigo-50/80 text-indigo-600 border border-indigo-100/60",
              },
              {
                title: "Mahasiswa / Pemula",
                desc: "Mulai biasakan mencatat keuangan harian dengan setup yang sangat praktis dan gratis.",
                icon: GraduationCap,
                color: "bg-amber-50/80 text-amber-600 border border-amber-100/60",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-100/80 rounded-3xl p-8 hover:border-slate-200/80 hover:shadow-2xl hover:shadow-slate-100/50 hover:-translate-y-1.5 transition-all duration-300 reveal-on-scroll flex flex-col justify-between"
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <div>
                    <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center mb-6 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-lg text-slate-800 mb-2 leading-snug">{item.title}</h4>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Offer / CTA Block Section */}
      {/* Offer / CTA Block Section */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden" id="daftar">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center reveal-on-scroll">
          <span className="text-xs font-bold uppercase text-blue-400 tracking-widest block mb-4">
            Penawaran Terbatas
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2">
            Investasi kecil yang buat keuanganmu lebih rapi.
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-12">
            Kurang dari Rp 300/hari — lebih murah dari segelas es teh dan hasilnya jauh lebih bermanfaat.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {/* Card 1: BASIC */}
            <div className="bg-white text-slate-800 border border-slate-100 rounded-3xl p-8 shadow-2xl relative flex flex-col justify-between reveal-on-scroll" style={{ transitionDelay: "100ms" }}>
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
                      ★ BASIC
                    </span>
                    <h3 className="text-2xl font-black mt-3">Basic</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 line-through text-xs font-bold block">
                      Rp 49.000
                    </span>
                    <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mt-0.5">
                      -100%
                    </span>
                  </div>
                </div>

                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">Rp 0</span>
                  <span className="text-xs font-bold text-slate-500">/ selamanya</span>
                </div>

                <div className="border-t border-slate-100 my-6" />

                <ul className="space-y-3.5 text-left mb-8">
                  {[
                    "Kelola 2 dompet / rekening bank",
                    "Catat pemasukan & pengeluaran manual",
                    "Atur rencana anggaran dasar",
                    "Target tabungan (maksimal 2)",
                    "Laporan & analisis grafis dasar",
                    "Kalkulator finansial lengkap",
                    "Integrasi Bot Telegram & WA (Maks 20/hari)",
                    "20 kuota AI Financial Assistant per hari",
                  ].map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm font-semibold text-slate-600">
                      <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                  {[
                    "Ganti warna & kustomisasi tema penuh",
                    "Workspace kolaboratif keluarga",
                    "Quota AI Assistant & Bot Tanpa Batas",
                  ].map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm font-semibold text-slate-350">
                      <span className="w-5 h-5 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center shrink-0">
                        ✕
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/login?mode=register"
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl py-4 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-auto"
              >
                Daftar Gratis Sekarang
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 2: PRO */}
            <div className="bg-[#18181b] border-2 border-blue-500 text-white rounded-3xl p-8 shadow-2xl relative flex flex-col justify-between reveal-on-scroll" style={{ transitionDelay: "200ms" }}>
              <span className="absolute -top-4 right-8 bg-blue-600 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md animate-pulse">
                PALING POPULER
              </span>

              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-blue-400 bg-blue-950/50 border border-blue-900/50 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1 w-fit">
                      <Zap className="w-3 h-3 fill-blue-400 stroke-none animate-bounce" /> PRO
                    </span>
                    <h3 className="text-2xl font-black mt-3">Premium Pro</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 line-through text-xs font-bold block">
                      {proCycle === 'bulanan' ? 'Rp 49.000' : proCycle === 'tahunan' ? 'Rp 299.000' : 'Rp 499.000'}
                    </span>
                    <span className="bg-blue-950/60 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mt-0.5 border border-blue-900/40">
                      {proCycle === 'bulanan' ? '-59%' : proCycle === 'tahunan' ? '-60%' : '-68%'}
                    </span>
                  </div>
                </div>

                {/* Duration/Billing Cycle Tabs */}
                <div className="flex bg-slate-800/80 p-1 rounded-2xl mb-6 border border-slate-700/40">
                  {[
                    { id: 'bulanan', label: 'Bulanan' },
                    { id: 'tahunan', label: 'Tahunan' },
                    { id: 'lifetime', label: 'Lifetime' },
                  ].map((cycle) => (
                    <button
                      key={cycle.id}
                      onClick={() => setProCycle(cycle.id as any)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        proCycle === cycle.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      {cycle.label}
                    </button>
                  ))}
                </div>

                <div className="mb-2 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-blue-400">
                    {proCycle === 'bulanan' ? 'Rp 20.000' : proCycle === 'tahunan' ? 'Rp 119.000' : 'Rp 159.000'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    / {proCycle === 'bulanan' ? 'bulan' : proCycle === 'tahunan' ? 'tahun' : 'sekali bayar'}
                  </span>
                </div>
                <span className="text-blue-400 block text-xs font-bold text-left mb-6">
                  ✓ Termasuk Kuota AI Asisten Tanpa Batas!
                </span>

                <div className="border-t border-slate-800 my-6" />

                <ul className="space-y-3.5 text-left mb-8">
                  {[
                    "Semua fitur paket BASIC",
                    "Kelola banyak dompet tanpa batas",
                    "AI Financial Advisor & Report Analyzer (Tanpa Batas)",
                    "Lacak aset & net worth otomatis",
                    "Catat otomatis via Telegram & WhatsApp (Tanpa Batas)",
                    "Ganti warna & kustomisasi tema penuh",
                    "Workspace kolaboratif keluarga / bersama pasangan",
                    "Bebas iklan & prioritas update fitur terbaru",
                  ].map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm font-semibold text-slate-300">
                      <span className="w-5 h-5 bg-blue-950 text-blue-400 rounded-full flex items-center justify-center shrink-0 border border-blue-900/30">
                        ✓
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/login?mode=register"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-auto"
              >
                Daftar & Mulai Gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50/50" id="faq">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 reveal-on-scroll">
            <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full tracking-wider">
              Pertanyaan Umum
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-4 mb-2">
              Ada Pertanyaan? Kami Punya Jawabannya
            </h2>
            <p className="text-slate-500 text-base">
              Berikut adalah beberapa jawaban atas pertanyaan paling sering ditanyakan mengenai Karsafin.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4 reveal-on-scroll" style={{ transitionDelay: "150ms" }}>
            {[
              {
                q: "Apakah Karsafin benar-benar gratis?",
                a: "Ya! Fitur-fitur dasar Karsafin (dasbor, pencatatan transaksi, target tabungan, anggaran, serta integrasi bot Telegram) 100% gratis untuk selamanya. Kami menawarkan opsi premium di masa depan hanya untuk analisis lanjutan atau kebutuhan tim bisnis.",
              },
              {
                q: "Bagaimana cara kerja pencatatan via Telegram Bot?",
                a: "Setelah membuat akun, kamu dapat masuk ke bagian pengaturan di dasbor dan mengikuti instruksi untuk menautkan bot Telegram. Setelah aktif, kamu cukup mengirim pesan biasa seperti `Gaji 8500000` atau `Kopi 35000` ke bot tersebut, dan transaksi kamu langsung tercatat otomatis.",
              },
              {
                q: "Apakah data finansial saya aman di Karsafin?",
                a: "Keamanan dan privasi kamu adalah prioritas utama kami. Seluruh data transaksi dienkripsi saat dikirimkan dan disimpan di database aman yang dilindungi oleh Supabase security protocols. Kami tidak pernah menjual atau membagikan data kamu kepada pihak ketiga.",
              },
              {
                q: "Dapatkah saya membagi dasbor dengan pasangan saya?",
                a: "Tentu saja! Fitur Multi-Workspace kami memungkinkan kamu membuat workspace khusus (misal: 'Catatan Keluarga') dan mengundang pasangan atau anggota keluarga kamu untuk mencatat dan memantau anggaran bersama.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center px-6 py-5 text-left font-bold text-slate-800 hover:text-blue-600 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-blue-500 font-extrabold text-xs">Q{idx + 1}</span>
                    <span className="text-sm sm:text-base">{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${faqOpen === idx ? "transform rotate-180" : ""
                      }`}
                  />
                </button>
                {faqOpen === idx && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-50 text-slate-600 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-600 text-blue-100 py-12 border-t border-blue-500/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/karsafin-logo.png"
                alt="Karsafin Logo"
                className="h-8 w-auto object-contain brightness-0 invert"
              />
              <span className="font-extrabold text-sm tracking-wider text-white">Karsafin</span>
            </div>

            <p className="text-xs text-center md:text-left leading-relaxed text-blue-100">
              © {new Date().getFullYear()} Karsafin. Seluruh hak cipta dilindungi undang-undang.<br />
              Dibuat dengan dedikasi untuk kesehatan keuangan keluarga Indonesia.
            </p>

            <div className="flex gap-4 text-xs font-semibold text-blue-100">
              <Link href="/syarat-ketentuan" className="hover:text-white transition-colors">
                Syarat &amp; Ketentuan
              </Link>
              <span>•</span>
              <a href="/privacy.html" className="hover:text-white transition-colors">
                Kebijakan Privasi
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-blue-600 p-4 md:hidden border-t border-blue-500 flex items-center justify-between text-white shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Akses Karsafin</span>
          <span className="text-sm font-black">100% Gratis Selamanya</span>
        </div>
        <Link
          href="/login?mode=register"
          className="bg-white text-blue-600 hover:bg-slate-50 px-5 py-2.5 rounded-full text-xs font-black shadow-md transition-colors"
        >
          Daftar Sekarang →
        </Link>
      </div>
    </div>
  );
}
