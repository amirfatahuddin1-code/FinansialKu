"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  HelpCircle,
  LogOut,
  Video,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/providers";

export function BottomNavigation() {
  const { signOut } = useAuth();
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const pathname = usePathname();

  const startTour = (type: string) => {
    setShowHelpMenu(false);
    // Dispatch custom event to start guided tour
    window.dispatchEvent(new CustomEvent("start-karsafin-tour", { detail: { type } }));
  };

  return (
    <>
      {/* Help & Logout in bottom left (floating, aligned perfectly with LeftSidebar) */}
      <div className="fixed bottom-6 left-4 z-50 flex flex-col gap-2 p-1.5 floating-nav rounded-3xl pointer-events-auto">
        <button
          onClick={() => setShowHelpMenu(!showHelpMenu)}
          className={`sidebar-icon-btn cursor-pointer transition-all ${
            showHelpMenu
              ? "bg-dashboard-blue text-white shadow-lg shadow-blue-500/20"
              : "text-dashboard-gray hover:text-dashboard-blue hover:bg-slate-50"
          }`}
          title="Bantuan & Panduan"
        >
          <HelpCircle className="h-6 w-6" />
        </button>
        <div className="h-px bg-slate-100 mx-2" />
        <button
          onClick={signOut}
          className="sidebar-icon-btn text-dashboard-gray hover:text-red-500 hover:bg-red-50 cursor-pointer"
          title="Keluar"
        >
          <LogOut className="h-6 w-6" />
        </button>
      </div>

      {/* TUTORIAL & GUIDE POPUP (Dropdown Menu) */}
      {showHelpMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowHelpMenu(false)} />
          <div className="fixed bottom-24 left-4 z-50 bg-white border border-slate-150 rounded-3xl shadow-xl w-72 overflow-hidden py-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="px-4 pb-2 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Tutorial & Panduan
            </div>

            {/* List items matching target mockup */}
            <div className="mt-2 space-y-0.5 px-2">
              {/* Video Tutorials */}
              <Link
                href="/dashboard/tutorials"
                onClick={() => setShowHelpMenu(false)}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="relative shrink-0 w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <Video className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-dashboard-blue transition-colors">
                  Video Tutorials
                </span>
              </Link>

              {/* Tur Utama */}
              <button
                onClick={() => startTour("main")}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="shrink-0 w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-dashboard-blue transition-colors">
                  Tur Utama
                </span>
              </button>

              {/* Catat dengan AI */}
              <button
                onClick={() => startTour("ai")}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-dashboard-blue transition-colors">
                  Catat dengan AI
                </span>
              </button>

              {/* Filter Tanggal */}
              <button
                onClick={() => startTour("date")}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-dashboard-blue transition-colors">
                  Filter Tanggal
                </span>
              </button>

              {/* Pengaturan */}
              <button
                onClick={() => startTour("settings")}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-dashboard-blue transition-colors">
                  Pengaturan
                </span>
              </button>

              {/* Profil Keuangan */}
              <button
                onClick={() => startTour("profile")}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl hover:bg-slate-50 transition-colors text-left cursor-pointer group"
              >
                <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-dashboard-blue transition-colors">
                  Profil Keuangan
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* FAB + Button in bottom right */}
      {pathname !== "/dashboard/ai" && (
        <div className="fixed bottom-6 right-6 md:right-8 z-50 pointer-events-auto">
          <Link
            href="/dashboard/transactions/add"
            className="w-14 h-14 bg-dashboard-blue text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-500/25 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Tambah Transaksi Baru"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </Link>
        </div>
      )}
    </>
  );
}
