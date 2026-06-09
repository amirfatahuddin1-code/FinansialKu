"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { useAuth } from "@/providers";
import type { BudgetWithRealization } from "@karsafin/shared";

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value).replace("IDR", "Rp");
}

function getProgressColor(percentage: number) {
  if (percentage > 90) return "bg-red-500";
  if (percentage > 70) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function BudgetRealizationPage() {
  const { api } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [realizations, setRealizations] = useState<BudgetWithRealization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: err } = await api.budgets.getByMonthWithRealization(year, monthIndex + 1);
      if (err) throw err;
      setRealizations(data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [api, year, monthIndex]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalBudget = realizations.reduce((sum, r) => sum + r.amount, 0);
  const totalSpent = realizations.reduce((sum, r) => sum + r.spent, 0);
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <section className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Link href="/dashboard/planning/budget" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Anggaran
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-slate-800">
            Realisasi Anggaran
          </h1>
          <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
            Bandingkan anggaran dengan pengeluaran aktual per kategori.
          </p>
        </div>
 
        <div className="flex items-center gap-2 bg-white/50 p-2 rounded-2xl border border-white shrink-0">
          <button
            onClick={() => { if (monthIndex > 0) { setMonthIndex(monthIndex - 1); } else { setYear(year - 1); setMonthIndex(11); } }}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>
          <span className="bg-blue-600 text-white rounded-full px-6 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-md min-w-[140px] justify-center">
            {months[monthIndex]} {year}
            <ChevronDown className="h-4 w-4" />
          </span>
          <button
            onClick={() => { if (monthIndex < 11) { setMonthIndex(monthIndex + 1); } else { setYear(year + 1); setMonthIndex(0); } }}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </section>
 
      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      ) : realizations.length === 0 ? (
        <div className="custom-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-400 mb-2">Belum ada data realisasi</p>
          <p className="text-sm text-slate-400">Atur anggaran terlebih dahulu untuk melihat realisasi.</p>
          <Link href="/dashboard/planning/budget" className="inline-block mt-4 text-sm font-bold text-blue-600 hover:underline cursor-pointer">Kembali ke Anggaran</Link>
        </div>
      ) : (
        <>
          <section className="custom-card p-8 md:p-10 mb-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <div>
                <h3 className="font-black text-xl text-slate-800 mb-1">Ringkasan Realisasi</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {months[monthIndex]} {year}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">Anggaran</p>
                  <p className="text-lg font-black text-slate-800">{formatRupiah(totalBudget)}</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">Terpakai</p>
                  <p className="text-lg font-black text-slate-800">{formatRupiah(totalSpent)}</p>
                </div>
                <span className={`text-xs font-black px-3 py-1.5 rounded-full ${overallPercentage > 90 ? "text-red-600 bg-red-50" : overallPercentage > 70 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50"}`}>
                  {overallPercentage}%
                </span>
              </div>
            </div>
            <div className="h-5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
              <div className={`h-full ${getProgressColor(overallPercentage)} rounded-full shadow-sm transition-all duration-1000`} style={{ width: `${Math.min(overallPercentage, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>Rp0</span>
              <span>{formatRupiah(totalBudget)}</span>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {realizations.map((r) => {
              const remaining = r.amount - r.spent;
              const isOverBudget = r.spent > r.amount;
              const color = getProgressColor(r.percentage);
              return (
                <div key={r.id} className="custom-card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 text-lg">
                      {r.category?.icon || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{r.category?.name || "Kategori"}</h4>
                      <p className="text-xs text-slate-400">Anggaran {formatRupiah(r.amount)}</p>
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${r.percentage > 90 ? "text-red-600 bg-red-50" : r.percentage > 70 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50"}`}>
                      {r.percentage}%
                    </span>
                  </div>

                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 mb-4">
                    <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(r.percentage, 100)}%` }} />
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Terpakai</p>
                      <p className="text-sm font-black text-slate-700">{formatRupiah(r.spent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{isOverBudget ? "Over" : "Sisa"}</p>
                      <p className={`text-sm font-black ${isOverBudget ? "text-red-500" : "text-emerald-600"}`}>
                        {isOverBudget ? "+" : ""}{formatRupiah(Math.abs(remaining))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-[10px] font-bold text-slate-400">Rata-rata/hari</p>
                      <p className="text-xs font-black text-slate-700">{formatRupiah(Math.round(r.spent / 30))}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-[10px] font-bold text-slate-400">Proyeksi</p>
                      <p className={`text-xs font-black ${isOverBudget ? "text-red-500" : "text-slate-700"}`}>
                        {formatRupiah(Math.round(r.spent / Math.min(monthIndex + 1 === now.getMonth() + 1 ? now.getDate() : 30, 30) * 30))}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </>
  );
}
