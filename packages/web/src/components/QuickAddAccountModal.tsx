import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { useAuth } from "@/providers";

interface QuickAddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAccount: any) => void;
}

export function QuickAddAccountModal({ isOpen, onClose, onSuccess }: QuickAddAccountModalProps) {
  const { user, api } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<"bank" | "ewallet" | "investment" | "other">("bank");
  const [icon, setIcon] = useState("🏦");
  const [initialBalance, setInitialBalance] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setType("bank");
      setIcon("🏦");
      setInitialBalance("");
    }
  }, [isOpen]);

  // Sync default icon with type
  const handleTypeChange = (newType: "bank" | "ewallet" | "investment" | "other") => {
    setType(newType);
    if (newType === "bank") setIcon("🏦");
    else if (newType === "ewallet") setIcon("📱");
    else if (newType === "investment") setIcon("📈");
    else setIcon("💵");
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const balanceNum = Number(initialBalance.replace(/\D/g, ""));

      const { data: newAcc, error } = await api.accounts.create(user.id, {
        name: name.trim(),
        type,
        is_default: false,
        color: type === "bank" ? "#0066AE" : type === "ewallet" ? "#00AED6" : type === "investment" ? "#00E676" : "#10b981",
        icon: icon,
        balance: balanceNum,
      });

      if (error) throw error;

      onSuccess(newAcc);
      onClose();
    } catch (err: any) {
      console.error("Gagal menambah akun:", err);
      alert("Gagal menambahkan akun keuangan.");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={onClose} />
      
      {/* Modal Box */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-extrabold text-lg text-slate-800">Tambah Akun Keuangan</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer border-none">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Account Name */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Nama Akun (Tampilan)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: BCA Tabungan, GoPay Pribadi"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Tipe Akun
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "bank" as const, label: "🏦 Bank" },
                { key: "ewallet" as const, label: "📱 E-Wallet" },
                { key: "investment" as const, label: "📈 Investasi" },
                { key: "other" as const, label: "💵 Tunai / Lainnya" }
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTypeChange(t.key)}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                    type === t.key
                      ? "bg-blue-50 border-blue-500 text-blue-600 font-extrabold"
                      : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Account Icon Preset Emojis */}
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Ikon Akun
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {["🏦", "📱", "📈", "💵", "💰", "💳", "💸"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg transition-all cursor-pointer ${
                    icon === emoji
                      ? "bg-blue-50 border-blue-500 text-blue-600"
                      : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Balance */}
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

        {/* Action Buttons */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-2xl py-3 font-bold text-sm hover:bg-slate-100 cursor-pointer"
          >
            Batal
          </button>
          <button 
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 bg-blue-600 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Simpan Akun
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
