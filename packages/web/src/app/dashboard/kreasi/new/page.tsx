"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  LayoutGrid,
  Filter,
  Bell,
  Cog,
  FileText,
  Calculator,
  ArrowLeft,
  Wand2,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  Send,
  ChevronRight,
  ChevronLeft,
  Puzzle,
  Save,
  X,
  Info,
} from "lucide-react";
import { useAuth, useWorkspace, useFeatures } from "@/providers";
import { validateFeatureDefinition } from "@karsafin/shared";
import type { FeatureType } from "@karsafin/shared";
import { FeaturePreview } from "@/components/FeaturePreview";

const FEATURE_TYPE_OPTIONS: { type: FeatureType; icon: any; label: string; desc: string; examples: string; color: string }[] = [
  { type: "dashboard_widget", icon: LayoutGrid, label: "Widget Dashboard", desc: "Tampilkan informasi di halaman utama", examples: 'Contoh: "Tunjukkan total pengeluaran transportasi dalam progress bar"', color: "from-blue-500 to-blue-600" },
  { type: "smart_filter", icon: Filter, label: "Filter Cerdas", desc: "Filter transaksi tersimpan yang bisa dipakai cepat", examples: 'Contoh: "Filter semua transaksi di atas 1 juta dalam 7 hari terakhir"', color: "from-emerald-500 to-emerald-600" },
  { type: "notification_trigger", icon: Bell, label: "Notifikasi Otomatis", desc: "Dapatkan notifikasi saat kondisi terpenuhi", examples: 'Contoh: "Beri notifikasi jika budget makanan sudah 80%"', color: "from-amber-500 to-amber-600" },
  { type: "auto_rule", icon: Cog, label: "Aturan Otomatis", desc: "Aksi yang berjalan otomatis", examples: 'Contoh: "Sisihkan 10% dari setiap pemasukan ke tabungan darurat"', color: "from-purple-500 to-purple-600" },
  { type: "report_template", icon: FileText, label: "Laporan Kustom", desc: "Template laporan keuangan pribadi", examples: 'Contoh: "Buat laporan perbandingan pengeluaran bulan ini vs bulan lalu"', color: "from-rose-500 to-rose-600" },
  { type: "budget_strategy", icon: Calculator, label: "Strategi Budget", desc: "Alokasi anggaran otomatis", examples: 'Contoh: "50% kebutuhan, 30% keinginan, 20% tabungan"', color: "from-cyan-500 to-cyan-600" },
  { type: "custom_calc", icon: Calculator, label: "Kalkulasi Kustom", desc: "Rumus finansial pribadi", examples: 'Contoh: "Hitung disposable income = pemasukan - pengeluaran wajib - tabungan"', color: "from-indigo-500 to-indigo-600" },
];

export default function NewFeaturePage() {
  const router = useRouter();
  const { api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<FeatureType | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generatedDef, setGeneratedDef] = useState<any>(null);
  const [featureName, setFeatureName] = useState("");
  const [featureDesc, setFeatureDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { refresh: refreshFeatures } = useFeatures();
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    if (!selectedType || !prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setValidationErrors([]);

    try {
      const systemPrompt = `Anda adalah asisten pembuat fitur Karsafin. 
Tugas Anda mengubah deskripsi pengguna menjadi definisi fitur terstruktur JSON.
Tipe fitur: ${selectedType}
Data tersedia: transactions, budgets, savings, debts, events, categories, accounts
Operator: \$and, \$or, \$gte, \$lte, \$gt, \$lt, \$eq, \$ne, \$contains, \$in, \$nin, \$sum, \$avg, \$count, \$min, \$max

Output HANYA JSON valid tanpa teks lain. Gunakan struktur:

Untuk dashboard_widget:
{ "version": 1, "type": "dashboard_widget", "name": "...", "placement": "dashboard", "refresh": "on_focus", "query": { "from": "...", "filter": {...}, "compute": {...} }, "display": { "type": "card|progress_card|list|number_with_icon", "icon": "...", "label": "...", "color": "..." } }

Untuk smart_filter:
{ "version": 1, "type": "smart_filter", "name": "...", "query": { "from": "transactions", "filter": {...}, "sort": {...}, "limit": 50 }, "icon": "...", "color": "..." }

Untuk auto_rule:
{ "version": 1, "type": "auto_rule", "name": "...", "trigger": "on_transaction_created", "condition": {...}, "actions": [{ "type": "create_transaction|update_savings_goal|send_notification", "params": {...} }], "max_daily_executions": 30 }

Untuk notification_trigger:
{ "version": 1, "type": "notification_trigger", "name": "...", "trigger": { "event": "on_transaction_added|on_schedule|on_percentage_reached", "condition": {...} }, "action": { "type": "push_notification|in_app_alert", "title": "...", "body": "..." }, "cooldown_hours": 24 }

Untuk report_template:
{ "version": 1, "type": "report_template", "name": "...", "sections": [{ "title": "...", "type": "card|card_highlight|pie_chart|list|table", "data": {...}, "format": "currency|percentage|number" }] }

User prompt: ${prompt}`;

      const { data: completion, error: aiError } = await api.supabase.functions.invoke("generate-feature", {
        body: { 
          prompt,
          featureType: selectedType,
        },
      });

      if (aiError) {
        throw new Error(aiError.message || "Gagal menghubungi AI");
      }

      const definition = completion?.definition;
      if (!definition) {
        throw new Error("AI tidak mengembalikan definisi yang valid");
      }

      const result = validateFeatureDefinition(definition);

      if (!result.valid) {
        setValidationErrors(result.errors);
        setGeneratedDef(definition);
      } else {
        setGeneratedDef(definition);
        setFeatureName(definition.name || "");
        setValidationErrors([]);
        setStep(3);
      }
    } catch (err: any) {
      setError(err.message || "Gagal generate fitur. Coba lagi.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedDef || !selectedType) return;
    setSaving(true);
    setError(null);

    try {
      const result = validateFeatureDefinition(generatedDef);
      if (!result.valid) {
        setValidationErrors(result.errors);
        setSaving(false);
        return;
      }

      const { data, error: err } = await api.features.create({
        name: featureName || generatedDef.name || "Fitur Baru",
        description: featureDesc || generatedDef.description || "",
        feature_type: selectedType,
        definition: generatedDef,
        workspace_id: activeWorkspace?.id,
      });

      if (err) throw err;

      refreshFeatures();
      setSuccess("Fitur berhasil dibuat!");
      setTimeout(() => {
        router.push("/dashboard/kreasi");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan fitur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/kreasi"
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Langkah {step} dari 3
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">Buat Fitur Baru</h1>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step > s ? "bg-emerald-500 text-white" :
              step === s ? "bg-purple-600 text-white" :
              "bg-slate-100 text-slate-400"
            }`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            <span className={`text-xs font-semibold ${
              step >= s ? "text-slate-700" : "text-slate-400"
            }`}>
              {s === 1 ? "Pilih Tipe" : s === 2 ? "Deskripsikan" : "Simpan"}
            </span>
            {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-emerald-500" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-xs font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-600 text-xs font-semibold">
          <Check className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Step 1: Pilih Tipe Fitur */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Pilih tipe fitur yang ingin kamu buat:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURE_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedType === opt.type;
              return (
                <button
                  key={opt.type}
                  onClick={() => setSelectedType(opt.type)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-purple-500 bg-purple-50 shadow-md shadow-purple-200"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center mb-3`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 mb-1">{opt.label}</h3>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedType}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-700 transition-all cursor-pointer"
            >
              Lanjut <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Deskripsikan dengan AI */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="custom-card p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Deskripsikan Fitur yang Kamu Inginkan
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  selectedType === "dashboard_widget"
                    ? 'Contoh: "Tampilkan widget yang menunjukkan sisa budget makanan dalam bentuk progress bar"'
                    : selectedType === "smart_filter"
                    ? 'Contoh: "Filter semua transaksi di atas Rp500.000 dalam 30 hari terakhir, urutkan dari yang terbesar"'
                    : selectedType === "auto_rule"
                    ? 'Contoh: "Setiap kali ada pemasukan, sisihkan 10% ke tabungan Dana Darurat"'
                    : selectedType === "notification_trigger"
                    ? 'Contoh: "Beri notifikasi jika pengeluaran hari ini melebihi Rp1.000.000"'
                    : selectedType === "report_template"
                    ? 'Contoh: "Buat laporan yang menampilkan total aset, total hutang, dan kekayaan bersih"'
                    : "Jelaskan fitur yang kamu inginkan..."
                }
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 resize-none"
              />
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-blue-700">
                <p className="font-bold mb-0.5">Tips menulis prompt yang baik:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Sebutkan data apa yang ingin ditampilkan</li>
                  <li>Sebutkan kondisi filter (jika ada)</li>
                  <li>Sebutkan tipe tampilan yang diinginkan</li>
                  <li>Gunakan bahasa Indonesia yang natural</li>
                </ul>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs font-bold text-amber-700 mb-2">Hasil perlu diperbaiki:</p>
                <ul className="list-disc list-inside text-[11px] text-amber-600 space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {generatedDef && validationErrors.length === 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-700">Definisi fitur berhasil digenerate!</p>
                  <p className="text-[11px] text-emerald-600">Klik "Simpan" untuk melanjutkan.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Kembali
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                disabled={!generatedDef}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Eye className="h-4 w-4" /> Preview
              </button>

              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI Sedang Memproses...
                  </>
                ) : generatedDef && validationErrors.length === 0 ? (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate Ulang
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate dengan AI
                  </>
                )}
              </button>

              {generatedDef && validationErrors.length === 0 && (
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all cursor-pointer"
                >
                  Lanjut <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {showPreview && generatedDef && selectedType && (
            <div className="custom-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Preview Tampilan</h3>
                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <FeaturePreview definition={generatedDef} featureType={selectedType} featureName={featureName} />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Simpan */}
      {step === 3 && generatedDef && (
        <div className="space-y-4">
          <div className="custom-card p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Nama Fitur
              </label>
              <input
                type="text"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                placeholder="Nama fitur..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Deskripsi (Opsional)
              </label>
              <textarea
                value={featureDesc}
                onChange={(e) => setFeatureDesc(e.target.value)}
                className="w-full h-20 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 resize-none"
                placeholder="Jelaskan fitur ini..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Preview Tampilan
              </label>
              <FeaturePreview definition={generatedDef} featureType={selectedType!} featureName={featureName} />
            </div>

            {validationErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs font-bold text-red-700 mb-2">Validasi Error:</p>
                <ul className="list-disc list-inside text-[11px] text-red-600 space-y-0.5">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Kembali
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !featureName.trim()}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-8 py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Fitur
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
