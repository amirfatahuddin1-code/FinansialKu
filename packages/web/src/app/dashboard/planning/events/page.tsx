"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Plus,
  CalendarDays,
  MapPin,
  ArrowRight,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useAuth, useWorkspace } from "@/providers";
import type { Event as KafEvent } from "@karsafin/shared";

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

export default function EventsPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  const [events, setEvents] = useState<KafEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventBudget, setEventBudget] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await api.events.getAll(true); // includeArchived = true
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error("Gagal memuat daftar acara:", err);
    } finally {
      setLoading(false);
    }
  }, [user, api, activeWorkspace]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Modal
  const openAddModal = () => {
    setEventName("");
    setEventBudget("");
    setEventDate(new Date().toISOString().split("T")[0]);
    setEventNotes("");
    setShowModal(true);
  };

  // Submit new event
  const handleSaveEvent = async () => {
    if (!user) return;
    const budgetNum = Number(eventBudget.replace(/\D/g, ""));
    if (!eventName.trim()) {
      alert("Nama acara tidak boleh kosong");
      return;
    }
    if (budgetNum <= 0) {
      alert("Anggaran harus lebih dari 0");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: eventName.trim(),
        date: eventDate,
        budget: budgetNum,
        notes: eventNotes.trim(),
        archived: false,
      };

      const { error } = await api.events.create(user.id, payload);
      if (error) throw error;

      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal membuat acara");
    } finally {
      setSaving(false);
    }
  };

  // Delete event
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus acara "${name}"?`)) {
      return;
    }
    try {
      const { error } = await api.events.delete(id);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus acara");
    }
  };

  const getEventBudgetTotal = (ev: KafEvent) => {
    if (ev.items && ev.items.length > 0) {
      return ev.items.reduce((sum, item) => sum + item.budget, 0);
    }
    return ev.budget || 0;
  };

  const getEventActualTotal = (ev: KafEvent) => {
    if (ev.items && ev.items.length > 0) {
      return ev.items.reduce((sum, item) => sum + item.actual, 0);
    }
    return 0;
  };

  const totalEvents = events.length;
  const overallBudget = events.reduce((sum, e) => sum + getEventBudgetTotal(e), 0);
  const overallSpent = events.reduce((sum, e) => sum + getEventActualTotal(e), 0);
  const spentPercent = overallBudget > 0 ? Math.round((overallSpent / overallBudget) * 100) : 0;

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
            Acara
          </h1>
          <p className="text-dashboard-gray max-w-2xl text-lg leading-relaxed">
            Rencanakan dan kelola anggaran untuk setiap acara penting dalam hidup Anda.
          </p>
        </div>
 
        <button
          onClick={openAddModal}
          className="bg-dashboard-blue text-white rounded-2xl px-6 py-3.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="h-5 w-5" />
          Tambah Acara
        </button>
      </section>
 
      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="custom-card p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Total Acara
          </p>
          <p className="text-3xl font-black text-slate-800">{totalEvents}</p>
          <p className="text-xs text-slate-400 mt-1">Acara terdaftar</p>
        </div>
        <div className="custom-card p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Total Anggaran
          </p>
          <p className="text-3xl font-black text-slate-800">{formatRupiah(overallBudget)}</p>
          <p className="text-xs text-slate-400 mt-1">Dari semua acara</p>
        </div>
        <div className="custom-card p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Total Terpakai
          </p>
          <p className="text-3xl font-black text-amber-600">{formatRupiah(overallSpent)}</p>
          <p className="text-xs text-slate-400 mt-1">{spentPercent}% dari total anggaran</p>
        </div>
      </section>
 
      {/* Event Cards */}
      <section className="space-y-6">
        {events.length === 0 ? (
          <div className="custom-card p-12 text-center text-slate-400">
            Belum ada rencana acara yang tercatat. Klik "Tambah Acara" di atas untuk mulai merencanakan!
          </div>
        ) : (
          events.map((event) => {
            const budget = getEventBudgetTotal(event);
            const spent = getEventActualTotal(event);
            const remaining = budget - spent;
            const percentage = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
            const status = event.archived ? "Selesai" : "Aktif";
 
            return (
              <div
                key={event.id}
                className="custom-card p-6 md:p-8 hover:shadow-xl transition-all duration-300 relative group"
              >
                <button
                  onClick={() => handleDelete(event.id, event.name)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-2 cursor-pointer"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
 
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Left: Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-slate-800 truncate">
                        {event.name}
                      </h3>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${statusStyles[status]}`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">
                      {event.notes || "Tidak ada catatan tambahan"}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(event.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
 
                  {/* Right: Budget Stats */}
                  <div className="flex items-center gap-6 shrink-0 pt-4 lg:pt-0">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Anggaran
                      </p>
                      <p className="text-lg font-black text-slate-800">
                        {formatRupiah(budget)}
                      </p>
                    </div>
                    <div className="w-px h-10 bg-slate-200" />
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Terpakai
                      </p>
                      <p className="text-lg font-black text-amber-600">
                        {formatRupiah(spent)}
                      </p>
                    </div>
                    <div className="w-px h-10 bg-slate-200" />
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Sisa
                      </p>
                      <p
                        className={`text-lg font-black ${
                          remaining <= 0 ? "text-red-500" : "text-emerald-600"
                        }`}
                      >
                        {formatRupiah(remaining)}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/planning/events/${event.id}`}
                      className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-bold">Progress Anggaran Acara</span>
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full ${
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
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        percentage > 90
                          ? "bg-red-500"
                          : percentage > 70
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* PORTALS FOR MODALS */}

      {/* Add Event Modal */}
      {mounted && showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 md:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="font-extrabold text-lg text-slate-800">Rencanakan Acara Baru</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Nama Acara</label>
                <input
                  type="text"
                  placeholder="Contoh: Liburan Keluarga Bali"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Estimasi Anggaran</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-sm">Rp</span>
                  <input
                    type="text"
                    placeholder="0"
                    value={eventBudget}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setEventBudget(raw ? Number(raw).toLocaleString("id-ID") : "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-10 pr-4 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Tanggal Acara</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">Catatan / Deskripsi</label>
                <textarea
                  placeholder="Keterangan singkat tentang rencana kegiatan ini..."
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                  Batal
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
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
