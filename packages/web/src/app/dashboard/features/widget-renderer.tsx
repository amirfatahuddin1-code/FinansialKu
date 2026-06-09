"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/providers";
import { executeQuery } from "@karsafin/shared";
import type { UserFeature, WidgetDefinition } from "@karsafin/shared";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";

interface WidgetRendererProps {
  feature: UserFeature;
  onError: (featureId: string, error: Error) => void;
  data: Record<string, unknown>[];
}

function WidgetCard({ definition, data }: { definition: WidgetDefinition; data: Record<string, unknown>[] }) {
  const disp = definition.display;
  const queryResult = executeQuery(data, definition.query);

  if (queryResult.error) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
        <p className="text-xs font-bold text-red-600">Error: {queryResult.error}</p>
      </div>
    );
  }

  const resultData = queryResult.result as Record<string, unknown>[];
  const firstRow = resultData[0] || {};
  const value = (firstRow as any)._aggregate ?? resultData.length;
  const isCurrency = definition.display.format === "currency" || typeof value === "number";

  const formatValue = (val: unknown): string => {
    if (typeof val === "number") {
      if (isCurrency) {
        return new Intl.NumberFormat("id-ID").format(Math.round(val));
      }
      return val.toLocaleString("id-ID");
    }
    return String(val ?? 0);
  };

  if (disp.type === "number_with_icon" || disp.type === "card") {
    return (
      <div className="flex items-center gap-4 p-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl`} style={{ backgroundColor: disp.color + "20" }}>
          {disp.icon || "📊"}
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{disp.label}</p>
          <p className="text-xl font-black text-slate-800">Rp {formatValue(value)}</p>
        </div>
      </div>
    );
  }

  if (disp.type === "progress_card") {
    const r = firstRow as Record<string, unknown>;
    const findVal = (keys: string[]): number => {
      for (const key of keys) {
        const found = Object.entries(r).find(([k]) => k.toLowerCase().includes(key));
        if (found && typeof found[1] === "number") return found[1] as number;
      }
      return 0;
    };
    const spent = findVal(["spent", "total", "used", "actual"]) || (r._aggregate as number) || 0;
    const budget = findVal(["budget", "target", "limit", "max", "goal"]) || spent * 2 || 1;
    const remaining = budget - spent;
    const percent = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
    const isOverBudget = spent > budget;

    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{disp.icon || "📊"}</span>
            <span className="text-xs font-bold text-slate-700">{disp.label}</span>
          </div>
          <span className={`text-xs font-extrabold ${isOverBudget ? "text-red-600" : "text-emerald-600"}`}>
            {percent}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-slate-400">
          <span>Terpakai: Rp {formatValue(spent)}</span>
          <span>Sisa: Rp {formatValue(Math.max(remaining, 0))}</span>
        </div>
      </div>
    );
  }

  if (disp.type === "list") {
    return (
      <div className="divide-y divide-slate-50">
        {resultData.slice(0, 5).map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-xs font-semibold text-slate-700">{item.name || item._groupKey || `Item ${i + 1}`}</span>
            <span className="text-xs font-extrabold text-slate-800">Rp {formatValue(item._aggregate || item.amount || item.value || 0)}</span>
          </div>
        ))}
        {resultData.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Tidak ada data</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 text-center">
      <p className="text-2xl font-black text-slate-800">{formatValue(value)}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-1">{disp.label}</p>
    </div>
  );
}

export function WidgetRenderer({ feature, onError, data }: WidgetRendererProps) {
  const definition = feature.definition as WidgetDefinition;
  const queryFrom = definition.query?.from;
  const filteredData = queryFrom
    ? data.filter((d) => (d as any)._source === queryFrom)
    : data;

  return (
    <FeatureErrorBoundary featureId={feature.id} featureName={feature.name} onError={onError}>
      <div className={`custom-card overflow-hidden transition-all hover:shadow-md ${!feature.is_enabled ? "opacity-60" : ""}`}>
        <WidgetCard definition={definition} data={filteredData} />
      </div>
    </FeatureErrorBoundary>
  );
}
