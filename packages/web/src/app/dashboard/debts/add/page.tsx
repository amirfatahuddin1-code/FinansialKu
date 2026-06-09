"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  CalendarDays,
  Save,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers";
import type { FinancialAccount } from "@karsafin/shared";
import { QuickAddAccountModal } from "@/components/QuickAddAccountModal";
import { getLocalToday } from "@karsafin/shared";
import { InstitutionLogo } from "@/components/InstitutionLogo";

type DebtType = "hutang" | "piutang";

export default function AddDebtPage() {
  const { user, api } = useAuth();
  const router = useRouter();

  const [debtType, setDebtType] = useState<DebtType>("hutang");
  const [counterpart, setCounterpart] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAccDropdownOpen, setIsAccDropdownOpen] = useState(false);
  const accDropdownRef = useRef<HTMLDivElement>(null);

  const handleAddAccountSuccess = async (newAcc: any) => {
    try {
      const { data } = await api.accounts.getAll();
      if (data) {
        setAccounts(data);
      }
    } catch (err) {
      console.error(err);
      setAccounts((prev) => [...prev, newAcc]);
    }
    setSelectedAccountId(newAcc.id);
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data } = await api.accounts.getAll();
        if (data) {
          setAccounts(data);
          const defAcc = data.find((a) => a.is_default) || data[0];
          if (defAcc) setSelectedAccountId(defAcc.id);
        }
      } catch (err) {
        console.error("Gagal memuat akun keuangan:", err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    if (user) {
      fetchAccounts();
    }
  }, [user, api]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accDropdownRef.current && !accDropdownRef.current.contains(event.target as Node)) {
        setIsAccDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handleSave = async () => {
    if (!user) return;
    const amountNum = Number(amount.replace(/\D/g, ""));
    if (amountNum <= 0) {
      alert("Nominal harus lebih dari 0");
      return;
    }
    if (!counterpart.trim()) {
      alert("Nama pihak terkait tidak boleh kosong");
      return;
    }

    setSaving(true);
    try {
      const type = debtType === "hutang" ? "payable" : "receivable";
      const payload = {
        name: `${debtType === "hutang" ? "Hutang ke" : "Piutang dari"} ${counterpart.trim()}`,
        type,
        amount: amountNum,
        paid: 0,
        counterpart: counterpart.trim(),
        due_date: dueDate || undefined,
        notes: notes.trim(),
        status: "unpaid" as const,
        account_id: selectedAccountId || undefined,
      };

      const { data: newDebt, error: debtErr } = await api.debts.create(user.id, payload as any);
      if (debtErr) throw debtErr;

      if (newDebt) {
        // Resolve category for auto-transaction creation
        const catConfig = type === "payable"
          ? { name: "Terima Hutang", type: "income" as const, icon: "📥", color: "#10b981" }
          : { name: "Beri Piutang", type: "expense" as const, icon: "🤝", color: "#f59e0b" };

        const { data: catData, error: catError } = await api.categories.getOrCreateByName(user.id, catConfig);
        if (catError) {
          console.error("Gagal membuat/mendapatkan kategori otomatis:", catError);
        } else if (catData) {
          // Create transaction linked to this debt
          const txPayload = {
            type: catConfig.type,
            amount: amountNum,
            category_id: catData.id,
            description: type === "payable"
              ? `Terima hutang dari ${counterpart.trim()}`
              : `Beri piutang kepada ${counterpart.trim()}`,
            date: getLocalToday(),
            account_id: selectedAccountId || undefined,
            debt_id: newDebt.id,
          };
          const { error: txError } = await api.transactions.create(user.id, txPayload);
          if (txError) {
            console.error("Gagal mencatat transaksi otomatis terkait hutang:", txError);
          }
        }
      }

      router.push("/dashboard/debts");
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan catatan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/dashboard/debts"
          className="inline-flex items-center gap-2 text-dashboard-gray hover:text-dashboard-blue transition-colors mb-6 text-sm font-bold"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Hutang & Piutang
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3 text-slate-800">
          Tambah Hutang/Piutang
        </h1>
        <p className="text-dashboard-gray text-lg leading-relaxed">
          Catat hutang baru atau piutang yang perlu dilacak.
        </p>
      </section>

      <div>
        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setTypeToggle("hutang")}
            className={`rounded-2xl p-6 border-2 flex flex-col items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${
              debtType === "hutang"
                ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                : "bg-red-50 text-red-500 border-red-200"
            }`}
          >
            <ArrowDownLeft className="h-7 w-7" />
            <div className="text-center">
              <span className="text-sm font-black block">Hutang</span>
              <span className={`text-xs ${debtType === "hutang" ? "text-white/70" : "text-red-400"}`}>
                Uang yang saya pinjam
              </span>
            </div>
          </button>
          <button
            onClick={() => setTypeToggle("piutang")}
            className={`rounded-2xl p-6 border-2 flex flex-col items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${
              debtType === "piutang"
                ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20"
                : "bg-green-50 text-green-600 border-green-200"
            }`}
          >
            <ArrowUpRight className="h-7 w-7" />
            <div className="text-center">
              <span className="text-sm font-black block">Piutang</span>
              <span className={`text-xs ${debtType === "piutang" ? "text-white/70" : "text-green-500"}`}>
                Uang yang saya pinjamkan
              </span>
            </div>
          </button>
        </div>

        {/* Form */}
        <div className="custom-card p-8 md:p-10 space-y-8">
          {/* Person Name */}
          <div>
            <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">
              {debtType === "hutang" ? "Nama Pemberi Pinjaman" : "Nama Peminjam"}
            </label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-dashboard-gray" />
              <input
                type="text"
                placeholder={
                  debtType === "hutang"
                    ? "Contoh: Ahmad Fauzi, Bank BCA..."
                    : "Contoh: Rizky Pratama, Dewi Lestari..."
                }
                value={counterpart}
                onChange={(e) => setCounterpart(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-5 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all"
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">
              Jumlah
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-dashboard-gray font-black text-lg">
                Rp
              </span>
              <input
                type="text"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-14 pr-6 text-2xl font-black text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all"
              />
            </div>
          </div>

          {/* Date Fields Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">
                Jatuh Tempo (Opsional)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all"
                />
              </div>
            </div>

            {/* Financial Account Selection */}
            <div>
              <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest block mb-3">
                Akun Keuangan
              </label>
              {loadingAccounts ? (
                <div className="py-4 text-xs text-slate-400">Memuat akun keuangan...</div>
              ) : (
                <div className="flex items-stretch gap-3">
                  <div className="flex-1 relative" ref={accDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsAccDropdownOpen(!isAccDropdownOpen)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all flex items-center justify-between text-left"
                    >
                      {selectedAccount ? (
                        <div className="flex items-center gap-3">
                          <InstitutionLogo name={selectedAccount.name} icon={(selectedAccount as any).icon} size="sm" />
                          <span>{selectedAccount.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-bold">Pilih akun...</span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-dashboard-gray transition-transform duration-200 ${isAccDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isAccDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-150 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto py-2">
                        <button
                          type="button"
                          onClick={() => { setSelectedAccountId(""); setIsAccDropdownOpen(false); }}
                          className="w-full px-5 py-3 text-left text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer border-none bg-transparent"
                        >
                          <span>Pilih akun...</span>
                        </button>
                        {accounts.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => { setSelectedAccountId(acc.id); setIsAccDropdownOpen(false); }}
                            className={`w-full px-5 py-3 text-left text-sm font-bold transition-colors flex items-center gap-3 cursor-pointer border-none bg-transparent ${
                              selectedAccountId === acc.id
                                ? "bg-blue-50/50 text-dashboard-blue"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <InstitutionLogo name={acc.name} icon={(acc as any).icon} size="sm" />
                            <span>{acc.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddAccountOpen(true)}
                    className="px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-2xl text-[11px] font-bold text-blue-600 cursor-pointer transition-all flex flex-col items-center justify-center text-center leading-tight whitespace-nowrap shrink-0"
                  >
                    <span>Tambah</span>
                    <span>Akun</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3 block">
              Catatan
            </label>
            <textarea
              placeholder="Tambahkan catatan tentang pinjaman ini (opsional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm text-slate-800 placeholder:text-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 text-white rounded-2xl py-4 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01] active:scale-95 cursor-pointer disabled:opacity-50 ${
                debtType === "hutang"
                  ? "bg-red-500 shadow-red-500/20 hover:bg-red-600"
                  : "bg-green-600 shadow-green-500/20 hover:bg-green-700"
              }`}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan {debtType === "hutang" ? "Hutang" : "Piutang"}
            </button>
            <Link
              href="/dashboard/debts"
              className="flex-1 bg-white text-slate-600 border-2 border-slate-200 rounded-2xl py-4 font-black text-sm flex items-center justify-center gap-2 hover:border-slate-300 hover:text-slate-800 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
              Batal
            </Link>
          </div>
        </div>

        <QuickAddAccountModal
          isOpen={isAddAccountOpen}
          onClose={() => setIsAddAccountOpen(false)}
          onSuccess={handleAddAccountSuccess}
        />
      </div>
    </>
  );

  // Toggle helper to reset selected account properly if needed
  function setTypeToggle(t: DebtType) {
    setDebtType(t);
  }
}
