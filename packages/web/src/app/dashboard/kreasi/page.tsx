"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  LayoutGrid,
  Filter,
  Bell,
  Cog,
  FileText,
  Calculator,
  Plus,
  RefreshCw,
  ChevronRight,
  Loader2,
  AlertCircle,
  EyeOff,
  Eye,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Puzzle,
  Info,
} from "lucide-react";
import { useAuth } from "@/providers";
import { useWorkspace } from "@/providers";
import type { UserFeature, FeatureType } from "@karsafin/shared";

const FEATURE_TYPE_CONFIG: Record<FeatureType, { icon: any; label: string; desc: string; color: string }> = {
  dashboard_widget: { icon: LayoutGrid, label: "Widget Dashboard", desc: "Kartu informasi di halaman utama", color: "text-blue-600 bg-blue-50" },
  smart_filter: { icon: Filter, label: "Filter Cerdas", desc: "Filter transaksi tersimpan", color: "text-emerald-600 bg-emerald-50" },
  notification_trigger: { icon: Bell, label: "Notifikasi", desc: "Peringatan otomatis", color: "text-amber-600 bg-amber-50" },
  auto_rule: { icon: Cog, label: "Aturan Otomatis", desc: "Aksi otomatis berdasarkan transaksi", color: "text-purple-600 bg-purple-50" },
  report_template: { icon: FileText, label: "Laporan Kustom", desc: "Template laporan keuangan", color: "text-rose-600 bg-rose-50" },
  budget_strategy: { icon: Calculator, label: "Strategi Budget", desc: "Alokasi anggaran cerdas", color: "text-cyan-600 bg-cyan-50" },
  custom_calc: { icon: Calculator, label: "Kalkulasi Kustom", desc: "Rumus finansial pribadi", color: "text-indigo-600 bg-indigo-50" },
};

export default function KreasiPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [features, setFeatures] = useState<UserFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadFeatures = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await api.features.getAll(activeWorkspace?.id);
      if (err) throw err;
      setFeatures(data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat fitur");
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace, api]);

  useEffect(() => { loadFeatures(); }, [loadFeatures]);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    const { error: err } = await api.features.toggle(id, !currentEnabled);
    if (err) {
      setError("Gagal mengubah status fitur");
      return;
    }
    setFeatures((prev) => prev.map((f) => f.id === id ? { ...f, is_enabled: !currentEnabled } : f));
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error: err } = await api.features.delete(id);
    if (err) {
      setError("Gagal menghapus fitur");
      setDeletingId(null);
      return;
    }
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    setDeletingId(null);
  };

  const featureCount = features.length;
  const enabledCount = features.filter((f) => f.is_enabled).length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Puzzle className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Kreasi User</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
            Fitur Kreasimu
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            Buat fitur keuangan kustom dengan bantuan AI. Tanpa coding, tanpa ribet.
          </p>
        </div>
        <Link
          href="/dashboard/kreasi/new"
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          Buat Fitur Baru
        </Link>
      </section>

      {featureCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="custom-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Puzzle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{featureCount}</p>
              <p className="text-xs font-medium text-slate-500">Total Fitur</p>
            </div>
          </div>
          <div className="custom-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Eye className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{enabledCount}</p>
              <p className="text-xs font-medium text-slate-500">Fitur Aktif</p>
            </div>
          </div>
          <div className="custom-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{featureCount - enabledCount}</p>
              <p className="text-xs font-medium text-slate-500">Fitur Nonaktif</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="custom-card p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full mb-3" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : features.length === 0 ? (
        <div className="custom-card p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="h-10 w-10 text-purple-400" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Belum Ada Fitur Kustom</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Gunakan AI untuk membuat fitur keuangan sesuai kebutuhanmu. 
            Cukup deskripsikan apa yang kamu inginkan, dan AI akan membuatkannya.
          </p>
          <Link
            href="/dashboard/kreasi/new"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Buat Fitur Pertama
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => {
            const config = FEATURE_TYPE_CONFIG[feature.feature_type];
            const Icon = config?.icon || Puzzle;
            const hasError = feature.error_count > 0;

            return (
              <div
                key={feature.id}
                className={`custom-card p-6 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  !feature.is_enabled ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config?.color || "bg-slate-100 text-slate-600"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{feature.name}</h3>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {config?.label || feature.feature_type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasError && (
                      <div className="relative group">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <div className="absolute right-0 top-6 w-48 bg-red-50 border border-red-100 rounded-xl p-2 text-[10px] text-red-600 hidden group-hover:block z-10 shadow-lg">
                          Error terakhir: {feature.last_error || "Unknown error"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {feature.description && (
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{feature.description}</p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-4">
                  <span>v{feature.version}</span>
                  <span>{new Date(feature.updated_at || feature.created_at).toLocaleDateString("id-ID")}</span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleToggle(feature.id, feature.is_enabled)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      feature.is_enabled
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {feature.is_enabled ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    {feature.is_enabled ? "Aktif" : "Nonaktif"}
                  </button>

                  <Link
                    href={`/dashboard/kreasi/${feature.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Info className="h-3.5 w-3.5" />
                    Detail
                  </Link>

                  <button
                    onClick={() => {
                      if (window.confirm(`Hapus fitur "${feature.name}"?`)) {
                        handleDelete(feature.id);
                      }
                    }}
                    disabled={deletingId === feature.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors ml-auto cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === feature.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
