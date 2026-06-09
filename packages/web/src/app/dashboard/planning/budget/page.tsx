"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Plus,
  Clock,
  BarChart3,
  Loader2,
  Save,
  X,
  AlertCircle,
  Check,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useAuth, useWorkspace } from "@/providers";
import type { BudgetWithRealization, Category, UpsertBudgetInput } from "@karsafin/shared";
import { getCategoryStyle } from "@/components/CategoryIcon";

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
  if (percentage > 90) return { bar: "bg-red-500", badge: "text-red-600 bg-red-50" };
  if (percentage > 70) return { bar: "bg-amber-500", badge: "text-amber-600 bg-amber-50" };
  return { bar: "bg-emerald-500", badge: "text-emerald-600 bg-emerald-50" };
}

export default function BudgetPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [budgets, setBudgets] = useState<BudgetWithRealization[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [budgetRes, catRes] = await Promise.all([
        api.budgets.getByMonthWithRealization(year, monthIndex + 1),
        api.categories.getAll(),
      ]);
      if (budgetRes.error) throw budgetRes.error;
      setBudgets(budgetRes.data || []);
      setCategories((catRes.data || []).filter((c: Category) => c.type === "expense"));
    } catch (err: any) {
      setError(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [user, api, year, monthIndex]);

  useEffect(() => { loadData(); }, [loadData]);

  const openBudgetModal = () => {
    const inputs: Record<string, string> = {};
    for (const cat of categories) {
      const existing = budgets.find((b) => b.category_id === cat.id);
      inputs[cat.id] = existing ? String(existing.amount) : "";
    }
    setBudgetInputs(inputs);
    setShowModal(true);
  };

  const handleSaveBudget = async () => {
    setSaving(true);
    setError(null);
    try {
      const items: UpsertBudgetInput[] = [];
      for (const cat of categories) {
        const amount = Number(budgetInputs[cat.id]);
        if (amount > 0) {
          items.push({
            category_id: cat.id,
            amount,
            mode: "nominal",
            month: monthIndex + 1,
            year,
          });
        }
      }
      if (items.length === 0) {
        setError("Isi minimal satu anggaran");
        setSaving(false);
        return;
      }
      if (!user) throw new Error("Belum login");
      const { error: err } = await api.budgets.upsertBatch(user.id, items);
      if (err) throw err;
      setSuccess("Anggaran berhasil disimpan!");
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const month = monthIndex + 1;
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const overallColor = getProgressColor(overallPercentage);

  if (loading) {
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
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
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
          <Link href="/dashboard/planning" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Perencanaan
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-slate-800">
            Anggaran Bulanan
          </h1>
          <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
            Kelola dan pantau anggaran pengeluaran Anda berdasarkan kategori setiap bulan.
          </p>
        </div>
 
        <div className="flex items-center gap-2 bg-white/50 p-2 rounded-2xl border border-white shrink-0">
          <button onClick={() => { if (monthIndex > 0) { setMonthIndex(monthIndex - 1); } else { setYear(year - 1); setMonthIndex(11); } }} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>
          <span className="bg-blue-600 text-white rounded-full px-6 py-2.5 text-sm font-semibold flex items-center gap-2 shadow-md min-w-[140px] justify-center">
            {months[monthIndex]} {year}
          </span>
          <button onClick={() => { if (monthIndex < 11) { setMonthIndex(monthIndex + 1); } else { setYear(year + 1); setMonthIndex(0); } }} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>
      </section>
 
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/dashboard/planning/budget/history" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
          <Clock className="h-4 w-4" /> Histori Anggaran
        </Link>
        <Link href="/dashboard/planning/budget/realization" className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
          <BarChart3 className="h-4 w-4" /> Realisasi Anggaran
        </Link>
        <button onClick={openBudgetModal} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 cursor-pointer">
          <Plus className="h-4 w-4" /> Tambah Anggaran
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="custom-card p-12 text-center">
          <p className="text-lg font-bold text-slate-400 mb-2">Belum ada anggaran</p>
          <p className="text-sm text-slate-400 mb-6">Atur anggaran Anda untuk mulai memantau pengeluaran.</p>
          <button onClick={openBudgetModal} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all cursor-pointer">
            <Plus className="h-4 w-4" /> Atur Anggaran Sekarang
          </button>
        </div>
      ) : (
        <>
          <section className="custom-card p-8 md:p-10 mb-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
              <div>
                <h3 className="font-black text-xl text-slate-800 mb-1">Total Anggaran</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Ringkasan pengeluaran {months[monthIndex]} {year}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">Terpakai</p>
                  <p className="text-lg font-black text-slate-800">{formatRupiah(totalSpent)}</p>
                </div>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-right">
                  <p className="text-xs text-slate-400 mb-1">Anggaran</p>
                  <p className="text-lg font-black text-slate-800">{formatRupiah(totalBudget)}</p>
                </div>
                <span className={`text-xs font-black px-3 py-1.5 rounded-full ${overallColor.badge}`}>
                  {overallPercentage}%
                </span>
              </div>
            </div>
            <div className="h-5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
              <div className={`h-full ${overallColor.bar} rounded-full shadow-sm transition-all duration-1000`} style={{ width: `${overallPercentage}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-400">Rp0</span>
              <span className="text-xs text-slate-400">{formatRupiah(totalBudget)}</span>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {budgets.map((b) => {
              const cat = b.category;
              const cfg = getCategoryStyle(cat?.name || "");
              const Icon = cfg.Icon;
              const remaining = b.amount - b.spent;
              const progressColor = getProgressColor(b.percentage);

              return (
                <div key={b.id} className="custom-card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-11 h-11 ${cfg.bgClass} ${cfg.borderClass} border rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-5 w-5 ${cfg.textClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{cat?.name || "Kategori"}</h4>
                      <p className="text-xs text-slate-400">Limit {formatRupiah(b.amount)}</p>
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full ${progressColor.badge}`}>
                      {b.percentage}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 mb-4">
                    <div className={`h-full ${progressColor.bar} rounded-full transition-all duration-700`} style={{ width: `${Math.min(b.percentage, 100)}%` }} />
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Terpakai</p>
                      <p className="text-sm font-black text-slate-700">{formatRupiah(b.spent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sisa</p>
                      <p className={`text-sm font-black ${remaining < 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {formatRupiah(Math.max(remaining, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      {mounted && showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Atur Anggaran</h3>
                <p className="text-xs text-slate-400">{months[monthIndex]} {year}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {categories.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">Tidak ada kategori pengeluaran</p>
              )}
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                  <span className="text-lg w-8 text-center">📦</span>
                  <span className="flex-1 text-sm font-bold text-slate-700">{cat.name}</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Rp</span>
                    <input
                      type="number"
                      value={budgetInputs[cat.id] || ""}
                      onChange={(e) => setBudgetInputs({ ...budgetInputs, [cat.id]: e.target.value })}
                      placeholder="0"
                      className="w-36 pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-bold text-right focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 pt-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                Batal
              </button>
              <button onClick={handleSaveBudget} disabled={saving} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
