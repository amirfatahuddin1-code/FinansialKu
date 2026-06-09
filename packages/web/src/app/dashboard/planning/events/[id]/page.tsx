"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Plus,
  CalendarDays,
  MapPin,
  Wallet,
  TrendingUp,
  PiggyBank,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/providers";
import type { Event as KafEvent, EventItem, Category } from "@karsafin/shared";
import { CategoryIcon, getCategoryStyle } from "@/components/CategoryIcon";
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

const statusStyles = {
  Aktif: "text-emerald-600 bg-emerald-50 border-emerald-200",
  Selesai: "text-blue-600 bg-blue-50 border-blue-200",
  Draft: "text-slate-500 bg-slate-100 border-slate-200",
};

export default function EventDetailPage() {
  const { user, api } = useAuth();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<KafEvent | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [mounted, setMounted] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemUnitPrice, setItemUnitPrice] = useState("");
  const [itemSaving, setItemSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadEvent = useCallback(async () => {
    if (!user || !eventId) return;
    setLoading(true);
    try {
      const [eventsRes, catRes] = await Promise.all([
        api.events.getAll(true),
        api.categories.getAll()
      ]);
      if (eventsRes.error) throw eventsRes.error;
      const found = eventsRes.data?.find((e) => e.id === eventId);
      setEvent(found || null);
      if (catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error("Gagal memuat rincian acara:", err);
    } finally {
      setLoading(false);
    }
  }, [user, eventId, api]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Open Cost Item Modal
  const openAddItemModal = () => {
    setItemName("");
    setItemCategory(categories.length > 0 ? categories[0].id : "");
    setItemQty("1");
    setItemUnitPrice("");
    setShowItemModal(true);
  };

  // Add Item to Event
  const handleSaveItem = async () => {
    if (!event || !user) return;
    const qtyNum = Number(itemQty) || 1;
    const priceNum = Number(itemUnitPrice.replace(/\D/g, ""));

    if (!itemName.trim()) {
      alert("Nama pengeluaran tidak boleh kosong");
      return;
    }
    if (priceNum <= 0) {
      alert("Harga satuan harus lebih dari 0");
      return;
    }

    setItemSaving(true);
    try {
      const cost = qtyNum * priceNum;
      const payload = {
        name: itemName.trim(),
        category: itemCategory,
        qty: qtyNum,
        unit_price: priceNum,
        budget: cost,
        actual: cost,
        is_paid: true,
        notes: "Dibuat via Web App",
      };

      const { error } = await api.eventItems.create(event.id, payload);
      if (error) throw error;

      // Auto-create a matching expense transaction tagged with the event name
      try {
        await api.transactions.create(user.id, {
          type: "expense",
          amount: cost,
          description: serializeDescriptionAndTags(
            `Pengeluaran Acara: ${itemName.trim()} (${event.name})`,
            [event.name]
          ),
          date: new Date().toISOString(),
          source: "manual",
        } as any);
      } catch (txError) {
        // Non-fatal: log error but don't block the event item save
        console.error("Gagal mencatat transaksi acara otomatis:", txError);
      }

      setShowItemModal(false);
      loadEvent();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan pengeluaran");
    } finally {
      setItemSaving(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pengeluaran "${name}"?`)) {
      return;
    }
    try {
      const { error } = await api.eventItems.delete(itemId);
      if (error) throw error;
      loadEvent();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus pengeluaran");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="custom-card p-12 text-center text-slate-400">
        Acara tidak ditemukan. Kembali ke{" "}
        <Link href="/dashboard/planning/events" className="text-blue-600 font-bold hover:underline">
          halaman Acara
        </Link>
        .
      </div>
    );
  }

  const items = event.items || [];
  const budget = items.length > 0 ? items.reduce((sum, item) => sum + item.budget, 0) : event.budget || 0;
  const spent = items.reduce((sum, item) => sum + item.actual, 0);
  const remaining = budget - spent;
  const percentage = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
  const status = event.archived ? "Selesai" : "Aktif";

  // Helper to get category name
  const getCategoryName = (catIdOrName: string | undefined) => {
    if (!catIdOrName) return "Lainnya";
    const found = categories.find(c => c.id === catIdOrName);
    return found ? found.name : catIdOrName;
  };

  // Group items by category to render category breakdowns
  const categoryBreakdown = items.reduce((acc, item) => {
    const cat = getCategoryName(item.category);
    if (!acc[cat]) acc[cat] = { spent: 0, budget: 0 };
    acc[cat].spent += item.actual;
    acc[cat].budget += item.budget;
    return acc;
  }, {} as Record<string, { spent: number; budget: number }>);

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/dashboard/planning/events"
          className="inline-flex items-center gap-2 text-sm text-dashboard-gray hover:text-dashboard-blue transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Acara
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
                {event.name}
              </h1>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusStyles[status]}`}>
                {status}
              </span>
            </div>
            <p className="text-dashboard-gray text-lg">{event.notes || "Tidak ada catatan tambahan"}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {new Date(event.date).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <button
            onClick={openAddItemModal}
            className="bg-dashboard-blue text-white rounded-2xl px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="h-5 w-5" />
            Tambah Pengeluaran
          </button>
        </div>
      </section>

      {/* Budget Overview Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="custom-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
            <Wallet className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Anggaran Total
            </p>
            <p className="text-2xl font-black text-blue-600">{formatRupiah(budget)}</p>
          </div>
        </div>
        <div className="custom-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Terpakai
            </p>
            <p className="text-2xl font-black text-amber-600">{formatRupiah(spent)}</p>
          </div>
        </div>
        <div className="custom-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
            <PiggyBank className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Sisa
            </p>
            <p className={`text-2xl font-black ${remaining >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {formatRupiah(remaining)}
            </p>
          </div>
        </div>
      </section>

      {/* Overall Progress */}
      <section className="custom-card p-6 mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-slate-600">Progress Anggaran</span>
          <span
            className={`text-xs font-black px-3 py-1 rounded-full ${
              percentage > 90
                ? "text-red-600 bg-red-50"
                : percentage > 70
                ? "text-amber-600 bg-amber-50"
                : "text-emerald-600 bg-emerald-50"
            }`}
          >
            {percentage}%
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              percentage > 90
                ? "bg-red-500"
                : percentage > 70
                ? "bg-amber-500"
                : "bg-gradient-to-r from-blue-500 to-blue-600"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Breakdown */}
        <div className="lg:col-span-1">
          <div className="custom-card p-6">
            <h3 className="font-black text-lg text-slate-800 mb-6">Anggaran per Kategori</h3>
            {Object.keys(categoryBreakdown).length === 0 ? (
              <div className="text-slate-400 text-xs font-semibold py-4 text-center">
                Belum ada data pengeluaran per kategori.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(categoryBreakdown).map(([catName, data]) => {
                  const cfg = getCategoryStyle(catName);
                  const Icon = cfg.Icon;
                  const catPct = data.budget > 0 ? Math.min(Math.round((data.spent / data.budget) * 100), 100) : 0;
                  return (
                    <div key={catName}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 ${cfg.bgClass} ${cfg.borderClass} border rounded-lg flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 ${cfg.textClass}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700 truncate">{catName}</span>
                            <span className="text-xs text-slate-400 ml-2">{catPct}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-11">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              catPct > 90 ? "bg-red-500" : catPct > 70 ? "bg-amber-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${catPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{formatRupiah(data.spent)}</span>
                          <span>{formatRupiah(data.budget)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Expense List */}
        <div className="lg:col-span-2">
          <div className="custom-card p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg text-slate-800">Daftar Pengeluaran</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                {items.length} item pengeluaran
              </span>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Belum ada rincian pengeluaran untuk acara ini. Klik "Tambah Pengeluaran" di atas!
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((expense) => {
                  return (
                    <div
                      key={expense.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all group"
                    >
                      <CategoryIcon name={expense.category || "Lainnya"} size="sm" className="group-hover:scale-110" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">{expense.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{getCategoryName(expense.category)}</span>
                          <span>·</span>
                          <span>{expense.qty} x {formatRupiah(expense.unit_price)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-black text-slate-800 shrink-0">
                          {formatRupiah(expense.actual)}
                        </p>
                        <button
                          onClick={() => handleDeleteItem(expense.id, expense.name)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1.5 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PORTALS FOR MODALS */}

      {/* Add Cost Item Modal */}
      {mounted && showItemModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowItemModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-800">Tambah Pengeluaran Acara</h3>
              <button onClick={() => setShowItemModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Nama Item</label>
                <input
                  type="text"
                  placeholder="Contoh: Tiket Pesawat PP, Booking Hotel"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Kategori</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Kuantitas</label>
                  <input
                    type="number"
                    min="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Harga Satuan</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-sm">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={itemUnitPrice}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setItemUnitPrice(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-10 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowItemModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={itemSaving}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {itemSaving && <Loader2 className="h-4 w-4 animate-spin" />}
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
