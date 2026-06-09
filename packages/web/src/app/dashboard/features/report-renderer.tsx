"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { useAuth } from "@/providers";
import { executeQuery } from "@karsafin/shared";
import type { UserFeature, ReportTemplateDefinition } from "@karsafin/shared";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";

interface ReportRendererProps {
  feature: UserFeature;
  onError: (featureId: string, error: Error) => void;
  data: Record<string, unknown>[];
}

function ReportSection({ section, data }: { section: ReportTemplateDefinition["sections"][0]; data: Record<string, unknown>[] }) {
  const formatVal = (val: unknown): string => {
    if (typeof val === "number") {
      if (section.format === "currency") {
        return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(val))}`;
      }
      if (section.format === "percentage") {
        return `${Math.round(val)}%`;
      }
      return val.toLocaleString("id-ID");
    }
    return String(val ?? "-");
  };

  if (section.type === "card" || section.type === "card_highlight") {
    const result = "from" in section.data ? executeQuery(data, section.data as any) : { result: [] };
    const resultData = (result.result || []) as Record<string, unknown>[];
    const value = (resultData[0] as any)?._aggregate ?? 0;

    return (
      <div className={`p-5 rounded-2xl border ${section.type === "card_highlight" ? "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100" : "bg-white border-slate-100"}`}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{section.title}</p>
        <p className={`text-2xl font-black ${section.type === "card_highlight" ? "text-purple-700" : "text-slate-800"}`}>
          {formatVal(value)}
        </p>
      </div>
    );
  }

  if (section.type === "list") {
    const result = "from" in section.data ? executeQuery(data, section.data as any) : { result: [] };
    const items = result.result as Record<string, unknown>[];

    return (
      <div className="p-5 bg-white border border-slate-100 rounded-2xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{section.title}</p>
        <div className="divide-y divide-slate-50">
          {items.slice(0, 10).map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className="text-xs font-semibold text-slate-700">{String(item.name || item._groupKey || `Item ${i + 1}`)}</span>
              <span className="text-xs font-extrabold text-slate-800">{formatVal(item._aggregate || item.amount || item.value || 0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === "table") {
    const result = "from" in section.data ? executeQuery(data, section.data as any) : { result: [] };
    const rows = result.result as Record<string, unknown>[];

    if (rows.length === 0) {
      return (
        <div className="p-5 bg-white border border-slate-100 rounded-2xl text-center text-xs text-slate-400">
          Tidak ada data
        </div>
      );
    }

    const columns = Object.keys(rows[0]);

    return (
      <div className="p-5 bg-white border border-slate-100 rounded-2xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">{section.title}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                {columns.map((col) => (
                  <th key={col} className="text-left py-2 px-3 font-bold text-slate-500">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {columns.map((col) => (
                    <td key={col} className="py-2 px-3 text-slate-700">{formatVal(row[col])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
}

export function ReportRenderer({ feature, onError, data }: ReportRendererProps) {
  const definition = feature.definition as ReportTemplateDefinition;

  return (
    <FeatureErrorBoundary featureId={feature.id} featureName={feature.name} onError={onError}>
      <div className="custom-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{feature.name}</h3>
            {feature.description && (
              <p className="text-[11px] text-slate-500">{feature.description}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {definition.sections.map((section, i) => (
            <ReportSection key={i} section={section} data={data} />
          ))}
        </div>
      </div>
    </FeatureErrorBoundary>
  );
}
