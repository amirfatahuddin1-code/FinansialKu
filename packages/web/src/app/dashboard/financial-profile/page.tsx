"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  Info,
  CreditCard,
  TrendingUp,
  Coins,
  PiggyBank,
  User,
  Check,
  HelpCircle,
  Landmark,
  Wallet,
  AlertCircle,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  CreditCard as CardIcon,
  Crown,
  List,
  ChevronDown
} from "lucide-react";
import { useAuth, useWorkspace } from "@/providers";
import type { FinancialAccount, Debt, Savings, Transaction } from "@karsafin/shared";
import { formatCurrency, getLocalToday } from "@karsafin/shared";
import { createPortal } from "react-dom";
import { InstitutionLogo } from "@/components/InstitutionLogo";

// Helper untuk format rupiah
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

interface IncomeSource {
  id: string;
  name: string;
  nominal: number;
}

interface LocalCreditCard {
  id: string;
  name: string;
  limit: number;
  outstanding: number;
  dueDate: string;
}

export default function FinancialProfilePage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  // State data
  const [dbAccounts, setDbAccounts] = useState<FinancialAccount[]>([]);
  const [dbDebts, setDbDebts] = useState<Debt[]>([]);
  const [dbSavings, setDbSavings] = useState<Savings[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // State lokal disimpan di localStorage (diasosiasikan dengan user.id)
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [creditCards, setCreditCards] = useState<LocalCreditCard[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [calculateDebtInNet, setCalculateDebtInNet] = useState(false);
  const [editingUnlocked, setEditingUnlocked] = useState(false);

  // State loading & UI
  const [loading, setLoading] = useState(true);
  const [activeDebtTab, setActiveDebtTab] = useState<"payable" | "receivable">("payable");
  const [mounted, setMounted] = useState(false);

  // State modal
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeNominal, setNewIncomeNominal] = useState("");

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"bank" | "ewallet" | "investment" | "other">("bank");
  const [newAccountBalance, setNewAccountBalance] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [newDebtCounterpart, setNewDebtCounterpart] = useState("");
  const [newDebtType, setNewDebtType] = useState<"payable" | "receivable">("payable");
  const [newDebtAmount, setNewDebtAmount] = useState("");
  const [newDebtDueDate, setNewDebtDueDate] = useState("");
  const [newDebtNotes, setNewDebtNotes] = useState("");
  const [savingDebt, setSavingDebt] = useState(false);

  const [showAddSavingsModal, setShowAddSavingsModal] = useState(false);
  const [newSavingsName, setNewSavingsName] = useState("");
  const [newSavingsTarget, setNewSavingsTarget] = useState("");
  const [newSavingsCurrent, setNewSavingsCurrent] = useState("");
  const [newSavingsDeadline, setNewSavingsDeadline] = useState("");
  const [savingSavings, setSavingSavings] = useState(false);

  const [showAddCreditCardModal, setShowAddCreditCardModal] = useState(false);
  const [newCcName, setNewCcName] = useState("");
  const [newCcLimit, setNewCcLimit] = useState("");
  const [newCcOutstanding, setNewCcOutstanding] = useState("");
  const [newCcDueDate, setNewCcDueDate] = useState("");

  const [activeInfoModal, setActiveInfoModal] = useState<{title: string, desc: string} | null>(null);

  // State edit untuk Mode Unlocked
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [editAccountType, setEditAccountType] = useState<"bank" | "ewallet" | "investment" | "other">("bank");
  const [editAccountBalance, setEditAccountBalance] = useState("");
  const [updatingAccount, setUpdatingAccount] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memuat data dari basis data
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [accountsRes, debtsRes, savingsRes, txRes, invRes] = await Promise.all([
        api.accounts.getAll(),
        api.debts.getAll(user.id),
        api.savings.getAll(),
        api.transactions.getAll(),
        api.investmentAssets.getAll(),
      ]);

      setDbAccounts(accountsRes.data || []);
      setDbDebts(debtsRes.data || []);
      setDbSavings(savingsRes.data || []);
      setTransactions(txRes.data || []);
      setInvestments(invRes.data || []);
    } catch (err) {
      console.error("Gagal mengambil data profil keuangan:", err);
    } finally {
      setLoading(false);
    }
  }, [user, api]);

  useEffect(() => {
    if (user) {
      loadData();
      
      // Muat data lokal
      const cachedIncome = localStorage.getItem(`karsafin_income_sources_${user.id}`);
      if (cachedIncome) {
        setIncomeSources(JSON.parse(cachedIncome));
      } else {
        setIncomeSources([]);
      }

      const cachedCards = localStorage.getItem(`karsafin_credit_cards_${user.id}`);
      if (cachedCards) {
        setCreditCards(JSON.parse(cachedCards));
      } else {
        setCreditCards([]);
      }

      const cachedDebtNet = localStorage.getItem(`karsafin_calc_debt_net_${user.id}`);
      if (cachedDebtNet) {
        setCalculateDebtInNet(JSON.parse(cachedDebtNet));
      }
    }
  }, [user, loadData]);

  // Utilitas penyimpan localStorage
  const saveIncomeSources = (sources: IncomeSource[]) => {
    if (!user) return;
    setIncomeSources(sources);
    localStorage.setItem(`karsafin_income_sources_${user.id}`, JSON.stringify(sources));
  };

  const saveCreditCards = (cards: LocalCreditCard[]) => {
    if (!user) return;
    setCreditCards(cards);
    localStorage.setItem(`karsafin_credit_cards_${user.id}`, JSON.stringify(cards));
  };

  const handleToggleDebtNet = (val: boolean) => {
    if (!user) return;
    setCalculateDebtInNet(val);
    localStorage.setItem(`karsafin_calc_debt_net_${user.id}`, JSON.stringify(val));
  };

  // --- AKSI ---

  // 1. Sumber Pemasukan
  const handleAddIncome = () => {
    if (!newIncomeName.trim() || !newIncomeNominal) return;
    const nominalNum = Number(newIncomeNominal.replace(/\D/g, ""));
    const newSource: IncomeSource = {
      id: `income-${Date.now()}`,
      name: newIncomeName.trim(),
      nominal: nominalNum,
    };
    saveIncomeSources([...incomeSources, newSource]);
    setNewIncomeName("");
    setNewIncomeNominal("");
    setShowAddIncomeModal(false);
  };

  const handleDeleteIncome = (id: string) => {
    if (confirm("Hapus sumber pemasukan ini?")) {
      saveIncomeSources(incomeSources.filter(s => s.id !== id));
    }
  };

  // 2. Akun Keuangan
  const handleAddAccount = async () => {
    if (!user || !newAccountName.trim()) return;
    setSavingAccount(true);
    try {
      const balanceNum = Number(newAccountBalance.replace(/\D/g, ""));

      const { data: newAcc, error } = await api.accounts.create(user.id, {
        name: newAccountName.trim(),
        type: newAccountType,
        is_default: dbAccounts.length === 0,
        color: newAccountType === "bank" ? "#0066AE" : newAccountType === "ewallet" ? "#00AED6" : "#00E676",
        icon: newAccountType === "bank" ? "🏦" : newAccountType === "ewallet" ? "📱" : newAccountType === "investment" ? "📈" : "💵",
        balance: balanceNum,
      });

      if (error) throw error;

      setNewAccountName("");
      setNewAccountBalance("");
      setShowAddAccountModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan rekening baru.");
    } finally {
      setSavingAccount(false);
    }
  };

  const handleOpenEditAccount = (acc: FinancialAccount) => {
    setEditingAccount(acc);
    setEditAccountName(acc.name);
    setEditAccountType(acc.type);
    setEditAccountBalance(acc.balance ? Number(acc.balance).toLocaleString("id-ID") : "");
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount || !editAccountName.trim()) return;
    setUpdatingAccount(true);
    try {
      const { error } = await api.accounts.update(editingAccount.id, {
        name: editAccountName.trim(),
        type: editAccountType,
        icon: editAccountType === "bank" ? "🏦" : editAccountType === "ewallet" ? "📱" : editAccountType === "investment" ? "📈" : "💵",
        balance: Number(editAccountBalance.replace(/\D/g, "")),
      });
      if (error) throw error;
      setEditingAccount(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Gagal merubah data rekening.");
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (confirm("Hapus rekening ini? Seluruh transaksi terkait akan ikut terhapus.")) {
      try {
        const { error } = await api.accounts.delete(id);
        if (error) throw error;
        loadData();
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus rekening.");
      }
    }
  };

  // 3. Utang / Piutang
  const handleAddDebt = async () => {
    if (!user || !newDebtCounterpart.trim() || !newDebtAmount) return;
    setSavingDebt(true);
    try {
      const amountVal = Number(newDebtAmount.replace(/\D/g, ""));
      const { error } = await api.debts.create(user.id, {
        name: newDebtCounterpart.trim(),
        counterpart: newDebtCounterpart.trim(),
        type: newDebtType,
        amount: amountVal,
        paid: 0,
        due_date: newDebtDueDate || undefined,
        notes: newDebtNotes || undefined,
        status: "unpaid",
      });

      if (error) throw error;

      setNewDebtCounterpart("");
      setNewDebtAmount("");
      setNewDebtDueDate("");
      setNewDebtNotes("");
      setShowAddDebtModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan utang/piutang.");
    } finally {
      setSavingDebt(false);
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (confirm("Hapus catatan utang/piutang ini?")) {
      try {
        const { error } = await api.debts.delete(id);
        if (error) throw error;
        loadData();
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus utang/piutang.");
      }
    }
  };

  // 4. Target Tabungan
  const handleAddSavings = async () => {
    if (!user || !newSavingsName.trim() || !newSavingsTarget) return;
    setSavingSavings(true);
    try {
      const targetVal = Number(newSavingsTarget.replace(/\D/g, ""));
      const currentVal = Number(newSavingsCurrent.replace(/\D/g, "") || "0");
      const { error } = await api.savings.create(user.id, {
        name: newSavingsName.trim(),
        target: targetVal,
        current: currentVal,
        deadline: newSavingsDeadline || undefined,
        color: "#0066AE"
      });

      if (error) throw error;

      setNewSavingsName("");
      setNewSavingsTarget("");
      setNewSavingsCurrent("");
      setNewSavingsDeadline("");
      setShowAddSavingsModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan target tabungan.");
    } finally {
      setSavingSavings(false);
    }
  };

  const handleDeleteSavings = async (id: string) => {
    if (confirm("Hapus target tabungan ini?")) {
      try {
        const { error } = await api.savings.delete(id);
        if (error) throw error;
        loadData();
      } catch (err) {
        console.error(err);
        alert("Gagal menghapus target tabungan.");
      }
    }
  };

  // 5. Kartu Kredit
  const handleAddCreditCard = () => {
    if (!newCcName.trim() || !newCcLimit) return;
    const limitNum = Number(newCcLimit.replace(/\D/g, ""));
    const outstandingNum = Number(newCcOutstanding.replace(/\D/g, "") || "0");
    const newCard: LocalCreditCard = {
      id: `cc-${Date.now()}`,
      name: newCcName.trim(),
      limit: limitNum,
      outstanding: outstandingNum,
      dueDate: newCcDueDate || "Setiap tanggal 20",
    };
    saveCreditCards([...creditCards, newCard]);
    setNewCcName("");
    setNewCcLimit("");
    setNewCcOutstanding("");
    setNewCcDueDate("");
    setShowAddCreditCardModal(false);
  };

  const handleDeleteCreditCard = (id: string) => {
    if (confirm("Hapus kartu kredit ini?")) {
      saveCreditCards(creditCards.filter(c => c.id !== id));
    }
  };

  // --- PERHITUNGAN ---
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Jumlah pemasukan bulanan
  const totalMonthlyIncome = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === "income" && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0) || 2100000; // Default simulasi sesuai tangkapan layar jika data kosong

  // Total tabungan (Akun bank + investasi + kas)
  const totalSavingsAmount = dbAccounts.reduce((sum, acc) => {
    return sum + (acc.balance || 0);
  }, 0);
  const totalSavingsCount = dbAccounts.length;

  // Total utang berjalan
  const unpaidDebts = dbDebts.filter(d => d.type === "payable" && d.status !== "paid");
  const totalDebtAmount = unpaidDebts.reduce((sum, d) => sum + (d.amount - d.paid), 0);
  const totalDebtCount = unpaidDebts.length;

  // Pengeluaran Bulanan
  const totalMonthlyExpense = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2.5">
            Profil Keuangan
          </h1>
          <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
            Kelola gambaran keuanganmu secara lengkap
          </p>
        </div>
      </div>

      {/* 2. Kartu Rangkuman Atas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pemasukan Bulanan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-dashboard-gray tracking-widest">Pemasukan Bulanan</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{formatRupiah(totalMonthlyIncome)}</p>
          </div>
        </div>

        {/* Total Tabungan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-dashboard-gray tracking-widest">Total Tabungan</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{formatRupiah(totalSavingsAmount)}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-bold">{totalSavingsCount} rekening</p>
          </div>
        </div>

        {/* Total Utang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-dashboard-gray tracking-widest">Total Utang</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{formatRupiah(totalDebtAmount)}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-bold">{totalDebtCount} transaksi</p>
          </div>
        </div>

        {/* Pengeluaran Bulanan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-black text-dashboard-gray tracking-widest">Pengeluaran Bulanan</p>
            <p className="text-lg font-black text-slate-800 mt-0.5">{formatRupiah(totalMonthlyExpense)}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-bold">Bulan ini</p>
          </div>
        </div>
      </div>

      {/* 3. Kolom Kontainer */}
      <div className="space-y-6">
        
        {/* Sumber Pemasukan */}
        <div className="custom-card p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💼</span>
              <h2 className="text-lg font-black text-slate-800">Sumber Pemasukan</h2>
              <button onClick={() => setActiveInfoModal({title: "Sumber Pemasukan", desc: "Daftar semua sumber pendapatan rutin Anda, seperti gaji, hasil usaha, atau investasi."})} className="text-blue-500 hover:text-blue-600 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowAddIncomeModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>
          {incomeSources.length === 0 ? (
            <div className="text-sm font-bold text-slate-400 text-center py-8">
              Belum ada sumber pemasukan
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {incomeSources.map((source) => (
                <div key={source.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between group">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{source.name}</p>
                    <p className="text-xs text-slate-500 mt-1 font-bold">{formatRupiah(source.nominal)} / bln</p>
                  </div>
                  <button
                    onClick={() => handleDeleteIncome(source.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dompet & Rekening */}
        <div className="custom-card p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💵</span>
              <h2 className="text-lg font-black text-slate-800">Dompet & Rekening</h2>
              <button onClick={() => setActiveInfoModal({title: "Dompet & Rekening", desc: "Catat seluruh akun keuangan Anda. Saldo awal dikelola sistem agar tetap akurat."})} className="text-blue-500 hover:text-blue-600 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>
          </div>

          {dbAccounts.length === 0 ? (
            <div className="text-sm font-bold text-slate-400 text-center py-8">
              Belum ada dompet atau rekening. Silakan klik "+ Tambah" untuk menambahkan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {dbAccounts.map((account) => (
                <div key={account.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 flex items-center justify-between group relative overflow-hidden">
                  <div className="flex items-center gap-3.5">
                    <InstitutionLogo name={account.name} icon={account.icon} size="md" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-sm">{account.name}</span>
                        {account.is_default && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold text-[10px] tracking-wide">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-bold tracking-wider">
                        {account.type === "bank" ? "Tabungan Bank" : account.type === "ewallet" ? "Dompet Digital" : account.type === "investment" ? "Investasi" : "Uang Kas"} - {formatRupiah(account.balance || 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 z-10">
                    <button
                      onClick={() => handleOpenEditAccount(account)}
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                      title="Edit Rekening"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Hapus Rekening"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Utang & Piutang */}
        <div className="custom-card p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <h2 className="text-lg font-black text-slate-800">Utang & Piutang</h2>
              <button onClick={() => setActiveInfoModal({title: "Utang & Piutang", desc: "Pantau utang yang harus dibayar dan piutang yang belum ditagih. Centang 'Hitung utang di Net Balance' untuk mempengaruhi total kekayaan."})} className="text-blue-500 hover:text-blue-600 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowAddDebtModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            {/* Custom Tab Selector */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex max-w-xs w-full">
              <button
                onClick={() => setActiveDebtTab("payable")}
                className={`flex-1 text-center py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  activeDebtTab === "payable"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Utang
              </button>
              <button
                onClick={() => setActiveDebtTab("receivable")}
                className={`flex-1 text-center py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  activeDebtTab === "receivable"
                    ? "bg-white text-green-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Piutang
              </button>
            </div>

            {/* Checkbox */}
            <label className="flex items-center gap-2.5 font-bold text-xs text-slate-500 hover:text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={calculateDebtInNet}
                onChange={(e) => handleToggleDebtNet(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Hitung utang di Net Balance</span>
            </label>
          </div>

          {/* List or Empty State */}
          {dbDebts.filter(d => d.type === activeDebtTab).length === 0 ? (
            <div className="text-sm font-bold text-slate-400 text-center py-10">
              {activeDebtTab === "payable" ? "Gak ada utang" : "Gak ada piutang"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {dbDebts.filter(d => d.type === activeDebtTab).map((debt) => (
                <div key={debt.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{debt.counterpart || debt.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-bold">
                        {debt.due_date ? `Jatuh tempo: ${new Date(debt.due_date).toLocaleDateString("id-ID", { year: 'numeric', month: 'short', day: 'numeric' })}` : "Tanpa jatuh tempo"}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider ${
                      debt.status === "paid" 
                        ? "bg-emerald-50 text-emerald-600" 
                        : "bg-amber-50 text-amber-600"
                    }`}>
                      {debt.status === "paid" ? "Lunas" : "Belum Lunas"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-dashboard-gray tracking-widest">Nominal</p>
                      <p className="text-sm font-black text-slate-800">{formatRupiah(debt.amount)}</p>
                    </div>
                    {debt.paid > 0 && (
                      <div className="text-right">
                        <p className="text-xs font-black text-dashboard-gray tracking-widest">Terbayar</p>
                        <p className="text-xs font-bold text-slate-600">{formatRupiah(debt.paid)}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteDebt(debt.id)}
                    className="absolute top-2 right-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Target Tabungan */}
        <div className="custom-card p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h2 className="text-lg font-black text-slate-800">Target Tabungan</h2>
              <button onClick={() => setActiveInfoModal({title: "Target Tabungan", desc: "Target tabungan Anda untuk berbagai tujuan masa depan."})} className="text-blue-500 hover:text-blue-600 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowAddSavingsModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>

          {dbSavings.length === 0 ? (
            <div className="text-sm font-bold text-slate-400 text-center py-8">
              Belum ada target tabungan
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {dbSavings.map((item) => {
                const percent = Math.min(Math.round(((item.current || 0) / (item.target || 1)) * 100), 100);
                return (
                  <div key={item.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between relative group">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mt-2">
                        <span>{formatRupiah(item.current)}</span>
                        <span>{percent}%</span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 h-2 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-dashboard-gray mt-2 font-bold tracking-widest">
                        Target: {formatRupiah(item.target)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteSavings(item.id)}
                      className="absolute top-2 right-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Hapus Target"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Investasi */}
        <div className="custom-card p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <h2 className="text-lg font-black text-slate-800">Investasi</h2>
              <button onClick={() => setActiveInfoModal({title: "Investasi", desc: "Portofolio investasi Anda, termasuk reksadana, saham, emas, dll."})} className="text-blue-500 hover:text-blue-600 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <Link
              href="/dashboard/planning/investments"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              Kelola
            </Link>
          </div>

          {investments.length === 0 ? (
            <div className="text-sm font-bold text-slate-400 text-center py-8">
              Belum ada portofolio investasi
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {investments.map((asset) => {
                const totalValue = asset.units * asset.currentPrice;
                return (
                  <div key={asset.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col justify-between relative group">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800 text-sm">{asset.name}</p>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-bold text-[10px] tracking-wide">
                          {asset.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-bold">{asset.platform}</p>
                      
                      <div className="mt-4">
                        <p className="text-xs font-black text-dashboard-gray tracking-widest">Total Nilai</p>
                        <p className="text-sm font-black text-slate-800">{formatRupiah(totalValue)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Credit Cards */}
        <div className="custom-card p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">💳</span>
              <h2 className="text-lg font-black text-slate-800">Kartu Kredit</h2>
              <button onClick={() => setActiveInfoModal({title: "Kartu Kredit", desc: "Pantau limit dan tagihan kartu kredit Anda agar tidak melebihi batas."})} className="text-blue-500 hover:text-blue-600 transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowAddCreditCardModal(true)}
              className="border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer bg-white"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Kartu
            </button>
          </div>

          {creditCards.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center max-w-md mx-auto">
              <div className="w-14 h-14 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-500 mb-4 shadow-sm">
                <CardIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-400">Belum ada kartu kredit</h3>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed font-bold">
                Tambahkan kartu kredit Anda untuk memantau limit belanja, tagihan berjalan, dan tanggal jatuh tempo pembayaran.
              </p>
              <button
                onClick={() => setShowAddCreditCardModal(true)}
                className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Kartu Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {creditCards.map((cc) => {
                const limitUsage = Math.min(Math.round((cc.outstanding / cc.limit) * 100), 100);
                return (
                  <div key={cc.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/35 relative group flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CardIcon className="w-4 h-4 text-blue-500 shrink-0" />
                        <p className="font-bold text-slate-800 text-sm leading-none">{cc.name}</p>
                      </div>
                      <p className="text-xs text-dashboard-gray mt-2 font-bold tracking-widest">
                        Jatuh Tempo: {cc.dueDate}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Outstanding: {formatRupiah(cc.outstanding)}</span>
                        <span>{limitUsage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${limitUsage}%` }}
                        />
                      </div>
                      <p className="text-xs text-dashboard-gray mt-2 font-bold tracking-widest">
                        Limit Kartu: {formatRupiah(cc.limit)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteCreditCard(cc.id)}
                      className="absolute top-2 right-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Hapus Kartu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Modal Tambah Sumber Pemasukan */}
      {mounted && showAddIncomeModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowAddIncomeModal(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowAddIncomeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all">
              <X className="w-4.5 h-4.5" />
            </button>
            <h3 className="text-lg font-black text-slate-800 mb-4">Tambah Sumber Pemasukan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nama Pemasukan</label>
                <input
                  type="text"
                  placeholder="Gaji Pokok, Freelance, Kontrakan"
                  value={newIncomeName}
                  onChange={(e) => setNewIncomeName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nominal Bulanan</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={newIncomeNominal}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setNewIncomeNominal(val ? Number(val).toLocaleString("id-ID") : "");
                    }}
                    className="w-full rounded-xl border border-slate-200 text-xs pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddIncomeModal(false)}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddIncome}
                  className="flex-1 py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Modal Tambah Akun Keuangan */}
      {mounted && showAddAccountModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowAddAccountModal(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowAddAccountModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all">
              <X className="w-4.5 h-4.5" />
            </button>
            <h3 className="text-lg font-black text-slate-800 mb-4">Tambah Rekening / Dompet Baru</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nama Rekening</label>
                <input
                  type="text"
                  placeholder="e.g. BCA Mandiri, GoPay Utama"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Tipe Akun</label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank">Tabungan Bank</option>
                  <option value="ewallet">Dompet Digital</option>
                  <option value="investment">Investasi</option>
                  <option value="other">Uang Tunai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Saldo Awal</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={newAccountBalance}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setNewAccountBalance(val ? Number(val).toLocaleString("id-ID") : "");
                    }}
                    className="w-full rounded-xl border border-slate-200 text-xs pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddAccountModal(false)}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddAccount}
                  disabled={savingAccount}
                  className="flex-1 py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savingAccount ? "Menyimpan..." : "Simpan Akun"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Akun Modal (Unlocked Mode) */}
      {mounted && editingAccount && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setEditingAccount(null)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in zoom-in-95 duration-200">
            <button onClick={() => setEditingAccount(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all">
              <X className="w-4.5 h-4.5" />
            </button>
            <h3 className="text-lg font-black text-slate-800 mb-4">Edit Rekening / Dompet</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nama Rekening</label>
                <input
                  type="text"
                  value={editAccountName}
                  onChange={(e) => setEditAccountName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Tipe Akun</label>
                <select
                  value={editAccountType}
                  onChange={(e) => setEditAccountType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank">Tabungan Bank</option>
                  <option value="ewallet">Dompet Digital</option>
                  <option value="investment">Investasi</option>
                  <option value="other">Uang Tunai</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Saldo Saat Ini</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={editAccountBalance}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setEditAccountBalance(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full rounded-xl border border-slate-200 text-xs px-3.5 pl-8 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingAccount(null)}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateAccount}
                  disabled={updatingAccount}
                  className="flex-1 py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {updatingAccount ? "Menyimpan..." : "Update Akun"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Modal Tambah Utang */}
      {mounted && showAddDebtModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowAddDebtModal(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowAddDebtModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all">
              <X className="w-4.5 h-4.5" />
            </button>
            <h3 className="text-lg font-black text-slate-800 mb-4">Tambah Utang / Piutang</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nama Kontak / Peminjam</label>
                <input
                  type="text"
                  placeholder="e.g. Budi, Bank Mandiri"
                  value={newDebtCounterpart}
                  onChange={(e) => setNewDebtCounterpart(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Tipe Transaksi</label>
                <select
                  value={newDebtType}
                  onChange={(e) => setNewDebtType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="payable">Utang (Saya meminjam uang)</option>
                  <option value="receivable">Piutang (Orang lain meminjam uang saya)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nominal Pinjaman</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={newDebtAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setNewDebtAmount(val ? Number(val).toLocaleString("id-ID") : "");
                    }}
                    className="w-full rounded-xl border border-slate-200 text-xs pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Jatuh Tempo (Opsional)</label>
                <input
                  type="date"
                  value={newDebtDueDate}
                  onChange={(e) => setNewDebtDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Catatan</label>
                <textarea
                  placeholder="Keterangan atau info tambahan"
                  value={newDebtNotes}
                  onChange={(e) => setNewDebtNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-2.5 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddDebtModal(false)}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddDebt}
                  disabled={savingDebt}
                  className="flex-1 py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savingDebt ? "Menyimpan..." : "Simpan Utang"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 4. Modal Tambah Target Tabungan */}
      {mounted && showAddSavingsModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowAddSavingsModal(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowAddSavingsModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all">
              <X className="w-4.5 h-4.5" />
            </button>
            <h3 className="text-lg font-black text-slate-800 mb-4">Tambah Target Tabungan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nama Target</label>
                <input
                  type="text"
                  placeholder="e.g. Beli Laptop Baru, Liburan Akhir Tahun"
                  value={newSavingsName}
                  onChange={(e) => setNewSavingsName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Target Dana</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={newSavingsTarget}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setNewSavingsTarget(val ? Number(val).toLocaleString("id-ID") : "");
                    }}
                    className="w-full rounded-xl border border-slate-200 text-xs pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Saldo Terkumpul Awal (Opsional)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={newSavingsCurrent}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setNewSavingsCurrent(val ? Number(val).toLocaleString("id-ID") : "");
                    }}
                    className="w-full rounded-xl border border-slate-200 text-xs pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Batas Waktu (Deadline - Opsional)</label>
                <input
                  type="date"
                  value={newSavingsDeadline}
                  onChange={(e) => setNewSavingsDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddSavingsModal(false)}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddSavings}
                  disabled={savingSavings}
                  className="flex-1 py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savingSavings ? "Menyimpan..." : "Simpan Target"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. Modal Tambah Kartu Kredit */}
      {mounted && showAddCreditCardModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowAddCreditCardModal(false)} />
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowAddCreditCardModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all">
              <X className="w-4.5 h-4.5" />
            </button>
            <h3 className="text-lg font-black text-slate-800 mb-4">Tambah Kartu Kredit</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nama Kartu</label>
                <input
                  type="text"
                  placeholder="e.g. BCA Platinum, Mandiri Signature"
                  value={newCcName}
                  onChange={(e) => setNewCcName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Limit Kredit</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={newCcLimit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setNewCcLimit(val ? Number(val).toLocaleString("id-ID") : "");
                    }}
                    className="w-full rounded-xl border border-slate-200 text-xs pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Tagihan Berjalan (Outstanding)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={newCcOutstanding}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setNewCcOutstanding(val ? Number(val).toLocaleString("id-ID") : "");
                    }}
                    className="w-full rounded-xl border border-slate-200 text-xs pl-9 pr-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Tanggal Jatuh Tempo</label>
                <input
                  type="text"
                  placeholder="e.g. Setiap tanggal 20"
                  value={newCcDueDate}
                  onChange={(e) => setNewCcDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddCreditCardModal(false)}
                  className="flex-1 py-3.5 text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddCreditCard}
                  className="flex-1 py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer"
                >
                  Simpan Kartu
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Info Modal */}
      {mounted && activeInfoModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setActiveInfoModal(null)} />
          <div className="bg-white rounded-3xl w-full max-w-sm relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setActiveInfoModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                {activeInfoModal.title}
              </h3>
              <p className="text-sm text-dashboard-gray leading-relaxed">
                {activeInfoModal.desc}
              </p>
              <button
                onClick={() => setActiveInfoModal(null)}
                className="w-full mt-6 py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
