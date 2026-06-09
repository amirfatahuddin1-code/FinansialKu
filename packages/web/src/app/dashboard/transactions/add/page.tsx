"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  ChevronLeft,
  CalendarDays,
  ChevronDown,
  Save,
  X,
  Plus,
  Loader2,
  Check,
} from "lucide-react";
import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useAuth, useWorkspace } from "@/providers";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { QuickAddAccountModal } from "@/components/QuickAddAccountModal";
import { TagSelector } from "@/components/TagSelector";
import { serializeDescriptionAndTags } from "@/utils/tagUtils";

const TX_TYPES = [
  {
    key: "income" as const,
    label: "Pemasukan",
    icon: <ArrowUpRight className="h-6 w-6" />,
    color: "bg-green-50 text-green-600 border-green-200",
    activeColor: "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20",
  },
  {
    key: "expense" as const,
    label: "Pengeluaran",
    icon: <ArrowDownRight className="h-6 w-6" />,
    color: "bg-red-50 text-red-500 border-red-200",
    activeColor: "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20",
  },
  {
    key: "savings" as const,
    label: "Tabungan",
    icon: <PiggyBank className="h-6 w-6" />,
    color: "bg-blue-50 text-dashboard-blue border-blue-200",
    activeColor: "bg-dashboard-blue text-white border-dashboard-blue shadow-lg shadow-blue-500/20",
  },
];

type TabType = "expense" | "income" | "savings";

const TAB_LABELS: Record<TabType, string> = {
  expense: "Pengeluaran",
  income: "Pemasukan",
  savings: "Tabungan",
};

const ICON_OPTIONS = [
  "🍔", "🚗", "🏠", "🛒", "💊", "📚", "🎬", "✈️",
  "👕", "📱", "🐾", "🎮", "🏥", "🎓", "💼", "🎵",
  "☕", "🎂", "🔧", "💡", "📦", "🎁", "🏋️", "🧘",
  "💻", "🎨", "🌿", "💰", "🏦", "📊", "💳", "⭐",
];

const COLOR_OPTIONS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#64748b",
];

const CATEGORIES_INCOME = [
  { emoji: "💼", label: "Gaji" },
  { emoji: "💻", label: "Freelance" },
  { emoji: "🎁", label: "Bonus" },
  { emoji: "📈", label: "Investasi" },
  { emoji: "🏪", label: "Bisnis" },
  { emoji: "💰", label: "Lainnya" },
];

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

const CATEGORIES_SAVINGS = [
  { emoji: "🏦", label: "Tabungan" },
];

const ACCOUNTS = [
  { emoji: "🏦", label: "BCA" },
  { emoji: "🏦", label: "Mandiri" },
  { emoji: "📱", label: "GoPay" },
  { emoji: "📱", label: "OVO" },
  { emoji: "📈", label: "Bibit" },
  { emoji: "💵", label: "Cash" },
];

type TxType = "income" | "expense" | "savings";

export default function AddTransactionPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();
  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Add Category Modal States
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");
  const [newCatColor, setNewCatColor] = useState("#3b82f6");
  const [newCatType, setNewCatType] = useState<TabType>("expense");
  const [savingCategory, setSavingCategory] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Savings target integration states
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [selectedSavingsId, setSelectedSavingsId] = useState("");
  const [isSavingsDropdownOpen, setIsSavingsDropdownOpen] = useState(false);
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false);

  // States for new savings goal modal
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalColor, setGoalColor] = useState("#10b981");
  const [goalSaving, setGoalSaving] = useState(false);

  const savingsDropdownRef = useRef<HTMLDivElement>(null);

  const setToCurrentTime = () => {
    const today = new Date();
    const hours = String(today.getHours()).padStart(2, "0");
    const minutes = String(today.getMinutes()).padStart(2, "0");
    setTime(`${hours}:${minutes}`);
  };

  useEffect(() => {
    // Set date to today's local date on mount
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setDate(`${year}-${month}-${day}`);

    const hours = String(today.getHours()).padStart(2, "0");
    const minutes = String(today.getMinutes()).padStart(2, "0");
    setTime(`${hours}:${minutes}`);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const acc = params.get("account");
      const type = params.get("type");
      if (acc) {
        setSelectedAccount(acc);
      }
      if (type === "transfer" || type === "income" || type === "expense" || type === "savings") {
        setTxType(type === "transfer" ? "expense" : type);
      }
    }
  }, []);

  // Lock category to Tabungan automatically when txType is savings
  useEffect(() => {
    if (txType === "savings") {
      setSelectedCategory("Tabungan");
    } else {
      setSelectedCategory("");
    }
  }, [txType]);

  useEffect(() => {
    async function loadAccountsAndCategories() {
      if (!user || !activeWorkspace) return;
      try {
        const [accRes, catRes, savingsRes] = await Promise.all([
          api.accounts.getAll(),
          api.categories.getAll(),
          api.savings.getAll(),
        ]);
        if (accRes.data) {
          setDbAccounts(accRes.data);
        }
        if (catRes.data) {
          setDbCategories(catRes.data);
        }
        if (savingsRes.data) {
          setSavingsGoals(savingsRes.data);
        }
      } catch (err) {
        console.error("Gagal memuat data akun, kategori, dan target tabungan:", err);
      }
    }
    loadAccountsAndCategories();
  }, [user, activeWorkspace, api]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (savingsDropdownRef.current && !savingsDropdownRef.current.contains(event.target as Node)) {
        setIsSavingsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddAccountSuccess = async (newAcc: any) => {
    try {
      const res = await api.accounts.getAll();
      if (res.data) {
        setDbAccounts(res.data);
      }
    } catch (err) {
      console.error(err);
      setDbAccounts((prev) => [...prev, newAcc]);
    }
    setSelectedAccount(newAcc.name);
  };

  const isDatabaseEmpty = dbAccounts.length === 0;
  const accountsToUse = isDatabaseEmpty
    ? ACCOUNTS.map((acc) => ({ icon: acc.emoji, name: acc.label }))
    : dbAccounts.map((acc) => ({
        icon: acc.icon || "🏦",
        name: acc.name,
      }));

  const handleSave = async () => {
    if (!user || !activeWorkspace) return;
    if (!amount) {
      alert("Jumlah transaksi tidak boleh kosong");
      return;
    }
    if (!selectedCategory) {
      alert("Silakan pilih kategori");
      return;
    }
    if (!selectedAccount) {
      alert("Silakan pilih akun");
      return;
    }

    setSaving(true);
    try {
      const amountNum = Number(amount.replace(/\D/g, ""));
      
      // Find category ID
      let categoryId = "";
      if (dbCategories.length > 0) {
        const found = dbCategories.find(
          (c) => c.name.toLowerCase() === selectedCategory.toLowerCase() && c.type === txType
        );
        if (found) {
          categoryId = found.id;
        }
      }

      // If category not found, create/get it
      if (!categoryId) {
        const defaultCats = txType === "income"
          ? CATEGORIES_INCOME
          : txType === "savings"
          ? CATEGORIES_SAVINGS
          : CATEGORIES_EXPENSE;
        const matchingCat = defaultCats.find(c => c.label === selectedCategory);
        const catConfig = {
          name: selectedCategory,
          type: txType,
          icon: matchingCat?.emoji || "💰",
          color: txType === "income" ? "#10b981" : txType === "savings" ? "#3b82f6" : "#ef4444",
        };
        const { data: newCat, error: catErr } = await api.categories.getOrCreateByName(user.id, catConfig as any);
        if (catErr) throw catErr;
        if (newCat) {
          categoryId = newCat.id;
        }
      }

      // Find account ID
      let accountId = "";
      if (dbAccounts.length > 0) {
        const found = dbAccounts.find(
          (a) => a.name.toLowerCase() === selectedAccount.toLowerCase()
        );
        if (found) {
          accountId = found.id;
        }
      }

      // If database is empty, create the account
      if (!accountId && isDatabaseEmpty) {
        const typeMapped = (selectedAccount === "GoPay" || selectedAccount === "OVO" 
          ? "ewallet" 
          : selectedAccount === "Bibit" 
          ? "investment" 
          : selectedAccount === "Cash" 
          ? "other" 
          : "bank") as "other" | "bank" | "ewallet" | "investment";
        const colorMapped = typeMapped === "bank" ? "#0066AE" : typeMapped === "ewallet" ? "#00AED6" : typeMapped === "investment" ? "#00E676" : "#10b981";
        const emojiMapped = selectedAccount === "GoPay" || selectedAccount === "OVO" ? "📱" : selectedAccount === "Bibit" ? "📈" : selectedAccount === "Cash" ? "💵" : "🏦";
        
        const { data: newAcc, error: accErr } = await api.accounts.create(user.id, {
          name: selectedAccount,
          type: typeMapped,
          is_default: false,
          color: colorMapped,
          icon: emojiMapped,
          balance: 0,
        });
        if (accErr) throw accErr;
        if (newAcc) {
          accountId = newAcc.id;
        }
      }

      if (!accountId) {
        alert("Akun tidak ditemukan");
        return;
      }

      // If savings goal is selected, update it first
      if (txType === "savings" && selectedSavingsId) {
        const goal = savingsGoals.find((g) => g.id === selectedSavingsId);
        if (goal) {
          const newCurrent = goal.current + amountNum;
          const { error: goalErr } = await api.savings.update(selectedSavingsId, { current: newCurrent });
          if (goalErr) throw goalErr;
        }
      }

      const txDescription = serializeDescriptionAndTags(notes || selectedCategory, selectedTags);

      const [y, m, d] = date.split('-');
      const [h, min] = (time || "00:00").split(':');
      const localDate = new Date(Number(y), Number(m)-1, Number(d), Number(h), Number(min), 0);

      const { error: txErr } = await api.transactions.create(user.id, {
        type: txType,
        amount: amountNum,
        description: txDescription,
        date: localDate.toISOString(),
        category_id: categoryId,
        account_id: accountId,
        savings_id: txType === "savings" && selectedSavingsId ? selectedSavingsId : undefined,
      } as any);

      if (txErr) throw txErr;

      router.push("/dashboard/transactions");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  };

  // Savings Goal Saving Handler (Create new Savings Goal from Transaction Page)
  const handleSaveSavingsGoal = async () => {
    if (!user) return;
    const pTarget = Number(goalTarget.replace(/\D/g, ""));

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
        current: 0,
        deadline: goalDeadline || undefined,
        color: goalColor,
      };

      const { data: newSavings, error } = await api.savings.create(user.id, payload);
      if (error) throw error;

      const savingsRes = await api.savings.getAll();
      if (savingsRes.data) {
        setSavingsGoals(savingsRes.data);
      }
      
      if (newSavings) {
        setSelectedSavingsId(newSavings.id);
      }

      setShowSavingsGoalModal(false);
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan target");
    } finally {
      setGoalSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!user || !newCatName.trim()) return;
    setSavingCategory(true);
    try {
      const res = await api.categories.create("", {
        name: newCatName.trim(),
        icon: newCatIcon,
        color: newCatColor,
        type: newCatType,
      });
      if (res.data) {
        setDbCategories([...dbCategories, res.data]);
        if (newCatType === txType) {
          setSelectedCategory(res.data.name);
        }
      }
      setShowAddCategoryModal(false);
      setNewCatName("");
    } catch (err: any) {
      alert("Gagal menyimpan kategori");
    } finally {
      setSavingCategory(false);
    }
  };

  const baseCategories =
    txType === "income"
      ? CATEGORIES_INCOME
      : txType === "savings"
      ? CATEGORIES_SAVINGS
      : CATEGORIES_EXPENSE;

  const dbCats = dbCategories
    .filter((c) => c.type === txType)
    .map((c) => ({
      label: c.name,
      iconEmoji: c.icon,
      isDb: true,
      color: c.color,
    }));

  const dbCatLabels = new Set(dbCats.map(c => c.label.toLowerCase()));

  const combinedCategories = [
    ...baseCategories
      .filter(c => !dbCatLabels.has(c.label.toLowerCase()))
      .map(c => ({ label: c.label, iconEmoji: c.emoji, isDb: false, color: "" })),
    ...dbCats
  ];

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-2 text-dashboard-gray hover:text-dashboard-blue transition-colors mb-6 text-sm font-bold"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Transaksi
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3 text-slate-800">
          Transaksi Baru
        </h1>
        <p className="text-dashboard-gray text-lg leading-relaxed">
          Catat pemasukan, pengeluaran, atau tabungan baru Anda.
        </p>
      </section>

      <div>
        {/* Transaction Type Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {TX_TYPES.map((type) => (
            <button
              key={type.key}
              onClick={() => {
                setTxType(type.key);
                setSelectedCategory("");
              }}
              className={`rounded-2xl p-6 border-2 flex flex-col items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${
                txType === type.key ? type.activeColor : type.color
              }`}
            >
              {type.icon}
              <span className="text-sm font-black">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="custom-card p-6 md:p-10 space-y-8">
          {/* Amount */}
          <div>
            <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">
              Jumlah
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-lg">
                Rp
              </span>
              <input
                type="text"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-2xl font-black text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all"
              />
            </div>
          </div>

          {/* Category Grid */}
          {txType !== "savings" && (
            <div>
              <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-4 block">
                Kategori
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {combinedCategories.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`rounded-2xl p-4 flex flex-col items-center gap-2 border-2 cursor-pointer transition-all hover:scale-[1.03] active:scale-95 ${
                      selectedCategory === cat.label
                        ? "border-dashboard-blue bg-blue-50 shadow-md shadow-blue-500/10"
                        : "border-slate-100 bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    {cat.isDb ? (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-1 shrink-0 transition-transform"
                        style={{ backgroundColor: cat.color + "20" }}
                      >
                        {cat.iconEmoji}
                      </div>
                    ) : (
                      <CategoryIcon name={cat.label} size="md" className="mb-1" />
                    )}
                    <span
                      className={`text-xs font-bold ${
                        selectedCategory === cat.label
                          ? "text-dashboard-blue"
                          : "text-dashboard-gray"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                ))}
                
                {/* Add Category Button */}
                <button
                  onClick={() => {
                    setNewCatType(txType as TabType);
                    setNewCatName("");
                    setNewCatIcon("📦");
                    setNewCatColor("#3b82f6");
                    setShowAddCategoryModal(true);
                  }}
                  className="rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 bg-transparent hover:border-dashboard-blue hover:bg-blue-50/50 cursor-pointer transition-all hover:scale-[1.03] active:scale-95 text-slate-400 hover:text-dashboard-blue"
                >
                  <Plus className="w-6 h-6 mb-1" />
                  <span className="text-xs font-bold">Tambah</span>
                </button>
              </div>
            </div>
          )}

          {/* Target Tabungan Selection (Only for savings type) */}
          {txType === "savings" && (
            <div>
              <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest block mb-3">
                Target Tabungan
              </label>
              <div className="flex items-stretch gap-3">
                <div className="flex-1 relative" ref={savingsDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSavingsDropdownOpen(!isSavingsDropdownOpen)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-850 cursor-pointer focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all flex items-center justify-between text-left"
                  >
                    {selectedSavingsId ? (
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🎯</span>
                        <span>{savingsGoals.find((g) => g.id === selectedSavingsId)?.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-bold">Pilih target tabungan...</span>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-dashboard-gray transition-transform duration-200 ${
                        isSavingsDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isSavingsDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-150 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSavingsId("");
                          setIsSavingsDropdownOpen(false);
                        }}
                        className="w-full px-5 py-3 text-left text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer border-none bg-transparent"
                      >
                        <span>Pilih target tabungan...</span>
                      </button>
                      {savingsGoals.map((goal) => (
                        <button
                          key={goal.id}
                          type="button"
                          onClick={() => {
                            setSelectedSavingsId(goal.id);
                            setIsSavingsDropdownOpen(false);
                          }}
                          className={`w-full px-5 py-3 text-left text-sm font-bold transition-colors flex items-center gap-3 cursor-pointer border-none bg-transparent ${
                            selectedSavingsId === goal.id
                              ? "bg-blue-50/50 text-dashboard-blue font-black"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-lg">🎯</span>
                          <span>{goal.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGoalName("");
                    setGoalTarget("");
                    setGoalDeadline(() => {
                      const today = new Date();
                      const year = today.getFullYear();
                      const month = String(today.getMonth() + 1).padStart(2, "0");
                      const day = String(today.getDate()).padStart(2, "0");
                      return `${year}-${month}-${day}`;
                    });
                    setGoalColor("#10b981");
                    setShowSavingsGoalModal(true);
                  }}
                  className="px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-2xl text-[11px] font-bold text-blue-600 cursor-pointer transition-all flex flex-col items-center justify-center text-center leading-tight whitespace-nowrap shrink-0"
                >
                  <span>Tambah</span>
                  <span>Target</span>
                </button>
              </div>
            </div>
          )}

          {/* Account */}
          <div>
            <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest block mb-3">
              Akun
            </label>
            <div className="flex items-stretch gap-3">
              <div className="flex-1 relative" ref={accountDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all flex items-center justify-between text-left"
                >
                  {selectedAccount ? (
                    <div className="flex items-center gap-3">
                      <InstitutionLogo
                        name={selectedAccount}
                        icon={accountsToUse.find((a) => a.name === selectedAccount)?.icon}
                        size="sm"
                      />
                      <span>{selectedAccount}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 font-bold">Pilih akun...</span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-dashboard-gray transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-150 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAccount("");
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-5 py-3 text-left text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer border-none bg-transparent"
                    >
                      <span>Pilih akun...</span>
                    </button>
                    {accountsToUse.map((acc) => (
                      <button
                        key={acc.name}
                        type="button"
                        onClick={() => {
                          setSelectedAccount(acc.name);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-5 py-3 text-left text-sm font-bold transition-colors flex items-center gap-3 cursor-pointer border-none bg-transparent ${
                          selectedAccount === acc.name
                            ? "bg-blue-50/50 text-dashboard-blue"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <InstitutionLogo name={acc.name} icon={acc.icon} size="sm" />
                        <span>{acc.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(true)}
                className="px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-2xl text-[11px] font-bold text-blue-600 cursor-pointer transition-all flex flex-col items-center justify-center text-center leading-tight whitespace-nowrap shrink-0"
              >
                <span>Tambah</span>
                <span>Akun</span>
              </button>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">
                Tanggal
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all"
                />
                <CalendarDays className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-dashboard-gray pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 flex items-center justify-between">
                <span>Waktu</span>
                <button
                  type="button"
                  onClick={setToCurrentTime}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-bold normal-case flex items-center gap-1 bg-transparent border-none cursor-pointer"
                >
                  ⏱️ Saat Ini
                </button>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">
              Catatan
            </label>
            <textarea
              placeholder="Tambahkan catatan (opsional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all"
            />
          </div>

          {/* Tag Selector */}
          {user && (
            <TagSelector
              selectedTags={selectedTags}
              onChange={setSelectedTags}
              userId={user.id}
            />
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-dashboard-blue text-white rounded-2xl py-4 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Simpan Transaksi
                </>
              )}
            </button>
            <Link
              href="/dashboard/transactions"
              className="flex-1 bg-white text-slate-600 border-2 border-slate-200 rounded-2xl py-4 font-black text-sm flex items-center justify-center gap-2 hover:border-slate-300 hover:text-slate-800 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
              Batal
            </Link>
          </div>
        </div>
      </div>

      <QuickAddAccountModal
        isOpen={isAddAccountOpen}
        onClose={() => setIsAddAccountOpen(false)}
        onSuccess={handleAddAccountSuccess}
      />

      {/* Savings Goal Modal (Add target tabungan baru) */}
      {showSavingsGoalModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowSavingsGoalModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-800">
                Target Tabungan Baru
              </h3>
              <button onClick={() => setShowSavingsGoalModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer border-none">
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
                <button type="button" onClick={() => setShowSavingsGoalModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-none">
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveSavingsGoal}
                  disabled={goalSaving}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 border-none"
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
      {/* Add Category Modal */}
      {showAddCategoryModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setShowAddCategoryModal(false)}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">
                Tambah Kategori Baru
              </h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Tipe</label>
                <div className="flex gap-2">
                  {(Object.keys(TAB_LABELS) as TabType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewCatType(t)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        newCatType === t
                          ? "bg-dashboard-blue text-white shadow-md shadow-blue-500/20"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {TAB_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Nama Kategori</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue"
                  placeholder="Contoh: Makan Siang"
                  maxLength={30}
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Ikon</label>
                <div className="flex flex-wrap gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewCatIcon(icon)}
                      className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                        newCatIcon === icon
                          ? "bg-dashboard-blue text-white scale-110 shadow-md"
                          : "bg-slate-50 border border-slate-100 hover:bg-slate-100"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">Warna</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCatColor(color)}
                      className={`w-9 h-9 rounded-xl transition-all cursor-pointer ${
                        newCatColor === color ? "ring-4 ring-offset-2 ring-dashboard-blue scale-110" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveCategory}
              disabled={savingCategory || !newCatName.trim()}
              className="w-full mt-6 py-3.5 rounded-2xl bg-dashboard-blue text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingCategory ? "Menyimpan..." : "Tambah Kategori"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
