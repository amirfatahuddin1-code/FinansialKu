"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { useAuth, useWorkspace } from "@/providers";
import {
  computeAllAchievements,
  ACHIEVEMENT_CATEGORIES,
  type AchievementsSummary,
} from "@karsafin/shared";

export default function PencapaianPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [summary, setSummary] = useState<AchievementsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user || !activeWorkspace) return;
    setLoading(true);
    try {
      // Load transactions
      const txRes = await api.transactions.getAll();
      const transactions = txRes.data || [];

      // Load budgets for the last 12 months
      const now = new Date();
      const budgetPromises = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        budgetPromises.push(
          api.budgets.getByMonth(d.getFullYear(), d.getMonth() + 1)
        );
      }
      const budgetResults = await Promise.all(budgetPromises);
      const allBudgets = budgetResults.flatMap((r) => r.data || []);

      // Compute achievements
      const result = computeAllAchievements(transactions, allBudgets);
      setSummary(result);
    } catch (err) {
      console.error("Gagal memuat data pencapaian:", err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace, api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Memuat pencapaian...</p>
      </div>
    );
  }

  const s = summary ?? {
    totalAchievements: 12,
    unlockedCount: 0,
    percentage: 0,
    recordingStreak: { current: 0, best: 0 },
    noSpendStreak: { current: 0, best: 0 },
    totalTransactions: 0,
    achievements: [],
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* ── Header ── */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Pencapaian</h1>
        </div>

        {/* ── Hero Card ── */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 shadow-lg">
          <div className="flex flex-col items-center text-center">
            <span className="mb-2 text-5xl">🏆</span>
            <p className="text-4xl font-extrabold text-white">
              {s.unlockedCount}{" "}
              <span className="text-2xl font-semibold text-emerald-100">
                / {s.totalAchievements}
              </span>
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-100">
              Pencapaian Terbuka
            </p>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-700"
                style={{ width: `${s.percentage}%` }}
              />
            </div>

            {/* Chips */}
            <div className="mt-4 flex gap-3">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                🔥 {s.recordingStreak.current}h streak
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                📝 {s.totalTransactions} txns
              </span>
            </div>
          </div>
        </div>

        {/* ── Streak Saat Ini ── */}
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-slate-800">
            🔥 Streak Saat Ini
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Recording streak */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                Pencatatan
              </p>
              <p className="text-3xl font-extrabold text-amber-600">
                {s.recordingStreak.current}
                <span className="ml-1 text-base font-semibold text-amber-400">
                  hari
                </span>
              </p>
              <p className="mt-1 text-xs text-amber-500">
                Terbaik: {s.recordingStreak.best} hari
              </p>
            </div>

            {/* No-spend streak */}
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                Tanpa Belanja
              </p>
              <p className="text-3xl font-extrabold text-teal-600">
                {s.noSpendStreak.current}
                <span className="ml-1 text-base font-semibold text-teal-400">
                  hari
                </span>
              </p>
              <p className="mt-1 text-xs text-teal-500">
                Terbaik: {s.noSpendStreak.best} hari
              </p>
            </div>
          </div>
        </div>

        {/* ── Achievement Categories ── */}
        {ACHIEVEMENT_CATEGORIES.map((cat: any) => {
          const items = s.achievements.filter(
            (a: any) => a.definition.category === cat.key
          );
          const unlockedInCat = items.filter((a: any) => a.unlocked).length;

          return (
            <div key={cat.key} className="mb-8">
              {/* Category header */}
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">{cat.icon}</span>
                <h2 className="text-lg font-bold text-slate-800">
                  {cat.label}
                </h2>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {unlockedInCat}/{items.length}
                </span>
              </div>

              {/* Achievement cards */}
              <div className="flex flex-col gap-3">
                {items.map((ach: any) => {
                  const pct =
                    ach.definition.target > 0
                      ? Math.round(
                          (ach.current / ach.definition.target) * 100
                        )
                      : 0;

                  return (
                    <div
                      key={ach.definition.id}
                      className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors ${
                        ach.unlocked
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-100 bg-white"
                      }`}
                    >
                      {/* Icon */}
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-xl ${
                          ach.unlocked
                            ? "bg-emerald-100"
                            : "bg-slate-100"
                        }`}
                      >
                        {ach.unlocked ? (
                          <span>{ach.definition.icon}</span>
                        ) : (
                          <Lock className="h-5 w-5 text-slate-400" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-semibold ${
                              ach.unlocked
                                ? "text-emerald-800"
                                : "text-slate-700"
                            }`}
                          >
                            {ach.definition.name}
                          </p>
                          {ach.unlocked && (
                            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              ✅ Terbuka
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-0.5 text-xs ${
                            ach.unlocked
                              ? "text-emerald-600"
                              : "text-slate-500"
                          }`}
                        >
                          {ach.definition.description}
                        </p>

                        {/* Progress bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                ach.unlocked
                                  ? "bg-emerald-500"
                                  : "bg-blue-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-semibold ${
                              ach.unlocked
                                ? "text-emerald-600"
                                : "text-slate-500"
                            }`}
                          >
                            {ach.current}/{ach.definition.target}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
