"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Check,
  ToggleLeft,
  ToggleRight,
  Trash2,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  FileText,
  Clock,
  Bug,
  LayoutGrid,
  Filter,
  Bell,
  Cog,
  Calculator,
  Puzzle,
} from "lucide-react";
import { useAuth } from "@/providers";
import { validateFeatureDefinition } from "@karsafin/shared";
import type { UserFeature, FeatureError } from "@karsafin/shared";
import { WidgetRenderer } from "@/app/dashboard/features/widget-renderer";
import { FilterRenderer } from "@/app/dashboard/features/filter-renderer";
import { ReportRenderer } from "@/app/dashboard/features/report-renderer";

const FEATURE_TYPE_ICONS: Record<string, any> = {
  dashboard_widget: LayoutGrid,
  smart_filter: Filter,
  notification_trigger: Bell,
  auto_rule: Cog,
  report_template: FileText,
  budget_strategy: Calculator,
  custom_calc: Calculator,
};

export default function FeatureDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { api } = useAuth();
  const [feature, setFeature] = useState<UserFeature | null>(null);
  const [errors, setErrors] = useState<FeatureError[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "errors" | "preview">("detail");
  const [editDef, setEditDef] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const loadFeature = useCallback(async () => {
    if (!params?.id) return;
    setLoading(true);
    try {
      const [featRes, errRes] = await Promise.all([
        api.features.getById(params.id as string),
        api.features.getErrors(params.id as string),
      ]);
      if (featRes.error) throw featRes.error;
      if (!featRes.data) {
        setError("Fitur tidak ditemukan");
        return;
      }
      setFeature(featRes.data);
      setEditDef(JSON.stringify(featRes.data.definition, null, 2));
      setEditName(featRes.data.name);
      setEditDesc(featRes.data.description || "");
      setErrors(errRes.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat fitur");
    } finally {
      setLoading(false);
    }
  }, [params?.id, api]);

  useEffect(() => { loadFeature(); }, [loadFeature]);

  const handleToggle = async () => {
    if (!feature) return;
    const { error: err } = await api.features.toggle(feature.id, !feature.is_enabled);
    if (err) { setError("Gagal mengubah status"); return; }
    setFeature({ ...feature, is_enabled: !feature.is_enabled });
    setSuccess(`Fitur ${feature.is_enabled ? "dinonaktifkan" : "diaktifkan"}`);
  };

  const handleSave = async () => {
    if (!feature) return;
    setSaving(true);
    setError(null);
    try {
      let parsedDef: any;
      try {
        parsedDef = JSON.parse(editDef);
      } catch {
        setError("JSON definisi tidak valid");
        setSaving(false);
        return;
      }
      const result = validateFeatureDefinition(parsedDef);
      if (!result.valid) {
        setError("Validasi gagal: " + result.errors.join(", "));
        setSaving(false);
        return;
      }
      const { error: err } = await api.features.update(feature.id, {
        name: editName,
        description: editDesc,
        definition: parsedDef,
      });
      if (err) throw err;
      setSuccess("Fitur berhasil diperbarui!");
      setFeature({ ...feature, name: editName, description: editDesc, definition: parsedDef });
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!feature) return;
    if (!window.confirm(`Hapus fitur "${feature.name}"?`)) return;
    const { error: err } = await api.features.delete(feature.id);
    if (err) { setError("Gagal menghapus"); return; }
    router.push("/dashboard/kreasi");
  };

  const handleClearErrors = async () => {
    if (!feature) return;
    await api.features.clearErrors(feature.id);
    setErrors([]);
    setFeature({ ...feature, error_count: 0, last_error: undefined });
    setSuccess("Error log dibersihkan");
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error && !feature) {
    return (
      <div className="custom-card p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-sm font-bold text-slate-700">{error}</p>
        <Link href="/dashboard/kreasi" className="text-purple-600 text-sm font-semibold hover:underline mt-4 inline-block">Kembali</Link>
      </div>
    );
  }

  if (!feature) return null;

  const Icon = FEATURE_TYPE_ICONS[feature.feature_type] || Puzzle;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/kreasi" className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${feature.is_enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
              {feature.is_enabled ? "Aktif" : "Nonaktif"}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{feature.feature_type.replace("_", " ")}</span>
            <span className="text-[10px] font-bold text-slate-400">v{feature.version}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">{feature.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleToggle} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${feature.is_enabled ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}>
            {feature.is_enabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {feature.is_enabled ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer">
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
        {[
          { id: "detail" as const, label: "Detail", icon: FileText },
          { id: "errors" as const, label: "Error Log", icon: Bug },
          { id: "preview" as const, label: "Preview", icon: Eye },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab.id ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <TabIcon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "detail" && (
        <div className="space-y-4">
          <div className="custom-card p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Fitur</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Deskripsi</label>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full h-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Definisi (JSON)</label>
              <textarea value={editDef} onChange={(e) => setEditDef(e.target.value)} className="w-full h-64 p-3 bg-slate-900 text-slate-100 border border-slate-700 rounded-xl text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <Clock className="h-3.5 w-3.5" /> Dibuat: {new Date(feature.created_at).toLocaleString("id-ID")}
              {feature.updated_at && <><span>·</span> Diperbarui: {new Date(feature.updated_at).toLocaleString("id-ID")}</>}
            </div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-purple-700 transition-all disabled:opacity-50 cursor-pointer">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}

      {activeTab === "errors" && (
        <div className="custom-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">Error Log</h3>
              <p className="text-xs text-slate-500">{errors.length} error tercatat · {feature.error_count} total error</p>
            </div>
            {errors.length > 0 && (
              <button onClick={handleClearErrors} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                <RefreshCw className="h-3.5 w-3.5" /> Bersihkan
              </button>
            )}
          </div>
          {errors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">Belum ada error tercatat</div>
          ) : (
            <div className="space-y-2">
              {errors.map((err) => (
                <div key={err.id} className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-700">{err.error_message || "Unknown error"}</p>
                      <p className="text-[10px] text-red-500 mt-1">{new Date(err.created_at).toLocaleString("id-ID")}</p>
                      {err.error_stack && <pre className="text-[10px] text-red-400 mt-2 max-h-20 overflow-y-auto">{err.error_stack}</pre>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "preview" && (
        <PreviewTab feature={feature} />
      )}
    </div>
  );
}

function PreviewTab({ feature }: { feature: UserFeature }) {
  const def = feature.definition as any;

  const fakeFeature: UserFeature = {
    ...feature,
    definition: feature.definition,
  };

  const previewWrapper = (children: React.ReactNode) => (
    <div className="custom-card p-6">
      <h3 className="font-bold text-slate-800 mb-4">Preview</h3>
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        {children}
      </div>
      <details className="mt-4">
        <summary className="text-xs font-bold text-slate-400 cursor-pointer hover:text-slate-600">Lihat definisi JSON</summary>
        <pre className="mt-2 bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono leading-relaxed">
          {JSON.stringify(feature.definition, null, 2)}
        </pre>
      </details>
    </div>
  );

  switch (feature.feature_type) {
    case "dashboard_widget":
      return previewWrapper(
        <div className="max-w-sm mx-auto">
          <WidgetRenderer feature={fakeFeature} onError={() => {}} data={[]} />
        </div>
      );

    case "smart_filter":
      return previewWrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Filter Cerdas</p>
          <p className="text-sm font-bold text-slate-800">{(def as any)?.name || feature.name}</p>
          {def.query && (
            <p className="text-xs text-slate-500 mt-2">Sumber: {(def.query as any)?.from || "N/A"}</p>
          )}
        </div>
      );

    case "notification_trigger": {
      const action = def.action as any || {};
      const trigger = def.trigger as any || {};
      return previewWrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 text-lg">🔔</div>
            <div>
              <p className="text-sm font-bold text-slate-800">{action?.title || feature.name}</p>
              <p className="text-[10px] text-slate-400">Trigger: {trigger?.event || "N/A"}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">{action?.body || ""}</p>
          {def.cooldown_hours && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Clock className="h-3 w-3" /> Cooldown: {String(def.cooldown_hours)} jam
            </div>
          )}
        </div>
      );
    }

    case "auto_rule": {
      const actions = def.actions as any[] || [];
      return previewWrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Cog className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-bold text-slate-800">{feature.name}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Trigger</p>
            <p className="text-xs text-slate-700 mt-0.5">{String(def.trigger || "N/A")}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Actions</p>
            {actions.map((action, i) => (
              <p key={i} className="text-xs text-slate-600 mt-0.5">• {action.type || "N/A"}</p>
            ))}
          </div>
          {def.max_daily_executions && (
            <p className="text-[10px] text-slate-400">Max {String(def.max_daily_executions)} eksekusi/hari</p>
          )}
        </div>
      );
    }

    case "report_template":
      return previewWrapper(
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase">{feature.name}</p>
          <ReportRenderer feature={fakeFeature} onError={() => {}} data={[]} />
        </div>
      );

    case "budget_strategy": {
      const allocation = def.allocation as any[] || [];
      return previewWrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-cyan-600" />
            <p className="text-sm font-bold text-slate-800">{feature.name}</p>
          </div>
          {allocation.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Belum ada alokasi</p>
          )}
          {allocation.map((alloc, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-700">{alloc.category || alloc.name || "Kategori"}</span>
                <span className="text-slate-500">{alloc.percentage || 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${alloc.percentage || 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "custom_calc": {
      const formula = def.formula as any || {};
      return previewWrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-bold text-slate-800">{feature.name}</p>
          </div>
          {formula && typeof formula === "object" && Object.keys(formula).length > 0 && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Formula</p>
              <pre className="text-xs font-mono text-indigo-700">{JSON.stringify(formula)}</pre>
            </div>
          )}
          <p className="text-xs text-slate-500">Data source: {(def.dataSource as any)?.from || "N/A"}</p>
          <p className="text-xs text-slate-500">Format: {def.format as string || "number"}</p>
        </div>
      );
    }

    default:
      return previewWrapper(
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono leading-relaxed">
          {JSON.stringify(feature.definition, null, 2)}
        </pre>
      );
  }
}
