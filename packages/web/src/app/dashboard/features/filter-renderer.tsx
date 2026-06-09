"use client";

import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import type { UserFeature, FilterDefinition } from "@karsafin/shared";

interface FilterRendererProps {
  features: UserFeature[];
  onApplyFilter: (feature: UserFeature) => void;
}

export function FilterRenderer({ features, onApplyFilter }: FilterRendererProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  if (features.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
      >
        <Filter className="h-3.5 w-3.5" />
        Filter Tersimpan
        <ChevronDown className="h-3 w-3" />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 py-2">
            <div className="px-4 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
              Filter Kreasimu
            </div>
            {features.map((feature) => {
              const def = feature.definition as FilterDefinition;
              return (
                <button
                  key={feature.id}
                  onClick={() => {
                    onApplyFilter(feature);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <span className="text-lg">{def.icon || "📌"}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{feature.name}</p>
                    <p className="text-[10px] text-slate-400">{feature.description || def.query.from}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
