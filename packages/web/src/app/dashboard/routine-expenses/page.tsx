"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  ChevronDown,
  Save,
  X,
  Repeat,
  Sparkles,
  HelpCircle,
  AlertCircle,
  ArrowLeft,
  Bell,
  Zap,
  Lock,
  Crown
} from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { useAuth, useWorkspace } from "@/providers";

interface RoutineExpense {
  id: string;
  name: string;
  type: "bill" | "subscription";
  amount: number;
  dayOfMonth: number;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  remindBefore?: number;
  autoDebit?: boolean;
}

const CATEGORIES_EXPENSE = [
  { emoji: "🍽️", label: "Makan" },
  { emoji: "🚗", label: "Transport" },
  { emoji: "🛍️", label: "Belanja" },
  { emoji: "⚡", label: "Tagihan" },
  { emoji: "🎮", label: "Hiburan" },
  { emoji: "❤️", label: "Kesehatan" },
  { emoji: "🎓", label: "Pendidikan" },
  { emoji: "🏠", label: "Sewa" },
  { emoji: "📱", label: "Internet" },
  { emoji: "☕", label: "Kopi" },
  { emoji: "👕", label: "Pakaian" },
  { emoji: "💇", label: "Perawatan" },
  { emoji: "✈️", label: "Liburan" },
  { emoji: "🎵", label: "Langganan" },
  { emoji: "💡", label: "Lainnya" },
];

const DEFAULT_ACCOUNTS = [
  { emoji: "🏦", name: "BCA" },
  { emoji: "🏦", name: "Mandiri" },
  { emoji: "📱", name: "GoPay" },
  { emoji: "📱", name: "OVO" },
  { emoji: "📈", name: "Bibit" },
  { emoji: "💵", name: "Cash" },
];

function formatRupiah(value: number) {
  return `-Rp${value.toLocaleString("id-ID")}`;
}

export default function RoutineExpensesPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState<"bill" | "subscription">("bill");
  const [expenses, setExpenses] = useState<RoutineExpense[]>([]);
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"bill" | "subscription">("bill");
  const [formAmount, setFormAmount] = useState("");
  const [formDay, setFormDay] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formRemindBefore, setFormRemindBefore] = useState("3");
  const [formAutoDebit, setFormAutoDebit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEditClick = (item: RoutineExpense) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormType(item.type);
    setFormAmount(item.amount.toLocaleString("id-ID"));
    setFormDay(String(item.dayOfMonth));
    setFormAccount(item.accountName);
    setFormCategory(item.categoryName);
    setFormRemindBefore(String(item.remindBefore !== undefined ? item.remindBefore : "3"));
    setFormAutoDebit(item.autoDebit || false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setFormName("");
    setFormAmount("");
    setFormDay("");
    setFormAccount("");
    setFormCategory("");
    setFormRemindBefore("3");
    setFormAutoDebit(false);
    setEditingId(null);
    setIsModalOpen(false);
  };

  // UI State
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch accounts & categories
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const [accRes, catRes] = await Promise.all([
          api.accounts.getAll(),
          api.categories.getAll(),
        ]);
        if (accRes.data) setDbAccounts(accRes.data);
        if (catRes.data) setDbCategories(catRes.data);
      } catch (err) {
        console.error("Gagal mengambil data akun/kategori:", err);
      }
    }
    loadData();
  }, [user, api]);

  // Load routine expenses from localStorage
  useEffect(() => {
    if (!user || !mounted) return;
    try {
      const key = `karsafin_routine_expenses_${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setExpenses(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Gagal memuat pengeluaran rutin dari localStorage:", err);
    } finally {
      setLoading(false);
    }
  }, [user, mounted]);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Save routine expense
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formName.trim()) {
      alert("Nama pengeluaran rutin tidak boleh kosong");
      return;
    }
    const amountNum = Number(formAmount.replace(/\D/g, ""));
    if (amountNum <= 0) {
      alert("Nominal pembayaran harus lebih besar dari 0");
      return;
    }
    const dayNum = Number(formDay);
    if (!dayNum || dayNum < 1 || dayNum > 31) {
      alert("Hari penagihan bulanan harus antara tanggal 1 sampai 31");
      return;
    }
    if (!formAccount) {
      alert("Silakan pilih akun pembayaran");
      return;
    }
    if (!formCategory) {
      alert("Silakan pilih kategori");
      return;
    }

    setSaving(true);
    try {
      // Find category ID
      let categoryId = "";
      const catFound = dbCategories.find(
        (c) => c.name.toLowerCase() === formCategory.toLowerCase() && c.type === "expense"
      );
      if (catFound) {
        categoryId = catFound.id;
      } else {
        // Create category
        const matchingPreset = CATEGORIES_EXPENSE.find(c => c.label === formCategory);
        const { data: newCat, error: catErr } = await api.categories.getOrCreateByName(user.id, {
          name: formCategory,
          type: "expense",
          icon: matchingPreset?.emoji || "💡",
          color: "#ef4444",
        });
        if (catErr) throw catErr;
        if (newCat) categoryId = newCat.id;
      }

      // Find account ID
      let accountId = "";
      const accFound = dbAccounts.find(
        (a) => a.name.toLowerCase() === formAccount.toLowerCase()
      );
      if (accFound) {
        accountId = accFound.id;
      } else {
        // If database is empty, create default account
        const typeMapped = (formAccount === "GoPay" || formAccount === "OVO"
          ? "ewallet"
          : formAccount === "Bibit"
          ? "investment"
          : formAccount === "Cash"
          ? "other"
          : "bank") as "other" | "bank" | "ewallet" | "investment";
        const colorMapped = typeMapped === "bank" ? "#0066AE" : typeMapped === "ewallet" ? "#00AED6" : typeMapped === "investment" ? "#00E676" : "#10b981";
        const emojiMapped = formAccount === "GoPay" || formAccount === "OVO" ? "📱" : formAccount === "Bibit" ? "📈" : formAccount === "Cash" ? "💵" : "🏦";

        const { data: newAcc, error: accErr } = await api.accounts.create(user.id, {
          name: formAccount,
          type: typeMapped,
          is_default: false,
          color: colorMapped,
          icon: emojiMapped,
          balance: 0,
        });
        if (accErr) throw accErr;
        if (newAcc) accountId = newAcc.id;
      }

      if (!accountId) {
        alert("Akun pembayaran tidak valid");
        setSaving(false);
        return;
      }

      // Generate target transaction date in the current month
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const maxDaysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(dayNum, maxDaysInMonth);
      const dateStr = `${year}-${month}-${String(targetDay).padStart(2, "0")}`;

      // Call API to create a live transaction
      const { error: txErr } = await api.transactions.create(user.id, {
        type: "expense",
        amount: amountNum,
        description: formName,
        date: dateStr,
        category_id: categoryId,
        account_id: accountId,
      });

      if (txErr) throw txErr;

      // Save template to localStorage list
      let updatedExpenses = [];
      if (editingId) {
        updatedExpenses = expenses.map((e) =>
          e.id === editingId
            ? {
                ...e,
                name: formName,
                type: formType,
                amount: amountNum,
                dayOfMonth: dayNum,
                accountId: accountId,
                accountName: formAccount,
                categoryId: categoryId,
                categoryName: formCategory,
                remindBefore: Number(formRemindBefore) || 0,
                autoDebit: formAutoDebit,
              }
            : e
        );
      } else {
        const newExpense: RoutineExpense = {
          id: crypto.randomUUID(),
          name: formName,
          type: formType,
          amount: amountNum,
          dayOfMonth: dayNum,
          accountId: accountId,
          accountName: formAccount,
          categoryId: categoryId,
          categoryName: formCategory,
          createdAt: new Date().toISOString(),
          remindBefore: Number(formRemindBefore) || 0,
          autoDebit: formAutoDebit,
        };
        updatedExpenses = [...expenses, newExpense];
      }

      setExpenses(updatedExpenses);

      const key = `karsafin_routine_expenses_${user.id}`;
      localStorage.setItem(key, JSON.stringify(updatedExpenses));

      // Reset Form and close modal
      setFormName("");
      setFormAmount("");
      setFormDay("");
      setFormAccount("");
      setFormCategory("");
      setFormRemindBefore("3");
      setFormAutoDebit(false);
      setEditingId(null);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menyimpan pengeluaran rutin");
    } finally {
      setSaving(false);
    }
  };

  // Delete routine expense
  const handleDelete = (id: string) => {
    if (!user) return;
    if (!confirm("Apakah Anda yakin ingin menghapus pengeluaran rutin ini?")) return;

    const updatedExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(updatedExpenses);

    const key = `karsafin_routine_expenses_${user.id}`;
    localStorage.setItem(key, JSON.stringify(updatedExpenses));
  };

  // Dynamic Lists & Calculations
  const billsList = expenses.filter((e) => e.type === "bill");
  const subsList = expenses.filter((e) => e.type === "subscription");

  const totalBills = billsList.reduce((acc, curr) => acc + curr.amount, 0);
  const totalSubs = subsList.reduce((acc, curr) => acc + curr.amount, 0);

  const displayedList = activeTab === "bill" ? billsList : subsList;

  const accountsToSelect = dbAccounts.length > 0
    ? dbAccounts.map((a) => ({ id: a.id, emoji: a.icon || "🏦", name: a.name }))
    : DEFAULT_ACCOUNTS.map((a, idx) => ({ id: `default-${idx}`, emoji: a.emoji, name: a.name }));

  const categoriesToSelect = CATEGORIES_EXPENSE;

  if (!mounted) return null;

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-dashboard-gray hover:text-dashboard-blue transition-colors mb-6 text-sm font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dasbor
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3 text-slate-800 flex items-center gap-3">
              <Repeat className="h-8 w-8 text-dashboard-blue" />
              Pengeluaran Rutin
            </h1>
            <p className="text-dashboard-gray text-lg leading-relaxed">
              Kelola tagihan bulanan dan langganan aktif Anda secara otomatis.
            </p>
          </div>
          <button
            onClick={() => {
              setFormType(activeTab);
              setFormName("");
              setFormAmount("");
              setFormDay("");
              setFormAccount("");
              setFormCategory("");
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-dashboard-blue hover:bg-blue-700 text-white rounded-2xl py-3.5 px-6 font-black text-sm shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            Tambah Pengeluaran
          </button>
        </div>
      </section>

      {/* Metrics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="custom-card p-6 md:p-8 flex items-center justify-between relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/20">
          <div className="space-y-2">
            <span className="text-xs font-black text-dashboard-gray uppercase tracking-widest block">
              Total Tagihan Bulanan
            </span>
            <div className="text-2xl md:text-3xl font-black text-rose-500">
              {formatRupiah(totalBills)}
            </div>
            <span className="text-xs font-bold text-dashboard-gray block">
              {billsList.length} tagihan aktif saat ini
            </span>
          </div>
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm shrink-0">
            <CreditCard className="h-7 w-7" />
          </div>
        </div>

        <div className="custom-card p-6 md:p-8 flex items-center justify-between relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/20">
          <div className="space-y-2">
            <span className="text-xs font-black text-dashboard-gray uppercase tracking-widest block">
              Total Langganan Bulanan
            </span>
            <div className="text-2xl md:text-3xl font-black text-rose-500">
              {formatRupiah(totalSubs)}
            </div>
            <span className="text-xs font-bold text-dashboard-gray block">
              {subsList.length} langganan aktif saat ini
            </span>
          </div>
          <div className="w-14 h-14 bg-fuchsia-50 text-fuchsia-500 rounded-2xl flex items-center justify-center border border-fuchsia-100 shadow-sm shrink-0">
            <Repeat className="h-7 w-7" />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="mb-6 flex gap-4">
        <button
          onClick={() => setActiveTab("bill")}
          className={`px-6 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer border-2 ${
            activeTab === "bill"
              ? "bg-dashboard-blue text-white border-dashboard-blue shadow-lg shadow-blue-500/20"
              : "border-slate-100 bg-slate-50 hover:border-slate-200 text-dashboard-gray hover:text-slate-800"
          }`}
        >
          Tagihan
        </button>
        <button
          onClick={() => setActiveTab("subscription")}
          className={`px-6 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer border-2 ${
            activeTab === "subscription"
              ? "bg-dashboard-blue text-white border-dashboard-blue shadow-lg shadow-blue-500/20"
              : "border-slate-100 bg-slate-50 hover:border-slate-200 text-dashboard-gray hover:text-slate-800"
          }`}
        >
          Langganan
        </button>
      </section>

      {/* Content List */}
      <section className="space-y-4">
        {loading ? (
          <div className="custom-card p-10 flex items-center justify-center text-dashboard-gray font-bold gap-3">
            <span className="w-6 h-6 border-3 border-dashboard-blue border-t-transparent rounded-full animate-spin" />
            Memuat pengeluaran rutin...
          </div>
        ) : displayedList.length === 0 ? (
          <div className="custom-card p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-150 text-slate-400">
              {activeTab === "bill" ? <CreditCard className="h-8 w-8" /> : <Repeat className="h-8 w-8" />}
            </div>
            <h3 className="text-lg font-black text-slate-700">
              Belum ada {activeTab === "bill" ? "tagihan" : "langganan"} terdaftar
            </h3>
            <p className="text-dashboard-gray text-sm max-w-md">
              Tambahkan pengeluaran rutin Anda untuk memantau siklus keuangan dan mencatatkan transaksi pengeluaran otomatis.
            </p>
            <button
              onClick={() => {
                setFormType(activeTab);
                setFormName("");
                setFormAmount("");
                setFormDay("");
                setFormAccount("");
                setFormCategory("");
                setEditingId(null);
                setIsModalOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-2 text-xs font-black text-dashboard-blue bg-blue-50 border-2 border-blue-100 hover:bg-blue-100 px-5 py-3 rounded-2xl transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Tambah Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayedList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleEditClick(item)}
                className="custom-card p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:border-slate-300 hover:bg-slate-50/40"
              >
                <div className="flex items-center gap-4">
                  <CategoryIcon name={item.categoryName} size="md" className="shrink-0" />
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 text-base">{item.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dashboard-gray font-bold">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Jatuh tempo setiap tanggal {item.dayOfMonth}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300 hidden sm:inline" />
                      <span className="flex items-center gap-1">
                        <InstitutionLogo name={item.accountName} size="sm" className="w-5 h-5" />
                        {item.accountName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-slate-100 pt-3 sm:pt-0 sm:border-none">
                  <div className="text-right sm:space-y-0.5">
                    <div className="text-lg font-black text-rose-500">{formatRupiah(item.amount)}</div>
                    <span className="text-[10px] font-black text-dashboard-gray uppercase tracking-widest">
                      Bulanan
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-red-50 text-dashboard-gray hover:text-red-500 flex items-center justify-center border border-slate-150 hover:border-red-100 transition-colors cursor-pointer shrink-0"
                    title="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Dialog Form */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            {/* Backdrop close */}
            <div className="absolute inset-0" onClick={handleCloseModal} />

            {/* Modal Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 relative z-10">
              <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Repeat className="h-5 w-5 text-dashboard-blue" />
                    {editingId ? "Ubah Pengeluaran Rutin" : "Tambah Pengeluaran Rutin"}
                  </h3>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer border-none"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Tipe Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Tipe Pengeluaran
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setFormType("bill")}
                        className={`py-2 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${
                          formType === "bill"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                        }`}
                      >
                        Tagihan
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormType("subscription")}
                        className={`py-2 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${
                          formType === "subscription"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                        }`}
                      >
                        Langganan
                      </button>
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Nama Pengeluaran
                    </label>
                    <input
                      type="text"
                      placeholder='Contoh: "Netflix", "Listrik PLN"'
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Nominal Pembayaran
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">
                        Rp
                      </span>
                      <input
                        type="text"
                        placeholder="0"
                        value={formAmount}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setFormAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                        }}
                        required
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-base font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Day of Month Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Hari Penagihan Bulanan (Tanggal 1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="Setiap tanggal 1 sampai 31"
                      value={formDay}
                      onChange={(e) => setFormDay(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    />
                  </div>

                  {/* Account Dropdown */}
                  <div className="relative" ref={accountDropdownRef}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Akun Pembayaran
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer flex items-center justify-between text-left"
                    >
                      {formAccount ? (
                        <div className="flex items-center gap-2">
                          <InstitutionLogo
                            name={formAccount}
                            icon={accountsToSelect.find((a) => a.name === formAccount)?.emoji}
                            size="sm"
                            className="w-5 h-5"
                          />
                          <span>{formAccount}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-bold">Pilih akun...</span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-dashboard-gray transition-transform duration-200 ${isAccountDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isAccountDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl z-[210] max-h-48 overflow-y-auto py-1.5">
                        {accountsToSelect.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setFormAccount(acc.name);
                              setIsAccountDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm font-bold transition-colors flex items-center gap-2.5 cursor-pointer border-none bg-transparent ${
                              formAccount === acc.name
                                ? "bg-blue-50/50 text-dashboard-blue font-black"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <InstitutionLogo name={acc.name} icon={acc.emoji} size="sm" className="w-5 h-5" />
                            <span>{acc.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category Dropdown */}
                  <div className="relative" ref={categoryDropdownRef}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Kategori
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer flex items-center justify-between text-left"
                    >
                      {formCategory ? (
                        <div className="flex items-center gap-2">
                          <CategoryIcon name={formCategory} size="sm" className="w-5 h-5" />
                          <span>{formCategory}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-bold">Pilih kategori...</span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-dashboard-gray transition-transform duration-200 ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isCategoryDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl z-[210] max-h-48 overflow-y-auto py-1.5">
                        {categoriesToSelect.map((cat) => (
                          <button
                            key={cat.label}
                            type="button"
                            onClick={() => {
                              setFormCategory(cat.label);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm font-bold transition-colors flex items-center gap-2.5 cursor-pointer border-none bg-transparent ${
                              formCategory === cat.label
                                ? "bg-blue-50/50 text-dashboard-blue font-black"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <CategoryIcon name={cat.label} size="sm" className="w-5 h-5" />
                            <span>{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ingatkan Saya Sebelum */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-slate-400" />
                      Ingatkan Saya Sebelum
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {["1", "2", "3", "5", "7"].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setFormRemindBefore(d)}
                          className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            formRemindBefore === d
                              ? "bg-blue-600 border-blue-600 text-white font-extrabold shadow-md shadow-blue-500/15"
                              : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {d} hari
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={formRemindBefore}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setFormRemindBefore(raw);
                        }}
                        placeholder="0"
                        className="w-20 text-center px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <span className="text-xs text-slate-500 font-medium leading-relaxed">
                        Hari sebelum jatuh tempo (0 = pada hari H)
                      </span>
                    </div>
                  </div>

                  {/* Debit Otomatis (Pro Feature Locked) */}
                  <div className="border border-slate-150 rounded-2xl p-4 flex items-center justify-between bg-slate-50/20 relative group overflow-hidden">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-sm text-slate-700 block">Debit Otomatis</span>
                        <span className="text-xs text-slate-455 font-medium leading-relaxed block">
                          Otomatis catat pengeluaran setiap tanggal penagihan
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 select-none">
                      <span className="bg-amber-100 text-amber-700 border border-amber-200/50 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide uppercase flex items-center gap-1 shrink-0">
                        <Crown className="w-2.5 h-2.5" />
                        Pro
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-slate-150 flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Informational Message */}
                  <div className="bg-blue-50 border border-blue-150/50 rounded-2xl p-4 flex gap-3 text-xs text-blue-700">
                    <AlertCircle className="h-5.5 w-5.5 shrink-0 text-blue-500" />
                    <div className="space-y-1">
                      <span className="font-extrabold block">Pencatatan Otomatis</span>
                      <p className="leading-relaxed">
                        Setelah Anda menyimpan pengeluaran rutin ini, sistem akan otomatis langsung membuat satu transaksi pengeluaran rill di daftar transaksi sesuai dengan tanggal hari penagihan yang Anda tentukan di bulan ini.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Simpan & Catat Transaksi
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
