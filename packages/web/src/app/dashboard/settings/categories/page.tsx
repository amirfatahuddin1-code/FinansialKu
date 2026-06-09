"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, X, Check, Save } from "lucide-react";
import { useAuth } from "@/providers";

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

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TabType;
  is_default: boolean;
}

export default function CategoriesPage() {
  const { api } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("expense");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("📦");
  const [formColor, setFormColor] = useState("#6366f1");
  const [formType, setFormType] = useState<TabType>("expense");
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.categories.getAll();
      if (res.data) setCategories(res.data as CategoryItem[]);
    } catch (err) {
      console.error("Gagal memuat kategori:", err);
    } finally {
      setLoading(false);
    }
  }, [api.categories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = categories.filter((c) => c.type === activeTab);

  const openAdd = (type: TabType) => {
    setEditId(null);
    setFormName("");
    setFormIcon("📦");
    setFormColor("#6366f1");
    setFormType(type);
    setShowModal(true);
  };

  const openEdit = (cat: CategoryItem) => {
    setEditId(cat.id);
    setFormName(cat.name);
    setFormIcon(cat.icon);
    setFormColor(cat.color);
    setFormType(cat.type);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.categories.update(editId, { name: formName.trim(), icon: formIcon, color: formColor, type: formType });
      } else {
        await api.categories.create("", { name: formName.trim(), icon: formIcon, color: formColor, type: formType });
      }
      setShowModal(false);
      await loadCategories();
    } catch (err) {
      console.error("Gagal menyimpan kategori:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    try {
      await api.categories.delete(id);
      await loadCategories();
    } catch (err) {
      console.error("Gagal menghapus kategori:", err);
    }
  };

  return (
    <>
      {/* Header */}
      <section className="mb-8">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-bold text-dashboard-gray hover:text-dashboard-blue transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Pengaturan
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
          Kategori Transaksi
        </h1>
        <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
          Kelola kategori pemasukan, pengeluaran, dan tabungan.
        </p>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-dashboard-blue text-white shadow-lg shadow-blue-200"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Category List */}
      <div className="custom-card p-6">
        {loading ? (
          <div className="text-center py-8 text-sm text-dashboard-gray">Memuat kategori...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-dashboard-gray mb-4">Belum ada kategori {TAB_LABELS[activeTab].toLowerCase()}</p>
            <button
              onClick={() => openAdd(activeTab)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-dashboard-blue text-white font-bold text-sm hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Tambah Kategori
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: cat.color + "20" }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">{cat.name}</span>
                    {cat.is_default && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Bawaan
                      </span>
                    )}
                  </div>
                </div>
                {!cat.is_default && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(cat)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                    >
                      <Pencil className="h-4 w-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <button
            onClick={() => openAdd(activeTab)}
            className="w-full mt-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-bold text-dashboard-gray hover:border-dashboard-blue hover:text-dashboard-blue transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Tambah Kategori {TAB_LABELS[activeTab]}
          </button>
        )}
      </div>

      {/* ─── Modal: Add/Edit Category ─── */}
      {mounted && showModal && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">
                {editId ? "Edit Kategori" : "Tambah Kategori Baru"}
              </h3>
              <button onClick={() => setShowModal(false)} className="cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors">
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
                      onClick={() => setFormType(t)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        formType === t
                          ? "bg-dashboard-blue text-white"
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
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
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
                      onClick={() => setFormIcon(icon)}
                      className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                        formIcon === icon
                          ? "bg-dashboard-blue text-white scale-110 shadow-md"
                          : "bg-slate-100 hover:bg-slate-200"
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
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormColor(color)}
                      className={`w-9 h-9 rounded-xl transition-all cursor-pointer ${
                        formColor === color ? "ring-4 ring-offset-2 ring-dashboard-blue scale-110" : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="w-full mt-6 py-3.5 rounded-2xl bg-dashboard-blue text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Tambah Kategori"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
