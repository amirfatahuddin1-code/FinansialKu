"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Check, Loader2, AlertCircle, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/providers";
import type { Budget, UpsertBudgetInput } from "@karsafin/shared";

const months = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value).replace("IDR", "Rp");
}

export default function BudgetHistoryPage() {
  const { user, api } = useAuth();
  const [historyMonths, setHistoryMonths] = useState<{ year: number; month: number }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [historyBudgets, setHistoryBudgets] = useState<Budget[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await api.budgets.getAllHistory();
        if (err) throw err;
        setHistoryMonths(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const loadHistoryBudgets = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const { data, error: err } = await api.budgets.getByMonth(year, month);
      if (err) throw err;
      setHistoryBudgets(data || []);
      setSelectedIds(new Set((data || []).map((b) => b.id)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const handleSelectMonth = (ym: { year: number; month: number }) => {
    setSelectedMonth(ym);
    loadHistoryBudgets(ym.year, ym.month);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleApply = async () => {
    if (!selectedMonth) return;
    setApplying(true);
    setError(null);
    try {
      const now = new Date();
      const targetYear = now.getFullYear();
      const targetMonth = now.getMonth() + 1;

      const items: UpsertBudgetInput[] = historyBudgets
        .filter((b) => selectedIds.has(b.id))
        .map((b) => ({
          category_id: b.category_id,
          amount: b.amount,
          mode: b.mode,
          percentage: b.percentage,
          month: targetMonth,
          year: targetYear,
        }));

      if (items.length === 0) {
        setError("Pilih minimal satu anggaran");
        setApplying(false);
        return;
      }

      if (!user) throw new Error("Belum login");
      const { error: err } = await api.budgets.upsertBatch(user.id, items);
      if (err) throw err;
      setSuccess(`${items.length} anggaran berhasil diterapkan ke bulan ini!`);
    } catch (err: any) {
      setError(err.message || "Gagal menerapkan");
    } finally {
      setApplying(false);
    }
  };

  if (loading && historyMonths.length === 0) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
          <button onClick={() => setError(null)} className="ml-auto cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <Check className="h-4 w-4" /> {success}
          <button onClick={() => setSuccess(null)} className="ml-auto cursor-pointer"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <section className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Link href="/dashboard/planning/budget" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Anggaran
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-slate-800">
            Histori Anggaran
          </h1>
          <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
            Lihat dan terapkan anggaran dari bulan sebelumnya ke bulan berjalan.
          </p>
        </div>
      </section>
 
      {historyMonths.length === 0 ? (
        <div className="custom-card p-12 text-center">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-400 mb-2">Belum ada histori</p>
          <p className="text-sm text-slate-400">Atur anggaran terlebih dahulu untuk melihat histori.</p>
          <Link href="/dashboard/planning/budget" className="inline-block mt-4 text-sm font-bold text-blue-600 hover:underline cursor-pointer">Kembali ke Anggaran</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="custom-card p-6">
            <h3 className="font-bold text-slate-800 mb-4">Pilih Bulan</h3>
            <div className="space-y-1">
              {historyMonths.map((ym) => {
                const isSelected = selectedMonth?.year === ym.year && selectedMonth?.month === ym.month;
                return (
                  <button
                    key={`${ym.year}-${ym.month}`}
                    onClick={() => handleSelectMonth(ym)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${isSelected ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-transparent"}`}
                  >
                    <span>{months[ym.month - 1]} {ym.year}</span>
                    <ChevronRight className={`h-4 w-4 ${isSelected ? "text-blue-500" : "text-slate-400"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {selectedMonth && (
            <div className="custom-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">{months[selectedMonth.month - 1]} {selectedMonth.year}</h3>
                <span className="text-xs font-bold text-slate-400">{historyBudgets.length} kategori</span>
              </div>
              {historyBudgets.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Tidak ada anggaran di bulan ini</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {historyBudgets.map((b) => (
                    <label key={b.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(b.id)}
                        onChange={() => toggleSelect(b.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{b.category?.name || "Kategori"}</p>
                        <p className="text-xs text-slate-400">{formatRupiah(b.amount)}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {historyBudgets.length > 0 && (
                <button
                  onClick={handleApply}
                  disabled={applying || selectedIds.size === 0}
                  className="w-full mt-4 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Terapkan ke Bulan Ini ({selectedIds.size})
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
