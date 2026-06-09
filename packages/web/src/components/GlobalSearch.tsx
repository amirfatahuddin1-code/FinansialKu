"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  CreditCard,
  CalendarDays,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { useAuth } from "@/providers";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  href: string;
  icon: React.ReactNode;
}

function formatRupiah(amount: number) {
  return `Rp${Math.abs(amount).toLocaleString("id-ID")}`;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const { user, api } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !user || !api) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const lower = q.toLowerCase();
        const found: SearchResult[] = [];

        // Search transactions
        const txRes = await api.transactions.getAll();
        if (txRes.data) {
          txRes.data
            .filter(
              (tx: any) =>
                (tx.description || "").toLowerCase().includes(lower) ||
                (tx.category?.name || "").toLowerCase().includes(lower) ||
                (tx.account?.name || "").toLowerCase().includes(lower)
            )
            .slice(0, 5)
            .forEach((tx: any) => {
              const isIncome = tx.type === "income";
              const isSavings = tx.type === "savings";
              found.push({
                id: `tx-${tx.id}`,
                title: tx.description || tx.category?.name || "Transaksi",
                subtitle: `${tx.category?.name || ""} · ${tx.account?.name || ""} · ${formatRupiah(tx.amount)}`,
                tag: isIncome ? "Pemasukan" : isSavings ? "Tabungan" : "Pengeluaran",
                tagColor: isIncome
                  ? "bg-emerald-50 text-emerald-600"
                  : isSavings
                  ? "bg-amber-50 text-amber-600"
                  : "bg-red-50 text-red-500",
                href: "/dashboard/transactions",
                icon: isIncome ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : isSavings ? (
                  <PiggyBank className="h-4 w-4 text-amber-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-400" />
                ),
              });
            });
        }

        // Search savings goals
        const savRes = await api.savings.getAll();
        if (savRes.data) {
          savRes.data
            .filter((s: any) => (s.name || "").toLowerCase().includes(lower))
            .slice(0, 3)
            .forEach((s: any) => {
              found.push({
                id: `sav-${s.id}`,
                title: s.name,
                subtitle: `${formatRupiah(s.current)} / ${formatRupiah(s.target)}`,
                tag: "Target Tabungan",
                tagColor: "bg-blue-50 text-blue-600",
                href: "/dashboard/planning/savings",
                icon: <PiggyBank className="h-4 w-4 text-blue-500" />,
              });
            });
        }

        // Search debts
        try {
          const debtRes = await api.debts.getAll(user.id);
          if (debtRes?.data) {
            debtRes.data
              .filter(
                (d: any) =>
                  (d.name || d.description || "").toLowerCase().includes(lower) ||
                  (d.contact_name || "").toLowerCase().includes(lower)
              )
              .slice(0, 3)
              .forEach((d: any) => {
                found.push({
                  id: `debt-${d.id}`,
                  title: d.name || d.description || "Hutang Piutang",
                  subtitle: `${d.contact_name || ""} · ${formatRupiah(d.amount)}`,
                  tag: d.type === "receivable" ? "Piutang" : "Hutang",
                  tagColor:
                    d.type === "receivable"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500",
                  href: "/dashboard/debts",
                  icon: <CreditCard className="h-4 w-4 text-slate-500" />,
                });
              });
          }
        } catch {}

        // Search events
        try {
          const evRes = await api.events.getAll();
          if (evRes?.data) {
            evRes.data
              .filter((e: any) => (e.name || "").toLowerCase().includes(lower))
              .slice(0, 3)
              .forEach((e: any) => {
                found.push({
                  id: `ev-${e.id}`,
                  title: e.name,
                  subtitle: e.description || e.status || "Acara",
                  tag: "Acara",
                  tagColor: "bg-purple-50 text-purple-600",
                  href: `/dashboard/planning/events/${e.id}`,
                  icon: <CalendarDays className="h-4 w-4 text-purple-500" />,
                });
              });
          }
        } catch {}

        setResults(found);
        setSelectedIdx(0);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    },
    [user, api]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      handleSelect(results[selectedIdx]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isClient || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Input Row */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          {loading ? (
            <Loader2 className="h-5 w-5 text-slate-400 shrink-0 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-slate-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari transaksi, tabungan, hutang, acara..."
            className="flex-1 text-sm font-medium text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd
            onClick={onClose}
            className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-slate-200 transition-colors select-none"
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[380px] overflow-y-auto py-2">
            {results.map((result, idx) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`w-full px-5 py-3.5 flex items-center gap-3.5 text-left transition-colors cursor-pointer border-none ${
                  selectedIdx === idx ? "bg-blue-50/60" : "hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedIdx === idx ? "bg-white shadow-sm" : "bg-slate-100"
                  }`}
                >
                  {result.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {result.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {result.subtitle}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-xl shrink-0 ${result.tagColor}`}
                >
                  {result.tag}
                </span>
                {selectedIdx === idx && (
                  <CornerDownLeft className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query.trim() && !loading && results.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm font-bold text-slate-400">
              Tidak ada hasil untuk &quot;{query}&quot;
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Coba kata kunci lain
            </p>
          </div>
        )}

        {/* Idle hint */}
        {!query.trim() && (
          <div className="py-8 px-5 text-center space-y-1">
            <p className="text-xs text-slate-400 font-medium">
              Ketik untuk mencari transaksi, target tabungan, hutang/piutang, atau acara
            </p>
            <div className="flex items-center justify-center gap-4 mt-3">
              {[
                { label: "Transaksi", color: "bg-blue-50 text-blue-600" },
                { label: "Tabungan", color: "bg-amber-50 text-amber-600" },
                { label: "Hutang", color: "bg-red-50 text-red-500" },
                { label: "Acara", color: "bg-purple-50 text-purple-600" },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${item.color}`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-2.5 flex items-center gap-4 text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-bold">↑↓</kbd>
              navigasi
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-bold">↵</kbd>
              buka
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-bold">Esc</kbd>
              tutup
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
