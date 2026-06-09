"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Plus,
  Shield,
  Home,
  Plane,
  GraduationCap,
  TrendingUp,
  Calendar,
  Loader2,
  Trash2,
  X,
  PlusCircle,
  ArrowRightLeft,
  Info,
} from "lucide-react";
import { useAuth, useWorkspace } from "@/providers";
import type { Savings, FinancialAccount, Category } from "@karsafin/shared";
import { formatCurrency, getLocalToday, parseAmount } from "@karsafin/shared";
import { serializeDescriptionAndTags } from "@/utils/tagUtils";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("IDR", "Rp");
}

function ProgressRing({
  percentage,
  color,
  bgColor,
  size = 100,
  strokeWidth = 8,
}: {
  percentage: number;
  color: string;
  bgColor: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black text-slate-800">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export default function SavingsPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [savings, setSavings] = useState<Savings[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [mounted, setMounted] = useState(false);

  // 1. Add/Edit Goal Modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalColor, setGoalColor] = useState("#10b981");
  const [goalAccountId, setGoalAccountId] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);

  // 2. Add Balance Modal
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [activeGoal, setActiveGoal] = useState<Savings | null>(null);
  const [addBalanceAmount, setAddBalanceAmount] = useState("");
  const [addBalanceAccountId, setAddBalanceAccountId] = useState("");
  const [addBalanceSaving, setAddBalanceSaving] = useState(false);

  // 3. Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferSourceAccountId, setTransferSourceAccountId] = useState("");
  const [transferDestAccountId, setTransferDestAccountId] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [savingsRes, accountsRes, categoriesRes] = await Promise.all([
        api.savings.getAll(),
        api.accounts.getAll(),
        api.categories.getAll(),
      ]);

      setSavings(savingsRes.data || []);
      setAccounts(accountsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      console.error("Gagal memuat data tabungan:", err);
    } finally {
      setLoading(false);
    }
  }, [user, api, activeWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Goal Saving Handler (Create/Update)
  const openAddGoalModal = () => {
    setEditGoalId(null);
    setGoalName("");
    setGoalTarget("");
    setGoalCurrent("0");
    setGoalDeadline(getLocalToday());
    setGoalColor("#10b981");
    setGoalAccountId(accounts.find((a) => a.is_default)?.id || accounts[0]?.id || "");
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    if (!user) return;
    const pTarget = Number(goalTarget.replace(/\D/g, ""));
    const pCurrent = Number(goalCurrent.replace(/\D/g, ""));

    if (!goalName.trim()) {
      alert("Nama target tidak boleh kosong");
      return;
    }
    if (pTarget <= 0) {
      alert("Target tabungan harus lebih dari 0");
      return;
    }

    setGoalSaving(true);
    try {
      const payload = {
        name: goalName.trim(),
        target: pTarget,
        current: pCurrent,
        deadline: goalDeadline || undefined,
        color: goalColor,
      };

      if (editGoalId) {
        const { error } = await api.savings.update(editGoalId, payload);
        if (error) throw error;
      } else {
        const { data: newSavings, error } = await api.savings.create(user.id, payload);
        if (error) throw error;

        // If there's initial balance and account is selected, create category & auto-transaction
        if (pCurrent > 0 && goalAccountId && newSavings) {
          const { data: newCat, error: catErr } = await api.categories.create(user.id, {
            name: goalName.trim(),
            icon: "🏦",
            color: goalColor,
            type: "savings",
          });
          if (catErr) throw catErr;

          await api.transactions.create(user.id, {
            type: "savings",
            amount: pCurrent,
            savings_id: newSavings.id,
            account_id: goalAccountId,
            category_id: newCat?.id || undefined,
            date: getLocalToday(),
            description: serializeDescriptionAndTags(`Saldo awal tabungan ${goalName.trim()}`, [goalName.trim()]),
            source: "manual",
          } as any);
        }
      }

      setShowGoalModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan target");
    } finally {
      setGoalSaving(false);
    }
  };

  // Add Balance Handler
  const openAddBalanceModal = (g: Savings) => {
    setActiveGoal(g);
    setAddBalanceAmount("");
    setAddBalanceAccountId(accounts.find((a) => a.is_default)?.id || accounts[0]?.id || "");
    setShowAddBalanceModal(true);
  };

  const handleSaveBalance = async () => {
    if (!activeGoal || !user) return;
    const amountNum = Number(addBalanceAmount.replace(/\D/g, ""));
    if (amountNum <= 0) {
      alert("Nominal harus lebih dari 0");
      return;
    }

    setAddBalanceSaving(true);
    try {
      const newCurrent = activeGoal.current + amountNum;
      const { error } = await api.savings.update(activeGoal.id, { current: newCurrent });
      if (error) throw error;

      // Log transaction automatically
      const payload: any = {
        type: "savings",
        amount: amountNum,
        savings_id: activeGoal.id,
        date: getLocalToday(),
        description: serializeDescriptionAndTags(`Menabung untuk: ${activeGoal.name}`, [activeGoal.name]),
        source: "manual",
        account_id: addBalanceAccountId || undefined,
      };
      await api.transactions.create(user.id, payload);

      setShowAddBalanceModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menambah saldo");
    } finally {
      setAddBalanceSaving(false);
    }
  };

  // Transfer Balance Handler
  const openTransferModal = (g: Savings) => {
    setActiveGoal(g);
    setTransferAmount("");
    setTransferSourceAccountId(accounts.find((a) => a.is_default)?.id || accounts[0]?.id || "");
    setTransferDestAccountId(accounts.find((a) => !a.is_default)?.id || "");
    setShowTransferModal(true);
  };

  const handleSaveTransfer = async () => {
    if (!activeGoal || !user) return;
    const amountNum = Number(transferAmount.replace(/\D/g, ""));
    if (amountNum <= 0) {
      alert("Nominal harus lebih dari 0");
      return;
    }
    if (!transferSourceAccountId || !transferDestAccountId) {
      alert("Pilih akun asal dan tujuan terlebih dahulu");
      return;
    }
    if (transferSourceAccountId === transferDestAccountId) {
      alert("Akun asal dan tujuan tidak boleh sama!");
      return;
    }

    setTransferSaving(true);
    try {
      const newCurrent = activeGoal.current + amountNum;
      const { error } = await api.savings.update(activeGoal.id, { current: newCurrent });
      if (error) throw error;

      // Log transfer transaction automatically
      const payload: any = {
        type: "savings",
        amount: amountNum,
        savings_id: activeGoal.id,
        date: getLocalToday(),
        description: serializeDescriptionAndTags(`Transfer menabung: ${activeGoal.name}`, [activeGoal.name]),
        source: "manual",
        account_id: transferSourceAccountId,
        destination_account_id: transferDestAccountId,
      };
      await api.transactions.create(user.id, payload);

      setShowTransferModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal transfer tabungan");
    } finally {
      setTransferSaving(false);
    }
  };

  // Delete Goal Handler
  const handleDeleteGoal = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus target tabungan "${name}"? Seluruh transaksi terkait juga akan dihapus.`)) {
      return;
    }

    try {
      // Fetch associated transactions and delete them
      const { data: allTxs } = await api.transactions.getAll();
      if (allTxs) {
        const related = allTxs.filter((t) => t.type === "savings" && t.savings_id === id);
        for (const tx of related) {
          await api.transactions.delete(tx.id);
        }
      }

      // Delete the category corresponding to the savings target
      const cat = categories.find((c) => c.type === "savings" && c.name.toLowerCase() === name.toLowerCase());
      if (cat) {
        await api.categories.delete(cat.id);
      }

      await api.savings.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus target");
    }
  };

  const totalTarget = savings.reduce((sum, g) => sum + g.target, 0);
  const totalCurrent = savings.reduce((sum, g) => sum + g.current, 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  // Icons mapper for styling
  const getGoalIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("rumah") || lower.includes("dp")) return Home;
    if (lower.includes("liburan") || lower.includes("jepang") || lower.includes("wisata")) return Plane;
    if (lower.includes("sekolah") || lower.includes("pendidikan") || lower.includes("anak")) return GraduationCap;
    return Shield;
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <section className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Link
            href="/dashboard/planning"
            className="inline-flex items-center gap-2 text-sm text-dashboard-gray hover:text-dashboard-blue transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Perencanaan
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-slate-800">
            Target Tabungan
          </h1>
          <p className="text-dashboard-gray max-w-2xl text-lg leading-relaxed">
            Tetapkan tujuan finansial dan pantau progres tabungan Anda menuju target yang telah ditetapkan.
          </p>
        </div>

        <button
          onClick={openAddGoalModal}
          className="bg-dashboard-blue text-white rounded-2xl px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="h-5 w-5" />
          Tambah Target
        </button>
      </section>

      {/* Info Tips Banner */}
      <section className="custom-card p-5 mb-8 border border-slate-100 bg-slate-50 flex items-start gap-3.5">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-black text-slate-800">Tips Menabung:</h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Anda dapat menyisihkan dana tabungan Anda menggunakan 2 cara: <br />
            1. <strong>+ Saldo</strong>: Ambil dana secara langsung dari akun keuangan Anda (uang disisihkan dari akun keuangan yang kamu pilih, jadi saldo akun keuangan terkait berkurang). <br />
            2. <strong>Transfer</strong>: Lakukan pemindahan dana tabungan antar akun keuangan terdaftar.
          </p>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="custom-card p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Total Target
          </p>
          <p className="text-2xl font-black text-slate-800">
            {formatRupiah(totalTarget)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{savings.length} target aktif</p>
        </div>
        <div className="custom-card p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Total Terkumpul
          </p>
          <p className="text-2xl font-black text-emerald-600">
            {formatRupiah(totalCurrent)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{overallPercentage}% dari total target</p>
        </div>
        <div className="custom-card p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Sisa Kebutuhan
          </p>
          <p className="text-2xl font-black text-amber-600">
            {formatRupiah(Math.max(totalTarget - totalCurrent, 0))}
          </p>
          <p className="text-xs text-slate-400 mt-1">{100 - overallPercentage}% lagi</p>
        </div>
        <div className="custom-card p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Tingkat Tabungan
          </p>
          <p className="text-2xl font-black text-blue-600">
            {overallPercentage}%
          </p>
          <p className="text-xs text-slate-400 mt-1">Keseluruhan target</p>
        </div>
      </section>

      {/* Savings Goal Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {savings.length === 0 ? (
          <div className="custom-card p-12 text-center text-slate-400 col-span-2">
            Belum ada target tabungan. Klik "Tambah Target" untuk mulai menyimpan!
          </div>
        ) : (
          savings.map((goal) => {
            const Icon = getGoalIcon(goal.name);
            const remaining = goal.target - goal.current;
            const percentage = goal.target > 0 ? Math.min(Math.round((goal.current / goal.target) * 100), 100) : 0;
            const ringColor = goal.color || "#10b981";
            const ringBg = `${ringColor}20`;

            return (
              <div
                key={goal.id}
                className="custom-card p-5 hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
                style={{
                  borderLeft: `4px solid ${ringColor}`,
                  background: `linear-gradient(135deg, ${ringColor}08 0%, #ffffff 60%)`,
                }}
              >
                {/* Trash delete icon */}
                <button
                  onClick={() => handleDeleteGoal(goal.id, goal.name)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-4">
                  {/* Progress Ring */}
                  <div className="shrink-0">
                    <ProgressRing
                      percentage={percentage}
                      color={ringColor}
                      bgColor={ringBg}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className="w-9 h-9 border rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{ borderColor: ringBg, backgroundColor: ringBg }}
                      >
                        <Icon className="h-4 w-4" style={{ color: ringColor }} />
                      </div>
                      <h3 className="text-lg font-black text-slate-800 truncate">
                        {goal.name}
                      </h3>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-2 mt-2">
                      <div className="rounded-xl p-2" style={{ backgroundColor: ringBg }}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          Target
                        </p>
                        <p className="text-sm font-black" style={{ color: ringColor }}>
                          {formatRupiah(goal.target)}
                        </p>
                      </div>
                      <div className="rounded-xl p-2" style={{ backgroundColor: ringBg }}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                          Terkumpul
                        </p>
                        <p className="text-sm font-black text-slate-800">
                          {formatRupiah(goal.current)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: ringColor,
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Deposit Actions */}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-50">
                      <button
                        onClick={() => openAddBalanceModal(goal)}
                        className="flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-xl border"
                        style={{ backgroundColor: `${ringColor}15`, borderColor: `${ringColor}40`, color: ringColor }}
                      >
                        <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
                        + Saldo
                      </button>
                      <button
                        onClick={() => openTransferModal(goal)}
                        className="flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-xl border"
                        style={{ backgroundColor: `${ringColor}10`, borderColor: `${ringColor}30`, color: ringColor }}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5 text-purple-600" />
                        Transfer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* PORTALS FOR MODALS */}

      {/* Goal Modal (Add/Edit Target) */}
      {mounted && showGoalModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowGoalModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-800">
                {editGoalId ? "Edit Target" : "Target Tabungan Baru"}
              </h3>
              <button onClick={() => setShowGoalModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Nama Target</label>
                <input
                  type="text"
                  placeholder="Mis: DP Rumah Pertama"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Target Nominal</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-sm">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={goalTarget}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setGoalTarget(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-10 pr-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {!editGoalId && (
                <div>
                  <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Saldo Awal</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-sm">Rp</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={goalCurrent}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setGoalCurrent(raw ? Number(raw).toLocaleString("id-ID") : "");
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-10 pr-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              )}

              {!editGoalId && Number(goalCurrent.replace(/\D/g, "")) > 0 && accounts.length > 0 && (
                <div>
                  <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Ambil Dari Akun Keuangan</label>
                  <select
                    value={goalAccountId}
                    onChange={(e) => setGoalAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Batas Waktu (Deadline)</label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Warna Tema</label>
                <div className="flex gap-3">
                  {["#10b981", "#2563eb", "#7c3aed", "#d97706", "#ef4444"].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setGoalColor(col)}
                      className="w-8 h-8 rounded-full cursor-pointer border-2"
                      style={{
                        backgroundColor: col,
                        borderColor: goalColor === col ? "#000" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowGoalModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handleSaveGoal}
                  disabled={goalSaving}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {goalSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Balance Modal */}
      {mounted && showAddBalanceModal && activeGoal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowAddBalanceModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">Tambah Saldo Tabungan</h3>
                <p className="text-xs text-slate-400 mt-1">{activeGoal.name}</p>
              </div>
              <button onClick={() => setShowAddBalanceModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Nominal Tabungan</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-sm">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={addBalanceAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setAddBalanceAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-10 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Sumber Dana (Akun Keuangan)</label>
                  <select
                    value={addBalanceAccountId}
                    onChange={(e) => setAddBalanceAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowAddBalanceModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handleSaveBalance}
                  disabled={addBalanceSaving}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {addBalanceSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Transfer Modal */}
      {mounted && showTransferModal && activeGoal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowTransferModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">Transfer Tabungan</h3>
                <p className="text-xs text-slate-400 mt-1">{activeGoal.name}</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Nominal Transfer</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-sm">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={transferAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setTransferAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-10 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {accounts.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Akun Asal</label>
                    <select
                      value={transferSourceAccountId}
                      onChange={(e) => setTransferSourceAccountId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Akun Tujuan</label>
                    <select
                      value={transferDestAccountId}
                      onChange={(e) => setTransferDestAccountId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowTransferModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handleSaveTransfer}
                  disabled={transferSaving}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {transferSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
