"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  SlidersHorizontal,
  Plus,
  Loader2,
  X,
  Edit2,
  Trash2,
  Copy,
  CreditCard,
} from "lucide-react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import { useAuth, useWorkspace } from "@/providers";
import { parseDescriptionAndTags } from "@/utils/tagUtils";

const TABS = ["Semua", "Pemasukan", "Pengeluaran", "Tabungan"] as const;
type Tab = (typeof TABS)[number];

const ACCOUNTS = [
  "Semua Akun",
  "BCA",
  "Mandiri",
  "GoPay",
  "OVO",
  "Bibit",
  "Cash",
];

interface Transaction {
  id: number;
  date: string;
  category: string;
  icon: React.ReactNode;
  description: string;
  amount: number;
  account: string;
  type: "income" | "expense" | "savings";
}

const categoryIcon = (name: string, className = "h-4 w-4") => null;

const TRANSACTIONS: Transaction[] = [
  { id: 1, date: "2026-05-31T09:00:00", category: "Gaji", icon: categoryIcon("Gaji"), description: "Gaji Bulanan PT Teknologi Nusantara", amount: 8500000, account: "BCA", type: "income" },
  { id: 2, date: "2026-05-31T08:30:00", category: "Tabungan", icon: categoryIcon("Tabungan"), description: "Setoran Tabungan Darurat", amount: -2000000, account: "Bibit", type: "savings" },
  { id: 3, date: "2026-05-30T13:15:00", category: "Makan", icon: categoryIcon("Makan"), description: "Makan Siang Warteg Bu Siti", amount: -35000, account: "GoPay", type: "expense" },
  { id: 4, date: "2026-05-30T10:00:00", category: "Transport", icon: categoryIcon("Transport"), description: "Grab ke Kantor", amount: -42000, account: "OVO", type: "expense" },
  { id: 5, date: "2026-05-29T18:45:00", category: "Tagihan", icon: categoryIcon("Tagihan"), description: "Listrik PLN Mei 2026", amount: -450000, account: "BCA", type: "expense" },
  { id: 6, date: "2026-05-29T14:30:00", category: "Internet", icon: categoryIcon("Internet"), description: "IndiHome Fiber 50Mbps", amount: -399000, account: "BCA", type: "expense" },
  { id: 7, date: "2026-05-28T09:00:00", category: "Freelance", icon: categoryIcon("Freelance"), description: "Proyek Desain UI Klien Baru", amount: 3500000, account: "Mandiri", type: "income" },
  { id: 8, date: "2026-05-28T16:00:00", category: "Belanja", icon: categoryIcon("Belanja"), description: "Belanja Bulanan Superindo", amount: -875000, account: "BCA", type: "expense" },
  { id: 9, date: "2026-05-27T19:30:00", category: "Hiburan", icon: categoryIcon("Hiburan"), description: "Tiket Bioskop CGV Grand Indonesia", amount: -95000, account: "GoPay", type: "expense" },
  { id: 10, date: "2026-05-27T08:00:00", category: "Langganan", icon: categoryIcon("Langganan"), description: "Langganan Spotify Premium", amount: -54990, account: "BCA", type: "expense" },
  { id: 11, date: "2026-05-26T15:20:00", category: "Makan", icon: categoryIcon("Makan"), description: "Kopi Kenangan Iced Americano", amount: -28000, account: "GoPay", type: "expense" },
  { id: 12, date: "2026-05-26T10:00:00", category: "Kesehatan", icon: categoryIcon("Kesehatan"), description: "Konsultasi Dokter Online Halodoc", amount: -150000, account: "OVO", type: "expense" },
  { id: 13, date: "2026-05-25T11:00:00", category: "Bonus", icon: categoryIcon("Bonus"), description: "Bonus Proyek Q1 2026", amount: 2000000, account: "BCA", type: "income" },
  { id: 14, date: "2026-05-25T07:30:00", category: "Sewa Rumah", icon: categoryIcon("Sewa Rumah"), description: "Sewa Kos Bulanan", amount: -2500000, account: "Mandiri", type: "expense" },
  { id: 15, date: "2026-05-24T17:10:00", category: "Transport", icon: categoryIcon("Transport"), description: "Bensin Pertamax Pertamina", amount: -150000, account: "Cash", type: "expense" },
  { id: 16, date: "2026-05-24T12:00:00", category: "Pendidikan", icon: categoryIcon("Pendidikan"), description: "Kursus Online Udemy React", amount: -189000, account: "BCA", type: "expense" },
  { id: 17, date: "2026-05-23T08:00:00", category: "Tabungan", icon: categoryIcon("Tabungan"), description: "Auto-Invest Bibit Reksadana", amount: -1000000, account: "Bibit", type: "savings" },
  { id: 18, date: "2026-05-22T19:40:00", category: "Makan", icon: categoryIcon("Makan"), description: "GoFood Nasi Padang Sederhana", amount: -55000, account: "GoPay", type: "expense" },
];

function formatRupiah(amount: number) {
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  return `${isNeg ? "-" : ""}Rp${abs.toLocaleString("id-ID")}`;
}

function formatFriendlyDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${datePart} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
}

/** Returns { date: "6 Jun 2026", time: "07:00" } from a friendly date string or ISO string */
function splitDateAndTime(dateStr: string): { datePart: string; timePart: string } {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const datePart = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      const timePart = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return { datePart, timePart };
    }
    // Try splitting formatted string like "6 Jun 2026 07:00"
    const spaceIdx = dateStr.lastIndexOf(" ");
    if (spaceIdx > -1) {
      return { datePart: dateStr.substring(0, spaceIdx), timePart: dateStr.substring(spaceIdx + 1) };
    }
  } catch {}
  return { datePart: dateStr, timePart: "" };
}

const renderSourceBadge = (source?: string) => {
  const s = (source || "manual").toLowerCase();
  
  if (s.startsWith("ai")) {
    return (
      <span className="inline-flex items-center whitespace-nowrap text-[10px] md:text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-xl">
        AI Asisten
      </span>
    );
  }
  if (s.startsWith("telegram")) {
    return (
      <span className="inline-flex items-center whitespace-nowrap text-[10px] md:text-xs font-bold text-sky-600 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-xl">
        Telegram
      </span>
    );
  }
  if (s.startsWith("whatsapp")) {
    return (
      <span className="inline-flex items-center whitespace-nowrap text-[10px] md:text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
        Whatsapp
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center whitespace-nowrap text-[10px] md:text-xs font-bold text-slate-500 bg-slate-100/70 border border-slate-200/50 px-2.5 py-1 rounded-xl">
      Manual
    </span>
  );
};

export default function TransactionsPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const isFamily = activeWorkspace?.type === "family";
  const [activeTab, setActiveTab] = useState<Tab>("Semua");
  const [activeAccount, setActiveAccount] = useState("Semua Akun");
  const [loading, setLoading] = useState(true);
  const [dbTransactions, setDbTransactions] = useState<any[]>([]);
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);

  const [timePeriod, setTimePeriod] = useState<"hari" | "minggu" | "bulan" | "tahun" | "semua">("bulan");
  const [currentDate, setCurrentDate] = useState<Date>(new Date("2026-06-03"));
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<any[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [selectedDetailTx, setSelectedDetailTx] = useState<any | null>(null);
  const [activeSource, setActiveSource] = useState("Semua Sumber");
  const [activeRecorder, setActiveRecorder] = useState("Semua Pengguna");
  const [mockTransactionsList, setMockTransactionsList] = useState<any[]>(TRANSACTIONS);

  const getDateLabel = () => {
    const months = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    
    if (timePeriod === "hari") {
      return currentDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    }
    if (timePeriod === "minggu") {
      const day = currentDate.getDay();
      const diffToMonday = currentDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(currentDate);
      monday.setDate(diffToMonday);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const formatOption: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
      if (monday.getFullYear() !== sunday.getFullYear()) {
        formatOption.year = "numeric";
      }
      return `${monday.toLocaleDateString("id-ID", formatOption)} - ${sunday.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    if (timePeriod === "bulan") {
      return `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (timePeriod === "tahun") {
      return `${currentDate.getFullYear()}`;
    }
    return "Semua Waktu";
  };

  const handlePrevDate = () => {
    const newDate = new Date(currentDate);
    if (timePeriod === "hari") {
      newDate.setDate(currentDate.getDate() - 1);
    } else if (timePeriod === "minggu") {
      newDate.setDate(currentDate.getDate() - 7);
    } else if (timePeriod === "bulan") {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else if (timePeriod === "tahun") {
      newDate.setFullYear(currentDate.getFullYear() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextDate = () => {
    const newDate = new Date(currentDate);
    if (timePeriod === "hari") {
      newDate.setDate(currentDate.getDate() + 1);
    } else if (timePeriod === "minggu") {
      newDate.setDate(currentDate.getDate() + 7);
    } else if (timePeriod === "bulan") {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else if (timePeriod === "tahun") {
      newDate.setFullYear(currentDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: Date[] = [];
    
    const startOffset = firstDay.getDay(); // 0 is Sunday, 1 is Monday, etc.
    
    for (let i = startOffset; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push(d);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push(d);
    }
    
    const totalCells = Math.ceil(days.length / 7) * 7;
    const endOffset = totalCells - days.length;
    for (let i = 1; i <= endOffset; i++) {
      const d = new Date(year, month + 1, i);
      days.push(d);
    }
    
    return days;
  };

  const loadTransactions = useCallback(async () => {
    if (!user || !activeWorkspace) return;
    setLoading(true);
    try {
      const res = await api.transactions.getAll();
      if (res.error) throw res.error;
      setDbTransactions(res.data || []);
    } catch (err) {
      console.error("Gagal memuat transaksi:", err);
    } finally {
      setLoading(false);
    }
  }, [user, activeWorkspace, api]);

  const loadAccounts = useCallback(async () => {
    if (!user || !activeWorkspace) return;
    try {
      const res = await api.accounts.getAll();
      if (res.data) {
        setDbAccounts(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat akun:", err);
    }
  }, [user, activeWorkspace, api]);

  const loadCategories = useCallback(async () => {
    if (!user || !activeWorkspace) return;
    try {
      const res = await api.categories.getAll();
      if (res.data) {
        setDbCategories(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat kategori:", err);
    }
  }, [user, activeWorkspace, api]);

  const deleteSingle = async (id: any) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    
    setLoading(true);
    try {
      if (isDatabaseEmpty) {
        setMockTransactionsList(prev => prev.filter(t => t.id !== id));
      } else {
        const res = await api.transactions.delete(String(id));
        if (res.error) throw res.error;
        await loadTransactions();
      }
    } catch (err) {
      console.error("Gagal menghapus transaksi:", err);
      alert("Gagal menghapus transaksi");
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedTxIds.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedTxIds.length} transaksi terpilih?`)) return;
    
    setLoading(true);
    try {
      if (isDatabaseEmpty) {
        setMockTransactionsList(prev => prev.filter(t => !selectedTxIds.includes(t.id)));
      } else {
        await Promise.all(selectedTxIds.map(id => api.transactions.delete(String(id))));
        await loadTransactions();
      }
      setSelectedTxIds([]);
      setIsSelectionMode(false);
    } catch (err) {
      console.error("Gagal menghapus transaksi terpilih:", err);
      alert("Gagal menghapus beberapa transaksi");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (updatedData: {
    amount: number;
    description: string;
    category: string;
    account: string;
    date: string;
    type: "income" | "expense" | "savings";
  }) => {
    setLoading(true);
    try {
      if (isDatabaseEmpty) {
        setMockTransactionsList(prev => prev.map(t => {
          if (t.id === editingTransaction.id) {
            return {
              ...t,
              amount: updatedData.type === "income" ? Math.abs(updatedData.amount) : -Math.abs(updatedData.amount),
              description: updatedData.description,
              category: updatedData.category,
              account: updatedData.account,
              date: formatFriendlyDate(updatedData.date),
              type: updatedData.type,
              rawDate: new Date(updatedData.date)
            };
          }
          return t;
        }));
      } else {
        let categoryId = "";
        const foundCat = dbCategories.find(c => c.name.toLowerCase() === updatedData.category.toLowerCase());
        if (foundCat) categoryId = foundCat.id;
        
        let accountId = "";
        const foundAcc = dbAccounts.find(a => a.name.toLowerCase() === updatedData.account.toLowerCase());
        if (foundAcc) accountId = foundAcc.id;

        const res = await api.transactions.update(String(editingTransaction.id), {
          amount: updatedData.type === "income" ? Math.abs(updatedData.amount) : -Math.abs(updatedData.amount),
          description: updatedData.description,
          category_id: categoryId,
          account_id: accountId || undefined,
          date: updatedData.date,
          type: updatedData.type
        });
        if (res.error) throw res.error;
        await loadTransactions();
      }
      setEditingTransaction(null);
    } catch (err) {
      console.error("Gagal mengedit transaksi:", err);
      alert("Gagal mengedit transaksi");
    } finally {
      setLoading(false);
    }
  };

  const repeatSingle = async (tx: any) => {
    setLoading(true);
    try {
      const today = new Date();
      const getLocalISOString = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const seconds = String(d.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };
      const dateStr = getLocalISOString(today);
      const friendlyDateStr = formatFriendlyDate(dateStr);

      if (isDatabaseEmpty) {
        // Generate new local ID
        const nextId = Math.max(...mockTransactionsList.map(t => t.id), 0) + 1;
        const newTx = {
          ...tx,
          id: nextId,
          date: friendlyDateStr,
          rawDate: today,
        };
        setMockTransactionsList(prev => [newTx, ...prev]);
      } else {
        // Find category ID
        let categoryId = "";
        const foundCat = dbCategories.find(c => c.name.toLowerCase() === tx.category.toLowerCase() && c.type === tx.type);
        if (foundCat) {
          categoryId = foundCat.id;
        } else {
          // Fallback or create category
          const catConfig = {
            name: tx.category,
            type: tx.type,
            icon: "💰",
            color: tx.type === "income" ? "#10b981" : tx.type === "savings" ? "#3b82f6" : "#ef4444",
          };
          const { data: newCat, error: catErr } = await api.categories.getOrCreateByName(user!.id, catConfig as any);
          if (catErr) throw catErr;
          if (newCat) categoryId = newCat.id;
        }

        // Find account ID
        let accountId = "";
        const foundAcc = dbAccounts.find(a => a.name.toLowerCase() === tx.account.toLowerCase());
        if (foundAcc) accountId = foundAcc.id;

        const res = await api.transactions.create(user!.id, {
          amount: tx.amount,
          description: tx.description,
          category_id: categoryId,
          account_id: accountId || undefined,
          date: dateStr,
          type: tx.type,
          source: "manual"
        });
        if (res.error) throw res.error;
        await loadTransactions();
      }
      alert("Transaksi berhasil diulangi!");
    } catch (err) {
      console.error("Gagal mengulangi transaksi:", err);
      alert("Gagal mengulangi transaksi");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectRow = (id: any) => {
    setSelectedTxIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };


  useEffect(() => {
    if (user && activeWorkspace) {
      loadTransactions();
      loadAccounts();
      loadCategories();
    }
  }, [user, activeWorkspace, loadTransactions, loadAccounts, loadCategories]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const acc = params.get("account");
      if (acc) {
        setActiveAccount(acc);
      }
    }
  }, []);

  if (loading && user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Memuat transaksi...</p>
      </div>
    );
  }

  const isDatabaseEmpty = dbTransactions.length === 0;

  const normalizedTransactions = dbTransactions.map(tx => {
    const { description: cleanDesc, tags } = parseDescriptionAndTags(tx.description || "");
    return {
      id: tx.id,
      date: formatFriendlyDate(tx.date),
      category: tx.category?.name || "Lainnya",
      description: cleanDesc,
      rawDescription: tx.description || "",
      tags: tags,
      amount: tx.amount,
      account: tx.account?.name || "Cash",
      destination_account_id: tx.destination_account_id,
      type: tx.type as "income" | "expense" | "savings",
      source: tx.source || "manual",
      recorderName: tx.recorderName || "User",
      rawDate: new Date(tx.date)
    };
  }).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

  const targetList = (isDatabaseEmpty ? mockTransactionsList : normalizedTransactions).map(tx => {
    const { description: cleanDesc, tags } = parseDescriptionAndTags(tx.description || "");
    return {
      ...tx,
      description: cleanDesc,
      tags: (tx as any).tags || tags,
      source: (tx as any).source || "manual",
      recorderName: (tx as any).recorderName || "User",
      accountLabel: (tx as any).destination_account_id
        ? `${tx.account} ➔ ${dbAccounts.find(a => a.id === (tx as any).destination_account_id)?.name || "Akun Tujuan"}`
        : tx.account,
    };
  });

  const dynamicAccounts = isDatabaseEmpty
    ? ["Semua Akun", "BCA", "Mandiri", "GoPay", "OVO", "Bibit", "Cash"]
    : ["Semua Akun", ...Array.from(new Set([
        ...dbAccounts.map(acc => acc.name),
        ...normalizedTransactions.map(tx => tx.account)
      ]))];

  const dynamicRecorders = ["Semua Pengguna", ...Array.from(new Set(
    targetList.map(tx => (tx as any).recorderName || "User")
  ))];

  const parseTxDate = (dStr: string) => {
    let normalized = dStr
      .replace("Mei", "May")
      .replace("Agu", "Aug")
      .replace("Okt", "Oct")
      .replace("Des", "Dec");
    return new Date(normalized);
  };

  const filteredByDate = targetList.filter((t) => {
    const d = (t as any).rawDate || parseTxDate(t.date);
    if (isNaN(d.getTime())) return true;
    
    if (timePeriod === "semua") return true;
    
    if (timePeriod === "hari") {
      return (
        d.getDate() === currentDate.getDate() &&
        d.getMonth() === currentDate.getMonth() &&
        d.getFullYear() === currentDate.getFullYear()
      );
    }
    if (timePeriod === "minggu") {
      const day = currentDate.getDay();
      const diffToMonday = currentDate.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(currentDate);
      monday.setDate(diffToMonday);
      monday.setHours(0,0,0,0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);
      
      return d.getTime() >= monday.getTime() && d.getTime() < sunday.getTime();
    }
    if (timePeriod === "bulan") {
      return (
        d.getMonth() === currentDate.getMonth() &&
        d.getFullYear() === currentDate.getFullYear()
      );
    }
    if (timePeriod === "tahun") {
      return d.getFullYear() === currentDate.getFullYear();
    }
    return true;
  });

  const filtered = filteredByDate.filter((t) => {
    const tabMatch =
      activeTab === "Semua" ||
      (activeTab === "Pemasukan" && t.type === "income") ||
      (activeTab === "Pengeluaran" && t.type === "expense") ||
      (activeTab === "Tabungan" && t.type === "savings");
      
    const accountMatch =
      activeAccount === "Semua Akun" || t.account === activeAccount;
      
    const sourceMatch = (() => {
      if (activeSource === "Semua Sumber") return true;
      const s = (t.source || "manual").toLowerCase();
      if (activeSource === "AI Asisten") return s.startsWith("ai");
      if (activeSource === "Telegram") return s.startsWith("telegram");
      if (activeSource === "Whatsapp") return s.startsWith("whatsapp");
      if (activeSource === "Manual") return s === "manual" || !t.source;
      return true;
    })();

    const recorderMatch =
      !isFamily ||
      activeRecorder === "Semua Pengguna" ||
      ((t as any).recorderName || "User") === activeRecorder;

    const searchMatch =
      !searchQuery ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.account.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.source && t.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.recorderName && t.recorderName.toLowerCase().includes(searchQuery.toLowerCase()));
      
    return tabMatch && accountMatch && sourceMatch && recorderMatch && searchMatch;
  });

  const isAllSelected = filtered.length > 0 && filtered.every(tx => selectedTxIds.includes(tx.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(filtered.map(tx => tx.id));
    }
  };

  const totalIncome = filteredByDate.filter((t) => t.type === "income").reduce(
    (s, t) => s + t.amount,
    0
  );
  const totalExpense = filteredByDate.filter(
    (t) => t.type === "expense"
  ).reduce((s, t) => s + Math.abs(t.amount), 0);
  const getPeriodStartDate = () => {
    if (timePeriod === "semua") return null;
    
    const start = new Date(currentDate);
    if (timePeriod === "hari") {
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (timePeriod === "minggu") {
      const day = currentDate.getDay();
      const diffToMonday = currentDate.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diffToMonday);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    if (timePeriod === "bulan") {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0);
    }
    if (timePeriod === "tahun") {
      return new Date(currentDate.getFullYear(), 0, 1, 0, 0, 0, 0);
    }
    return null;
  };

  const periodStartDate = getPeriodStartDate();
  const saldoAwal = periodStartDate 
    ? targetList
        .filter((t) => {
          const d = (t as any).rawDate || parseTxDate(t.date);
          return !isNaN(d.getTime()) && d.getTime() < periodStartDate.getTime();
        })
        .reduce((sum, t) => {
          const amt = Math.abs(t.amount);
          return sum + (t.type === "income" ? amt : t.type === "savings" ? 0 : -amt);
        }, isDatabaseEmpty ? 15_800_000 : 0)
    : (isDatabaseEmpty ? 15_800_000 : 0);
  const saldoAkhir = saldoAwal + totalIncome - totalExpense;

  const calendarDays = getDaysInMonth(currentDate);
  const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const getDayTransactions = (day: Date) => {
    return targetList.filter((tx) => {
      const d = (tx as any).rawDate || parseTxDate(tx.date);
      return (
        d.getDate() === day.getDate() &&
        d.getMonth() === day.getMonth() &&
        d.getFullYear() === day.getFullYear()
      );
    });
  };


  const checkboxSpan = "col-span-1";
  const tanggalSpan = "col-span-1";
  const kategoriSpan = (isSelectionMode && isFamily) ? "col-span-1" : "col-span-2";
  const keteranganSpan = "col-span-3";
  const dicatatDariSpan = "col-span-1";
  const dicatatOlehSpan = "col-span-2";
  const jumlahSpan = isFamily ? "col-span-1" : "col-span-2";
  const akunSpan = (isSelectionMode || isFamily) ? "col-span-1" : "col-span-2";
  const aksiSpan = "col-span-1";

  return (
    <>
      {/* Header */}
      <section className="mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1 text-slate-800">
            Transaksi
          </h1>
          <p className="text-dashboard-gray text-sm md:text-base leading-relaxed">
            Pantau seluruh transaksi mu
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "calendar"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>
          
          <Link
            href="/dashboard/transactions/add"
            className="bg-dashboard-blue text-white rounded-2xl px-5 py-3 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </Link>
        </div>
      </section>

      {/* Time Filter Tabs Bar */}
      <div className="bg-white border border-slate-200 p-1 rounded-2xl flex w-full mb-4 shadow-sm">
        {(["hari", "minggu", "bulan", "tahun", "semua"] as const).map((period) => (
          <button
            key={period}
            onClick={() => setTimePeriod(period)}
            className={`flex-1 py-2.5 text-center text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              timePeriod === period
                ? "bg-dashboard-blue text-white shadow-md shadow-blue-500/15"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
            }`}
          >
            {period === "hari" ? "Hari Ini" : period === "minggu" ? "Minggu" : period === "bulan" ? "Bulan" : period === "tahun" ? "Tahun" : "Semua"}
          </button>
        ))}
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={handlePrevDate}
          disabled={timePeriod === "semua"}
          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold text-slate-700 border-b border-dotted border-slate-400 pb-0.5 cursor-pointer">
          {getDateLabel()}
        </span>
        <button
          onClick={handleNextDate}
          disabled={timePeriod === "semua"}
          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Search and Filter */}
      <div className="custom-card p-4 mb-5">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, category, label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-2xl text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5 cursor-pointer text-sm font-bold"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            
            {showFilterDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowFilterDropdown(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-150 shadow-xl z-40 p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipe Transaksi</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TABS.map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                            activeTab === tab
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Akun Keuangan</label>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {dynamicAccounts.map((acc) => (
                        <button
                          key={acc}
                          onClick={() => setActiveAccount(acc)}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                            activeAccount === acc
                              ? "bg-blue-50 text-blue-600"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {acc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dicatat Dari</label>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {["Semua Sumber", "Manual", "AI Asisten", "Telegram", "Whatsapp"].map((src) => (
                        <button
                          key={src}
                          onClick={() => setActiveSource(src)}
                          className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                            activeSource === src
                              ? "bg-blue-50 text-blue-600"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {src}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isFamily && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dicatat Oleh</label>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {dynamicRecorders.map((rec) => (
                          <button
                            key={rec}
                            onClick={() => setActiveRecorder(rec)}
                            className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                              activeRecorder === rec
                                ? "bg-blue-50 text-blue-600"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {rec}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bulk Selection controls */}
          {viewMode === "list" && (
            <div className="shrink-0">
              {isSelectionMode ? (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-2xl p-1.5">
                  <span className="text-xs font-bold text-dashboard-blue px-1.5 whitespace-nowrap">
                    {selectedTxIds.length} Terpilih
                  </span>
                  <button
                    onClick={deleteSelected}
                    disabled={selectedTxIds.length === 0}
                    className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedTxIds([]);
                    }}
                    className="px-3.5 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsSelectionMode(true);
                    setSelectedTxIds([]);
                  }}
                  className="px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-2xl text-slate-600 hover:text-blue-600 transition-colors text-sm font-bold cursor-pointer whitespace-nowrap"
                >
                  Pilih Beberapa
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="custom-card p-6 md:p-8 mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <SummaryItem
            label="Saldo Awal"
            value={formatRupiah(saldoAwal)}
            color="text-slate-800"
          />
          <SummaryItem
            label="Total Pemasukan"
            value={`+${formatRupiah(totalIncome)}`}
            color="text-green-600"
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
          <SummaryItem
            label="Total Pengeluaran"
            value={`-${formatRupiah(totalExpense)}`}
            color="text-red-500"
            icon={<ArrowDownRight className="h-4 w-4" />}
          />
          <SummaryItem
            label="Saldo Akhir"
            value={formatRupiah(saldoAkhir)}
            color={saldoAkhir < 0 ? "text-red-500 font-extrabold" : "text-dashboard-blue"}
            highlight
            isWarning={saldoAkhir < 0}
          />
        </div>
      </div>

      {/* View Layout (List vs Calendar) */}
      {viewMode === "list" ? (
        <div className="custom-card overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 md:px-8 py-4 border-b border-slate-100 text-xs font-black text-dashboard-gray uppercase tracking-widest items-center">
            {isSelectionMode && (
              <span className={`${checkboxSpan} flex items-center justify-start`}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
              </span>
            )}
            <span className={tanggalSpan}>Tanggal</span>
            <span className={kategoriSpan}>Kategori</span>
            <span className={keteranganSpan}>Keterangan</span>
            <span className={`${dicatatDariSpan} whitespace-nowrap`}>Dicatat Dari</span>
            {isFamily && <span className={dicatatOlehSpan}>Dicatat Oleh</span>}
            <span className={`${jumlahSpan} text-right`}>Jumlah</span>
            <span className={`${akunSpan} text-right`}>Akun</span>
            <span className={aksiSpan}></span>
          </div>

          {/* Rows */}
          {filtered.map((tx, i) => {
            const isRowSelected = selectedTxIds.includes(tx.id);
            return (
              <div
                key={tx.id}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleSelectRow(tx.id);
                  } else {
                    setSelectedDetailTx(tx);
                  }
                }}
                className={`grid grid-cols-12 gap-4 px-6 md:px-8 py-5 items-center hover:bg-blue-50/40 transition-colors cursor-pointer group ${
                  isRowSelected ? "bg-blue-50/20" : ""
                } ${i < filtered.length - 1 ? "border-b border-slate-50" : ""}`}
              >
                {isSelectionMode && (
                  <div className={`${checkboxSpan} flex items-center justify-start`} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isRowSelected}
                      onChange={() => toggleSelectRow(tx.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                    />
                  </div>
                )}
                <div className={`${tanggalSpan} flex flex-col min-w-0`}>
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                    {splitDateAndTime(tx.date).datePart}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">
                    {splitDateAndTime(tx.date).timePart}
                  </span>
                </div>
                <div className={`${kategoriSpan} flex items-center gap-2.5`}>
                  <CategoryIcon name={tx.category} size="sm" className="group-hover:scale-110 shrink-0" />
                  <span className="text-sm font-bold text-slate-700 truncate">
                    {tx.category}
                  </span>
                </div>
                <div className={`${keteranganSpan} flex flex-col min-w-0`}>
                  <span className="text-sm text-dashboard-gray truncate">
                    {tx.description}
                  </span>
                  {tx.tags && tx.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tx.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-100/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={dicatatDariSpan}>
                  {renderSourceBadge(tx.source)}
                </div>
                {isFamily && (
                  <div className={`${dicatatOlehSpan} truncate`}>
                    <span className="inline-block text-xs font-bold text-slate-600 bg-slate-50 border border-slate-150 px-2.5 py-1.5 rounded-xl truncate max-w-full">
                      {tx.recorderName}
                    </span>
                  </div>
                )}
                <span
                  className={`${jumlahSpan} text-sm font-black text-right ${
                    tx.type === "income" 
                      ? "text-emerald-600" 
                      : tx.type === "savings" 
                      ? "text-amber-500" 
                      : "text-rose-500"
                  }`}
                >
                  {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                  {formatRupiah(Math.abs(tx.amount))}
                </span>
                <span className={`${akunSpan} text-right`}>
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full inline-block truncate max-w-full">
                    {(tx as any).accountLabel || tx.account}
                  </span>
                </span>
                <span className={`${aksiSpan} flex items-center justify-end text-slate-300 group-hover:text-slate-500 transition-colors`}>
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="px-8 py-16 text-center text-dashboard-gray">
              <p className="text-lg font-bold mb-1">Tidak ada transaksi</p>
              <p className="text-sm">
                Coba ubah filter untuk menampilkan data.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="custom-card p-6 md:p-8 overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Weekdays Headers */}
              <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                {weekDays.map((day) => (
                  <div key={day} className="py-2">{day}</div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2.5">
                {calendarDays.map((day, idx) => {
                  const dayTxs = getDayTransactions(day);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday =
                    day.getDate() === new Date().getDate() &&
                    day.getMonth() === new Date().getMonth() &&
                    day.getFullYear() === new Date().getFullYear();
                  
                  const isSelected = selectedDate &&
                    day.getDate() === selectedDate.getDate() &&
                    day.getMonth() === selectedDate.getMonth() &&
                    day.getFullYear() === selectedDate.getFullYear();

                  const dayIncome = dayTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
                  const dayExpense = dayTxs.filter(t => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);
                  
                  // Transaction indicators (dots)
                  const hasIncome = dayTxs.some(t => t.type === "income");
                  const hasExpense = dayTxs.some(t => t.type === "expense" && t.category !== "Langganan" && t.category !== "Tagihan" && t.category !== "Internet");
                  const hasSubscription = dayTxs.some(t => t.type === "expense" && (t.category === "Langganan" || t.category === "Tagihan" || t.category === "Internet"));
                  const hasSavings = dayTxs.some(t => t.type === "savings");
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[95px] p-3 rounded-2xl flex flex-col justify-between transition-all duration-200 cursor-pointer border relative group ${
                        isCurrentMonth
                          ? isSelected
                            ? "bg-blue-50/40 border-dashboard-blue shadow-sm"
                            : "bg-slate-50/40 border-slate-100 hover:bg-slate-100/70 hover:border-slate-200 hover:shadow-sm"
                          : "bg-transparent border-slate-100/40 opacity-30 hover:opacity-50"
                      } ${isToday ? "border-amber-400 bg-amber-50/10" : ""}`}
                    >
                      {/* Top Row: Indicators & Date Number */}
                      <div className="flex justify-between items-start w-full">
                        {/* Dot Indicators */}
                        <div className="flex gap-1 mt-1">
                          {hasIncome && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                          {hasExpense && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                          {hasSubscription && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                          {hasSavings && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        </div>

                        {/* Date Number */}
                        <span
                          className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                            isToday
                              ? "bg-amber-400 text-slate-900"
                              : isCurrentMonth
                              ? isSelected
                                ? "text-dashboard-blue font-black"
                                : "text-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>

                      {/* Bottom Area: Amounts */}
                      <div className="space-y-0.5 text-[10px] font-bold text-right overflow-hidden mt-2">
                        {dayIncome > 0 && (
                          <div className="text-emerald-600 truncate font-semibold">+{formatRupiah(dayIncome)}</div>
                        )}
                        {dayTxs.filter(t => t.type === "savings").reduce((s, t) => s + Math.abs(t.amount), 0) > 0 && (
                          <div className="text-amber-500 truncate font-semibold">
                            {formatRupiah(dayTxs.filter(t => t.type === "savings").reduce((s, t) => s + Math.abs(t.amount), 0))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Divider */}
              <div className="border-t border-slate-100 my-6"></div>

              {/* Bottom Summary & Legend */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
                {/* Monthly Summary Cards (Income, Expense, Saved) */}
                <div className="grid grid-cols-3 gap-2 flex-1 max-w-xl bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <div className="text-center py-2 px-3">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pemasukan</span>
                    <span className="text-xs font-black text-emerald-600">{formatRupiah(totalIncome)}</span>
                  </div>
                  <div className="text-center py-2 px-3 border-x border-slate-200/60">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Pengeluaran</span>
                    <span className="text-xs font-black text-rose-500">{formatRupiah(totalExpense)}</span>
                  </div>
                  <div className="text-center py-2 px-3">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tabungan</span>
                    <span className="text-xs font-black text-amber-500">
                      {formatRupiah(
                        filteredByDate
                          .filter(t => t.type === "savings")
                          .reduce((s, t) => s + Math.abs(t.amount), 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-start md:justify-end text-[11px] font-bold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Pemasukan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Pengeluaran</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Langganan/Tagihan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>Tabungan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Date Transaction Details */}
          {selectedDate && (
            <div className="custom-card p-6 md:p-8 transition-all duration-300">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    Transaksi Tanggal {selectedDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </h3>
                  <p className="text-xs text-dashboard-gray font-semibold mt-0.5">
                    Daftar transaksi pada tanggal terpilih
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs font-bold text-dashboard-blue hover:underline cursor-pointer bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100"
                >
                  Tutup Detail
                </button>
              </div>

              <div className="space-y-4">
                {getDayTransactions(selectedDate).length === 0 ? (
                  <div className="text-center py-8 text-dashboard-gray">
                    <p className="text-sm font-semibold">Tidak ada transaksi pada tanggal ini.</p>
                    <Link
                      href="/dashboard/transactions/add"
                      className="text-xs text-dashboard-blue font-bold hover:underline inline-block mt-2"
                    >
                      + Tambah Transaksi Baru
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                    {getDayTransactions(selectedDate).map((tx) => (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedDetailTx(tx)}
                        className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                            <CategoryIcon name={tx.category} size="sm" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 leading-tight">
                              {tx.description || tx.category}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-black text-dashboard-gray uppercase tracking-widest">
                                {tx.category}
                              </span>
                              <span className="text-[10px] text-slate-300">•</span>
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                {(tx as any).accountLabel || tx.account}
                              </span>
                              <span className="text-[10px] text-slate-300">•</span>
                              {renderSourceBadge((tx as any).source)}
                              {isFamily && (
                                <>
                                  <span className="text-[10px] text-slate-300">•</span>
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    Oleh: {(tx as any).recorderName || "User"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-black shrink-0 ${
                            tx.type === "income" 
                              ? "text-emerald-600" 
                              : tx.type === "savings" 
                              ? "text-amber-500" 
                              : "text-rose-500"
                          }`}
                        >
                          {tx.type === "income" ? "+" : tx.type === "expense" ? "-" : ""}
                          {formatRupiah(Math.abs(tx.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveEdit}
          dbAccounts={dbAccounts}
          dbCategories={dbCategories}
          userId={user?.id}
        />
      )}

      {selectedDetailTx && (
        <TransactionDetailDrawer
          transaction={selectedDetailTx}
          onClose={() => setSelectedDetailTx(null)}
          onEdit={() => {
            setEditingTransaction(selectedDetailTx);
            setSelectedDetailTx(null);
          }}
          onDelete={() => {
            deleteSingle(selectedDetailTx.id);
            setSelectedDetailTx(null);
          }}
          onRepeat={() => {
            repeatSingle(selectedDetailTx);
            setSelectedDetailTx(null);
          }}
        />
      )}
    </>
  );
}

function SummaryItem({
  label,
  value,
  color,
  icon,
  highlight,
  isWarning,
}: {
  label: string;
  value: string;
  color: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  isWarning?: boolean;
}) {
  return (
    <div
      className={`${
        highlight 
          ? isWarning
            ? "bg-rose-50 border border-rose-100/80"
            : "bg-blue-50 border border-blue-100" 
          : "bg-slate-50 border border-slate-100"
      } rounded-2xl p-5 transition-transform hover:scale-[1.02]`}
    >
      <p className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2">
        {label}
      </p>
      <div className={`flex items-center gap-1 ${color} whitespace-nowrap overflow-hidden`}>
        {icon}
        <span className="text-sm sm:text-base md:text-sm lg:text-base xl:text-lg font-black">{value}</span>
      </div>
    </div>
  );
}



interface TransactionDetailDrawerProps {
  transaction: any;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRepeat: () => void;
}

function TransactionDetailDrawer({
  transaction,
  onClose,
  onEdit,
  onDelete,
  onRepeat,
}: TransactionDetailDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setMounted(false);
    setTimeout(onClose, 300);
  };

  if (!isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          mounted ? "opacity-100" : "opacity-0"
        }`} 
        onClick={handleClose} 
      />
      
      {/* Sheet */}
      <div 
        className={`relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl border-t border-slate-100/85 p-6 pb-8 space-y-6 transition-transform duration-300 ease-out transform ${
          mounted ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle indicator */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto -mt-2 mb-2 cursor-pointer" onClick={handleClose} />
        
        {/* Detail Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CategoryIcon name={transaction.category} size="lg" />
            <div>
              <span className="text-[10px] font-black text-dashboard-gray uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
                {transaction.category}
              </span>
              <h3 className="text-lg font-black text-slate-800 mt-1 leading-tight">
                {transaction.description || transaction.category}
              </h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Jumlah</span>
              <span className={`text-base font-black ${
                transaction.type === "income" 
                  ? "text-emerald-600" 
                  : transaction.type === "savings" 
                  ? "text-amber-500" 
                  : "text-rose-500"
              }`}>
                {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                {formatRupiah(Math.abs(transaction.amount))}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Akun</span>
              <span className="text-sm font-bold text-slate-700">{transaction.account}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Tanggal</span>
              <span className="text-sm font-semibold text-slate-600">{transaction.date}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Dicatat Dari</span>
              <span className="inline-block mt-0.5">{renderSourceBadge(transaction.source)}</span>
            </div>
          </div>
        </div>

        {/* Buttons List */}
        <div className="space-y-3">
          {/* Button 1: Ulangi transaksi ini */}
          <button
            onClick={() => {
              onRepeat();
              handleClose();
            }}
            className="w-full flex items-center gap-4 p-3.5 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all cursor-pointer group text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">Ulangi transaksi ini</h4>
              <p className="text-xs text-slate-400 font-medium">Buat transaksi yang sama untuk hari ini</p>
            </div>
          </button>

          {/* Button 2: Edit Transaksi */}
          <button
            onClick={() => {
              onEdit();
              handleClose();
            }}
            className="w-full flex items-center gap-4 p-3.5 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all cursor-pointer group text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">Edit Transaksi</h4>
              <p className="text-xs text-slate-400 font-medium">Ubah jumlah, kategori, atau tanggal</p>
            </div>
          </button>

          {/* Button 3: Hapus Transaksi */}
          <button
            onClick={() => {
              onDelete();
              handleClose();
            }}
            className="w-full flex items-center gap-4 p-3.5 hover:bg-rose-50/30 border border-slate-100 rounded-2xl transition-all cursor-pointer group text-left"
          >
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-600">Hapus Transaksi</h4>
              <p className="text-xs text-slate-400 font-medium">Hapus transaksi ini secara permanen</p>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
