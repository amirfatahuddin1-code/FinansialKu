"use client";

import React from "react";
import { Cog, Calculator, Clock } from "lucide-react";
import type { BaseFeatureDefinition } from "@karsafin/shared";

export function FeaturePreview({
  definition,
  featureType,
  featureName,
}: {
  definition: BaseFeatureDefinition;
  featureType: string;
  featureName?: string;
}) {
  const def = definition as any;

  const wrapper = (children: React.ReactNode) => (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
      {children}
    </div>
  );

  switch (featureType) {
    case "dashboard_widget": {
      const disp = def.display || {};
      const icon = disp.icon || "📊";
      const label = disp.label || def.name || featureName || "Widget";
      const queryFrom = def.query?.from || "N/A";
      return wrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-4 p-4 border-b border-slate-100">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl`} style={{ backgroundColor: (disp.color || "#6366f1") + "20" }}>
              {icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-black text-slate-800">Rp 0</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Sumber data</span>
              <span className="font-bold text-slate-700">{queryFrom}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Tipe tampilan</span>
              <span className="font-bold text-slate-700">{disp.type || "N/A"}</span>
            </div>
            {disp.type === "progress_card" && (
              <div className="pt-2">
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: "65%" }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Terpakai: Rp 0</span>
                  <span>Sisa: Rp 0</span>
                </div>
              </div>
            )}
            {disp.type === "list" && (
              <p className="text-xs text-slate-400 text-center py-3">Menampilkan data dari {queryFrom}</p>
            )}
          </div>
        </div>
      );
    }

    case "smart_filter":
      return wrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-lg">📌</div>
            <div>
              <p className="text-sm font-bold text-slate-800">{def.name || featureName || "Filter Cerdas"}</p>
              <p className="text-[10px] text-slate-400">Filter transaksi</p>
            </div>
          </div>
          {def.query?.from && (
            <p className="text-xs text-slate-500">Sumber: <span className="font-bold">{def.query.from}</span></p>
          )}
          {def.query?.filter && Object.keys(def.query.filter).length > 0 && (
            <p className="text-xs text-slate-500 mt-1">Kondisi: {Object.keys(def.query.filter).join(", ")}</p>
          )}
          {def.query?.limit && (
            <p className="text-xs text-slate-500 mt-1">Limit: {def.query.limit} data</p>
          )}
        </div>
      );

    case "notification_trigger": {
      const action = def.action || {};
      const trigger = def.trigger || {};
      return wrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 text-lg">🔔</div>
            <div>
              <p className="text-sm font-bold text-slate-800">{action.title || def.name || featureName || "Notifikasi"}</p>
              <p className="text-[10px] text-slate-400">Trigger: {trigger.event || "N/A"}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">{action.body || ""}</p>
          {def.cooldown_hours && (
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Clock className="h-3 w-3" /> Cooldown: {def.cooldown_hours} jam
            </div>
          )}
        </div>
      );
    }

    case "auto_rule": {
      const actions = def.actions || [];
      return wrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Cog className="h-4 w-4 text-purple-600" />
            <p className="text-sm font-bold text-slate-800">{def.name || featureName || "Aturan Otomatis"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Trigger</p>
            <p className="text-xs text-slate-700 mt-0.5">{def.trigger || "N/A"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Actions</p>
            {actions.map((a: any, i: number) => (
              <p key={i} className="text-xs text-slate-600 mt-0.5">• {a.type || "N/A"}</p>
            ))}
            {actions.length === 0 && <p className="text-xs text-slate-400 mt-0.5">Tidak ada action</p>}
          </div>
          {def.max_daily_executions && (
            <p className="text-[10px] text-slate-400">Max {def.max_daily_executions} eksekusi/hari</p>
          )}
        </div>
      );
    }

    case "report_template": {
      const sections = def.sections || [];
      return wrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <p className="text-sm font-bold text-slate-800">{def.name || featureName || "Laporan"}</p>
          </div>
          <p className="text-xs text-slate-500">{sections.length} section{sections.length !== 1 ? "s" : ""}</p>
          <div className="space-y-2">
            {sections.slice(0, 3).map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                <span className="text-xs font-semibold text-slate-700">{s.title || "Section " + (i + 1)}</span>
                <span className="text-[10px] text-slate-400">{s.type || "N/A"}</span>
              </div>
            ))}
            {sections.length > 3 && (
              <p className="text-[10px] text-slate-400 text-center">+{sections.length - 3} section lainnya</p>
            )}
          </div>
        </div>
      );
    }

    case "budget_strategy": {
      const allocation = def.allocation || [];
      return wrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-cyan-600" />
            <p className="text-sm font-bold text-slate-800">{def.name || featureName || "Strategi Budget"}</p>
          </div>
          {allocation.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Belum ada alokasi</p>
          )}
          {allocation.map((a: any, i: number) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-700">{a.category_name || a.name || "Kategori"}</span>
                <span className="text-slate-500">{a.value || a.percentage || 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${a.value || a.percentage || 0}%` }} />
              </div>
            </div>
          ))}
          {def.period && <p className="text-[10px] text-slate-400">Periode: {def.period}</p>}
        </div>
      );
    }

    case "custom_calc": {
      return wrapper(
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-bold text-slate-800">{def.name || featureName || "Kalkulasi Kustom"}</p>
          </div>
          {def.formula && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Formula</p>
              <pre className="text-xs font-mono text-indigo-700">{typeof def.formula === "object" ? JSON.stringify(def.formula) : def.formula}</pre>
            </div>
          )}
          <p className="text-xs text-slate-500">Sumber: {def.dataSource?.from || "N/A"}</p>
          <p className="text-xs text-slate-500">Format: {def.format || "number"}</p>
        </div>
      );
    }

    default:
      return wrapper(
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono">
          {JSON.stringify(definition, null, 2)}
        </pre>
      );
  }
}
