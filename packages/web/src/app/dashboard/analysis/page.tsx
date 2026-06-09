"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  Wallet,
  Activity,
  BarChart3,
  Heart,
  ShieldCheck,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useAuth, useWorkspace } from "@/providers";
import type { Transaction, Debt, Savings, FinancialAccount } from "@karsafin/shared";
import { formatCurrency } from "@karsafin/shared";

function getFallbackInsights(monthIncome: number, monthExpense: number, sRatio: number, totalSavings: number, totalDebt: number, totalAccountBalance: number, _topCats: string): AiTip[] {
  const tips: AiTip[] = [];
  if (monthExpense > monthIncome) {
    tips.push({ title: "Pengeluaran Melebihi Pendapatan", description: `Pengeluaran bulan ini Rp${(monthExpense - monthIncome).toLocaleString("id-ID")} lebih besar dari pendapatan. Coba catat pengeluaran harian dan kurangi pos yang tidak esensial.`, tag: "Penghematan", tagColor: "purple" });
  }
  if (sRatio < 20 && sRatio >= 0) {
    tips.push({ title: "Tingkatkan Tabungan", description: `Rasio tabungan Anda ${sRatio}%. Idealnya minimal 20% dari pendapatan. Coba sisihkan sebagian pendapatan sebelum membelanjakannya.`, tag: "Tabungan", tagColor: "blue" });
  }
  if (totalDebt > 0 && totalSavings > 0) {
    const ratio = totalSavings / totalDebt;
    if (ratio < 0.5) {
      tips.push({ title: "Prioritaskan Pembayaran Utang", description: `Utang Anda (Rp${totalDebt.toLocaleString("id-ID")}) lebih besar dari tabungan (Rp${totalSavings.toLocaleString("id-ID")}). Fokus lunasi utang dengan bunga tertinggi terlebih dahulu.`, tag: "Dana Darurat", tagColor: "purple" });
    }
  }
  if (totalAccountBalance > 0 && totalSavings > 0) {
    tips.push({ title: "Saldo Rekening Tersebar", description: `Anda memiliki total Rp${(totalSavings + totalAccountBalance).toLocaleString("id-ID")} di tabungan dan rekening. Pastikan dana darurat 3-6 bulan pengeluaran sudah siap.`, tag: "Tabungan", tagColor: "green" });
  }
  if (monthIncome > 0 && monthExpense > 0) {
    tips.push({ title: "Budget Bulanan", description: `Pendapatan Rp${monthIncome.toLocaleString("id-ID")} dengan pengeluaran Rp${monthExpense.toLocaleString("id-ID")}. Coba terapkan budget 50/30/20 (kebutuhan/keinginan/tabungan).`, tag: "Pendapatan", tagColor: "blue" });
  }
  if (tips.length === 0) {
    tips.push({ title: "Keuangan Stabil", description: "Keuangan Anda terlihat sehat. Terus pantau pengeluaran dan tingkatkan tabungan untuk masa depan.", tag: "Tabungan", tagColor: "green" });
  }
  return tips;
}

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("IDR", "Rp");
}

interface AiTip {
  title: string;
  description: string;
  tag: string;
  tagColor: "green" | "blue" | "purple";
}

export default function AnalysisPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savings, setSavings] = useState<Savings[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [aiInsights, setAiInsights] = useState<AiTip[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const startDateStr = startDate.toISOString().split("T")[0];

      const [txRes, debtsRes, savRes, accRes] = await Promise.all([
        api.transactions.getAll({ startDate: startDateStr }),
        api.debts.getAll(user.id),
        api.savings.getAll(),
        api.accounts.getAll(),
      ]);
      if (txRes.error) throw txRes.error;
      setTransactions(txRes.data || []);
      setDebts(debtsRes.data || []);
      setSavings(savRes.data || []);
      setAccounts(accRes.data || []);
    } catch (err) {
      console.error("Gagal memuat data transaksi analisis:", err);
    } finally {
      setLoading(false);
    }
  }, [user, api, activeWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!api?.supabase?.functions || loading || !transactions.length) return;

    const loadInsights = async () => {
      setInsightsLoading(true);
      let monthIncome = 0, monthExpense = 0, sRatio = 0, topCats = "", totalSavings = 0, totalDebt = 0;
      try {
        const monthTxs = transactions.filter((t) => {
          const d = new Date(t.date);
          return d.getFullYear() === year && d.getMonth() === monthIndex;
        });
        monthIncome = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        monthExpense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        sRatio = monthIncome > 0 ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100) : 0;

        const catMap = monthTxs
          .filter((t) => t.type === "expense")
          .reduce((acc, t) => {
            const n = t.category?.name || "Lainnya";
            acc[n] = (acc[n] || 0) + t.amount;
            return acc;
          }, {} as Record<string, number>);
        const totalExp = Object.values(catMap).reduce((s, v) => s + v, 0);
        topCats = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, amt]) => `${name} ${totalExp > 0 ? Math.round((amt / totalExp) * 100) : 0}%`)
          .join(", ");

        const allIncomeTotal = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const allExpenseTotal = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        totalSavings = savings.reduce((s, sa) => s + sa.current, 0);
        totalDebt = debts
          .filter((d) => d.type === "payable" && d.status === "unpaid")
          .reduce((s, d) => s + (d.amount - d.paid), 0);

        const contextMessage = `Data Keuangan (${months[monthIndex]} ${year}):
- Pendapatan bulan ini: Rp${monthIncome.toLocaleString("id-ID")}
- Pengeluaran bulan ini: Rp${monthExpense.toLocaleString("id-ID")}
- Rasio tabungan: ${sRatio}%
- 3 kategori pengeluaran terbesar: ${topCats || "belum ada data"}
- Total tabungan: Rp${totalSavings.toLocaleString("id-ID")}
- Total utang: Rp${totalDebt.toLocaleString("id-ID")}
- Total pendapatan (semua waktu): Rp${allIncomeTotal.toLocaleString("id-ID")}
- Total pengeluaran (semua waktu): Rp${allExpenseTotal.toLocaleString("id-ID")}`;

        const { data, error } = await api.supabase.functions.invoke("ai-chat", {
          body: {
            message: `Berdasarkan data keuangan berikut, berikan 3 tips/insight singkat dan actionable dalam Bahasa Indonesia.\n\n${contextMessage}\n\nJawab hanya JSON array tanpa teks lain. Setiap item: { "title": string, "description": string (1-2 kalimat), "tag": "Tabungan" | "Investasi" | "Penghematan" | "Dana Darurat" | "Pendapatan", "color": "green" | "blue" | "purple" }`,
            history: [],
            context: {},
          },
        });

        if (error) throw error;
        const responseText = data?.response || "";
        const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as AiTip[];
          setAiInsights(parsed);
        }
      } catch (err) {
        console.error("Gagal memuat insight AI:", err);
        const fallback = getFallbackInsights(monthIncome, monthExpense, sRatio, totalSavings, totalDebt, totalAccountBalance, topCats);
        setAiInsights(fallback);
      } finally {
        setInsightsLoading(false);
      }
    };

    loadInsights();
  }, [api, loading, transactions, debts, savings, monthIndex, year]);

  // Calculations for selected month
  const selectedMonthTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });

  const selectedMonthIncome = selectedMonthTxs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const selectedMonthExpense = selectedMonthTxs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsRatio =
    selectedMonthIncome > 0
      ? Math.round(((selectedMonthIncome - selectedMonthExpense) / selectedMonthIncome) * 100)
      : 0;

  // Top expense categories calculation
  const selectedMonthExpenses = selectedMonthTxs.filter((t) => t.type === "expense");
  const categoryMap = selectedMonthExpenses.reduce((acc, t) => {
    const catName = t.category?.name || "Lainnya";
    const catIcon = t.category?.icon || "📦";
    if (!acc[catName]) acc[catName] = { amount: 0, icon: catIcon };
    acc[catName].amount += t.amount;
    return acc;
  }, {} as Record<string, { amount: number; icon: string }>);

  const totalExpense = Object.values(categoryMap).reduce((sum, c) => sum + c.amount, 0);

  const chartColors = [
    "bg-dashboard-blue",
    "bg-blue-400",
    "bg-blue-300",
    "bg-indigo-400",
    "bg-violet-400",
    "bg-purple-300",
  ];

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([name, data], idx) => ({
      name,
      icon: data.icon,
      amount: data.amount,
      percentage: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
      color: chartColors[idx % chartColors.length],
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // 6 Months Trend calculation
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, monthIndex - 5 + i, 1);
    return {
      monthName: d.toLocaleDateString("id-ID", { month: "short" }),
      y: d.getFullYear(),
      m: d.getMonth(),
    };
  });

  const trendData = last6Months.map((m) => {
    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === m.y && d.getMonth() === m.m;
    });
    const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return {
      monthLabel: m.monthName,
      income,
      expense,
    };
  });

  const maxVal = Math.max(...trendData.map((d) => Math.max(d.income, d.expense)), 100000);

  // Financial Health Score - 5 Indicators
  const allIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const allExpense = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  const uniqueMonths = new Set(transactions.map((t) => t.date?.slice(0, 7)).filter(Boolean));
  const numMonths = Math.max(1, uniqueMonths.size);

  const totalSavingsBalance = savings.reduce((s, sa) => s + sa.current, 0);
  const totalAccountBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const totalAsset = totalSavingsBalance + totalAccountBalance;

  const healthScoreData = (() => {
    if (allIncome === 0 && allExpense === 0) {
      return { score: 50, label: "Belum Ada Data", color: "#94a3b8", colorClass: "text-slate-400 bg-slate-50", details: [] as { label: string; score: number; weight: number; desc: string }[] };
    }

    const avgMonthlyIncome = allIncome / numMonths;
    const avgMonthlyExpense = allExpense / numMonths;

    // 1. Pendapatan vs Pengeluaran (20%)
    const expenseRatio = allIncome > 0 ? allExpense / allIncome : 99;
    let pendapatanScore: number, pendapatanDesc: string;
    if (allIncome === 0) { pendapatanScore = 0; pendapatanDesc = "Tidak ada pemasukan"; }
    else if (expenseRatio <= 0.5) { pendapatanScore = 100; pendapatanDesc = "Sangat baik"; }
    else if (expenseRatio <= 0.7) { pendapatanScore = 80; pendapatanDesc = "Ideal"; }
    else if (expenseRatio <= 0.85) { pendapatanScore = 60; pendapatanDesc = "Cukup"; }
    else if (expenseRatio <= 1) { pendapatanScore = 40; pendapatanDesc = "Hati-hati"; }
    else { pendapatanScore = 20; pendapatanDesc = "Melebihi pendapatan"; }

    // 2. Tabungan & Investasi (20%) — persentase pendapatan yang ditabung per bulan
    const avgMonthlySurplus = (allIncome - allExpense) / numMonths;
    const savingsRate = avgMonthlyIncome > 0 ? avgMonthlySurplus / avgMonthlyIncome : 0;
    let tabunganScore: number, tabunganDesc: string;
    if (savingsRate >= 0.3) { tabunganScore = 100; tabunganDesc = "Sangat baik (>30%)"; }
    else if (savingsRate >= 0.2) { tabunganScore = 85; tabunganDesc = "Baik (20-30%)"; }
    else if (savingsRate >= 0.1) { tabunganScore = 65; tabunganDesc = "Cukup (10-20%)"; }
    else if (savingsRate >= 0) { tabunganScore = 50; tabunganDesc = "Kurang (0-10%)"; }
    else { tabunganScore = 20; tabunganDesc = "Defisit"; }

    // 3. Dana Darurat (20%)
    const emergencyMonths = avgMonthlyExpense > 0 ? totalSavingsBalance / avgMonthlyExpense : 0;
    let daruratScore: number, daruratDesc: string;
    if (emergencyMonths >= 6) { daruratScore = 100; daruratDesc = "Sangat aman"; }
    else if (emergencyMonths >= 3) { daruratScore = 80; daruratDesc = "Aman (3-6 bulan)"; }
    else if (emergencyMonths >= 1) { daruratScore = 50; daruratDesc = "Kurang dari 3 bulan"; }
    else if (emergencyMonths > 0) { daruratScore = 30; daruratDesc = "Kritis"; }
    else { daruratScore = 0; daruratDesc = "Tidak ada"; }

    // 4. Utang & Cicilan (20%)
    const totalDebt = debts.filter((d) => d.type === "payable" && d.status === "unpaid").reduce((s, d) => s + (d.amount - d.paid), 0);
    const dtiRatio = avgMonthlyIncome > 0 ? totalDebt / avgMonthlyIncome : 99;
    let utangScore: number, utangDesc: string;
    if (totalDebt === 0) { utangScore = 100; utangDesc = "Tidak ada utang"; }
    else if (dtiRatio <= 0.3) { utangScore = 80; utangDesc = "Sehat"; }
    else if (dtiRatio <= 0.5) { utangScore = 60; utangDesc = "Cukup"; }
    else if (dtiRatio <= 1) { utangScore = 40; utangDesc = "Tinggi"; }
    else { utangScore = 20; utangDesc = "Sangat tinggi"; }

    // 5. Aset vs Liabilitas (20%)
    const totalLiability = debts.filter((d) => d.type === "payable").reduce((s, d) => s + (d.amount - d.paid), 0);
    const netWorth = totalAsset - totalLiability;
    let asetScore: number, asetDesc: string;
    if (netWorth > avgMonthlyIncome * 12) { asetScore = 100; asetDesc = "Sangat sehat"; }
    else if (netWorth > 0) { asetScore = 75; asetDesc = "Positif"; }
    else if (netWorth === 0) { asetScore = 50; asetDesc = "Netral"; }
    else { asetScore = 25; asetDesc = "Negatif"; }

    const details = [
      { label: "Pendapatan vs Pengeluaran", score: pendapatanScore, weight: 0.2, desc: pendapatanDesc },
      { label: "Tabungan & Investasi", score: tabunganScore, weight: 0.2, desc: tabunganDesc },
      { label: "Dana Darurat", score: daruratScore, weight: 0.2, desc: daruratDesc },
      { label: "Utang & Cicilan", score: utangScore, weight: 0.2, desc: utangDesc },
      { label: "Aset vs Liabilitas", score: asetScore, weight: 0.2, desc: asetDesc },
    ];

    const totalScore = Math.round(details.reduce((s, d) => s + d.score * d.weight, 0));

    let label: string, color: string, colorClass: string;
    if (totalScore >= 80) { label = "Sangat Sehat"; color = "#10b981"; colorClass = "text-emerald-600 bg-emerald-50"; }
    else if (totalScore >= 60) { label = "Cukup Sehat"; color = "#22c55e"; colorClass = "text-green-600 bg-green-50"; }
    else if (totalScore >= 40) { label = "Rentan"; color = "#f59e0b"; colorClass = "text-amber-600 bg-amber-50"; }
    else { label = "Tidak Sehat"; color = "#ef4444"; colorClass = "text-red-600 bg-red-50"; }

    return { score: totalScore, label, color, colorClass, details };
  })();

  const healthScore = healthScoreData.score;
  const healthStatus = healthScoreData.label;
  const healthColorClass = healthScoreData.colorClass;

  const insightIcons: Record<string, React.ReactNode> = {
    Tabungan: <PiggyBank className="h-5 w-5" />,
    Investasi: <TrendingUp className="h-5 w-5" />,
    Penghematan: <Target className="h-5 w-5" />,
    "Dana Darurat": <ShieldCheck className="h-5 w-5" />,
    Pendapatan: <TrendingUp className="h-5 w-5" />,
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <section className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-xs font-bold text-dashboard-gray uppercase tracking-widest mb-3">
            Dashboard &rsaquo; Analisis
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-slate-800">
            Analisis Keuangan
          </h1>
          <p className="text-dashboard-gray max-w-2xl text-lg leading-relaxed">
            Ringkasan mendalam tentang kondisi keuangan Anda, tren pengeluaran, dan rekomendasi berbasis data untuk bulan ini.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/50 p-2 rounded-2xl border border-white shrink-0 shadow-sm">
          <button
            onClick={() => {
              if (monthIndex > 0) {
                setMonthIndex(monthIndex - 1);
              } else {
                setYear(year - 1);
                setMonthIndex(11);
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>
          <span className="bg-dashboard-blue text-white rounded-full px-5 py-2 text-sm font-semibold min-w-[140px] text-center shadow-md shadow-blue-500/10">
            {months[monthIndex]} {year}
          </span>
          <button
            onClick={() => {
              if (monthIndex < 11) {
                setMonthIndex(monthIndex + 1);
              } else {
                setYear(year + 1);
                setMonthIndex(0);
              }
            }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </section>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          icon={<Wallet className="h-5 w-5" />}
          label="Pendapatan Total"
          value={formatRupiah(selectedMonthIncome)}
          change="Bulan Ini"
          positive
        />
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Pengeluaran Total"
          value={formatRupiah(selectedMonthExpense)}
          change="Bulan Ini"
          positive={false}
        />
        <MetricCard
          icon={<PiggyBank className="h-5 w-5" />}
          label="Rasio Tabungan"
          value={`${savingsRatio}%`}
          change={savingsRatio >= 20 ? "Ideal (>=20%)" : "Perlu ditingkatkan"}
          positive={savingsRatio >= 20}
        />
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="Tren Bulanan"
          value={selectedMonthIncome >= selectedMonthExpense ? "Positif (Surplus)" : "Negatif (Defisit)"}
          change={formatRupiah(Math.abs(selectedMonthIncome - selectedMonthExpense))}
          positive={selectedMonthIncome >= selectedMonthExpense}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-8 mb-8">
        {/* Spending by Category */}
        <div className="col-span-12 lg:col-span-7 custom-card p-8 md:p-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="font-black text-2xl text-slate-800 mb-1">
                Pengeluaran per Kategori
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Kategori belanja bulan ini
              </p>
            </div>
            <span className="text-sm font-bold text-dashboard-blue bg-blue-50 px-4 py-1.5 rounded-full">
              {formatRupiah(selectedMonthExpense)} Total
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Belum ada transaksi pengeluaran di bulan ini.
            </div>
          ) : (
            <div className="space-y-5">
              {categoryBreakdown.map((cat) => (
                <CategoryBar
                  key={cat.name}
                  emoji={cat.icon || "📦"}
                  label={cat.name}
                  amount={formatRupiah(cat.amount)}
                  percentage={cat.percentage}
                  color={cat.color}
                />
              ))}
            </div>
          )}
        </div>

        {/* Financial Health Score */}
        <div className="col-span-12 lg:col-span-5 custom-card p-8 md:p-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-6">
            <Heart className="h-5 w-5 text-rose-400" />
            <h3 className="font-black text-xl text-slate-800">
              Skor Kesehatan Finansial
            </h3>
          </div>

          {/* SVG Arc Gauge */}
          <HealthGauge score={healthScore} />

          <div className={`inline-flex items-center gap-2 font-bold text-sm px-5 py-2 rounded-full mb-4 ${healthColorClass}`}>
            <ShieldCheck className="h-4 w-4" />
            Status: {healthStatus}
          </div>
          <p className="text-xs font-semibold text-slate-400 mb-6">
            Pemasukan: Rp {formatCurrency(selectedMonthIncome)} &middot; Pengeluaran: Rp {formatCurrency(selectedMonthExpense)}
          </p>

          {/* 5 Indicator Rows (like mobile) */}
          <div className="w-full space-y-1 border-t border-slate-100 pt-4">
            {healthScoreData.details.map((item, idx) => {
              const scoreColor = item.score >= 60 ? "text-emerald-600" : item.score >= 40 ? "text-amber-600" : "text-red-600";
              const scoreBg = item.score >= 60 ? "bg-emerald-50" : item.score >= 40 ? "bg-amber-50" : "bg-red-50";
              return (
                <div key={idx} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-b-0">
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({Math.round(item.weight * 100)}%)</span>
                    </div>
                    <span className="text-xs text-slate-400">{item.desc}</span>
                  </div>
                  <div className={`ml-3 w-9 h-7 rounded-lg flex items-center justify-center ${scoreBg}`}>
                    <span className={`text-sm font-extrabold ${scoreColor}`}>{item.score}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="w-full border-t border-slate-100 pt-3 mt-2">
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              80-100: Sangat Sehat &middot; 60-79: Cukup Sehat &middot; 40-59: Rentan &middot; &lt;40: Tidak Sehat
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="grid grid-cols-12 gap-8 mb-8">
        <div className="col-span-12 custom-card p-8 md:p-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="font-black text-2xl text-slate-800 mb-1">
                Tren Bulanan
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Perbandingan Pendapatan vs Pengeluaran 6 bulan terakhir
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-dashboard-blue" />
                <span className="text-xs font-bold text-slate-500">Pendapatan</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="text-xs font-bold text-slate-500">Pengeluaran</span>
              </div>
            </div>
          </div>

          {/* CSS Bar Chart */}
          <div className="flex items-end justify-between gap-4 min-h-[260px] px-2 pb-2">
            {trendData.map((d, index) => {
              const incPct = maxVal > 0 ? (d.income / maxVal) * 100 : 0;
              const expPct = maxVal > 0 ? (d.expense / maxVal) * 100 : 0;
              const isCurrent = index === 5;

              return (
                <div key={index} className="flex flex-col items-center gap-3 w-full group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-48">
                    <div
                      className={`w-full max-w-[24px] rounded-t-xl transition-all duration-500 ${
                        isCurrent
                          ? "bg-dashboard-blue shadow-lg shadow-blue-200"
                          : "bg-blue-400/40 group-hover:bg-dashboard-blue"
                      }`}
                      style={{ height: `${Math.max(incPct, 2)}%` }}
                      title={`Income: ${formatRupiah(d.income)}`}
                    />
                    <div
                      className={`w-full max-w-[24px] rounded-t-xl transition-all duration-500 ${
                        isCurrent
                          ? "bg-rose-400 shadow-lg shadow-rose-200"
                          : "bg-rose-300/40 group-hover:bg-rose-400"
                      }`}
                      style={{ height: `${Math.max(expPct, 2)}%` }}
                      title={`Expense: ${formatRupiah(d.expense)}`}
                    />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isCurrent ? "text-dashboard-blue" : "text-slate-400"}`}>
                    {d.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-px bg-slate-100 mx-2 mt-1" />
        </div>
      </div>

      {/* AI Tips & Insights */}
      <div className="custom-card p-8 md:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-2xl text-slate-800">
              Tips & Insight AI
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Rekomendasi berdasarkan pola keuangan Anda
            </p>
          </div>
        </div>

        {insightsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            <span className="ml-3 text-slate-500 text-sm">Menyusun rekomendasi khusus untuk Anda...</span>
          </div>
        ) : aiInsights.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Belum ada rekomendasi. Pastikan data transaksi Anda tersedia.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {aiInsights.map((insight, idx) => (
              <TipCard
                key={idx}
                icon={insightIcons[insight.tag] || <Sparkles className="h-5 w-5" />}
                title={insight.title}
                description={insight.description}
                tag={insight.tag}
                tagColor={insight.tagColor}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ---- Sub-components ---- */

function MetricCard({
  icon,
  label,
  value,
  change,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="custom-card p-6 hover:shadow-lg transition-all hover:-translate-y-0.5 group">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-dashboard-blue group-hover:bg-dashboard-blue group-hover:text-white transition-colors">
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${positive ? "text-green-600 bg-green-50" : "text-rose-500 bg-rose-50"}`}>
          {change}
        </span>
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800 truncate">{value}</p>
    </div>
  );
}

function CategoryBar({
  emoji,
  label,
  amount,
  percentage,
  color,
}: {
  emoji: string;
  label: string;
  amount: string;
  percentage: number;
  color: string;
}) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-lg">{emoji}</span>
          <span className="text-sm font-bold text-slate-700">{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-slate-800">{amount}</span>
          <span className="text-xs font-bold text-slate-400">{percentage}%</span>
        </div>
      </div>
      <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 group-hover:opacity-80`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  // Arc from 210deg to 330deg (240deg sweep) — like a speedometer
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const strokeWidth = 14;

  // We sweep 240 degrees total, starting at 210deg (bottom-left) and ending at 330deg (bottom-right)
  const startAngle = 210;
  const totalDegrees = 240;

  function polarToCart(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function describeArc(startDeg: number, endDeg: number) {
    const s = polarToCart(startDeg);
    const e = polarToCart(endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  const endDeg = startAngle + (score / 100) * totalDegrees;

  const scoreColor =
    score >= 80
      ? "#10b981" // emerald
      : score >= 60
      ? "#22c55e" // green
      : score >= 40
      ? "#f59e0b" // amber
      : "#ef4444"; // red

  // Needle tip position
  const needleTip = polarToCart(endDeg);

  return (
    <div className="relative flex items-center justify-center mb-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        {/* Track arc */}
        <path
          d={describeArc(startAngle, startAngle + totalDegrees)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Progress arc */}
        {score > 0 && (
          <path
            d={describeArc(startAngle, Math.min(endDeg, startAngle + totalDegrees - 0.01))}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${scoreColor}55)`,
              transition: "all 1s ease-in-out",
            }}
          />
        )}
        {/* Indicator dot */}
        {score > 0 && (
          <circle
            cx={needleTip.x}
            cy={needleTip.y}
            r={7}
            fill="white"
            stroke={scoreColor}
            strokeWidth={3}
            style={{ filter: `drop-shadow(0 2px 4px ${scoreColor}66)` }}
          />
        )}
        {/* Score label */}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="38"
          fontWeight="900"
          fill="#1e293b"
          fontFamily="system-ui, sans-serif"
        >
          {score}
        </text>
        <text
          x={cx}
          y={cy + 34}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="700"
          fill="#94a3b8"
          fontFamily="system-ui, sans-serif"
        >
          dari 100
        </text>
        {/* Min / Max labels */}
        <text
          x={polarToCart(startAngle).x - 2}
          y={polarToCart(startAngle).y + 18}
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="#cbd5e1"
          fontFamily="system-ui, sans-serif"
        >
          0
        </text>
        <text
          x={polarToCart(startAngle + totalDegrees).x + 2}
          y={polarToCart(startAngle + totalDegrees).y + 18}
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="#cbd5e1"
          fontFamily="system-ui, sans-serif"
        >
          100
        </text>
      </svg>
    </div>
  );
}

function TipCard({
  icon,
  title,
  description,
  tag,
  tagColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
  tagColor: "green" | "blue" | "purple";
}) {
  const tagColors = {
    green: "text-green-600 bg-green-50",
    blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50",
  };
  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-dashboard-blue shadow-sm group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${tagColors[tagColor]}`}>
          {tag}
        </span>
      </div>
      <h4 className="font-bold text-slate-800 mb-2">{title}</h4>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
