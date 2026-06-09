"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  ChevronDown,
  LayoutGrid,
  Activity,
  Settings,
  CreditCard,
  Menu,
  X,
  Calendar,
  Repeat,
  User,
  HelpCircle,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutGrid },
  { label: "Transaksi", href: "/dashboard/transactions", icon: Activity },
  { label: "Perencanaan", href: "/dashboard/planning", icon: CreditCard },
  { label: "Hutang Piutang", href: "/dashboard/debts", icon: CreditCard },
  { label: "Analisis", href: "/dashboard/analysis", icon: Activity },
  { label: "AI", href: "/dashboard/ai", icon: Settings },
];

const sidebarItems = [
  { icon: Calendar, href: "/dashboard/planning/events", title: "Event" },
  { icon: Repeat, href: "/dashboard/routine-expenses", title: "Pengeluaran Rutin" },
  { icon: User, href: "/dashboard/financial-profile", title: "Profil Keuangan" },
];

import { useState, useEffect } from "react";
import { useAuth } from "@/providers";
import { GlobalSearch } from "@/components/GlobalSearch";

export function TopNavigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const name = user?.user_metadata?.name || user?.email?.split("@")[0] || "User Karsafin";
  const initials = name
    .split(" ")
    .map((n) => n.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 flex justify-center px-6">
        <header className="py-3 flex items-center gap-6 max-w-[1600px] w-full justify-between relative">
          {/* Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-1.5 shrink-0 hover:opacity-90 transition-opacity">
              <img src="/karsafin-logo.png" alt="Karsafin Logo" className="h-10 w-auto object-contain" />
              <span className="font-black text-dashboard-blue text-xl tracking-tight hidden sm:block">
                Karsafin
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-dashboard-blue text-white font-semibold"
                      : "text-dashboard-gray hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-dashboard-blue transition-colors cursor-pointer"
            aria-label="Menu navigasi"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Right side: search, bell, avatar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
              {/* Search button — opens global search overlay */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="group flex items-center gap-2 px-3 py-1.5 text-dashboard-gray hover:text-dashboard-blue bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl transition-all cursor-pointer"
                title="Cari (Ctrl+K)"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="hidden lg:block text-xs font-medium text-slate-400 group-hover:text-slate-600 whitespace-nowrap">
                  Cari...
                </span>
                <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-400 select-none">
                  ⌘K
                </kbd>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-dashboard-gray hover:text-dashboard-blue transition-colors relative cursor-pointer"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white border border-slate-100 shadow-xl z-40 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-800">Notifikasi</p>
                      </div>
                      <div className="p-6 text-center text-xs text-slate-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                        <p>Belum ada notifikasi</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Profile Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 pl-1 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-800 text-[10px]">
                  {initials}
                </div>
                <div className="hidden sm:block text-left text-[10px]">
                  <p className="font-bold leading-tight text-slate-800 truncate max-w-[120px]">
                    {name}
                  </p>
                  <p className="text-dashboard-gray leading-tight">Pengguna</p>
                </div>
                <ChevronDown className="h-4 w-4 text-dashboard-gray" />
              </button>

              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 mt-3 w-48 rounded-2xl bg-white border border-slate-100 shadow-xl z-40 py-2">
                    <div className="px-4 py-2 border-b border-slate-100 text-xs font-bold text-slate-400 truncate">
                      {user?.email}
                    </div>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setShowDropdown(false)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      Pengaturan Akun
                    </Link>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        signOut();
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-2 text-xs font-bold text-red-600 transition-colors border-t border-slate-100 cursor-pointer"
                    >
                      Keluar Sesi
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-white shadow-2xl border-r border-slate-100 md:hidden overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <span className="font-extrabold text-sm text-slate-500 uppercase tracking-widest">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Items from TopNavigation */}
            <div className="px-3 pt-4 pb-2">
              <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Utama</p>
              <div className="space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                        active
                          ? "bg-dashboard-blue text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Items (Dashboard, Event, Pengeluaran Rutin, Profil Keuangan, Settings) */}
            <div className="px-3 pt-4 pb-2 border-t border-slate-50">
              <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lainnya</p>
              <div className="space-y-0.5">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                    pathname === "/dashboard"
                      ? "bg-dashboard-blue text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <LayoutGrid className="w-5 h-5" />
                  Dashboard
                </Link>
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                        active
                          ? "bg-dashboard-blue text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Settings & Help */}
            <div className="px-3 pt-4 pb-2 border-t border-slate-50">
              <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Akun</p>
              <div className="space-y-0.5">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                    pathname.startsWith("/dashboard/settings")
                      ? "bg-dashboard-blue text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  Pengaturan
                </Link>
                <Link
                  href="/dashboard/tutorials"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <HelpCircle className="w-5 h-5" />
                  Tutorial
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Global Search Overlay */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
