"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Loader2,
  History,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useAuth, useWorkspace } from "@/providers";
import { QuickAddAccountModal } from "@/components/QuickAddAccountModal";
import type { Debt, DebtPayment, FinancialAccount } from "@karsafin/shared";
import { formatCurrency, getLocalToday } from "@karsafin/shared";
import { InstitutionLogo } from "@/components/InstitutionLogo";

type TabType = "hutang" | "piutang";

function formatRupiah(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export default function DebtsPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [activeTab, setActiveTab] = useState<TabType>("hutang");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [mounted, setMounted] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [editCounterpart, setEditCounterpart] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  const handleAddAccountSuccess = async (newAcc: any) => {
    try {
      const { data } = await api.accounts.getAll();
      if (data) {
        setAccounts(data);
      }
    } catch (err) {
      console.error(err);
      setAccounts((prev) => [...prev, newAcc]);
    }
    if (showPayModal) {
      setPayAccountId(newAcc.id);
    } else if (showEditModal) {
      setEditAccountId(newAcc.id);
    }
  };

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [debtsRes, accountsRes] = await Promise.all([
        api.debts.getAll(user.id),
        api.accounts.getAll(),
      ]);

      if (debtsRes.error) throw debtsRes.error;
      if (accountsRes.error) throw accountsRes.error;

      setDebts(debtsRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [user, api, activeWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate dynamic stats
  const totalHutang = debts
    .filter((d) => d.type === "payable" && d.status === "unpaid")
    .reduce((s, d) => s + (d.amount - (d.paid || 0)), 0);

  const totalPiutang = debts
    .filter((d) => d.type === "receivable" && d.status === "unpaid")
    .reduce((s, d) => s + (d.amount - (d.paid || 0)), 0);

  const selisih = totalPiutang - totalHutang;

  // Filter debts for the active tab
  const activeDbType = activeTab === "hutang" ? "payable" : "receivable";
  const filtered = debts.filter((d) => d.type === activeDbType);

  // Repayment Handler (Pay/Cicil)
  const openPayModal = (debt: Debt) => {
    setPayDebt(debt);
    setPayAmount("");
    setPayAccountId(debt.account_id || accounts.find((a) => a.is_default)?.id || accounts[0]?.id || "");
    setShowPayModal(true);
  };

  const handlePaySubmit = async () => {
    if (!payDebt || !user) return;
    const amountNum = Number(payAmount.replace(/\D/g, ""));
    if (amountNum <= 0) {
      alert("Nominal pembayaran harus lebih dari 0");
      return;
    }

    const remaining = payDebt.amount - (payDebt.paid || 0);
    if (amountNum > remaining) {
      alert("Nominal pembayaran melebihi sisa tagihan!");
      return;
    }

    setPaySaving(true);
    try {
      const newPaid = (payDebt.paid || 0) + amountNum;
      const paymentItem: DebtPayment = {
        id: Math.random().toString(36).substring(2, 9),
        amount: amountNum,
        date: getLocalToday(),
        notes: "Pembayaran via Web App",
      };

      const existingPayments = payDebt.payments || [];
      const updates: any = {
        paid: newPaid,
        payments: [...existingPayments, paymentItem],
      };

      if (newPaid >= payDebt.amount) {
        updates.status = "paid";
      }

      const { error: updateErr } = await api.debts.update(payDebt.id, updates);
      if (updateErr) throw updateErr;

      // Create transaction automatically
      const catConfig = payDebt.type === "payable"
        ? { name: "Bayar Hutang", type: "expense" as const, icon: "📤", color: "#ef4444" }
        : { name: "Terima Bayar Piutang", type: "income" as const, icon: "💰", color: "#10b981" };

      const { data: catData, error: catError } = await api.categories.getOrCreateByName(user.id, catConfig);
      if (catError) {
        console.error("Gagal mendapatkan kategori transaksi:", catError);
      } else if (catData) {
        const txPayload = {
          type: catConfig.type,
          amount: amountNum,
          category_id: catData.id,
          description: payDebt.type === "payable"
            ? `Bayar cicilan hutang ke ${payDebt.counterpart}`
            : `Terima bayar piutang dari ${payDebt.counterpart}`,
          date: getLocalToday(),
          account_id: payAccountId || undefined,
          debt_id: payDebt.id,
        };
        const { error: txError } = await api.transactions.create(user.id, txPayload);
        if (txError) {
          console.error("Gagal mencatat transaksi otomatis pembayaran hutang:", txError);
        }
      }

      setShowPayModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan pembayaran");
    } finally {
      setPaySaving(false);
    }
  };

  // Edit Debt Handler
  const openEditModal = (debt: Debt) => {
    setEditDebt(debt);
    setEditCounterpart(debt.counterpart);
    setEditAmount(debt.amount ? debt.amount.toLocaleString("id-ID") : "");
    setEditNotes(debt.notes || "");
    setEditDueDate(debt.due_date || "");
    setEditAccountId(debt.account_id || "");
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editDebt || !user) return;
    const amountNum = Number(editAmount.replace(/\D/g, ""));
    if (amountNum <= 0) {
      alert("Nominal harus lebih dari 0");
      return;
    }
    if (!editCounterpart.trim()) {
      alert("Nama pihak terkait tidak boleh kosong");
      return;
    }

    setEditSaving(true);
    try {
      const updates: any = {
        amount: amountNum,
        counterpart: editCounterpart.trim(),
        notes: editNotes.trim(),
        due_date: editDueDate || undefined,
        account_id: editAccountId || undefined,
        name: `${editDebt.type === "payable" ? "Hutang ke" : "Piutang dari"} ${editCounterpart.trim()}`,
      };

      const { error: editErr } = await api.debts.update(editDebt.id, updates);
      if (editErr) throw editErr;

      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui data");
    } finally {
      setEditSaving(false);
    }
  };

  // Delete Debt
  const handleDelete = async (debt: Debt) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus catatan ${debt.type === "payable" ? "hutang" : "piutang"} dengan ${debt.counterpart}?`)) {
      return;
    }
    try {
      const { error: delErr } = await api.debts.delete(debt.id);
      if (delErr) throw delErr;
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus");
    }
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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3 text-slate-800">
            Hutang & Piutang
          </h1>
          <p className="text-dashboard-gray text-lg leading-relaxed">
            Pantau uang yang Anda pinjam dan uang yang dipinjamkan ke orang lain.
          </p>
        </div>
        <Link
          href="/dashboard/debts/add"
          className="bg-dashboard-blue text-white rounded-2xl px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Tambah Baru
        </Link>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="custom-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-xs font-black text-dashboard-gray uppercase tracking-widest">
              Total Hutang
            </span>
          </div>
          <p className="text-3xl font-black text-red-500">
            {formatRupiah(totalHutang)}
          </p>
          <p className="text-xs text-dashboard-gray mt-2">
            {debts.filter((d) => d.type === "payable" && d.status !== "paid").length} hutang aktif
          </p>
        </div>

        <div className="custom-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs font-black text-dashboard-gray uppercase tracking-widest">
              Total Piutang
            </span>
          </div>
          <p className="text-3xl font-black text-green-600">
            {formatRupiah(totalPiutang)}
          </p>
          <p className="text-xs text-dashboard-gray mt-2">
            {debts.filter((d) => d.type === "receivable" && d.status !== "paid").length} piutang aktif
          </p>
        </div>

        <div className="custom-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selisih >= 0 ? "bg-blue-50" : "bg-orange-50"
              }`}
            >
              <span className={`text-lg ${selisih >= 0 ? "text-dashboard-blue" : "text-orange-500"}`}>
                ⚖️
              </span>
            </div>
            <span className="text-xs font-black text-dashboard-gray uppercase tracking-widest">
              Selisih
            </span>
          </div>
          <p className={`text-3xl font-black ${selisih >= 0 ? "text-dashboard-blue" : "text-orange-500"}`}>
            {selisih >= 0 ? "+" : "-"}
            {formatRupiah(Math.abs(selisih))}
          </p>
          <p className="text-xs text-dashboard-gray mt-2">
            {selisih >= 0 ? "Piutang lebih besar dari hutang" : "Hutang lebih besar dari piutang"}
          </p>
        </div>
      </div>

      {/* Toggle Tabs */}
      <div className="custom-card p-2 mb-8 flex items-center gap-1 w-fit">
        <button
          onClick={() => setActiveTab("hutang")}
          className={`px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "hutang"
              ? "bg-red-500 text-white shadow-md shadow-red-500/20"
              : "text-dashboard-gray hover:bg-slate-50"
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          Hutang
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-black ${
              activeTab === "hutang" ? "bg-white/20" : "bg-slate-100 text-slate-500"
            }`}
          >
            {debts.filter((d) => d.type === "payable").length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("piutang")}
          className={`px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "piutang"
              ? "bg-green-600 text-white shadow-md shadow-green-500/20"
              : "text-dashboard-gray hover:bg-slate-50"
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          Piutang
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-black ${
              activeTab === "piutang" ? "bg-white/20" : "bg-slate-100 text-slate-500"
            }`}
          >
            {debts.filter((d) => d.type === "receivable").length}
          </span>
        </button>
      </div>

      {/* Debt Cards */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="custom-card p-12 text-center text-slate-400">
            Belum ada catatan {activeTab === "hutang" ? "hutang" : "piutang"} yang terekam.
          </div>
        ) : (
          filtered.map((debt) => {
            const progress = debt.amount > 0 ? Math.round((debt.paid / debt.amount) * 100) : 0;
            const remaining = debt.amount - debt.paid;
            const initials = debt.counterpart.substring(0, 2).toUpperCase();

            return (
              <div
                key={debt.id}
                className="custom-card p-6 md:p-8 hover:shadow-lg transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* Avatar & Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-110 transition-transform ${
                        activeTab === "hutang" ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-slate-800 truncate">
                        {debt.counterpart}
                      </h3>
                      <p className="text-xs text-dashboard-gray truncate">{debt.notes || "Tidak ada catatan"}</p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-6 text-xs text-dashboard-gray shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>Dibuat: {new Date(debt.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                    {debt.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>Jatuh tempo: {new Date(debt.due_date).toLocaleDateString("id-ID")}</span>
                      </div>
                    )}
                  </div>

                  {/* Amount & Status */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-800">
                        {formatRupiah(debt.amount)}
                      </p>
                      {remaining > 0 && (
                        <p className="text-xs text-dashboard-gray">
                          Sisa: {formatRupiah(remaining)}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={debt.status === "paid" ? "lunas" : "belum"} />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-5 pt-5 border-t border-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-dashboard-gray">Progres Pembayaran</span>
                    <span className="text-xs font-black text-slate-800">{progress}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        progress === 100 ? "bg-green-500" : activeTab === "hutang" ? "bg-red-400" : "bg-green-400"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-dashboard-gray">
                    <span>Dibayar: {formatRupiah(debt.paid)}</span>
                    <span>Total: {formatRupiah(debt.amount)}</span>
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                  {debt.status !== "paid" && (
                    <button
                      onClick={() => openPayModal(debt)}
                      className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Bayar / Cicil
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setHistoryDebt(debt);
                      setShowHistoryModal(true);
                    }}
                    className="hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <History className="h-3.5 w-3.5" /> Riwayat
                  </button>
                  <button
                    onClick={() => openEditModal(debt)}
                    className="hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(debt)}
                    className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PORTALS FOR MODALS */}

      {/* Pay Modal */}
      {mounted && showPayModal && payDebt && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-800">Bayar / Cicil</h3>
              <button onClick={() => setShowPayModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Pihak Terkait</p>
              <p className="text-sm font-black text-slate-800">{payDebt.counterpart}</p>
              <p className="text-xs text-slate-500 mt-2">
                Sisa Tagihan: <span className="font-black text-slate-700">{formatRupiah(payDebt.amount - payDebt.paid)}</span>
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Nominal Pembayaran</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-lg">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={payAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setPayAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest block">Metode Pembayaran (Akun Keuangan)</label>
                  <button
                    type="button"
                    onClick={() => setIsAddAccountOpen(true)}
                    className="text-xs font-bold text-dashboard-blue hover:text-blue-700 cursor-pointer bg-transparent border-none flex items-center transition-colors"
                  >
                    + Tambah Akun
                  </button>
                </div>
                {accounts.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">Belum ada akun keuangan.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {accounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setPayAccountId(acc.id)}
                        className={`p-3 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                          payAccountId === acc.id
                            ? "bg-blue-50 border-blue-500 text-blue-700 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <InstitutionLogo name={acc.name} icon={(acc as any).icon} size="sm" />
                        <span className="text-xs truncate">{acc.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowPayModal(false)} className="flex-1 px-4 py-3.5 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handlePaySubmit}
                  disabled={paySaving}
                  className="flex-1 px-4 py-3.5 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {paySaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {mounted && showEditModal && editDebt && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-800">Edit Catatan</h3>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Nama Pihak Terkait</label>
                <input
                  type="text"
                  value={editCounterpart}
                  onChange={(e) => setEditCounterpart(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Nominal</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-sm">Rp</span>
                  <input
                    type="text"
                    value={editAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setEditAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Tanggal Jatuh Tempo (Opsional)</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Catatan</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest block mb-3">Akun Terkait</label>
                {accounts.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">Belum ada akun keuangan.</div>
                ) : (
                  <div className="flex items-stretch gap-3">
                    <select
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer min-w-0"
                    >
                      <option value="">Pilih Akun</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsAddAccountOpen(true)}
                      className="px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-2xl text-[11px] font-bold text-blue-600 cursor-pointer transition-all flex flex-col items-center justify-center text-center leading-tight whitespace-nowrap shrink-0"
                    >
                      <span>Tambah</span>
                      <span>Akun</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={editSaving}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Riwayat Pembayaran Modal */}
      {mounted && showHistoryModal && historyDebt && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowHistoryModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">Riwayat Pembayaran</h3>
                <p className="text-xs text-slate-400 mt-1">{historyDebt.counterpart}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(!historyDebt.payments || historyDebt.payments.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-sm font-bold">
                  Belum ada riwayat cicilan yang dicatat.
                </div>
              ) : (
                [...historyDebt.payments].reverse().map((pay) => (
                  <div key={pay.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-slate-800">{formatRupiah(pay.amount)}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        Tanggal: {new Date(pay.date).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-600 font-black px-2.5 py-1 rounded-full">
                      Sukses
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <button onClick={() => setShowHistoryModal(false)} className="mt-6 w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-bold transition-colors cursor-pointer shrink-0">
              Tutup
            </button>
          </div>
        </div>,
        document.body
      )}
      <QuickAddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onSuccess={handleAddAccountSuccess}
      />
    </>
  );
}

function StatusBadge({ status }: { status: "lunas" | "belum" }) {
  const config = {
    lunas: {
      label: "Lunas",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-green-50 text-green-600 border-green-100",
    },
    belum: {
      label: "Belum Lunas",
      icon: <Clock className="h-3 w-3" />,
      className: "bg-yellow-50 text-yellow-600 border-yellow-100",
    },
  };

  const { label, icon, className } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
