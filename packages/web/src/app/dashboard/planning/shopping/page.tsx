"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function ShoppingPlanningPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

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
      { id: generateId(), name: "", qty: 1, unitPrice: 0, total: 0, isRealized: false }
    ]);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (plan: ShoppingPlan) => {
    setEditId(plan.id);
    setPlanName(plan.name);
    setPlanDate(plan.date);
    setPlanType(plan.type);
    setItems(plan.items.map(item => ({ ...item }))); // clone items
    setShowModal(true);
  };

  // Modal Item manipulation handlers
  const handleAddItemRow = () => {
    setItems([
      ...items,
      { id: generateId(), name: "", qty: 1, unitPrice: 0, total: 0, isRealized: false }
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
      const totalPlanned = filteredItems.reduce((sum, item) => sum + item.total, 0);
      const totalRealized = filteredItems.reduce((sum, item) => sum + (item.isRealized ? item.total : 0), 0);
      const allRealized = filteredItems.every(item => item.isRealized);

      const payload = {
        name: planName.trim(),
        date: planDate,
        type: planType,
        items: filteredItems,
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
        isRealized: nextIsRealized
      }));
      const totalRealized = updatedItems.reduce((sum, item) => sum + (item.isRealized ? item.total : 0), 0);

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
        isRealized: false
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
                className="custom-card p-6 border border-slate-100 hover:shadow-xl transition-all duration-300 flex flex-col justify-between gap-5 relative overflow-hidden group"
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
                <div className="flex items-center justify-between border-t border-slate-50 pt-4 gap-3 shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditModal(plan)}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Edit rencana"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:border-red-100 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                      title="Hapus rencana"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenReuseModal(plan)}
                      className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplikat
                    </button>

                    <button
                      onClick={() => handleTogglePlanRealization(plan)}
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
                  <div className="col-span-5">Nama Barang</div>
                  <div className="col-span-2">Jumlah</div>
                  <div className="col-span-2">Harga Satuan</div>
                  <div className="col-span-2">Total</div>
                  <div className="col-span-1 text-center">Dibeli</div>
                </div>

                {/* Table Rows */}
                <div className="space-y-3 sm:space-y-2 mt-2">
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 sm:p-1.5 sm:bg-transparent bg-slate-50 border sm:border-0 border-slate-100 rounded-2xl sm:rounded-none items-center">
                      
                      {/* Name input */}
                      <div className="col-span-12 sm:col-span-5 flex items-center gap-2">
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

                      {/* Realized checkbox */}
                      <div className="col-span-3 sm:col-span-1 flex items-center justify-end sm:justify-center">
                        <span className="sm:hidden text-[10px] font-black text-slate-400 uppercase mr-3">Dibeli:</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemValue(item.id, "isRealized", !item.isRealized)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            item.isRealized
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {item.isRealized && <Check className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Sums inside Modal */}
                <div className="bg-slate-50 rounded-2xl p-4 mt-6 flex justify-between items-center text-xs font-black border border-slate-100/50">
                  <div className="text-slate-500">
                    Total Rencana: <span className="text-slate-800 text-sm ml-1">{formatRupiah(items.reduce((sum, i) => sum + i.total, 0))}</span>
                  </div>
                  <div className="text-emerald-600">
                    Total Realisasi: <span className="text-emerald-700 text-sm ml-1">{formatRupiah(items.reduce((sum, i) => sum + (i.isRealized ? i.total : 0), 0))}</span>
                  </div>
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
    </>
  );
}
