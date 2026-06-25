"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, X, Tag } from "lucide-react";
import { useAuth } from "@/providers";
import { getUserTags, addUserTag, deleteUserTag, updateUserTag } from "@/utils/tagUtils";

export default function LabelsSettingsPage() {
  const { user } = useAuth();
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [oldLabelName, setOldLabelName] = useState<string | null>(null); // For editing
  const [formName, setFormName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const stored = getUserTags(user.id);
      setLabels(stored);
      setLoading(false);
    }
  }, [user]);

  const openAdd = () => {
    setOldLabelName(null);
    setFormName("");
    setErrorMsg(null);
    setShowModal(true);
  };

  const openEdit = (label: string) => {
    setOldLabelName(label);
    setFormName(label);
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!user) return;
    const trimmed = formName.trim();
    if (!trimmed) {
      setErrorMsg("Nama label tidak boleh kosong");
      return;
    }

    if (trimmed.length > 20) {
      setErrorMsg("Nama label terlalu panjang (maksimal 20 karakter)");
      return;
    }

    // Check duplicate
    const isDuplicate = labels.some(
      (l) =>
        l.toLowerCase() === trimmed.toLowerCase() &&
        (!oldLabelName || l.toLowerCase() !== oldLabelName.toLowerCase())
    );

    if (isDuplicate) {
      setErrorMsg("Label dengan nama ini sudah ada");
      return;
    }

    let updatedList: string[];
    if (oldLabelName) {
      updatedList = updateUserTag(user.id, oldLabelName, trimmed);
    } else {
      updatedList = addUserTag(user.id, trimmed);
    }

    setLabels(updatedList);
    setShowModal(false);
  };

  const handleDelete = (label: string) => {
    if (!user) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus label "${label}"?`)) {
      return;
    }
    const updatedList = deleteUserTag(user.id, label);
    setLabels(updatedList);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Memuat label...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Back Button */}
      <Link
        href="/dashboard/settings"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Pengaturan
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            <Tag className="h-7 w-7 text-rose-500" />
            Kelola Label (Tag)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Atur label kustom Anda untuk mengelompokkan transaksi secara lebih detail.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2.5 text-sm font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Tambah Label
        </button>
      </div>

      {/* Label List Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {labels.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Belum ada label kustom. Tambahkan label baru untuk memulai!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {labels.map((label) => (
              <div
                key={label}
                className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-600 border border-blue-100/50">
                    🏷️ {label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(label)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                    title="Edit Label"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(label)}
                    className="p-2 hover:bg-red-50 rounded-xl text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                    title="Hapus Label"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-lg text-slate-800">
                {oldLabelName ? "Ubah Label" : "Tambah Label Baru"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nama Label
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Contoh: Kantor, Bensin, Kopi"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl px-4 py-3 text-sm text-slate-800 outline-none transition-all"
                  maxLength={20}
                  autoFocus
                />
              </div>

              {errorMsg && (
                <p className="text-xs font-bold text-red-500">{errorMsg}</p>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl py-3 text-sm transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl py-3 text-sm transition-colors cursor-pointer shadow-md shadow-blue-500/10"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
