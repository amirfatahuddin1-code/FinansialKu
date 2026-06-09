"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  TrendingUp,
  ArrowRightLeft,
  MoreHorizontal,
  Loader2,
  Search,
  Star,
  X,
  ChevronDown,
  Landmark,
  Wallet,
  Coins,
  Camera,
  ArrowLeft,
  Grid,
  List
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useAuth, useWorkspace } from "@/providers";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { getSupabaseClient } from "@karsafin/shared";
import { CategoryIcon } from "@/components/CategoryIcon";
import { parseDescriptionAndTags } from "@/utils/tagUtils";

interface Account {
  id: string;
  emoji: string;
  name: string;
  type: string;
  typeLabel: string;
  balance: number;
  change: number;
  color: string;
  bgGradient: string;
}

const TABS = [
  { key: "rekomendasi", label: "Rekomendasi" },
  { key: "bank", label: "Bank" },
  { key: "wallet", label: "E-Wallet" },
  { key: "investment", label: "Investasi" }
] as const;

type TabKey = (typeof TABS)[number]["key"];

const AVAILABLE_INSTITUTIONS = {
  bank: [
    { name: "m-BCA", recommended: true },
    { name: "Livin' by Mandiri", recommended: true },
    { name: "BNI Mobile Banking", recommended: true },
    { name: "BRI Mobile", recommended: true },
    { name: "KlikBCA Internet Banking", recommended: true },
    { name: "myBCA", recommended: true },
    { name: "Bank Jago", recommended: true },
    { name: "BRI Internet Banking", recommended: false }
  ],
  wallet: [
    { name: "GoPay", recommended: true },
    { name: "OVO", recommended: true },
    { name: "ShopeePay", recommended: true },
    { name: "DANA", recommended: true },
    { name: "LinkAja", recommended: false },
    { name: "iSAKU", recommended: false },
    { name: "Sakuku", recommended: false },
    { name: "Doku", recommended: false }
  ],
  investment: [
    { name: "Ajaib", recommended: false },
    { name: "Bibit", recommended: false },
    { name: "Stockbit", recommended: false },
    { name: "IPOT", recommended: false },
    { name: "Akseleran", recommended: false },
    { name: "Mandiri Sekuritas", recommended: false },
    { name: "Amartha", recommended: false }
  ]
};

const MOCK_ACCOUNTS: Account[] = [
  {
    id: "mock-1",
    emoji: "🏦",
    name: "BCA",
    type: "Bank",
    typeLabel: "Tabungan",
    balance: 12500000,
    change: 3.2,
    color: "text-blue-600",
    bgGradient: "from-blue-50 to-blue-100/50",
  },
  {
    id: "mock-2",
    emoji: "🏦",
    name: "Mandiri",
    type: "Bank",
    typeLabel: "Tabungan",
    balance: 8200000,
    change: -1.5,
    color: "text-yellow-600",
    bgGradient: "from-yellow-50 to-amber-100/50",
  },
  {
    id: "mock-3",
    emoji: "📱",
    name: "GoPay",
    type: "E-Wallet",
    typeLabel: "Dompet Digital",
    balance: 450000,
    change: 12.0,
    color: "text-green-600",
    bgGradient: "from-green-50 to-emerald-100/50",
  },
  {
    id: "mock-4",
    emoji: "📱",
    name: "OVO",
    type: "E-Wallet",
    typeLabel: "Dompet Digital",
    balance: 280000,
    change: -8.3,
    color: "text-purple-600",
    bgGradient: "from-purple-50 to-violet-100/50",
  },
  {
    id: "mock-5",
    emoji: "📈",
    name: "Bibit",
    type: "Investasi",
    typeLabel: "Reksadana & Saham",
    balance: 15000000,
    change: 5.7,
    color: "text-emerald-600",
    bgGradient: "from-emerald-50 to-teal-100/50",
  },
  {
    id: "mock-6",
    emoji: "💵",
    name: "Cash",
    type: "Cash",
    typeLabel: "Uang Kas",
    balance: 1200000,
    change: -15.0,
    color: "text-orange-600",
    bgGradient: "from-orange-50 to-amber-100/50",
  },
];

function formatRupiah(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

const getAccountTypeStyle = (type: string) => {
  const t = (type || "").toLowerCase().trim();
  if (t.includes("bank")) {
    return {
      Icon: Landmark,
      bg: "bg-blue-50",
      border: "border-blue-100/80",
      text: "text-blue-600"
    };
  }
  if (t.includes("wallet") || t.includes("e-wallet")) {
    return {
      Icon: Wallet,
      bg: "bg-purple-50",
      border: "border-purple-100/80",
      text: "text-purple-600"
    };
  }
  if (t.includes("invest")) {
    return {
      Icon: TrendingUp,
      bg: "bg-indigo-50",
      border: "border-indigo-100/80",
      text: "text-indigo-600"
    };
  }
  return {
    Icon: Coins,
    bg: "bg-emerald-50",
    border: "border-emerald-100/80",
    text: "text-emerald-600"
  };
};

export default function AccountsPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedHistoryAccount, setSelectedHistoryAccount] = useState<any | null>(null);

  // Transfer Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceAccount, setTransferSourceAccount] = useState<any | null>(null);
  const [transferDestAccountId, setTransferDestAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);

  // Layout States
  const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
  const [mockAccountsState, setMockAccountsState] = useState<Account[]>(MOCK_ACCOUNTS);

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAccount, setEditAccount] = useState<any>(null);
  const [editAccountName, setEditAccountName] = useState("");
  const [editAccountIcon, setEditAccountIcon] = useState("");
  const [editAccountBalance, setEditAccountBalance] = useState("");
  const [updating, setUpdating] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabKey>("rekomendasi");
  const [searchQuery, setSearchQuery] = useState("");

  // Step 2 Add Account Form
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [accountName, setAccountName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!user || !activeWorkspace) return;
    setLoading(true);
    try {
      const [accRes, txRes] = await Promise.all([
        api.accounts.getAll(),
        api.transactions.getAll()
      ]);
      if (accRes.error) throw accRes.error;
      if (txRes.error) throw txRes.error;
      setDbAccounts(accRes.data || []);
      setDbTransactions(txRes.data || []);
    } catch (err) {
      console.error("Gagal memuat akun dan transaksi:", err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace, api]);

  useEffect(() => {
    if (user && activeWorkspace) {
      loadAccounts();
    }
  }, [user, activeWorkspace, loadAccounts]);

  // Real-time subscription for financial_accounts changes
  useEffect(() => {
    if (!user || !activeWorkspace) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("accounts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "financial_accounts",
          filter: `workspace_id=eq.${activeWorkspace}`,
        },
        () => { loadAccounts(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeWorkspace, loadAccounts]);

  // Real-time subscription for transactions changes
  useEffect(() => {
    if (!user || !activeWorkspace) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("transactions-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `workspace_id=eq.${activeWorkspace}`,
        },
        () => { loadAccounts(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeWorkspace, loadAccounts]);

  const getBgGradient = (name: string, type: string) => {
    const n = name.toLowerCase().trim();
    if (n.includes("bca")) return "from-blue-50 to-blue-100/50";
    if (n.includes("mandiri")) return "from-yellow-50 to-amber-100/50";
    if (n.includes("gopay")) return "from-green-50 to-emerald-100/50";
    if (n.includes("ovo")) return "from-purple-50 to-violet-100/50";
    if (n.includes("bibit") || n.includes("invest")) return "from-emerald-50 to-teal-100/50";
    if (type === "bank") return "from-blue-50 to-indigo-50";
    if (type === "ewallet") return "from-purple-50 to-pink-50";
    if (type === "investment") return "from-amber-50 to-orange-50";
    return "from-slate-50 to-zinc-100/50";
  };

  const getTextColor = (name: string, type: string) => {
    const n = name.toLowerCase().trim();
    if (n.includes("bca")) return "text-blue-600";
    if (n.includes("mandiri")) return "text-yellow-600";
    if (n.includes("gopay")) return "text-green-600";
    if (n.includes("ovo")) return "text-purple-600";
    if (n.includes("bibit")) return "text-emerald-600";
    if (type === "bank") return "text-blue-600";
    if (type === "ewallet") return "text-purple-600";
    if (type === "investment") return "text-amber-600";
    return "text-slate-600";
  };

  const getTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case "bank": return "Tabungan Bank";
      case "ewallet": return "Dompet Digital";
      case "investment": return "Reksadana & Saham";
      default: return "Uang Kas";
    }
  };

  const isDatabaseEmpty = dbAccounts.length === 0;

  const normalizedDbAccounts = dbAccounts.map((acc) => {
    const txsForAccount = dbTransactions.filter(t => t.account_id === acc.id);
    const incomeTx = txsForAccount.filter(t => t.type === 'income');
    const transferInTx = dbTransactions.filter(t => t.destination_account_id === acc.id);
    const totalIncome = [...incomeTx, ...transferInTx].reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = txsForAccount
      .filter(t => t.type === 'expense' || t.type === 'savings')
      .reduce((sum, t) => sum + t.amount, 0);
    const realTimeBalance = (acc.balance || 0) + totalIncome - totalExpense;

    return {
      id: acc.id,
      name: acc.name,
      type: acc.type === "bank" ? "Bank" : acc.type === "ewallet" ? "E-Wallet" : acc.type === "investment" ? "Investasi" : "Cash",
      typeLabel: getTypeLabel(acc.type),
      balance: realTimeBalance,
      change: acc.change || 0,
      color: getTextColor(acc.name, acc.type),
      bgGradient: getBgGradient(acc.name, acc.type),
      emoji: acc.icon || "🏦"
    };
  });

  const targetAccounts = isDatabaseEmpty ? mockAccountsState : normalizedDbAccounts;

  const totalBalance = targetAccounts.reduce((sum, a) => sum + a.balance, 0);

  const accountsByType = [
    {
      label: "Bank",
      emoji: "🏦",
      count: targetAccounts.filter((a) => a.type.toLowerCase() === "bank").length,
      balance: targetAccounts.filter((a) => a.type.toLowerCase() === "bank").reduce((s, a) => s + a.balance, 0)
    },
    {
      label: "E-Wallet",
      emoji: "📱",
      count: targetAccounts.filter((a) => a.type.toLowerCase() === "e-wallet").length,
      balance: targetAccounts.filter((a) => a.type.toLowerCase() === "e-wallet").reduce((s, a) => s + a.balance, 0)
    },
    {
      label: "Investasi",
      emoji: "📈",
      count: targetAccounts.filter((a) => a.type.toLowerCase() === "investasi" || a.type.toLowerCase() === "invest").length,
      balance: targetAccounts.filter((a) => a.type.toLowerCase() === "investasi" || a.type.toLowerCase() === "invest").reduce((s, a) => s + a.balance, 0)
    },
    {
      label: "Cash",
      emoji: "💵",
      count: targetAccounts.filter((a) => a.type.toLowerCase() === "cash" || a.type.toLowerCase() === "other").length,
      balance: targetAccounts.filter((a) => a.type.toLowerCase() === "cash" || a.type.toLowerCase() === "other").reduce((s, a) => s + a.balance, 0)
    },
  ];

  // Filtering modal institutions based on tab and search query
  const getFilteredInstitutions = () => {
    const query = searchQuery.toLowerCase().trim();
    
    let list: { name: string; recommended: boolean; type: "bank" | "ewallet" | "investment" }[] = [];

    if (selectedTab === "rekomendasi") {
      const banks = AVAILABLE_INSTITUTIONS.bank.filter(i => i.recommended).map(i => ({ ...i, type: "bank" as const }));
      const wallets = AVAILABLE_INSTITUTIONS.wallet.filter(i => i.recommended).map(i => ({ ...i, type: "ewallet" as const }));
      list = [...banks, ...wallets];
    } else if (selectedTab === "bank") {
      list = AVAILABLE_INSTITUTIONS.bank.map(i => ({ ...i, type: "bank" as const }));
    } else if (selectedTab === "wallet") {
      list = AVAILABLE_INSTITUTIONS.wallet.map(i => ({ ...i, type: "ewallet" as const }));
    } else if (selectedTab === "investment") {
      list = AVAILABLE_INSTITUTIONS.investment.map(i => ({ ...i, type: "investment" as const }));
    }

    if (query) {
      const allList = [
        ...AVAILABLE_INSTITUTIONS.bank.map(i => ({ ...i, type: "bank" as const })),
        ...AVAILABLE_INSTITUTIONS.wallet.map(i => ({ ...i, type: "ewallet" as const })),
        ...AVAILABLE_INSTITUTIONS.investment.map(i => ({ ...i, type: "investment" as const }))
      ];
      return allList.filter(i => i.name.toLowerCase().includes(query));
    }

    return list;
  };

  const handleSelectInstitution = (inst: any) => {
    setSelectedInstitution(inst);
    setAccountName(inst.name);
    setInitialBalance("");
    setShowAddModal(false);
    setShowFormModal(true);
  };

  const handleCreateAccount = async () => {
    if (!user || !accountName.trim() || !selectedInstitution) return;
    setSaving(true);
    try {
      const typeMapped = selectedInstitution.type === "wallet" ? "ewallet" : selectedInstitution.type;
      const balanceNum = Number(initialBalance.replace(/\D/g, ""));
      
      const { data: newAcc, error } = await api.accounts.create(user.id, {
        name: accountName.trim(),
        type: typeMapped,
        is_default: false,
        color: selectedInstitution.type === "bank" ? "#0066AE" : selectedInstitution.type === "wallet" ? "#00AED6" : "#00E676",
        icon: "💳",
        balance: balanceNum,
      });

      if (error) throw error;

      setShowFormModal(false);
      loadAccounts();
    } catch (err) {
      console.error("Gagal menambah akun:", err);
      alert("Gagal menambahkan akun keuangan.");
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!user || !transferSourceAccount || !transferDestAccountId) return;
    
    const amountNum = Number(transferAmount.replace(/\D/g, ""));
    if (amountNum <= 0) {
      alert("Nominal transfer harus lebih dari 0");
      return;
    }

    if (transferSourceAccount.id === transferDestAccountId) {
      alert("Akun asal dan tujuan tidak boleh sama");
      return;
    }

    setTransferSaving(true);
    try {
      if (isDatabaseEmpty) {
        // Mode Demo / Mock Accounts
        setMockAccountsState((prev) =>
          prev.map((acc) => {
            if (acc.id === transferSourceAccount.id) {
              return { ...acc, balance: acc.balance - amountNum };
            }
            if (acc.id === transferDestAccountId) {
              return { ...acc, balance: acc.balance + amountNum };
            }
            return acc;
          })
        );
        setShowTransferModal(false);
        alert("Transfer berhasil disimpan (Mode Demo)");
        return;
      }

      // Mode Database Riil
      // 1. Fetch categories to find/create "Transfer" category of type "savings"
      const catRes = await api.categories.getAll();
      if (catRes.error) throw catRes.error;

      let transferCategoryId = "";
      const categories = catRes.data || [];
      const foundCat = categories.find(
        (c) => c.name.toLowerCase() === "transfer" && c.type === "savings"
      );

      if (foundCat) {
        transferCategoryId = foundCat.id;
      } else {
        // Create the "Transfer" category
        const { data: newCat, error: createCatErr } = await api.categories.create(user.id, {
          name: "Transfer",
          type: "savings",
          icon: "🔄",
          color: "#3B82F6",
        });
        if (createCatErr) throw createCatErr;
        if (newCat) transferCategoryId = newCat.id;
      }

      if (!transferCategoryId) {
        throw new Error("Gagal membuat atau menemukan kategori Transfer");
      }

      // 2. Create transfer transaction
      const { error: txErr } = await api.transactions.create(user.id, {
        type: "savings",
        amount: amountNum,
        description: transferNote.trim() || "Transfer antar akun",
        date: new Date().toISOString(),
        category_id: transferCategoryId,
        account_id: transferSourceAccount.id,
        destination_account_id: transferDestAccountId,
      } as any);

      if (txErr) throw txErr;

      setShowTransferModal(false);
      await loadAccounts();
      alert("Transfer berhasil disimpan");
    } catch (err: any) {
      console.error("Gagal melakukan transfer:", err);
      alert(err.message || "Gagal melakukan transfer dana.");
    } finally {
      setTransferSaving(false);
    }
  };

  const handleOpenEditModal = (account: any) => {
    setEditAccount(account);
    setEditAccountName(account.name);
    setEditAccountIcon(account.emoji || "");
    setEditAccountBalance(account.balance ? Number(account.balance).toLocaleString("id-ID") : "");
    setShowEditModal(true);
  };

  const handleUpdateAccount = async () => {
    if (!editAccount) return;
    setUpdating(true);
    try {
      if (editAccount.id.startsWith("mock-")) {
        setMockAccountsState((prev) =>
          prev.map((acc) =>
            acc.id === editAccount.id
              ? { ...acc, name: editAccountName.trim(), emoji: editAccountIcon, balance: Number(editAccountBalance.replace(/\D/g, "")) }
              : acc
          )
        );
      } else {
        const { error } = await api.accounts.update(editAccount.id, {
          name: editAccountName.trim(),
          icon: editAccountIcon,
          balance: Number(editAccountBalance.replace(/\D/g, "")),
        });
        if (error) throw error;
        await loadAccounts();
      }
      setShowEditModal(false);
    } catch (err) {
      console.error("Gagal memperbarui akun:", err);
      alert("Gagal memperbarui akun keuangan.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading && user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Memuat akun keuangan...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-bold text-dashboard-gray hover:text-dashboard-blue transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Pengaturan
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3 text-slate-800">
            Akun Keuangan
          </h1>
          <p className="text-dashboard-gray text-lg leading-relaxed">
            Kelola semua akun bank, e-wallet, dan investasi Anda.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Layout Toggle */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-1 flex items-center gap-1 shadow-sm select-none">
            <button
              onClick={() => setLayoutMode("grid")}
              className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                layoutMode === "grid"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Kolom (Grid)"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode("list")}
              className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                layoutMode === "list"
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Daftar (List)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button 
            id="tour-add-account-btn"
            onClick={() => {
              setSelectedTab("rekomendasi");
              setSearchQuery("");
              setShowAddModal(true);
            }}
            className="bg-dashboard-blue text-white rounded-2xl px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Akun
          </button>
        </div>
        </div>
      </section>

      {/* Total Balance Card */}
      <div id="tour-accounts-balance" className="custom-card p-8 md:p-10 mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3">
              Total Saldo Keseluruhan
            </p>
            <h2 className="text-4xl md:text-6xl font-black text-slate-800 mb-2">
              {formatRupiah(totalBalance)}
            </h2>
            <div className="flex items-center text-green-500 font-bold text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              +2.8% dibanding bulan lalu
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {accountsByType.map((t) => {
              const style = getAccountTypeStyle(t.label);
              const Icon = style.Icon;
              return (
                <div
                  key={t.label}
                  className="bg-white border border-slate-100 rounded-2xl px-4 py-2.5 flex items-center gap-3.5 shadow-sm"
                >
                  <div className={`w-9 h-9 rounded-xl ${style.bg} ${style.border} border flex items-center justify-center ${style.text} shrink-0`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 leading-tight">{t.label}</p>
                    <p className="text-[10px] font-bold text-dashboard-gray mt-0.5">
                      {t.count} akun · {formatRupiah(t.balance)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accounts Grouped by Type */}
      <div id="tour-accounts-grid" className={layoutMode === "list" ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
        {(() => {
          const groups = [
            { key: "bank", label: "Bank", emoji: "🏦", accounts: targetAccounts.filter(a => a.type === "Bank") },
            { key: "wallet", label: "E-Wallet", emoji: "📱", accounts: targetAccounts.filter(a => a.type === "E-Wallet") },
            { key: "investasi", label: "Investasi", emoji: "📈", accounts: targetAccounts.filter(a => a.type === "Investasi") },
            { key: "tunai", label: "Cash", emoji: "💵", accounts: targetAccounts.filter(a => a.type === "Cash") },
          ].filter(g => g.accounts.length > 0);

          return groups.flatMap((group, gi) => {
            const style = getAccountTypeStyle(group.key);
            const Icon = style.Icon;
            return [
              <div key={`h-${gi}`} className="col-span-full flex items-center gap-3 mt-8 first:mt-0">
                <div className={`w-8 h-8 rounded-lg ${style.bg} ${style.border} border flex items-center justify-center ${style.text} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-800">{group.label}</h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{group.accounts.length} akun</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>,
            ...group.accounts.map((account) => (
              <div
                key={account.id}
                onClick={() => handleOpenEditModal(account)}
                className={`custom-card group hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer relative ${
                  activeMenuId === account.id ? "z-[60]" : "z-10"
                } ${
                  layoutMode === "list"
                    ? "col-span-full flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-6"
                    : "p-4.5"
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${account.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl`} />
                <div className={`relative w-full flex ${activeMenuId === account.id ? "z-30" : "z-10"} ${layoutMode === "list" ? "flex-col md:flex-row md:items-center justify-between gap-4" : "flex-col"}`}>
                  
                  {/* Left Part: Logo + Title + Type */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <InstitutionLogo name={account.name} icon={account.emoji} size={layoutMode === "list" ? "lg" : "sm"} className="shadow-sm border border-slate-100/10 group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className={`font-black text-slate-800 leading-tight ${layoutMode === "list" ? "text-lg" : "text-sm"}`}>{account.name}</h3>
                      <p className="text-[10px] font-bold text-dashboard-gray mt-1">{account.type} · {account.typeLabel}</p>
                    </div>
                  </div>

                  {/* Middle Part: Balance */}
                  <div className={`flex items-center gap-4 ${layoutMode === "list" ? "md:justify-center flex-1" : "justify-between mt-3"}`}>
                    <div className={layoutMode === "list" ? "text-left md:text-right" : ""}>
                      <p className="text-[10px] font-black text-dashboard-gray uppercase tracking-widest mb-0.5">Saldo</p>
                      <p className={`font-black text-slate-800 ${layoutMode === "list" ? "text-xl md:text-2xl" : "text-lg"}`}>{formatRupiah(account.balance)}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${account.change >= 0 ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"}`}>
                      {account.change >= 0 ? <TrendingUp className="h-3 w-3" strokeWidth={2.5} /> : <TrendingUp className="h-3 w-3 rotate-180" strokeWidth={2.5} />}
                      {account.change >= 0 ? "+" : ""}{account.change}%
                    </div>
                  </div>

                  {/* Right Part: Buttons + Edit Dropdown */}
                  <div className={`flex items-center gap-3 shrink-0 ${layoutMode === "list" ? "w-full md:w-auto" : "mt-3.5 pt-3.5 border-t border-slate-100"}`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransferSourceAccount(account);
                        setTransferDestAccountId("");
                        setTransferAmount("");
                        setTransferNote("");
                        setShowTransferModal(true);
                      }}
                      className="flex-1 md:flex-initial bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-dashboard-gray flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="h-3 w-3" /> Transfer
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHistoryAccount(account);
                      }}
                      className="flex-1 md:flex-initial bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-dashboard-gray flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Riwayat
                    </button>
                    
                    <div className={`relative ml-2 ${activeMenuId === account.id ? "z-40" : "z-0"}`} onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === account.id ? null : account.id); }} className="text-slate-350 hover:text-slate-500 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-slate-100">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                      {activeMenuId === account.id && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }} />
                          <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-2 w-40 overflow-hidden">
                            <button onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Yakin ingin menghapus akun ${account.name}?`)) {
                                if (account.id.startsWith("mock-")) {
                                  setMockAccountsState(prev => prev.filter(a => a.id !== account.id));
                                } else {
                                  await api.accounts.delete(account.id);
                                  loadAccounts();
                                }
                              }
                              setActiveMenuId(null);
                            }} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer border-none">
                              Hapus Akun
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )),
          ];
        });
        })()}

        {/* Add Account Card */}
        <div 
          onClick={() => { setSelectedTab("rekomendasi"); setSearchQuery(""); setShowAddModal(true); }} 
          className={`border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:border-dashboard-blue hover:bg-blue-50/30 transition-all cursor-pointer group ${
            layoutMode === "list" ? "col-span-full py-6 min-h-0" : "min-h-[240px]"
          }`}
        >
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-dashboard-blue group-hover:text-white transition-all group-hover:scale-110 shadow-sm border border-slate-50">
            <Plus className="h-6 w-6 text-dashboard-gray group-hover:text-white transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-600 group-hover:text-dashboard-blue transition-colors">Tambah Akun Baru</p>
            <p className="text-xs text-dashboard-gray mt-1">Bank, e-wallet, atau investasi</p>
          </div>
        </div>
      </div>

      {/* SELECT INSTITUTION MODAL */}
      {mounted && showAddModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Search header */}
            <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari akun"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-slate-800 font-bold placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Selector tabs */}
            {!searchQuery && (
              <div className="px-6 py-2 border-b border-slate-50 flex gap-2 overflow-x-auto select-none no-scrollbar shrink-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedTab(tab.key)}
                    className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                      selectedTab === tab.key
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Institutions List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-1.5 min-h-[300px]">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                {searchQuery 
                  ? "Hasil Pencarian" 
                  : selectedTab === "rekomendasi" 
                    ? "Rekomendasi Akun" 
                    : `Tambah akun ${selectedTab} kamu`
                }
              </h3>
              
              {getFilteredInstitutions().length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium text-sm">
                  Akun tidak ditemukan.
                </div>
              ) : (
                getFilteredInstitutions().map((inst) => (
                  <div
                    key={inst.name}
                    onClick={() => handleSelectInstitution(inst)}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full border border-slate-100 bg-white flex items-center justify-center p-1 group-hover:scale-105 transition-transform overflow-hidden shadow-sm shrink-0">
                        <InstitutionLogo name={inst.name} size="md" />
                      </div>
                      <span className="text-sm font-black text-slate-700">{inst.name}</span>
                    </div>
                    {inst.recommended && (
                      <span className="w-7 h-7 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Bottom buttons */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <button 
                onClick={() => {
                  handleSelectInstitution({ name: "Akun Lainnya", type: "other", recommended: false });
                }}
                className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/10 cursor-pointer"
              >
                Tambah Akun Lain
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADD ACCOUNT FORM MODAL */}
      {mounted && showFormModal && selectedInstitution && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowFormModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg text-slate-800">Atur Detail Akun</h3>
              <button onClick={() => setShowFormModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Institution badge */}
              <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 rounded-full border border-slate-200 bg-white flex items-center justify-center p-2 mb-3 shadow-md">
                  <InstitutionLogo name={selectedInstitution.name} size="lg" />
                </div>
                <h4 className="font-black text-base text-slate-800">{selectedInstitution.name}</h4>
                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                  {selectedInstitution.type === "bank" ? "Tabungan Bank" : selectedInstitution.type === "wallet" ? "E-Wallet Digital" : "Aset Investasi"}
                </p>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Nama Akun (Tampilan)
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Contoh: BCA Tabungan, GoPay Pribadi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Saldo Awal
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={initialBalance}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setInitialBalance(raw ? Number(raw).toLocaleString("id-ID") : "");
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
              <button 
                onClick={() => {
                  setShowFormModal(false);
                  setShowAddModal(true);
                }}
                className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-2xl py-3 font-bold text-sm hover:bg-slate-100 cursor-pointer"
              >
                Kembali
              </button>
              <button 
                onClick={handleCreateAccount}
                disabled={saving || !accountName.trim()}
                className="flex-1 bg-blue-600 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Akun
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EDIT ACCOUNT MODAL */}
      {mounted && showEditModal && editAccount && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg text-slate-800">Edit Akun Keuangan</h3>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Current preview */}
              <div className="flex flex-col items-center justify-center text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 rounded-full border border-slate-200 bg-white flex items-center justify-center p-2 mb-3 shadow-md">
                  <InstitutionLogo name={editAccountName} icon={editAccountIcon} size="lg" />
                </div>
                <h4 className="font-black text-base text-slate-800">{editAccountName || "Nama Akun"}</h4>
                <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Pratinjau Kartu</p>
              </div>

              {/* Form Input fields */}
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Nama Akun (Tampilan)
                  </label>
                  <input
                    type="text"
                    value={editAccountName}
                    onChange={(e) => setEditAccountName(e.target.value)}
                    placeholder="Contoh: BCA Tabungan, GoPay Pribadi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Ikon Akun
                  </label>
                  
                  {/* Preset Emojis */}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {["🏦", "📱", "📈", "💵", "💰", "💳", "💸"].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setEditAccountIcon(emoji)}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg transition-all cursor-pointer ${
                          editAccountIcon === emoji
                            ? "bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Custom File Upload */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer transition-colors shadow-sm">
                      <Camera className="h-4 w-4 text-slate-500" />
                      <span>Upload Ikon Kustom</span>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              setEditAccountIcon(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                    
                    {editAccountIcon && editAccountIcon.startsWith("data:image/") && (
                      <button
                        onClick={() => setEditAccountIcon("🏦")}
                        className="text-xs text-red-500 hover:text-red-700 font-bold"
                      >
                        Hapus Kustom
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                    Saldo Saat Ini
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={editAccountBalance}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setEditAccountBalance(raw ? Number(raw).toLocaleString("id-ID") : "");
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-2xl py-3 font-bold text-sm hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button 
                onClick={handleUpdateAccount}
                disabled={updating || !editAccountName.trim()}
                className="flex-1 bg-blue-600 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
              >
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* TRANSACTION HISTORY MODAL */}
      {mounted && selectedHistoryAccount && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setSelectedHistoryAccount(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Riwayat Transaksi</h3>
                <p className="text-xs text-dashboard-gray mt-1">Akun: <span className="font-bold text-slate-700">{selectedHistoryAccount.name}</span></p>
              </div>
              <button onClick={() => setSelectedHistoryAccount(null)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {(() => {
                const historyTransactions = dbTransactions.filter(
                  (t) =>
                    t.account_id === selectedHistoryAccount.id ||
                    t.destination_account_id === selectedHistoryAccount.id
                );
                
                if (historyTransactions.length === 0) {
                  return (
                    <div className="text-center py-12 text-dashboard-gray">
                      <p className="text-sm font-semibold">Belum ada riwayat transaksi pada akun ini.</p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100">
                    {historyTransactions.map((tx) => {
                      const { description: cleanDesc, tags } = parseDescriptionAndTags(tx.description || "");
                      const isIncome = tx.type === 'income' || tx.destination_account_id === selectedHistoryAccount.id;
                      const dateStr = new Date(tx.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      });
                      
                      return (
                        <div key={tx.id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/20 rounded-xl px-2 transition-colors">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <CategoryIcon name={tx.category?.name || "Lainnya"} size="md" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{cleanDesc}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded-md">
                                  {tx.category?.name || "Lainnya"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
                              </div>
                              {tags && tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {tags.map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100/50"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <span className={`text-sm font-extrabold shrink-0 ${isIncome ? "text-emerald-500" : "text-red-500"}`}>
                            {isIncome ? "+" : "-"}{formatRupiah(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <Link
                href={`/dashboard/transactions?account=${selectedHistoryAccount.name}`}
                onClick={() => setSelectedHistoryAccount(null)}
                className="w-full text-center bg-dashboard-blue text-white rounded-2xl py-3 text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors"
              >
                Lihat Selengkapnya di Halaman Transaksi
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* TRANSFER MODAL */}
      {mounted && showTransferModal && transferSourceAccount && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowTransferModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg text-slate-800">Transfer Dana</h3>
              <button onClick={() => setShowTransferModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 flex-1 overflow-y-auto">
              {/* Source Account (Disabled/Label) */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Dari Rekening (Asal)
                </label>
                <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center p-1 overflow-hidden shadow-sm shrink-0">
                    <InstitutionLogo name={transferSourceAccount.name} icon={transferSourceAccount.emoji} size="md" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{transferSourceAccount.name}</p>
                    <p className="text-xs text-dashboard-gray mt-0.5">Saldo: {formatRupiah(transferSourceAccount.balance)}</p>
                  </div>
                </div>
              </div>

              {/* Destination Account Select */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Ke Rekening (Tujuan)
                </label>
                <div className="relative">
                  <select
                    value={transferDestAccountId}
                    onChange={(e) => setTransferDestAccountId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Pilih Rekening Tujuan</option>
                    {targetAccounts
                      .filter((acc) => acc.id !== transferSourceAccount.id)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatRupiah(acc.balance)})
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Nominal Transfer
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={transferAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setTransferAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-right"
                  />
                </div>
              </div>

              {/* Note input */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bayar arisan, transfer bulanan"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-2xl py-3 font-bold text-sm hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleExecuteTransfer}
                disabled={transferSaving || !transferDestAccountId || !transferAmount}
                className="flex-1 bg-blue-600 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
              >
                {transferSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Transfer Sekarang
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
