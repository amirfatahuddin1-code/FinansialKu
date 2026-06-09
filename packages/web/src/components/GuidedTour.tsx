"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";

interface TourStep {
  page: string;
  selector: string;
  title: string;
  description: string;
}

const TOURS: Record<string, TourStep[]> = {
  main: [
    {
      page: "/",
      selector: "tour-balance-card",
      title: "Ringkasan Saldo",
      description: "Di sini Anda dapat melihat saldo berjalan bulan ini, total pemasukan, dan total pengeluaran Anda secara ringkas."
    },
    {
      page: "/",
      selector: "tour-quick-actions",
      title: "Menu Pintasan",
      description: "Gunakan pintasan ini untuk membuka modul Karsafin secara cepat, seperti pencatatan anggaran, target tabungan, atau kalkulator finansial."
    },
    {
      page: "/",
      selector: "tour-recent-transactions",
      title: "Transaksi Terakhir",
      description: "Daftar transaksi terbaru Anda ditampilkan di sini secara real-time dari database."
    },
    {
      page: "/",
      selector: "tour-left-sidebar",
      title: "Navigasi Utama",
      description: "Gunakan menu melayang di samping kiri ini untuk menjelajah ke berbagai modul utama Karsafin."
    }
  ],
  ai: [
    {
      page: "/ai",
      selector: "tour-ai-chat",
      title: "Asisten AI Keuangan",
      description: "Ini adalah ruang obrolan dengan asisten cerdas Karsafin AI. Anda bisa bertanya tentang apa saja seputar keuangan Anda."
    },
    {
      page: "/ai",
      selector: "tour-ai-quick-replies",
      title: "Pertanyaan Cepat",
      description: "Gunakan pintasan pertanyaan ini untuk memulai scan struk belanja (melalui upload foto) atau meminta asisten menganalisis anggaran."
    },
    {
      page: "/ai",
      selector: "tour-ai-input-bar",
      title: "Input Percakapan",
      description: "Ketik pesan Anda di sini atau sebutkan perintah transaksi Anda langsung dengan menekan tombol kirim."
    }
  ],
  date: [
    {
      page: "/transactions",
      selector: "tour-tx-month-filter",
      title: "Filter Periode",
      description: "Klik tombol bulan di sini untuk berpindah periode pelaporan transaksi Anda ke bulan-bulan sebelumnya."
    },
    {
      page: "/transactions",
      selector: "tour-tx-tabs",
      title: "Filter Jenis Transaksi",
      description: "Saring transaksi Anda dengan cepat berdasarkan kategori Pemasukan, Pengeluaran, atau Tabungan."
    },
    {
      page: "/transactions",
      selector: "tour-tx-accounts-filter",
      title: "Filter Rekening",
      description: "Pilih rekening tertentu (seperti BCA, GoPay, Tunai) untuk melacak mutasi saldo pada rekening tersebut."
    }
  ],
  settings: [
    {
      page: "/settings",
      selector: "tour-settings-umum",
      title: "Pengaturan Umum",
      description: "Atur tema visual aplikasi Anda (Gelap/Terang) serta ganti tanggal siklus gajian bulanan Anda."
    },
    {
      page: "/settings",
      selector: "tour-settings-workspace",
      title: "Anggota Workspace",
      description: "Kelola kolaborator dan anggota keluarga di dalam workspace Anda untuk mencatat keuangan bersama."
    },
    {
      page: "/settings",
      selector: "tour-settings-integrasi",
      title: "Integrasi Bot Telegram",
      description: "Hubungkan Karsafin dengan Telegram untuk mencatat transaksi keuangan secara langsung via pesan Telegram."
    }
  ],
  profile: [
    {
      page: "/accounts",
      selector: "tour-accounts-balance",
      title: "Total Saldo",
      description: "Lihat akumulasi total kekayaan bersih Anda dari seluruh portofolio rekening bank, e-wallet, dan portofolio investasi."
    },
    {
      page: "/accounts",
      selector: "tour-accounts-grid",
      title: "Daftar Rekening",
      description: "Semua rekening perbankan, dompet digital, dan investasi Anda ditampilkan di sini lengkap dengan grafik pertumbuhan saldo."
    },
    {
      page: "/accounts",
      selector: "tour-add-account-btn",
      title: "Tambah Rekening Baru",
      description: "Tambahkan rekening bank baru, dompet digital, atau portofolio investasi dengan dukungan logo asli perbankan terkait."
    }
  ]
};

export function GuidedTour() {
  const pathname = usePathname();
  const router = useRouter();

  const [activeTour, setActiveTour] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Start Tour listener
  useEffect(() => {
    const handleStartTour = (e: Event) => {
      const customEvent = e as CustomEvent;
      const type = customEvent.detail?.type;
      if (type && TOURS[type]) {
        setActiveTour(type);
        setStepIndex(0);
        setIsTransitioning(true);

        const targetPage = TOURS[type][0].page;
        if (pathname !== targetPage) {
          router.push(targetPage);
        } else {
          // Same page, transition off immediately
          setTimeout(() => setIsTransitioning(false), 300);
        }
      }
    };

    window.addEventListener("start-karsafin-tour", handleStartTour);
    return () => window.removeEventListener("start-karsafin-tour", handleStartTour);
  }, [pathname, router]);

  // Recalculate position when pathname changes or isTransitioning completes
  useEffect(() => {
    if (!activeTour) return;

    const currentStep = TOURS[activeTour][stepIndex];
    if (pathname === currentStep.page && !isTransitioning) {
      const updateRect = () => {
        const el = document.getElementById(currentStep.selector);
        if (el) {
          setSpotlightRect(el.getBoundingClientRect());
        } else {
          // Fallback if element is not loaded yet
          setTimeout(() => {
            const retryEl = document.getElementById(currentStep.selector);
            if (retryEl) setSpotlightRect(retryEl.getBoundingClientRect());
          }, 200);
        }
      };

      updateRect();
      // Add event listeners for dynamic updates
      window.addEventListener("resize", updateRect);
      window.addEventListener("scroll", updateRect);
      return () => {
        window.removeEventListener("resize", updateRect);
        window.removeEventListener("scroll", updateRect);
      };
    }
  }, [activeTour, stepIndex, pathname, isTransitioning]);

  // Listen to path changes to clear transitioning state
  useEffect(() => {
    if (activeTour) {
      const currentStep = TOURS[activeTour][stepIndex];
      if (pathname === currentStep.page) {
        const timer = setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, activeTour, stepIndex]);

  const handleNext = () => {
    if (!activeTour) return;
    const steps = TOURS[activeTour];
    if (stepIndex < steps.length - 1) {
      const nextStep = steps[stepIndex + 1];
      setStepIndex(stepIndex + 1);
      setSpotlightRect(null);
      setIsTransitioning(true);

      if (pathname !== nextStep.page) {
        router.push(nextStep.page);
      } else {
        setTimeout(() => setIsTransitioning(false), 300);
      }
    } else {
      // Finished
      setActiveTour(null);
      setSpotlightRect(null);
    }
  };

  const handlePrev = () => {
    if (!activeTour) return;
    if (stepIndex > 0) {
      const prevStep = TOURS[activeTour][stepIndex - 1];
      setStepIndex(stepIndex - 1);
      setSpotlightRect(null);
      setIsTransitioning(true);

      if (pathname !== prevStep.page) {
        router.push(prevStep.page);
      } else {
        setTimeout(() => setIsTransitioning(false), 300);
      }
    }
  };

  const handleCancel = () => {
    setActiveTour(null);
    setSpotlightRect(null);
  };

  if (!activeTour || isTransitioning) return null;

  const currentStep = TOURS[activeTour][stepIndex];
  const stepsCount = TOURS[activeTour].length;

  // Calculate tooltip placement
  const getTooltipStyle = (): React.CSSProperties => {
    if (!spotlightRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
      };
    }

    const margin = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    
    let top = spotlightRect.bottom + margin;
    let left = spotlightRect.left + spotlightRect.width / 2 - tooltipWidth / 2;

    // Check if overflowing bottom
    if (top + tooltipHeight > window.innerHeight) {
      top = spotlightRect.top - tooltipHeight - margin;
    }

    // Check boundary horizontal
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));
    top = Math.max(80, Math.min(window.innerHeight - tooltipHeight - 16, top));

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 1000,
    };
  };

  return (
    <>
      {/* Dimmed Overlay with Spotlight punched hole */}
      <div className="fixed inset-0 z-[998] pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="tour-spotlight-mask">
              {/* Fill white to cover overlay */}
              <rect width="100%" height="100%" fill="white" />
              {/* Draw black rect over target to mask it out (hole) */}
              {spotlightRect && (
                <rect
                  x={spotlightRect.left - 8}
                  y={spotlightRect.top - 8}
                  width={spotlightRect.width + 16}
                  height={spotlightRect.height + 16}
                  rx={12}
                  ry={12}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          {/* Rect serving as background overlay */}
          <rect
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.5)"
            mask="url(#tour-spotlight-mask)"
            className="pointer-events-auto"
          />
        </svg>
      </div>

      {/* Spotlight Click Blocker to focus attention */}
      {spotlightRect && (
        <div
          className="fixed z-[999] pointer-events-none border-2 border-dashboard-blue rounded-xl animate-pulse"
          style={{
            left: `${spotlightRect.left - 8}px`,
            top: `${spotlightRect.top - 8}px`,
            width: `${spotlightRect.width + 16}px`,
            height: `${spotlightRect.height + 16}px`,
          }}
        />
      )}

      {/* Floating Guidance Tooltip Card */}
      <div
        style={getTooltipStyle()}
        className="bg-white rounded-3xl border border-slate-150 shadow-2xl p-6 flex flex-col z-[1000] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-black text-dashboard-gray uppercase tracking-widest">
            Langkah {stepIndex + 1} dari {stepsCount}
          </span>
          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-lg hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <h4 className="font-extrabold text-sm text-slate-800 mb-1">{currentStep.title}</h4>
        <p className="text-xs text-dashboard-gray leading-relaxed flex-1 mb-5">
          {currentStep.description}
        </p>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={handleCancel}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Lewati
          </button>

          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button
                onClick={handlePrev}
                className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={handleNext}
              className="bg-dashboard-blue hover:bg-blue-700 text-white rounded-xl px-4 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-md shadow-blue-500/10"
            >
              {stepIndex === stepsCount - 1 ? (
                <>
                  Selesai <Check className="h-3 w-3 ml-0.5" />
                </>
              ) : (
                <>
                  Lanjut <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
