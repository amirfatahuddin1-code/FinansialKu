"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PieChart as PieIcon,
  Target,
  Calculator,
  Handshake,
  CalendarPlus,
  CreditCard,
  BarChart3,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  ChevronDown,
  Plus,
  Calendar,
  Wallet,
  ChevronRight,
  Activity,
  Briefcase,
  User,
  Loader2,
  AlertCircle,
  Settings
} from "lucide-react";
import { useAuth, useWorkspace, useFeatures } from "@/providers";
import { formatCurrency, formatCurrencyCompact, getMonthlyRange } from "@karsafin/shared";
import type { Transaction, Savings, Debt, Event as KafEvent } from "@karsafin/shared";
import { CategoryIcon } from "@/components/CategoryIcon";
import { WidgetRenderer } from "@/app/dashboard/features/widget-renderer";
import { parseDescriptionAndTags } from "@/utils/tagUtils";

export default function DashboardPage() {
  const { user, api } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace, loadingWorkspaces } = useWorkspace();

  const [saldoView, setSaldoView] = useState<"bulan" | "total">("bulan");
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Real data state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [events, setEvents] = useState<KafEvent[]>([]);
  const [profileName, setProfileName] = useState("");

  const loadDashboardData = useCallback(async () => {
    if (!user || !activeWorkspace) return;
    setLoadingData(true);
    try {
      const [txRes, savRes, debtRes, evRes, profileRes] = await Promise.all([
        api.transactions.getAll(),
        api.savings.getAll(),
        api.debts.getAll(user.id),
        api.events.getAll(),
        api.profiles.get(user.id),
      ]);

      setTransactions(txRes.data || []);
      setSavings(savRes.data || []);
      setDebts(debtRes.data || []);
      setEvents(evRes.data || []);
      setProfileName(profileRes.data?.name || user.user_metadata?.name || user.email?.split("@")[0] || "User");
    } catch (err) {
      console.error("Gagal memuat data dasbor:", err);
    } finally {
      setLoadingData(false);
    }
  }, [user, activeWorkspace, api]);

  useEffect(() => {
    if (user && activeWorkspace) {
      loadDashboardData();
    }
  }, [user, activeWorkspace, loadDashboardData]);

  // Calculations based on loaded data
  const isDatabaseEmpty = transactions.length === 0;
  const now = new Date();
  // Assume payday is the 1st of the month
  const { startDate: startOfMonth, endDate: endOfMonth } = getMonthlyRange(1, now);

  const monthlyTx = transactions.filter((t) => {
    const txTime = new Date(t.date).getTime();
    return txTime >= new Date(startOfMonth).getTime() && txTime <= new Date(endOfMonth).getTime();
  });

  const monthlyIncome = monthlyTx
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = monthlyTx
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = monthlyIncome - monthlyExpense;

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const akumulasiSaldo = totalIncome - totalExpense;

  const currentBalance = isDatabaseEmpty
    ? (saldoView === "bulan" ? 4750000 : 13800000)
    : (saldoView === "bulan" ? balance : akumulasiSaldo);
  const isNegative = currentBalance < 0;

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Grouping monthly expenses by category
  const monthlyExpenses = monthlyTx.filter((t) => t.type === "expense");
  const catExpensesMap = monthlyExpenses.reduce((acc, t) => {
    const cat = t.category?.name || "Lainnya";
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalCatExpense = Object.values(catExpensesMap).reduce((a, b) => a + b, 0);
  const chartColors = ["#0062ff", "#fdc003", "#ef4444", "#10b981", "#8b5cf6"];
  const catExpenses = Object.entries(catExpensesMap)
    .map(([name, amount], index) => ({
      name,
      amount,
      percentage: totalCatExpense > 0 ? Math.round((amount / totalCatExpense) * 100) : 0,
      color: chartColors[index % chartColors.length],
    }))
    .sort((a, b) => b.amount - a.amount);

  // Debts
  const unpaidDebts = debts.filter((d) => d.status === "unpaid");
  const totalPayable = unpaidDebts
    .filter((d) => d.type === "payable")
    .reduce((sum, d) => sum + (d.amount - (d.paid || 0)), 0);
  const totalReceivable = unpaidDebts
    .filter((d) => d.type === "receivable")
    .reduce((sum, d) => sum + (d.amount - (d.paid || 0)), 0);

  // Upcoming events
  const upcomingEvents = events
    .filter((e) => !e.archived && new Date(e.date).getTime() >= new Date(startOfMonth).getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Helper date formatter
  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return {
      month: monthsShort[d.getMonth()],
      day: String(d.getDate()),
    };
  };

  const getEventBudget = (ev: KafEvent) => {
    if (ev.items && ev.items.length > 0) {
      return ev.items.reduce((sum, item) => sum + item.budget, 0);
    }
    return ev.budget || 0;
  };

  const getEventActual = (ev: KafEvent) => {
    if (ev.items && ev.items.length > 0) {
      return ev.items.reduce((sum, item) => sum + item.actual, 0);
    }
    return 0;
  };

  const { activeWidgets, reportError } = useFeatures();

  const quickActions = [
    {
      icon: PieIcon,
      label: "Atur Anggaran",
      bg: "bg-blue-50 hover:bg-blue-100",
      color: "text-blue-600",
      route: "/dashboard/planning/budget",
    },
    {
      icon: Target,
      label: "Target Tabungan",
      bg: "bg-emerald-50 hover:bg-emerald-100",
      color: "text-emerald-600",
      route: "/dashboard/planning/savings",
    },
    {
      icon: Calculator,
      label: "Kalkulator Finansial",
      bg: "bg-purple-50 hover:bg-purple-100",
      color: "text-purple-600",
      route: "/dashboard/calculator",
    },
    {
      icon: CalendarPlus,
      label: "Acara Baru",
      bg: "bg-orange-50 hover:bg-orange-100",
      color: "text-orange-600",
      route: "/dashboard/planning/events",
    },
    {
      icon: CreditCard,
      label: "Catat Hutang",
      bg: "bg-red-50 hover:bg-red-100",
      color: "text-red-600",
      route: "/dashboard/debts/add",
    },
    {
      icon: Handshake,
      label: "Catat Piutang",
      bg: "bg-violet-50 hover:bg-violet-100",
      color: "text-violet-600",
      route: "/dashboard/debts/add?type=receivable",
    },
    {
      icon: BarChart3,
      label: "Laporan Keuangan",
      bg: "bg-slate-100 hover:bg-slate-200",
      color: "text-slate-600",
      route: "/dashboard/analysis",
    },
  ];

  if (loadingWorkspaces || loadingData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Memuat dasbor keuangan Anda...</p>
      </div>
    );
  }

  // Soft fallback visual template for new users

  return (
    <div className="space-y-8">
      {/* Header Greeting & Workspace Switcher */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">👋</span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
              Hai {profileName.split(" ")[0]}!
            </h1>
            <div className="relative mt-1">
              <button
                onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <Briefcase className="h-3.5 w-3.5" />
                {activeWorkspace?.name || "Catatan Pribadi"}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showWorkspaceDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowWorkspaceDropdown(false)}
                  />
                  <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white border border-slate-100 shadow-xl z-20 py-2">
                    <div className="px-4 py-2 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase">
                      Pilih Workspace
                    </div>
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          switchWorkspace(ws.id);
                          setShowWorkspaceDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 flex flex-col transition-colors cursor-pointer ${
                          activeWorkspace?.id === ws.id ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <span className="text-sm font-bold text-slate-800">{ws.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {ws.type === "personal" ? "Pribadi" : "Keluarga"}
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                      <Link
                        href="/dashboard/settings/workspace"
                        onClick={() => setShowWorkspaceDropdown(false)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100/80 rounded-xl transition-all cursor-pointer text-center"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Kelola Workspace
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => setSaldoView("bulan")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              saldoView === "bulan"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📅 Bulan Ini
          </button>
          <button
            onClick={() => setSaldoView("total")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              saldoView === "total"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🏦 Total Saldo
          </button>
        </div>
      </section>

      {/* Database Empty Alert Tip */}
      {isDatabaseEmpty && (
        <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-blue-800">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="h-6 w-6 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Mulai Catat Keuangan Anda!</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Dasbor Anda saat ini menampilkan data simulasi. Gunakan tombol &quot;Catat Transaksi&quot; di menu bawah atau pintasan menu untuk mengisi catatan asli.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/transactions/add"
            className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shrink-0 shadow-md shadow-blue-500/10 cursor-pointer"
          >
            + Transaksi Baru
          </Link>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column (Main widgets) */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-8">
          {/* Main Balance and Income/Expense Card */}
          <div 
            id="tour-balance-card" 
            className={`custom-card p-8 md:p-10 relative overflow-hidden text-white shadow-2xl transition-all duration-300 ${
              isNegative
                ? "bg-gradient-to-br from-rose-600 via-rose-600 to-red-700 shadow-rose-500/20 border border-rose-500/30"
                : "bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 shadow-blue-500/20"
            }`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Wallet className="w-40 h-40" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold uppercase tracking-widest block ${
                  isNegative ? "text-rose-100" : "text-blue-100"
                }`}>
                  {saldoView === "bulan" ? "Saldo Bulan Ini" : "Akumulasi Total Saldo"}
                </span>
                {isNegative ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-900/40 text-red-200 border border-red-500/30 shadow-inner animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Defisit
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-900/30 text-emerald-300 border border-emerald-500/30 shadow-inner">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Surplus
                  </span>
                )}
              </div>

              <h2 className="text-4xl md:text-5xl font-black mb-8 flex items-baseline gap-1">
                {isNegative && <span className="text-4xl md:text-5xl font-black mr-0.5">-</span>}
                <span className={`text-2xl font-medium ${isNegative ? "text-rose-200" : "text-blue-200"}`}>Rp</span>
                {isDatabaseEmpty ? (
                  saldoView === "bulan" ? "4.750.000" : "13.800.000"
                ) : (
                  formatCurrency(currentBalance)
                )}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 hover:bg-white/15 transition-all">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-500/10">
                    <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isNegative ? "text-rose-100" : "text-blue-100"
                    }`}>
                      Total Pemasukan
                    </span>
                    <span className="text-lg font-extrabold text-white">
                      Rp{isDatabaseEmpty ? (
                        saldoView === "bulan" ? "8.5M" : "25M"
                      ) : (
                        formatCurrencyCompact(saldoView === "bulan" ? monthlyIncome : totalIncome)
                      )}
                    </span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 hover:bg-white/15 transition-all">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-red-500/10">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                      isNegative ? "text-rose-100" : "text-blue-100"
                    }`}>
                      Total Pengeluaran
                    </span>
                    <span className="text-lg font-extrabold text-white">
                      Rp{isDatabaseEmpty ? (
                        saldoView === "bulan" ? "3.7M" : "11.2M"
                      ) : (
                        formatCurrencyCompact(saldoView === "bulan" ? monthlyExpense : totalExpense)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div id="tour-quick-actions" className="custom-card p-4 md:p-5">
            <h3 className="font-extrabold text-sm text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Menu Pintasan
            </h3>
            <div className="flex items-stretch gap-2 w-full">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={idx}
                    href={action.route}
                    className="flex-1 flex flex-col items-center gap-2 px-3 py-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-0.5 text-center cursor-pointer min-w-0"
                  >
                    <div className={`w-9 h-9 rounded-xl ${action.bg} flex items-center justify-center transition-transform group-hover:scale-105`}>
                      <Icon className={`w-4 h-4 ${action.color}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 leading-tight group-hover:text-blue-600 transition-colors w-full text-center">
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Telegram Insight Banner */}
          <Link
            href="/dashboard/settings/telegram"
            className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:border-blue-100 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Send className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                Catat transaksi lebih mudah melalui Telegram Bot
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Recent Transactions Widget */}
          <div id="tour-recent-transactions" className="custom-card p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-lg text-slate-800">
                Transaksi Terakhir
              </h3>
              <Link
                href="/dashboard/transactions"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer"
              >
                Lihat Semua
              </Link>
            </div>

            <div className="divide-y divide-slate-50">
              {isDatabaseEmpty ? (
                // Mock visual fallback
                [
                  { id: "m1", emoji: "💰", desc: "Gaji Bulanan", acc: "BCA", date: "2026-05-30", amount: "+Rp8.500.000", color: "text-emerald-500" },
                  { id: "m2", emoji: "🍔", desc: "Makan Siang", acc: "GoPay", date: "2026-05-30", amount: "-Rp35.000", color: "text-red-500" },
                  { id: "m3", emoji: "⚡", desc: "Listrik PLN", acc: "Mandiri", date: "2026-05-29", amount: "-Rp450.000", color: "text-red-500" },
                  { id: "m4", emoji: "🛒", desc: "Belanja Bulanan", acc: "BCA", date: "2026-05-28", amount: "-Rp1.200.000", color: "text-red-500" },
                  { id: "m5", emoji: "💻", desc: "Freelance Project", acc: "Mandiri", date: "2026-05-27", amount: "+Rp2.500.000", color: "text-emerald-500" },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-slate-50/20 transition-colors rounded-xl px-2">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-lg border border-slate-100">
                        {item.emoji}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{item.desc}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.acc}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm font-extrabold ${item.color}`}>{item.amount}</span>
                  </div>
                ))
              ) : (
                recentTransactions.map((tx) => {
                  const { description: cleanDesc, tags } = parseDescriptionAndTags(tx.description || "");
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0 hover:bg-slate-50/20 transition-colors rounded-xl px-2"
                    >
                      <div className="flex items-center gap-4">
                        <CategoryIcon name={tx.category?.name || "Lainnya"} size="md" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {cleanDesc}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                              {tx.account?.name || "Cash"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(tx.date).toLocaleDateString("id-ID")}
                            </span>
                          </div>
                          {tags && tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tags.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100/50"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-sm font-extrabold ${
                          tx.type === "income"
                            ? "text-emerald-500"
                            : tx.type === "savings"
                            ? "text-amber-500"
                            : "text-red-500"
                        }`}
                      >
                        {tx.type === "income" ? "+" : tx.type === "savings" ? "" : "-"}Rp{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Budget Realization Widget */}
          <div className="custom-card p-6 md:p-8">
            <h3 className="font-extrabold text-lg text-slate-800 mb-6">
              Realisasi Anggaran
            </h3>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-2">
              {/* CSS Donut Chart */}
              <div
                className="w-36 h-36 rounded-full relative flex items-center justify-center shadow-inner shrink-0"
                style={{
                  background: isDatabaseEmpty
                    ? `conic-gradient(#0062ff 0% 40%, #fdc003 40% 72%, #ef4444 72% 89%, #10b981 89% 100%)`
                    : `conic-gradient(${
                        catExpenses.length > 0
                          ? catExpenses
                              .map((cat, idx, arr) => {
                                const prevPct = arr.slice(0, idx).reduce((s, c) => s + c.percentage, 0);
                                const currPct = prevPct + cat.percentage;
                                return `${cat.color} ${prevPct}% ${currPct}%`;
                              })
                              .join(", ")
                          : "#cbd5e1 0% 100%"
                      })`,
                }}
              >
                <div className="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center shadow-md">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Terpakai</span>
                  <span className="text-base font-extrabold text-slate-800">
                    Rp{isDatabaseEmpty ? "3.75Jt" : formatCurrencyCompact(monthlyExpense)}
                  </span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {isDatabaseEmpty ? (
                  [
                    { name: "Tagihan & Utilitas", amount: 1500000, percentage: 40, color: "#0062ff" },
                    { name: "Makanan & Minuman", amount: 1200000, percentage: 32, color: "#fdc003" },
                    { name: "Belanja", amount: 650000, percentage: 17, color: "#ef4444" },
                    { name: "Transportasi", amount: 400000, percentage: 11, color: "#10b981" },
                  ].map((cat, idx) => (
                    <div key={idx} className="p-3 border border-slate-100 bg-white rounded-xl shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <div>
                          <p className="text-xs font-bold text-slate-700">{cat.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Rp{formatCurrencyCompact(cat.amount)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">{cat.percentage}%</span>
                    </div>
                  ))
                ) : catExpenses.length === 0 ? (
                  <div className="col-span-2 p-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    Belum ada data alokasi anggaran bulan ini
                  </div>
                ) : (
                  catExpenses.map((cat, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-slate-100 bg-white rounded-xl shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-700">
                            {cat.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Rp{formatCurrencyCompact(cat.amount)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">
                        {cat.percentage}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar widgets) */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-8">
          {/* Savings Progress Widget */}
          <div className="custom-card p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-lg text-slate-800">
                Progres Tabungan
              </h3>
              <Link
                href="/dashboard/planning/savings"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer"
              >
                Atur
              </Link>
            </div>

            <div className="space-y-6">
              {isDatabaseEmpty ? (
                [
                  { id: "s1", name: "Dana Darurat", target: 50000000, current: 32500000, percentage: 65, monthly: 1500000 },
                  { id: "s2", name: "DP Rumah", target: 200000000, current: 46000000, percentage: 23, monthly: 3000000 },
                ].map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{goal.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Simpanan: Rp{formatCurrencyCompact(goal.monthly)}/bln</p>
                      </div>
                      <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{goal.percentage}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                      <div className="h-full bg-blue-600 rounded-full shadow-inner transition-all duration-1000" style={{ width: `${goal.percentage}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>Rp{formatCurrencyCompact(goal.current)}</span>
                      <span>Target Rp{formatCurrencyCompact(goal.target)}</span>
                    </div>
                  </div>
                ))
              ) : savings.length === 0 ? (
                <div className="p-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  Belum ada rencana target tabungan
                </div>
              ) : (
                savings.slice(0, 2).map((goal) => {
                  const target = goal.target || 0;
                  const current = goal.current || 0;
                  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{goal.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            Target: Rp{formatCurrencyCompact(target)}
                          </p>
                        </div>
                        <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                          {percentage}%
                        </span>
                      </div>

                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                        <div
                          className="h-full bg-blue-600 rounded-full shadow-inner transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>Rp{formatCurrencyCompact(current)}</span>
                        <span>Simpanan Bulanan</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Upcoming Events Widget */}
          <div className="custom-card p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-lg text-slate-800">
                Acara Mendatang
              </h3>
              <Link
                href="/dashboard/planning/events"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer"
              >
                Lihat
              </Link>
            </div>

            <div className="space-y-4">
              {isDatabaseEmpty ? (
                [
                  { id: "e1", name: "Liburan Keluarga Bali", budget: 15000000, actual: 10000000, month: "Jun", day: "15" },
                  { id: "e2", name: "Renovasi Rumah", budget: 50000000, actual: 15000000, month: "Jul", day: "12" },
                ].map((ev) => {
                  const remaining = ev.budget - ev.actual;
                  return (
                    <div key={ev.id} className="flex items-center gap-4 p-3.5 border border-slate-100 bg-white rounded-2xl hover:border-blue-100 transition-colors shadow-sm">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100/50 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-blue-500 uppercase">{ev.month}</span>
                        <span className="text-base font-extrabold text-blue-700 leading-none">{ev.day}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{ev.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Terkumpul: Rp{formatCurrencyCompact(ev.actual)} · Kurang: Rp{formatCurrencyCompact(remaining)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : upcomingEvents.length === 0 ? (
                <div className="p-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  Belum ada rencana kegiatan terdekat
                </div>
              ) : (
                upcomingEvents.map((ev) => {
                  const fd = formatEventDate(ev.date);
                  const budget = getEventBudget(ev);
                  const actual = getEventActual(ev);
                  const remaining = budget - actual;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-4 p-3.5 border border-slate-100 bg-white rounded-2xl hover:border-blue-100 transition-colors shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100/50 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-blue-500 uppercase">
                          {fd.month}
                        </span>
                        <span className="text-base font-extrabold text-blue-700 leading-none">
                          {fd.day}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {ev.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {actual > 0
                            ? `Terkumpul: Rp${formatCurrencyCompact(actual)}${
                                remaining > 0
                                  ? ` · Kurang: Rp${formatCurrencyCompact(remaining)}`
                                  : ""
                              }`
                            : `Target: Rp${formatCurrencyCompact(budget)}`}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* User Custom Widgets — disabled for now, enable later */}
          {false && activeWidgets.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-lg text-slate-800">Fitur Kreasimu</h3>
                <Link href="/dashboard/kreasi" className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline transition-all cursor-pointer">
                  Kelola
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {activeWidgets.map((feature) => {
                  const allData = [
                    ...transactions.map((t) => ({ ...t, category: t.category, account: t.account, _source: "transactions" })),
                    ...savings.map((s) => ({ ...s, _source: "savings" })),
                    ...debts.map((d) => ({ ...d, _source: "debts" })),
                    ...events.map((e) => ({ ...e, _source: "events" })),
                  ] as unknown as Record<string, unknown>[];
                  return (
                    <WidgetRenderer
                      key={feature.id}
                      feature={feature}
                      onError={reportError}
                      data={allData}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Debt Summary Widget */}
          <div className="custom-card p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-lg text-slate-800">
                Hutang & Piutang
              </h3>
              <Link
                href="/dashboard/debts"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer"
              >
                Rincian
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex flex-col gap-1 text-center">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                  Total Hutang
                </span>
                <span className="text-sm font-extrabold text-red-600">
                  Rp{isDatabaseEmpty ? "2.5M" : formatCurrencyCompact(totalPayable)}
                </span>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-1 text-center">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                  Total Piutang
                </span>
                <span className="text-sm font-extrabold text-emerald-600">
                  Rp{isDatabaseEmpty ? "4M" : formatCurrencyCompact(totalReceivable)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


