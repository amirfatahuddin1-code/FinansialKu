"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { TagSelector } from "@/components/TagSelector";
import { parseDescriptionAndTags, serializeDescriptionAndTags } from "@/utils/tagUtils";

export interface EditTransactionModalProps {
  transaction: any;
  onClose: () => void;
  onSave: (updatedData: {
    amount: number;
    description: string;
    category: string;
    account: string;
    date: string;
    type: "income" | "expense" | "savings";
  }) => Promise<void>;
  dbAccounts: any[];
  dbCategories: any[];
  userId?: string;
}

export function EditTransactionModal({
  transaction,
  onClose,
  onSave,
  dbAccounts,
  dbCategories,
  userId,
}: EditTransactionModalProps) {
  // Parse raw description to extract clean description and tags
  const { description: initDesc, tags: initTags } = parseDescriptionAndTags(
    transaction.rawDescription || transaction.description || ""
  );
  const [type, setType] = useState<"income" | "expense" | "savings">(transaction.type || "expense");
  const [amountStr, setAmountStr] = useState<string>(
    transaction.amount ? Math.abs(transaction.amount).toLocaleString("id-ID") : ""
  );
  const [description, setDescription] = useState<string>(initDesc);
  const [selectedTags, setSelectedTags] = useState<string[]>(initTags);
  
  // Normalize date format
  const formatDateToYYYYMMDD = (d: Date) => {
    if (!d || isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseTxDateLocal = (dStr: string) => {
    if (!dStr) return new Date();
    let normalized = dStr
      .replace("Mei", "May")
      .replace("Agu", "Aug")
      .replace("Okt", "Oct")
      .replace("Des", "Dec");
    return new Date(normalized);
  };

  const initialDateStr = (() => {
    if (transaction.rawDate) {
      return formatDateToYYYYMMDD(new Date(transaction.rawDate));
    }
    if (transaction.date) {
      const parsed = parseTxDateLocal(transaction.date);
      if (!isNaN(parsed.getTime())) {
        return formatDateToYYYYMMDD(parsed);
      }
    }
    return formatDateToYYYYMMDD(new Date());
  })();

  const initialTimeStr = (() => {
    const rawDateVal = transaction.rawDate ? new Date(transaction.rawDate) : (transaction.date ? parseTxDateLocal(transaction.date) : null);
    if (rawDateVal && !isNaN(rawDateVal.getTime())) {
      const hours = String(rawDateVal.getHours()).padStart(2, '0');
      const minutes = String(rawDateVal.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    const today = new Date();
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  })();

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [date, setDate] = useState<string>(initialDateStr);
  const [time, setTime] = useState<string>(initialTimeStr);
  const [category, setCategory] = useState<string>(transaction.category || transaction.categoryName || "");
  const [account, setAccount] = useState<string>(transaction.account || transaction.accountName || "");
  const [submitting, setSubmitting] = useState(false);

  const setToCurrentTime = () => {
    const today = new Date();
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    setTime(`${hours}:${minutes}`);
  };

  const categoriesList = dbCategories.length > 0 
    ? dbCategories.map(c => c.name) 
    : ["Gaji", "Freelance", "Bonus", "Makan", "Transport", "Belanja", "Tagihan", "Internet", "Hiburan", "Langganan", "Kesehatan", "Pendidikan", "Sewa Rumah", "Tabungan", "Lainnya"];

  const accountsList = dbAccounts.length > 0
    ? dbAccounts.map(a => a.name)
    : ["BCA", "Mandiri", "GoPay", "OVO", "Bibit", "Cash"];

  // Set default category and account if not set
  useEffect(() => {
    if (!category && categoriesList.length > 0) {
      setCategory(categoriesList[0]);
    }
    if (!account && accountsList.length > 0) {
      setAccount(accountsList[0]);
    }
  }, [categoriesList, accountsList, category, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = Number(amountStr.replace(/\D/g, "")) || 0;
    if (cleanAmount <= 0) {
      alert("Jumlah transaksi harus lebih dari 0");
      return;
    }
    setSubmitting(true);
    try {
      const serializedDesc = serializeDescriptionAndTags(description, selectedTags);

      const [y, m, d] = date.split('-');
      const [h, min] = (time || "00:00").split(':');
      const localDate = new Date(Number(y), Number(m)-1, Number(d), Number(h), Number(min), 0);

      await onSave({
        amount: cleanAmount,
        description: serializedDesc,
        category,
        account,
        date: localDate.toISOString(),
        type,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(true); // Keep disabled during transition/close
    }
  };

  if (!isClient) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      {/* Backdrop close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 relative z-10">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-lg font-black text-slate-800">Ubah Transaksi</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form Fields */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Tipe Transaksi */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipe Transaksi</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {(["income", "expense", "savings"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${
                      type === t
                        ? t === "income"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/15"
                          : t === "expense"
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/15"
                          : "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                    }`}
                  >
                    {t === "income" ? "Pemasukan" : t === "expense" ? "Pengeluaran" : "Tabungan"}
                  </button>
                ))}
              </div>
            </div>

            {/* Jumlah */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Jumlah</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">Rp</span>
                <input
                  type="text"
                  value={amountStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setAmountStr(raw ? Number(raw).toLocaleString("id-ID") : "");
                  }}
                  placeholder="0"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-150 rounded-2xl text-lg font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Keterangan</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Makan siang nasi goreng"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Akun */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Akun Keuangan</label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                {accountsList.map((acc) => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </select>
            </div>

            {/* Tanggal & Waktu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tanggal</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Waktu</span>
                  <button
                    type="button"
                    onClick={setToCurrentTime}
                    className="text-[10px] text-blue-600 hover:text-blue-800 transition-colors font-bold normal-case flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
                  >
                    ⏱️ Saat Ini
                  </button>
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                />
              </div>
            </div>

            {/* Tag Selector */}
            {userId && (
              <TagSelector
                selectedTags={selectedTags}
                onChange={setSelectedTags}
                userId={userId}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-[#0062ff] text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
