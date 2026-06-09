"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  HelpCircle,
  LogOut,
  Video,
  Sparkles,
  LayoutGrid,
  Activity,
  CreditCard,
  Settings,
  Bot,
} from "lucide-react";
import { useAuth } from "@/providers";

const bottomTabs = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Transaksi", href: "/dashboard/transactions", icon: Activity },
  { label: "Perencanaan", href: "/dashboard/planning", icon: CreditCard },
  { label: "AI", href: "/dashboard/ai", icon: Bot },
  { label: "Lainnya", href: "/dashboard/settings", icon: Settings },
];

export function BottomNavigation() {
  const { signOut } = useAuth();
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const pathname = usePathname();

  const startTour = (type: string) => {
    setShowHelpMenu(false);
    window.dispatchEvent(new CustomEvent("start-karsafin-tour", { detail: { type } }));
  };

  const isTabActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop: Help & Logout floating (hidden on mobile) */}
      <div className="fixed bottom-6 left-4 z-50 hidden md:flex flex-col gap-2 p-1.5 floating-nav rounded-3xl pointer-events-auto">
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

      {/* Mobile Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden safe-area-bottom">
        <nav className="flex items-center justify-around py-1.5 px-1">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? "text-dashboard-blue" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className={`text-[10px] font-bold ${active ? "" : "font-semibold"}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* TUTORIAL & GUIDE POPUP */}
      {showHelpMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowHelpMenu(false)} />
          <div className="fixed bottom-24 left-4 z-50 bg-white border border-slate-150 rounded-3xl shadow-xl w-72 overflow-hidden py-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="px-4 pb-2 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Tutorial & Panduan
            </div>

            <div className="mt-2 space-y-0.5 px-2">
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
        <div className="fixed bottom-20 md:bottom-6 right-6 md:right-8 z-50 pointer-events-auto">
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
