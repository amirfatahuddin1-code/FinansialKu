"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  X,
  Check,
  Copy,
  Calendar,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  TrendingUp,
  RotateCcw,
  Camera,
  Scan,
} from "lucide-react";
import { useAuth, useWorkspace } from "@/providers";
import type { ShoppingPlan, ShoppingItem } from "@karsafin/shared";
import { getLocalToday } from "@karsafin/shared";

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

function generateId(): string {
  return "item_" + Math.random().toString(36).substr(2, 9);
}

// Helper function to auto-categorize item transactions based on keywords
const categorizeItem = (itemName: string, categories: any[]) => {
  const name = itemName.toLowerCase().trim();
  const mapping = [
    {
      keywords: ['makan', 'minum', 'kopi', 'roti', 'susu', 'beras', 'snack', 'camilan', 'teh', 'jus', 'daging', 'sayur', 'buah', 'mie', 'bakso', 'cafe', 'resto', 'warung', 'kuliner', 'bumbu', 'telur'],
      categoryNames: ['makanan', 'minuman', 'makanan & minuman', 'kuliner', 'pangan']
    },
    {
      keywords: ['bensin', 'parkir', 'tol', 'ojek', 'grab', 'gojek', 'bus', 'kereta', 'tiket', 'service', 'oli', 'kendaraan', 'travel', 'transport', 'taxi', 'taksi'],
      categoryNames: ['transportasi', 'kendaraan', 'transport', 'perjalanan']
    },
    {
      keywords: ['baju', 'celana', 'sepatu', 'tas', 'kaos', 'jaket', 'kemeja', 'sabun', 'shampoo', 'odol', 'sikat', 'tisu', 'belanja', 'toko', 'supermarket', 'mal', 'mall', 'kosmetik', 'makeup', 'skincare'],
      categoryNames: ['belanja', 'kebutuhan pribadi', 'pribadi', 'pakaian', 'fashion']
    },
    {
      keywords: ['buku', 'pen', 'pensil', 'tulis', 'kertas', 'kursus', 'sekolah', 'kuliah', 'spp', 'edukasi', 'pendidikan', 'kuliah'],
      categoryNames: ['pendidikan', 'edukasi', 'sekolah', 'buku']
    },
    {
      keywords: ['obat', 'dokter', 'vitamin', 'sakit', 'klinik', 'apotek', 'sakit', 'sehat', 'kesehatan', 'rs', 'rumah sakit'],
      categoryNames: ['kesehatan', 'medis', 'obat']
    },
    {
      keywords: ['listrik', 'air', 'wifi', 'internet', 'pulsa', 'kuota', 'bpjs', 'tagihan', 'utilitas', 'netflix', 'spotify', 'youtube', 'langganan'],
      categoryNames: ['tagihan', 'utilitas', 'langganan', 'rutin']
    },
    {
      keywords: ['nonton', 'bioskop', 'game', 'liburan', 'wisata', 'rekreasi', 'hiburan', 'konser', 'karaoke', 'jalan-jalan'],
      categoryNames: ['hiburan', 'rekreasi', 'hobi', 'entertainment']
    }
  ];

  for (const map of mapping) {
    const hasKeyword = map.keywords.some(kw => name.includes(kw));
    if (hasKeyword) {
      const matchedCat = categories.find(c =>
        map.categoryNames.some(targetName => c.name.toLowerCase().includes(targetName))
      );
      if (matchedCat) return matchedCat;
    }
  }

  const belanjaCat = categories.find(c => c.name.toLowerCase().includes('belanja'));
  if (belanjaCat) return belanjaCat;

  const lainnyaCat = categories.find(c => c.name.toLowerCase().includes('lain'));
  if (lainnyaCat) return lainnyaCat;

  return categories[0];
};

// Helper function to smart match planned vs realized items
const isSmartMatch = (nameA: string, nameB: string) => {
  const stopWords = new Set([
    'dan', 'atau', 'di', 'ke', 'dari', 'untuk', 'dengan', 'yang', 'ini', 'itu', 'pada',
    'pcs', 'box', 'pack', 'pak', 'bks', 'bungkus', 'botol', 'kaleng', 'biji',
    'and', 'or', 'in', 'to', 'for', 'with', 'the', 'a', 'an', 'at', 'on', 'of', 'baru'
  ]);
  const normalize = (name: string) => {
    return (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));
  };
  const wordsA = normalize(nameA);
  const wordsB = normalize(nameB);
  
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  return wordsA.some(word => wordsB.includes(word));
};

export default function ShoppingPlanningPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [plans, setPlans] = useState<ShoppingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filter Tabs
  const [activeTab, setActiveTab] = useState<"all" | "daily" | "monthly" | "realized">("all");

  // Plan Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [planName, setPlanName] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planType, setPlanType] = useState<"daily" | "monthly">("daily");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Reuse / Copy Modal State
  const [showReuseModal, setShowReuseModal] = useState(false);
  const [reusePlan, setReusePlan] = useState<ShoppingPlan | null>(null);
  const [reuseDate, setReuseDate] = useState("");
  const [reuseName, setReuseName] = useState("");

  // Realization Modal State
  const [showRealizationModal, setShowRealizationModal] = useState(false);
  const [realizationPlan, setRealizationPlan] = useState<ShoppingPlan | null>(null);
  const [realizationItems, setRealizationItems] = useState<ShoppingItem[]>([]);
  const [autoSaveTransaction, setAutoSaveTransaction] = useState(true);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewPlan, setReviewPlan] = useState<ShoppingPlan | null>(null);

  // Summary / Checklist Modal State
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryPlan, setSummaryPlan] = useState<ShoppingPlan | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch shopping plans from Supabase API (with IndexedDB fallback)
      const res = await api.shoppingPlans.getAll();
      setPlans(res.data || []);
    } catch (err) {
      console.error("Gagal memuat rencana belanja:", err);
    } finally {
      setLoading(false);
    }
  }, [user, api, activeWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal
  const handleOpenAddModal = () => {
    setEditId(null);
    setPlanName("");
    setPlanDate(getLocalToday());
    setPlanType("daily");
    setItems([
      { id: generateId(), name: "", qty: 1, unitPrice: 0, total: 0, isRealized: false, realizedAmount: 0 }
    ]);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (plan: ShoppingPlan) => {
    setEditId(plan.id);
    setPlanName(plan.name);
    setPlanDate(plan.date);
    setPlanType(plan.type);
    setItems(plan.items.map(item => ({ ...item, realizedAmount: item.realizedAmount ?? (item.isRealized ? item.total : 0) }))); // clone items
    setShowModal(true);
  };

  // Modal Item manipulation handlers
  const handleAddItemRow = () => {
    setItems([
      ...items,
      { id: generateId(), name: "", qty: 1, unitPrice: 0, total: 0, isRealized: false, realizedAmount: 0 }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (items.length === 1) {
      alert("Minimal harus ada satu barang dalam daftar belanjaan");
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const handleUpdateItemValue = (id: string, field: keyof ShoppingItem, value: any) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Auto-recalculate total for this item row
          if (field === "qty" || field === "unitPrice") {
            const qty = field === "qty" ? Number(value) : item.qty;
            const price = field === "unitPrice" ? Number(value) : item.unitPrice;
            updated.total = qty * price;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Save Shopping Plan
  const handleSavePlan = async () => {
    if (!user) return;
    if (!planName.trim()) {
      alert("Nama rencana belanja tidak boleh kosong");
      return;
    }
    
    // Filter empty items
    const filteredItems = items.filter(item => item.name.trim() !== "");
    if (filteredItems.length === 0) {
      alert("Tambahkan minimal satu nama barang");
      return;
    }

    setSaving(true);
    try {
      const processedItems = items.filter(item => item.name.trim() !== "").map(item => {
        const isItemRealized = typeof item.realizedAmount === "number" && item.realizedAmount > 0;
        return {
          ...item,
          isRealized: isItemRealized,
          realizedAmount: item.realizedAmount ?? 0
        };
      });

      const totalPlanned = processedItems.reduce((sum, item) => sum + item.total, 0);
      const totalRealized = processedItems.reduce((sum, item) => sum + (item.realizedAmount || 0), 0);
      const allRealized = processedItems.every(item => item.isRealized);

      const payload = {
        name: planName.trim(),
        date: planDate,
        type: planType,
        items: processedItems,
        total_planned: totalPlanned,
        total_realized: totalRealized,
        is_realized: allRealized,
      };

      if (editId) {
        const { error } = await api.shoppingPlans.update(editId, payload);
        if (error) throw error;
      } else {
        const { error } = await api.shoppingPlans.create(user.id, payload);
        if (error) throw error;
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan rencana belanja");
    } finally {
      setSaving(false);
    }
  };

  // Delete Plan
  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus rencana belanja "${name}"?`)) {
      return;
    }

    try {
      const { error } = await api.shoppingPlans.delete(id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus rencana");
    }
  };

  // Quick realization toggle for entire plan
  const handleTogglePlanRealization = async (plan: ShoppingPlan) => {
    try {
      // Toggle all items to realized/unrealized
      const nextIsRealized = !plan.is_realized;
      const updatedItems = plan.items.map(item => ({
        ...item,
        isRealized: nextIsRealized,
        realizedAmount: nextIsRealized ? item.total : 0
      }));
      const totalRealized = updatedItems.reduce((sum, item) => sum + (item.realizedAmount || 0), 0);

      const { error } = await api.shoppingPlans.update(plan.id, {
        items: updatedItems,
        total_realized: totalRealized,
        is_realized: nextIsRealized
      });
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui status realisasi");
    }
  };

  // Open Realization Modal
  const openRealizationModal = (plan: ShoppingPlan) => {
    setRealizationPlan(plan);
    setRealizationItems(
      plan.items.map(item => ({
        ...item,
        isRealized: true,
        realizedAmount: item.realizedAmount ?? item.total,
      }))
    );
    setAutoSaveTransaction(true);
    setShowRealizationModal(true);
  };

  const handleUpdateRealizationItem = (id: string, field: keyof ShoppingItem, val: any) => {
    setRealizationItems(
      realizationItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: val };
          if (field === 'qty' || field === 'unitPrice') {
            updated.total = updated.qty * updated.unitPrice;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSaveRealization = async () => {
    if (!user || !realizationPlan) return;
    const invalidItem = realizationItems.some(item => !item.name.trim());
    if (invalidItem) {
      alert('Semua nama barang harus diisi.');
      return;
    }

    // Extract the original planned items from the realizationPlan
    const originalItems = realizationPlan.items.map(item => ({
      id: item.id,
      name: item.plannedName || item.name,
      qty: item.plannedQty !== undefined ? item.plannedQty : item.qty,
      unitPrice: item.plannedUnitPrice !== undefined ? item.plannedUnitPrice : item.unitPrice,
      total: item.plannedTotal !== undefined ? item.plannedTotal : item.total,
    }));

    // Perform smart matching between originalItems and realizationItems
    const matchedOriginalIds = new Set<string>();
    const mergedItems: ShoppingItem[] = [];

    for (const realized of realizationItems) {
      // Direct match by ID first
      let match = originalItems.find(orig => orig.id === realized.id);

      if (!match) {
        // Fallback: smart match by name
        match = originalItems.find(orig => 
          !matchedOriginalIds.has(orig.id) && isSmartMatch(orig.name, realized.name)
        );
      }

      if (match) {
        matchedOriginalIds.add(match.id);
        mergedItems.push({
          id: realized.id,
          name: realized.name.trim(), // Use realized/scanned name
          qty: realized.qty,
          unitPrice: realized.unitPrice,
          total: realized.total,
          isRealized: true,
          realizedAmount: realized.total,
          plannedName: match.name,
          plannedQty: match.qty,
          plannedUnitPrice: match.unitPrice,
          plannedTotal: match.total,
        });
      } else {
        // New item in realization
        mergedItems.push({
          id: realized.id,
          name: realized.name.trim(),
          qty: realized.qty,
          unitPrice: realized.unitPrice,
          total: realized.total,
          isRealized: true,
          realizedAmount: realized.total,
        });
      }
    }

    // Add unmatched planned items (planned but not realized)
    for (const orig of originalItems) {
      if (!matchedOriginalIds.has(orig.id)) {
        mergedItems.push({
          id: orig.id,
          name: orig.name,
          qty: 0,
          unitPrice: 0,
          total: 0,
          isRealized: false,
          realizedAmount: undefined,
          plannedName: orig.name,
          plannedQty: orig.qty,
          plannedUnitPrice: orig.unitPrice,
          plannedTotal: orig.total,
        });
      }
    }

    const totalRealized = realizationItems.reduce((sum, item) => sum + item.total, 0);

    try {
      // Update plan
      const { error } = await api.shoppingPlans.update(realizationPlan.id, {
        items: mergedItems,
        total_realized: totalRealized,
        is_realized: true,
      });
      if (error) throw error;

      // Auto save transactions per item
      if (autoSaveTransaction && realizationItems.length > 0) {
        const { data: catData } = await api.categories.getAll();
        const expenseCategories = catData?.filter(c => c.type === 'expense') || [];

        for (const item of realizationItems) {
          if (item.total <= 0) continue;
          
          const matchedCat = categorizeItem(item.name, expenseCategories);
          
          await api.transactions.create(user.id, {
            type: 'expense',
            amount: item.total,
            description: `${item.name} (${item.qty}x @ Rp ${item.unitPrice.toLocaleString("id-ID")}) - ${realizationPlan.name}`,
            date: getLocalToday(),
            category_id: matchedCat?.id,
          });
        }
      }

      setShowRealizationModal(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to realize plan:', err);
      alert('Gagal merealisasikan rencana belanja');
    }
  };

  const openReviewModal = (plan: ShoppingPlan) => {
    setReviewPlan(plan);
    setShowReviewModal(true);
  };

  const openSummaryModal = (plan: ShoppingPlan) => {
    setSummaryPlan(plan);
    // Reset checked items to unchecked
    const initialChecked: Record<string, boolean> = {};
    plan.items.forEach(i => {
      initialChecked[i.id] = false;
    });
    setCheckedItems(initialChecked);
    setShowSummaryModal(true);
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsScanningReceipt(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const mimeType = file.type;

        const { data: scanResult, error: scanError } = await api.supabase.functions.invoke("scan-receipt", {
          body: { image: base64, mimeType },
        });

        if (scanError || !scanResult?.transactions || scanResult.transactions.length === 0) {
          alert("Tidak bisa membaca nota ini. Pastikan foto jelas dan coba lagi.");
          setIsScanningReceipt(false);
          return;
        }

        const newItems = scanResult.transactions.map((tx: any) => {
          const qty = Number(tx.qty) || 1;
          const amount = Number(tx.amount) || 0;
          const unitPrice = Number(tx.unit_price) || (qty > 0 ? Math.round(amount / qty) : amount) || 0;
          const total = amount || (qty * unitPrice);
          return {
            id: "item_" + Math.random().toString(36).substring(2, 11),
            name: tx.description || "Item Baru",
            qty: qty,
            unitPrice: unitPrice,
            total: total,
            isRealized: true,
            realizedAmount: total,
          };
        });

        if (newItems.length > 0) {
          setRealizationItems(newItems);
        }
        setIsScanningReceipt(false);
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan saat memproses nota.");
        setIsScanningReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Reuse/Duplicate Modal
  const handleOpenReuseModal = (plan: ShoppingPlan) => {
    setReusePlan(plan);
    setReuseName(`Salinan - ${plan.name}`);
    setReuseDate(getLocalToday());
    setShowReuseModal(true);
  };

  // Save reused plan
  const handleSaveReuse = async () => {
    if (!user || !reusePlan) return;
    if (!reuseName.trim()) {
      alert("Nama rencana baru tidak boleh kosong");
      return;
    }

    try {
      // Reset items realization status when copying to new plan
      const freshItems = reusePlan.items.map(item => ({
        ...item,
        isRealized: false,
        realizedAmount: 0
      }));

      const payload = {
        name: reuseName.trim(),
        date: reuseDate,
        type: reusePlan.type,
        items: freshItems,
        total_planned: reusePlan.total_planned,
        total_realized: 0,
        is_realized: false,
      };

      const { error } = await api.shoppingPlans.create(user.id, payload);
      if (error) throw error;

      setShowReuseModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menggunakan kembali rencana");
    }
  };

  // Stats Calculations
  const filteredPlans = plans.filter(p => {
    if (activeTab === "daily") return p.type === "daily" && !p.is_realized;
    if (activeTab === "monthly") return p.type === "monthly" && !p.is_realized;
    if (activeTab === "realized") return p.is_realized;
    return true;
  });

  const totalPlanned = plans.reduce((sum, p) => sum + p.total_planned, 0);
  const totalRealized = plans.reduce((sum, p) => sum + p.total_realized, 0);
  const realizedPercentage = totalPlanned > 0 ? Math.round((totalRealized / totalPlanned) * 100) : 0;
  const remainingBudget = Math.max(totalPlanned - totalRealized, 0);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
        <span className="ml-3 text-slate-500 font-bold">Memuat Rencana Belanja...</span>
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
            className="inline-flex items-center gap-2 text-sm text-dashboard-gray hover:text-rose-500 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Perencanaan
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-slate-800">
            Perencanaan Belanja 🛒
          </h1>
          <p className="text-dashboard-gray max-w-2xl text-lg leading-relaxed">
            Rencanakan kebutuhan belanja harian atau bulanan Anda. Pantau nominal anggaran terhadap realisasi aktual, dan salin rencana untuk tanggal mendatang.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-rose-500 text-white rounded-2xl px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="h-5 w-5" />
          Rencana Belanja Baru
        </button>
      </section>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="custom-card p-6 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Anggaran Rencana</p>
          <p className="text-2xl font-black text-slate-800">{formatRupiah(totalPlanned)}</p>
          <p className="text-xs text-slate-400 mt-1">{plans.length} daftar belanja</p>
        </div>
        <div className="custom-card p-6 border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Pengeluaran Realisasi</p>
          <p className="text-2xl font-black text-emerald-600">{formatRupiah(totalRealized)}</p>
          <p className="text-xs text-slate-400 mt-1">{realizedPercentage}% terealisasi</p>
        </div>
        <div className="custom-card p-6 border-l-4 border-l-amber-500">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sisa Anggaran Belum Dibeli</p>
          <p className="text-2xl font-black text-amber-600">{formatRupiah(remainingBudget)}</p>
          <p className="text-xs text-slate-400 mt-1">{100 - realizedPercentage}% anggaran sisa</p>
        </div>
        <div className="custom-card p-6 border-l-4 border-l-rose-500 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Rasio Realisasi Belanja</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-rose-500">{realizedPercentage}%</span>
              <TrendingUp className="h-5 w-5 text-rose-500" />
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div className="bg-rose-500 h-full transition-all duration-1000" style={{ width: `${realizedPercentage}%` }} />
          </div>
        </div>
      </section>

      {/* Tabs Filter */}
      <section className="flex border-b border-slate-200 mb-8 gap-6">
        {[
          { id: "all", label: "Semua Daftar" },
          { id: "daily", label: "Rencana Harian" },
          { id: "monthly", label: "Rencana Bulanan" },
          { id: "realized", label: "Selesai (Realisasi)" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? "border-b-rose-500 text-rose-500 font-extrabold"
                : "border-b-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {/* Plans Listing Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {filteredPlans.length === 0 ? (
          <div className="custom-card p-12 text-center text-slate-400 col-span-2 flex flex-col items-center gap-3">
            <ShoppingCart className="h-10 w-10 text-slate-300" />
            <p className="font-bold text-slate-500">Tidak ada rencana belanja ditemukan</p>
            <p className="text-xs text-slate-400 max-w-sm">
              Rencanakan pengeluaran belanja Anda atau gunakan rencana sebelumnya dengan menekan tombol rencana baru.
            </p>
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const realizedItemsCount = plan.items.filter(i => i.isRealized).length;
            const progressPct = plan.items.length > 0 ? Math.round((realizedItemsCount / plan.items.length) * 100) : 0;

            return (
              <div
                key={plan.id}
                onClick={() => plan.is_realized ? openReviewModal(plan) : openSummaryModal(plan)}
                className="custom-card p-6 border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between gap-5 relative overflow-hidden group cursor-pointer"
              >
                {/* Background Accent */}
                <div
                  className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.03] -translate-y-6 translate-x-6 bg-gradient-to-br ${
                    plan.is_realized ? "from-emerald-500 to-teal-500" : "from-rose-500 to-red-500"
                  }`}
                />

                {/* Header Card */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        plan.type === "monthly"
                          ? "bg-purple-50 text-purple-600 border border-purple-100"
                          : "bg-blue-50 text-blue-600 border border-blue-100"
                      }`}
                    >
                      {plan.type === "monthly" ? "📅 Bulanan" : "☀️ Harian"}
                    </span>
                    
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        plan.is_realized
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}
                    >
                      {plan.is_realized ? "✓ Selesai" : "⏳ Aktif"}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-rose-500 transition-colors">
                    {plan.name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mb-4">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{new Date(plan.date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
                  </div>

                  {/* Summary of Items */}
                  <div className="space-y-1.5 border-t border-b border-slate-50 py-3 mb-4">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Progres Barang Belanja:</span>
                      <span className="font-bold">{realizedItemsCount} dari {plan.items.length} item ({progressPct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-700 ${plan.is_realized ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Nominal comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Rencana Anggaran</p>
                      <p className="text-base font-black text-slate-700">{formatRupiah(plan.total_planned)}</p>
                    </div>
                    <div className={`rounded-xl p-3 border ${plan.is_realized ? "bg-emerald-50/30 border-emerald-100/50" : "bg-slate-50 border-slate-100/50"}`}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Realisasi Pengeluaran</p>
                      <p className={`text-base font-black ${plan.total_realized > 0 ? "text-emerald-600" : "text-slate-500"}`}>
                        {formatRupiah(plan.total_realized)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-4 gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenEditModal(plan); }}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Edit rencana"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id, plan.name); }}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:border-red-100 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                      title="Hapus rencana"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenReuseModal(plan); }}
                      className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplikat
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (plan.is_realized) {
                          handleTogglePlanRealization(plan);
                        } else {
                          openRealizationModal(plan);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        plan.is_realized
                          ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                          : "bg-rose-50 border-rose-100 text-rose-500 hover:bg-rose-100"
                      }`}
                    >
                      {plan.is_realized ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Batal Realisasi
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          Tandai Selesai
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* PORTALS FOR MODALS */}

      {/* Add/Edit Plan Modal */}
      {mounted && showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-xl transition-all duration-300" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-800">
                {editId ? "Ubah Rencana Belanja" : "Buat Rencana Belanja Baru 🛒"}
              </h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2 block">Nama Belanja</label>
                  <input
                    type="text"
                    placeholder="Mis: Belanja Sayur Mingguan, Bulanan Giant"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2 block">Tanggal Belanja</label>
                  <input
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2 block">Tipe Belanja</label>
                <div className="flex bg-slate-100 rounded-xl p-1 gap-2 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setPlanType("daily")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      planType === "daily" ? "bg-white text-rose-500 shadow-sm" : "text-slate-400"
                    }`}
                  >
                    Harian
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanType("monthly")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                      planType === "monthly" ? "bg-white text-rose-500 shadow-sm" : "text-slate-400"
                    }`}
                  >
                    Bulanan
                  </button>
                </div>
              </div>

              {/* Items Grid Editor */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest block">Daftar Barang Belanjaan</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-rose-500 font-extrabold flex items-center gap-1.5 hover:text-rose-600 cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Tambah Barang
                  </button>
                </div>

                {/* Table Header */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-2 py-1 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                  <div className={editId ? "col-span-4" : "col-span-6"}>Nama Barang</div>
                  <div className="col-span-2">Jumlah</div>
                  <div className="col-span-2">Harga Satuan</div>
                  <div className="col-span-2">Total</div>
                  {editId && <div className="col-span-2 text-center">Realisasi</div>}
                </div>

                {/* Table Rows */}
                <div className="space-y-3 sm:space-y-2 mt-2">
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 sm:p-1.5 sm:bg-transparent bg-slate-50 border sm:border-0 border-slate-100 rounded-2xl sm:rounded-none items-center">
                      
                      {/* Name input */}
                      <div className={`col-span-12 ${editId ? "sm:col-span-4" : "sm:col-span-6"} flex items-center gap-2`}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(item.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <input
                          type="text"
                          placeholder="Nama barang..."
                          value={item.name}
                          onChange={(e) => handleUpdateItemValue(item.id, "name", e.target.value)}
                          className="w-full bg-white sm:bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none"
                        />
                      </div>

                      {/* Quantity input */}
                      <div className="col-span-6 sm:col-span-2 flex items-center sm:block">
                        <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase w-16">Jumlah:</span>
                        <input
                          type="number"
                          placeholder="1"
                          value={item.qty || ""}
                          min="1"
                          onChange={(e) => handleUpdateItemValue(item.id, "qty", Number(e.target.value))}
                          className="w-full bg-white sm:bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>

                      {/* Unit Price input */}
                      <div className="col-span-6 sm:col-span-2 flex items-center sm:block">
                        <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase w-16">Harga:</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={item.unitPrice || ""}
                          onChange={(e) => handleUpdateItemValue(item.id, "unitPrice", Number(e.target.value))}
                          className="w-full bg-white sm:bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>

                      {/* Total row label */}
                      <div className="col-span-9 sm:col-span-2 flex items-center sm:block">
                        <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase w-16">Total:</span>
                        <span className="text-xs font-black text-slate-700 px-2 sm:px-0">
                          {formatRupiah(item.total)}
                        </span>
                      </div>

                      {/* Realized input (Only visible when editing) */}
                      {editId && (
                        <div className="col-span-12 sm:col-span-2 flex items-center sm:block">
                          <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase w-24 shrink-0">Realisasi:</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={item.realizedAmount ?? ""}
                            onChange={(e) => handleUpdateItemValue(item.id, "realizedAmount", Number(e.target.value))}
                            className="w-full bg-white sm:bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer Sums inside Modal */}
                <div className="bg-slate-50 rounded-2xl p-4 mt-6 flex justify-between items-center text-xs font-black border border-slate-100/50">
                  <div className="text-slate-500">
                    Total Rencana: <span className="text-slate-800 text-sm ml-1">{formatRupiah(items.reduce((sum, i) => sum + i.total, 0))}</span>
                  </div>
                  {editId && (
                    <div className="text-emerald-600">
                      Total Realisasi: <span className="text-emerald-700 text-sm ml-1">{formatRupiah(items.reduce((sum, i) => sum + (i.realizedAmount || 0), 0))}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Save/Cancel */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handleSavePlan}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan Rencana
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reuse / Copy Modal */}
      {mounted && showReuseModal && reusePlan && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowReuseModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-800">Gunakan Kembali Rencana</h3>
              <button onClick={() => setShowReuseModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-100/50 rounded-2xl">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Semua item ({reusePlan.items.length} barang) dari <strong>{reusePlan.name}</strong> akan diduplikat dengan status **belum dibeli (rencana)** ke tanggal belanja baru.
                </p>
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2 block">Nama Rencana Baru</label>
                <input
                  type="text"
                  placeholder="Mis: Belanja Bulanan Juni"
                  value={reuseName}
                  onChange={(e) => setReuseName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2 block">Tanggal Belanja Baru</label>
                <input
                  type="date"
                  value={reuseDate}
                  onChange={(e) => setReuseDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button onClick={() => setShowReuseModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handleSaveReuse}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20"
                >
                  <Plus className="h-4 w-4" />
                  Buat Rencana
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 1. Modal Realisasi Belanja */}
      {mounted && showRealizationModal && realizationPlan && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-xl transition-all duration-300" onClick={() => setShowRealizationModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">
                  Realisasikan Belanja 🛍️
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  Rencana: {realizationPlan.name}
                </p>
              </div>
              <button onClick={() => setShowRealizationModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 flex-1">
              
              {/* Scan Receipt Action */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-slate-800">Scan Struk / Nota</h4>
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                    Unggah foto struk untuk membaca & mengisi otomatis daftar belanjaan.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleReceiptScan}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanningReceipt}
                    className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-755 disabled:opacity-50 transition-colors cursor-pointer shadow-sm shadow-blue-500/10"
                  >
                    {isScanningReceipt ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Membaca struk...
                      </>
                    ) : (
                      <>
                        <Camera className="h-3.5 w-3.5" />
                        Scan Nota Belanja
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Items List Editor */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Daftar Barang Realisasi</label>
                  <button
                    type="button"
                    onClick={() => setRealizationItems([
                      ...realizationItems,
                      { id: "item_" + Math.random().toString(36).substring(2, 11), name: "", qty: 1, unitPrice: 0, total: 0, isRealized: true }
                    ])}
                    className="text-xs text-blue-600 font-extrabold flex items-center gap-1 hover:text-blue-700 cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Tambah Barang
                  </button>
                </div>

                {/* Table Header */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-2 py-1 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                  <div className="col-span-5">Nama Barang</div>
                  <div className="col-span-2">Jumlah</div>
                  <div className="col-span-2.5">Harga Satuan</div>
                  <div className="col-span-2.5">Total</div>
                </div>

                {/* Table Rows */}
                <div className="space-y-3 sm:space-y-2 mt-2 max-h-[30vh] overflow-y-auto pr-1">
                  {realizationItems.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 sm:p-1 sm:bg-transparent bg-slate-50 border sm:border-0 border-slate-100 rounded-2xl sm:rounded-none items-center">
                      
                      {/* Name input */}
                      <div className="col-span-12 sm:col-span-5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRealizationItems(realizationItems.filter(i => i.id !== item.id))}
                          className="text-slate-350 hover:text-red-500 transition-colors p-1 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <input
                          type="text"
                          placeholder="Nama barang..."
                          value={item.name}
                          onChange={(e) => handleUpdateRealizationItem(item.id, "name", e.target.value)}
                          className="w-full bg-white sm:bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none"
                        />
                      </div>

                      {/* Quantity input */}
                      <div className="col-span-6 sm:col-span-2 flex items-center sm:block">
                        <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase w-16">Jumlah:</span>
                        <input
                          type="number"
                          placeholder="1"
                          value={item.qty || ""}
                          min="1"
                          onChange={(e) => handleUpdateRealizationItem(item.id, "qty", Number(e.target.value))}
                          className="w-full bg-white sm:bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>

                      {/* Unit Price input */}
                      <div className="col-span-6 sm:col-span-2.5 flex items-center sm:block">
                        <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase w-16">Harga:</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={item.unitPrice || ""}
                          onChange={(e) => handleUpdateRealizationItem(item.id, "unitPrice", Number(e.target.value))}
                          className="w-full bg-white sm:bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none"
                        />
                      </div>

                      {/* Total label */}
                      <div className="col-span-12 sm:col-span-2.5 flex items-center sm:block text-right">
                        <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase w-16 text-left">Total:</span>
                        <span className="text-xs font-black text-slate-700 px-2 sm:px-0">
                          {formatRupiah(item.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Sums */}
                <div className="bg-slate-50 rounded-2xl p-4 mt-4 flex justify-between items-center text-xs font-black border border-slate-100/50">
                  <div className="text-slate-500">
                    Total Anggaran Rencana: <span className="text-slate-700 text-sm ml-1">{formatRupiah(realizationPlan.total_planned)}</span>
                  </div>
                  <div className="text-blue-650">
                    Total Realisasi Belanja: <span className="text-blue-700 text-sm ml-1">{formatRupiah(realizationItems.reduce((sum, i) => sum + i.total, 0))}</span>
                  </div>
                </div>
              </div>

              {/* Auto Save Transaction Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer p-1">
                <input
                  type="checkbox"
                  checked={autoSaveTransaction}
                  onChange={(e) => setAutoSaveTransaction(e.target.checked)}
                  className="rounded border-slate-350 text-blue-650 focus:ring-blue-500 cursor-pointer h-4 w-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-700 block">Catat Transaksi Otomatis</span>
                  <span className="text-[10px] text-slate-400 block font-bold leading-none">
                    Otomatis catat transaksi pengeluaran keuangan per item barang ke database.
                  </span>
                </div>
              </label>

              {/* Modal Save/Cancel */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button onClick={() => setShowRealizationModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handleSaveRealization}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  <Check className="h-4 w-4" />
                  Simpan Realisasi Belanja
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. Modal Review Perbandingan Rencana vs Realisasi */}
      {mounted && showReviewModal && reviewPlan && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-xl transition-all duration-300" onClick={() => setShowReviewModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">
                  Review Realisasi Belanja 📊
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  Rencana: {reviewPlan.name}
                </p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-6 flex-1">
              
              {/* Summary Budget Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                  <p className="text-[10px] font-black text-slate-450 uppercase mb-0.5 tracking-wider">Rencana Anggaran</p>
                  <p className="text-base font-black text-slate-700">{formatRupiah(reviewPlan.total_planned)}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                  <p className="text-[10px] font-black text-slate-450 uppercase mb-0.5 tracking-wider">Realisasi Pengeluaran</p>
                  <p className="text-base font-black text-slate-750">{formatRupiah(reviewPlan.total_realized)}</p>
                </div>
                {(() => {
                  const diff = reviewPlan.total_planned - reviewPlan.total_realized;
                  const isSaving = diff >= 0;
                  return (
                    <div className={`rounded-2xl p-4 border ${isSaving ? "bg-emerald-50/50 border-emerald-100/50 text-emerald-700" : "bg-rose-50/50 border-rose-100/50 text-rose-700"}`}>
                      <p className="text-[10px] font-black uppercase mb-0.5 tracking-wider">Selisih ({isSaving ? "Hemat" : "Lebih"})</p>
                      <p className="text-base font-black">{isSaving ? "+" : ""}{formatRupiah(diff)}</p>
                    </div>
                  );
                })()}
              </div>

              {/* Items Comparison Table */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Rincian Perbandingan Barang</label>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {reviewPlan.items.map((item, idx) => {
                    const isRealized = item.isRealized;
                    const isMatched = isRealized && !!item.plannedName;
                    const isOnlyPlanned = !isRealized;
                    const isNewRealized = isRealized && !item.plannedName;

                    let statusBadge = null;
                    let diffAmount = 0;
                    if (isMatched) {
                      diffAmount = (item.plannedTotal ?? 0) - item.total;
                      statusBadge = diffAmount >= 0 ? (
                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100/30 uppercase">Hemat {formatRupiah(diffAmount)}</span>
                      ) : (
                        <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100/30 uppercase">Lebih {formatRupiah(Math.abs(diffAmount))}</span>
                      );
                    } else if (isOnlyPlanned) {
                      diffAmount = item.plannedTotal ?? item.total;
                      statusBadge = (
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200/30 uppercase">Hemat (Batal) {formatRupiah(diffAmount)}</span>
                      );
                    } else if (isNewRealized) {
                      diffAmount = item.total;
                      statusBadge = (
                        <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded border border-rose-200/30 uppercase">Barang Baru +{formatRupiah(diffAmount)}</span>
                      );
                    }

                    return (
                      <div key={item.id} className="p-4 border border-slate-100 bg-slate-50/30 rounded-2xl space-y-3.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-slate-400">Barang #{idx + 1}</span>
                          {statusBadge}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                          {/* Planned info */}
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Rencana Awal</p>
                            {isNewRealized ? (
                              <p className="text-slate-350 italic">— Tidak Direncanakan —</p>
                            ) : (
                              <div>
                                <p className="text-slate-800 font-extrabold text-sm mb-0.5">{item.plannedName || item.name}</p>
                                <p className="text-slate-500">
                                  {(item.plannedQty !== undefined ? item.plannedQty : item.qty)}x @ {formatRupiah((item.plannedUnitPrice !== undefined ? item.plannedUnitPrice : item.unitPrice))} &bull; <strong className="text-slate-700">{formatRupiah((item.plannedTotal !== undefined ? item.plannedTotal : item.total))}</strong>
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Realized info */}
                          <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-2.5 md:pt-0 md:pl-4">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Realisasi Aktual</p>
                            {isOnlyPlanned ? (
                              <p className="text-slate-350 italic">— Tidak Dibeli —</p>
                            ) : (
                              <div>
                                <p className="text-emerald-700 font-extrabold text-sm mb-0.5">{item.name}</p>
                                <p className="text-slate-500">
                                  {item.qty}x @ {formatRupiah(item.unitPrice)} &bull; <strong className="text-emerald-700">{formatRupiah(item.total)}</strong>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 border-t border-slate-100 shrink-0 flex justify-end">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-none"
                >
                  Tutup Review
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. Modal Ringkasan Checklist Daftar Belanja */}
      {mounted && showSummaryModal && summaryPlan && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/25 backdrop-blur-xl transition-all duration-300" onClick={() => setShowSummaryModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[85vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="font-extrabold text-lg text-slate-800">
                  Ringkasan Daftar Belanja 📋
                </h3>
                <p className="text-xs font-semibold text-slate-405 leading-relaxed mt-0.5">
                  Ketuk item untuk mencoret saat Anda berbelanja di toko fisik. Status coretan bersifat lokal & bebas gangguan.
                </p>
              </div>
              <button onClick={() => setShowSummaryModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer border-none">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 flex-1 overflow-y-auto pr-1">
              <div className="space-y-2.5">
                {summaryPlan.items.map((item, idx) => {
                  const isChecked = checkedItems[item.id] || false;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCheckedItems({
                        ...checkedItems,
                        [item.id]: !isChecked
                      })}
                      className={`w-full flex items-center gap-3.5 p-3.5 border rounded-2xl text-left transition-all cursor-pointer ${
                        isChecked
                          ? "bg-slate-50/50 border-slate-100 text-slate-350 line-through"
                          : "bg-white border-slate-150 text-slate-700 hover:border-rose-150 hover:bg-rose-50/10"
                      }`}
                    >
                      <div className={`w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isChecked
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-300 bg-white"
                      }`}>
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black block truncate">
                          {idx + 1}. {item.plannedName || item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          Jumlah: {(item.plannedQty !== undefined ? item.plannedQty : item.qty)} {item.unitPrice > 0 ? `@ ${formatRupiah(item.plannedUnitPrice !== undefined ? item.plannedUnitPrice : item.unitPrice)}` : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Progress Count */}
              <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center text-xs font-bold border border-slate-100/50">
                <span className="text-slate-450">Kemajuan Belanja</span>
                <span className="text-slate-800 font-black">
                  {Object.values(checkedItems).filter(Boolean).length} dari {summaryPlan.items.length} barang selesai dicoret
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 shrink-0 flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border-none"
              >
                Tutup Ringkasan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
