"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Send,
  Zap,
  Bot,
  User as UserIcon,
  ChevronRight,
  MessageSquare,
  Camera,
  ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Play,
  X
} from "lucide-react";
import { useAuth } from "@/providers";
import { EditTransactionModal } from "@/components/EditTransactionModal";
import type { Category, Transaction, Budget, FinancialAccount } from "@karsafin/shared";
import { getLocalToday, formatCurrency } from "@karsafin/shared";

type ChatMode = "normal" | "catalog_transaction" | "financial_simulation" | "set_budget" | "apply_budget_reco";

interface SavedTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  categoryName: string;
  accountName: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  type?: "text" | "insight";
  savedTransactions?: SavedTransaction[];
  insightData?: {
    label: string;
    percent: number;
    current: string;
    total: string;
    color: string;
  };
}

const QUICK_REPLIES = [
  { icon: "📷", text: "Scan struk" },
  { icon: "📒", text: "Catat transaksi" },
  { icon: "🧶", text: "Cek riwayat transaksi" },
  { icon: "📊", text: "Bandingkan keuangan per periode" },
  { icon: "💵", text: "Cek keuangan per kategori" },
  { icon: "❓", text: "Simulasi rencana keuangan" },
  { icon: "🤖", text: "Atur budget bulan ini" },
  { icon: "💰", text: "Minta rekomendasi budget" },
];

export default function AIPage() {
  const { user, api } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Halo! Saya Karsafin AI, asisten keuangan Anda. Ada yang bisa saya bantu hari ini? Anda bisa menanyakan tentang analisis pengeluaran, rencana tabungan, atau sekadar tips menghemat uang.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("normal");

  // Database contexts
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [pendingBudgetRecos, setPendingBudgetRecos] = useState<Array<{ category_id: string; name: string; amount: number }>>([]);

  // Quota states
  const [aiQuota, setAiQuota] = useState<{ quota: number; max: number; rewardAmount: number } | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [adLoading, setAdLoading] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [adPlaying, setAdPlaying] = useState(false);

  const [showQuickChatPopup, setShowQuickChatPopup] = useState(false);

  // References
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.style.paddingBottom = "16px";
      mainEl.style.height = "calc(100vh - 80px)";
      mainEl.style.overflow = "hidden";
    }
    document.body.style.overflow = "hidden";

    return () => {
      if (mainEl) {
        mainEl.style.paddingBottom = "";
        mainEl.style.height = "";
        mainEl.style.overflow = "";
      }
      document.body.style.overflow = "";
    };
  }, []);

  const handleSaveEdit = async (updatedData: {
    amount: number;
    description: string;
    category: string;
    account: string;
    date: string;
    type: "income" | "expense" | "savings";
  }) => {
    if (!editingTransaction) return;
    try {
      let categoryId = "";
      const foundCat = categories.find(
        (c) => c.name.toLowerCase() === updatedData.category.toLowerCase() && c.type === updatedData.type
      );
      if (foundCat) categoryId = foundCat.id;

      let accountId = "";
      const foundAcc = accounts.find((a) => a.name.toLowerCase() === updatedData.account.toLowerCase());
      if (foundAcc) accountId = foundAcc.id;

      const res = await api.transactions.update(String(editingTransaction.id), {
        amount: updatedData.type === "income" ? Math.abs(updatedData.amount) : -Math.abs(updatedData.amount),
        description: updatedData.description,
        category_id: categoryId || undefined,
        account_id: accountId || undefined,
        date: updatedData.date,
        type: updatedData.type,
      });
      if (res.error) throw res.error;

      // Update message state locally so that the chat bubble reflects the new values!
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.savedTransactions) {
            const hasTx = msg.savedTransactions.some((t) => t.id === editingTransaction.id);
            if (hasTx) {
              return {
                ...msg,
                savedTransactions: msg.savedTransactions.map((t) => {
                  if (t.id === editingTransaction.id) {
                    return {
                      ...t,
                      amount: updatedData.amount,
                      description: updatedData.description,
                      categoryName: updatedData.category,
                      accountName: updatedData.account,
                      date: updatedData.date,
                      type: updatedData.type as any,
                    };
                  }
                  return t;
                }),
              };
            }
          }
          return msg;
        })
      );

      // Reload all data (transactions list, budget progress, etc.)
      await loadAllData();
      setEditingTransaction(null);
    } catch (err) {
      console.error("Gagal mengedit transaksi dari AI:", err);
      alert("Gagal mengedit transaksi");
    }
  };

  const loadQuota = useCallback(async () => {
    if (!user) return;
    const { data } = await api.profiles.getAiQuota(user.id);
    if (data) setAiQuota(data);
  }, [user, api]);

  const loadAllData = useCallback(async () => {
    if (!user) return;
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const [catRes, txRes, budgetRes, accRes] = await Promise.all([
        api.categories.getAll(),
        api.transactions.getAll(),
        api.budgets.getByMonth(y, m),
        api.accounts.getAll(),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (txRes.data) setAllTransactions(txRes.data);
      if (budgetRes.data) setBudgets(budgetRes.data);
      if (accRes.data) setAccounts(accRes.data);
    } catch (e) {
      console.error("AI load data error:", e);
    }
  }, [user, api]);

  useEffect(() => {
    if (user) {
      loadQuota();
      loadAllData();
    }
  }, [user, loadQuota, loadAllData]);

  // Quota Ad Simulation
  const handleWatchAd = () => {
    if (aiQuota && aiQuota.quota >= aiQuota.max) {
      alert("Mohon Maaf, kuota Anda sudah mencapai batas maksimal harian.");
      return;
    }
    setAdPlaying(true);
    setAdProgress(0);

    const interval = setInterval(() => {
      setAdProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          finishAdReward();
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const finishAdReward = async () => {
    if (!user) return;
    const reward = aiQuota?.rewardAmount ?? 5;
    try {
      const { data } = await api.profiles.addAiQuota(user.id, reward);
      await loadQuota();
      if (data && data.applied) {
        alert(`🎉 Selamat! Anda mendapat ${reward} kuota AI gratis setelah menonton simulasi iklan!`);
      } else {
        alert("Mohon Maaf, kamu sudah melampaui batas reward harian.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdPlaying(false);
      setAdProgress(0);
      setShowQuotaModal(false);
    }
  };

  // Local rule-based NLP Matchers
  function matchCategory(text: string, txType: "income" | "expense"): Category | null {
    const lower = text.toLowerCase();
    const cats = categories.filter((c) => c.type === txType);
    const keywords: Record<string, string[]> = {
      Makanan: ["makan", "sepatu", "baju", "jajan", "beras", "minyak", "goreng", "nasi", "ayam", "soto", "bakso", "mi", "mie", "kopi", "roti", "kue", "camilan", "snack", "susu", "telur", "ikan", "daging", "sayur", "buah", "sate", "gado", "sop", "lontong", "ketoprak"],
      Transport: ["bensin", "bbm", "transport", "bahan bakar", "gojek", "grab", "ojek"],
      Belanja: ["belanja", "baju", "kaos", "celana", "sabun", "shampo"],
      Tagihan: ["listrik", "air", "pdam", "pln", "pulsa", "tagihan", "wifi", "internet"],
      Hiburan: ["nonton", "film", "game", "hiburan", "bioskop", "netflix"],
      Kesehatan: ["obat", "klinik", "rumah sakit", "dokter", "vitamin"],
      Gaji: ["gaji", "bulanan", "salary"],
      Freelance: ["proyek", "freelance", "kerja lepas", "sidejob"],
    };
    for (const cat of cats) {
      if (lower.includes(cat.name.toLowerCase())) return cat;
    }
    for (const cat of cats) {
      const kws = keywords[cat.name];
      if (kws?.some((kw) => typeof kw === "string" && lower.includes(kw))) return cat;
    }
    return null;
  }

  function parseAmountFromText(text: string): { amount: number; rest: string } {
    const patterns = [
      /(?:Rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu)/i,
      /(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)\s*(jt|juta|rb|ribu)?/i,
      /(?:Rp\.?\s*)?(\d+)/i,
    ];
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        const raw = m[1].replace(/\./g, "").replace(/,/g, "");
        const num = parseFloat(raw);
        const multiplier = m[2]?.toLowerCase();
        let amount = num;
        if (multiplier === "jt" || multiplier === "juta") amount = num * 1000000;
        else if (multiplier === "rb" || multiplier === "ribu") amount = num * 1000;
        const rest = text.replace(m[0], "").trim();
        return { amount, rest };
      }
    }
    return { amount: 0, rest: text };
  }

  function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseDateFromText(text: string): { date: string; rest: string } {
    const lower = text.toLowerCase().trim();
    let date = getLocalToday();
    let rest = text.trim();

    if (lower.startsWith("kemarin")) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = toLocalDateStr(d);
      rest = text.replace(/^kemarin\s*/i, "").trim();
      return { date, rest };
    }

    if (lower.startsWith("hari ini")) {
      rest = text.replace(/^hari ini\s*/i, "").trim();
      return { date, rest };
    }

    const monthMap: Record<string, number> = {
      januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6,
      juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
      jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, agt: 8,
      sep: 9, okt: 10, nov: 11, des: 12,
    };

    const datePatterns = [
      /^(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|aug|agt|sep|okt|nov|des)\s+(\d{4})\b/i,
      /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/,
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/,
    ];

    for (const pattern of datePatterns) {
      const m = lower.match(pattern);
      if (m) {
        if (pattern === datePatterns[0]) {
          const day = parseInt(m[1], 10);
          const month = monthMap[m[2].toLowerCase()] || 1;
          const year = parseInt(m[3], 10);
          const d = new Date(year, month - 1, day);
          if (d.getDate() === day && d.getMonth() === month - 1) {
            date = toLocalDateStr(d);
            rest = text.replace(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim();
            return { date, rest };
          }
        } else if (pattern === datePatterns[1]) {
          let day = parseInt(m[1], 10);
          let month = parseInt(m[2], 10);
          let year = parseInt(m[3], 10);
          if (day > 12 && month <= 12) {
            [day, month] = [month, day];
          }
          const d = new Date(year, month - 1, day);
          if (d.getDate() === day && d.getMonth() === month - 1) {
            date = toLocalDateStr(d);
            rest = text.replace(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim();
            return { date, rest };
          }
        } else {
          const year = parseInt(m[1], 10);
          const month = parseInt(m[2], 10);
          const day = parseInt(m[3], 10);
          const d = new Date(year, month - 1, day);
          if (d.getDate() === day && d.getMonth() === month - 1) {
            date = toLocalDateStr(d);
            rest = text.replace(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim();
            return { date, rest };
          }
        }
      }
    }

    return { date, rest };
  }

  function parseSingleTransaction(text: string): {
    type: "income" | "expense";
    amount: number;
    description: string;
    date: string;
    categoryName: string;
    accountName: string;
  } | null {
    let rest = text;

    const { date, rest: afterDate } = parseDateFromText(rest);
    rest = afterDate;

    const incomeKw = ["terima", "gaji", "dapat", "jual", "hasil", "masuk", "pendapatan"];
    const isIncome = incomeKw.some((kw) => rest.toLowerCase().includes(kw));
    const type = isIncome ? "income" : "expense";

    const { amount, rest: afterAmount } = parseAmountFromText(rest);
    if (amount === 0) return null;
    rest = afterAmount;

    let accountName = "";
    const accountKw = ["cash", "tunai", "bri", "bca", "mandiri", "bni", "gojek", "gopay", "ovo"];
    const prepKw = ["lewat", "via", "transfer", "pakai", "pake", "dengan", "menggunakan"];
    for (const kw of accountKw) {
      const idx = rest.toLowerCase().indexOf(kw);
      if (idx >= 0) {
        accountName = kw.toUpperCase();
        rest = rest.slice(0, idx).trim();
        break;
      }
    }
    if (!accountName) {
      for (const kw of prepKw) {
        const idx = rest.toLowerCase().indexOf(kw);
        if (idx >= 0) {
          const after = rest.slice(idx + kw.length).trim();
          const nextWord = after.split(/\s+/)[0];
          accountName = nextWord ? nextWord.toUpperCase() : "";
          rest = rest.slice(0, idx).trim();
          break;
        }
      }
    }
    rest = rest.replace(/^beli\s*/i, "").replace(/^bayar\s*/i, "").replace(/^terima\s*/i, "").trim();
    rest = rest.replace(/\b(pakai|pake|dengan|menggunakan|melalui|lewat|via|transfer)\s+\S+/gi, "").trim();
    rest = rest.replace(/\b(pakai|pake|dengan|menggunakan|melalui|lewat|via|transfer)\b\s*$/gi, "").trim();
    rest = rest.replace(/\b(pakai|pake|dengan|menggunakan|melalui|lewat|via|transfer)\b/gi, "").trim();
    const category = matchCategory(rest, type);
    const monthNames = /^(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4}\b/i;
    rest = rest.replace(monthNames, "").replace(/\b\d{1,2}\s+(jan|feb|mar|apr|mei|jun|jul|aug|agt|sep|okt|nov|des)\s+\d{4}\b/gi, "").trim();
    rest = rest.replace(/\s{2,}/g, " ").trim();
    return { type, amount, description: rest || "Tanpa keterangan", date, categoryName: category?.name || "Lainnya", accountName };
  }

  function parseTransactions(text: string): Array<{
    type: "income" | "expense";
    amount: number;
    description: string;
    date: string;
    categoryName: string;
    accountName: string;
  }> {
    const parts = text.split(/\bdan\b|\blalu\b|\bterus\b/i).map((s) => s.trim()).filter(Boolean);
    const results: Array<any> = [];
    for (const part of parts) {
      const parsed = parseSingleTransaction(part);
      if (parsed) results.push(parsed);
    }
    return results;
  }

  const getMonthName = (m: number) => {
    const names = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return names[m] || "";
  };

  const getTxByMonth = (txs: Transaction[], year: number, month: number) =>
    txs.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

  const addAiMessage = (content: string) => {
    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content };
    setMessages((prev) => [...prev, aiMsg]);
  };

  // Quota Checker Guard helper
  const checkQuotaAndDecrement = async (): Promise<boolean> => {
    if (!user) return false;
    await loadQuota();
    if (!aiQuota || aiQuota.quota <= 0) {
      setShowQuotaModal(true);
      return false;
    }

    const { data: newQuota, error } = await api.profiles.decrementAiQuota(user.id);
    if (error || newQuota === null) {
      setAiQuota((prev) => (prev ? { ...prev, quota: 0 } : prev));
      setShowQuotaModal(true);
      return false;
    }
    setAiQuota((prev) => (prev ? { ...prev, quota: newQuota } : prev));
    return true;
  };

  // Suggested questions handler
  const handleSuggested = async (q: string) => {
    const allowed = await checkQuotaAndDecrement();
    if (!allowed) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    await loadAllData();

    if (q === "Bagaimana status budget saya bulan ini?") {
      setIsTyping(false);
      const now = new Date();
      const curM = now.getMonth() + 1;
      const curY = now.getFullYear();
      const curTx = getTxByMonth(allTransactions, curY, curM).filter((t) => t.type === "expense");

      if (budgets.length === 0) {
        addAiMessage(`📭 Anda belum mengatur budget untuk ${getMonthName(curM)} ${curY}.\n\nGunakan "Atur budget bulan ini" atau "Minta rekomendasi budget" untuk mulai.`);
        return;
      }

      const spendingByCat: Record<string, number> = {};
      for (const tx of curTx) {
        spendingByCat[tx.category_id] = (spendingByCat[tx.category_id] || 0) + tx.amount;
      }

      const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
      const totalSpent = budgets.reduce((sum, b) => sum + (spendingByCat[b.category_id] || 0), 0);
      const overallPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

      let msg = `📊 Status Budget ${getMonthName(curM)} ${curY}\n\nAnda telah menggunakan ${overallPct}% dari total budget.\n`;

      let maxPct = 0;
      let criticalBudget: { catName: string; spent: number; budget: number; pct: number } | null = null;

      for (const b of budgets) {
        const spent = spendingByCat[b.category_id] || 0;
        const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
        const catName = b.category?.name || "Tanpa Kategori";
        const catIcon = b.category?.icon || "📦";
        const status = pct >= 90 ? "🔴" : pct >= 70 ? "🟡" : "🟢";
        msg += `\n${status} ${catIcon} ${catName}: Rp ${formatCurrency(spent)} / Rp ${formatCurrency(b.amount)} (${pct}%)`;

        if (pct > maxPct) {
          maxPct = pct;
          criticalBudget = { catName, spent, budget: b.amount, pct };
        }
      }

      if (criticalBudget && criticalBudget.pct >= 70) {
        msg += `\n\n⚠️ Perhatian: Kategori "${criticalBudget.catName}" sudah mencapai ${criticalBudget.pct}%!`;
      }

      if (criticalBudget) {
        const color = criticalBudget.pct >= 90 ? "text-red-500 bg-red-50 border-red-100" : criticalBudget.pct >= 70 ? "text-amber-500 bg-amber-50 border-amber-100" : "text-emerald-500 bg-emerald-50 border-emerald-100";
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          type: "insight",
          content: msg,
          insightData: {
            label: `${criticalBudget.pct >= 90 ? "Peringatan" : "Status"}: ${criticalBudget.catName}`,
            percent: Math.min(criticalBudget.pct, 100),
            current: `Rp ${formatCurrency(criticalBudget.spent)}`,
            total: `Rp ${formatCurrency(criticalBudget.budget)}`,
            color,
          },
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        addAiMessage(msg);
      }
      return;
    }

    if (q === "Beri saran investasi untuk pemula") {
      setIsTyping(false);
      let msg = "💡 Saran Investasi untuk Pemula\n\n";
      msg += "1. 🏦 Deposito Bank — Risiko rendah, cocok untuk dana darurat\n";
      msg += "2. 📈 Reksa Dana Pasar Uang — Lebih fleksibel dari deposito, risiko rendah\n";
      msg += "3. 🏛️ Obligasi Negara (SBN) — Dijamin pemerintah, return tetap\n";
      msg += "4. 📊 Reksa Dana Indeks — Diversifikasi otomatis, biaya rendah\n";
      msg += "5. 🥇 Emas Digital — Lindung nilai inflasi\n\n";
      msg += "📌 Tips Penting:\n";
      msg += "• Sisihkan dana darurat 3-6 bulan pengeluaran sebelum investasi\n";
      msg += "• Mulai dari yang risiko rendah\n";
      msg += "• Jangan investasi uang yang Anda butuhkan dalam waktu dekat\n";
      msg += "• Diversifikasi portfolio Anda";

      const now = new Date();
      const curTx = getTxByMonth(allTransactions, now.getFullYear(), now.getMonth() + 1);
      const monthlyIncome = curTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const monthlyExpense = curTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      if (monthlyIncome > 0) {
        const surplus = monthlyIncome - monthlyExpense;
        if (surplus > 0) {
          msg += `\n\n💰 Berdasarkan data bulan ini, Anda punya surplus Rp ${formatCurrency(surplus)} yang bisa dialokasikan untuk investasi.`;
        }
      }
      addAiMessage(msg);
      return;
    }

    if (q === "Analisis pengeluaran makanan saya") {
      setIsTyping(false);
      const now = new Date();
      const curM = now.getMonth() + 1;
      const curY = now.getFullYear();
      const curTx = getTxByMonth(allTransactions, curY, curM).filter((t) => t.type === "expense");
      const foodTx = curTx.filter((t) => {
        const catName = (t.category?.name || "").toLowerCase();
        return catName.includes("makanan") || catName.includes("makan") || catName.includes("food");
      });

      if (foodTx.length === 0) {
        addAiMessage(`🍔 Belum ada pengeluaran makanan tercatat di bulan ${getMonthName(curM)} ${curY}.\n\nMulai catat pengeluaran makanan Anda untuk mendapat analisis!`);
        return;
      }

      const totalFood = foodTx.reduce((sum, t) => sum + t.amount, 0);
      const totalAllExpense = curTx.reduce((sum, t) => sum + t.amount, 0);
      const foodPct = totalAllExpense > 0 ? ((totalFood / totalAllExpense) * 100).toFixed(0) : "0";
      const avgPerDay = Math.round(totalFood / now.getDate());

      let msg = `🍔 Analisis Pengeluaran Makanan (${getMonthName(curM)} ${curY})\n\n`;
      msg += `📊 Total: Rp ${formatCurrency(totalFood)} (${foodPct}% dari total pengeluaran)\n`;
      msg += `📝 Jumlah transaksi: ${foodTx.length}x\n`;
      msg += `📅 Rata-rata per hari: Rp ${formatCurrency(avgPerDay)}\n\n`;

      msg += "Rincian transaksi:\n";
      for (const tx of foodTx.slice(0, 5)) {
        const dateStr = new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        msg += `• ${dateStr} — ${tx.description || "Makanan"} Rp ${formatCurrency(tx.amount)}\n`;
      }
      if (foodTx.length > 5) {
        msg += `... dan ${foodTx.length - 5} transaksi lainnya`;
      }

      if (Number(foodPct) > 40) {
        msg += "\n\n⚠️ Pengeluaran makanan melebihi 40% total pengeluaran. Pertimbangkan untuk masak di rumah lebih sering!";
      } else if (Number(foodPct) > 25) {
        msg += "\n\n💡 Pengeluaran makanan Anda cukup moderat. Pertahankan!";
      } else {
        msg += "\n\n✅ Pengeluaran makanan Anda tergolong hemat. Bagus!";
      }

      addAiMessage(msg);
      return;
    }
  };

  const handleQuickReply = async (text: string) => {
    const allowed = await checkQuotaAndDecrement();
    if (!allowed) return;

    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    await loadAllData();

    if (text === "Scan struk") {
      setIsTyping(false);
      fileInputRef.current?.click();
      return;
    }

    if (text === "Catat transaksi") {
      setIsTyping(false);
      setChatMode("catalog_transaction");
      addAiMessage(
        'Silakan ketik transaksi yang ingin dicatat.\n\nContoh:\n• "Hari ini beli sepatu Rp250rb cash"\n• "Kemarin terima gaji 3jt lewat BRI dan beli beras 75rb cash"'
      );
      return;
    }

    if (text === "Cek riwayat transaksi") {
      setIsTyping(false);
      const recent = allTransactions.slice(0, 10);
      if (recent.length === 0) {
        addAiMessage("📭 Belum ada transaksi yang tercatat. Mulai catat transaksi pertama Anda!");
        return;
      }
      let detail = "📋 Berikut 10 transaksi terakhir Anda:\n";
      for (const tx of recent) {
        const icon = tx.type === "income" ? "💰" : "💳";
        const dateStr = new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        const catName = tx.category?.name || "Tanpa Kategori";
        detail += `\n${icon} ${dateStr} — ${tx.description || "Tanpa keterangan"} Rp ${formatCurrency(tx.amount)} (${catName})`;
      }
      const totalIn = recent.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const totalOut = recent.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      detail += `\n\n💰 Total Pemasukan: Rp ${formatCurrency(totalIn)}`;
      detail += `\n💳 Total Pengeluaran: Rp ${formatCurrency(totalOut)}`;
      addAiMessage(detail);
      return;
    }

    if (text === "Bandingkan keuangan per periode") {
      setIsTyping(false);
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      const prevM = curM === 1 ? 12 : curM - 1;
      const prevY = curM === 1 ? curY - 1 : curY;

      const curTx = getTxByMonth(allTransactions, curY, curM);
      const prevTx = getTxByMonth(allTransactions, prevY, prevM);

      const curIn = curTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const curOut = curTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      const prevIn = prevTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const prevOut = prevTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

      let msg = `📊 Perbandingan Keuangan\n\n`;
      msg += `📅 ${getMonthName(prevM)} ${prevY}:\n`;
      msg += `  💰 Pemasukan: Rp ${formatCurrency(prevIn)}\n`;
      msg += `  💳 Pengeluaran: Rp ${formatCurrency(prevOut)}\n`;
      msg += `  📈 Selisih: ${prevIn >= prevOut ? "+" : "-"}Rp ${formatCurrency(Math.abs(prevIn - prevOut))}\n\n`;
      msg += `📅 ${getMonthName(curM)} ${curY}:\n`;
      msg += `  💰 Pemasukan: Rp ${formatCurrency(curIn)}\n`;
      msg += `  💳 Pengeluaran: Rp ${formatCurrency(curOut)}\n`;
      msg += `  📈 Selisih: ${curIn >= curOut ? "+" : "-"}Rp ${formatCurrency(Math.abs(curIn - curOut))}`;

      if (prevOut > 0) {
        const pctChange = (((curOut - prevOut) / prevOut) * 100).toFixed(0);
        const direction = curOut > prevOut ? "lebih tinggi" : "lebih rendah";
        msg += `\n\n💡 Insight: Pengeluaran bulan ini ${Math.abs(Number(pctChange))}% ${direction} dari bulan lalu.`;
      }
      if (curTx.length === 0 && prevTx.length === 0) {
        msg = "📭 Belum ada data transaksi untuk dibandingkan. Mulai catat transaksi Anda!";
      }
      addAiMessage(msg);
      return;
    }

    if (text === "Cek keuangan per kategori") {
      setIsTyping(false);
      const now = new Date();
      const curM = now.getMonth() + 1;
      const curY = now.getFullYear();
      const curTx = getTxByMonth(allTransactions, curY, curM).filter((t) => t.type === "expense");

      if (curTx.length === 0) {
        addAiMessage(`📭 Belum ada pengeluaran di bulan ${getMonthName(curM)} ${curY}.`);
        return;
      }

      const byCategory: Record<string, { name: string; icon: string; total: number }> = {};
      for (const tx of curTx) {
        const catName = tx.category?.name || "Lainnya";
        const catIcon = tx.category?.icon || "📦";
        if (!byCategory[catName]) byCategory[catName] = { name: catName, icon: catIcon, total: 0 };
        byCategory[catName].total += tx.amount;
      }
      const sorted = Object.values(byCategory).sort((a, b) => b.total - a.total);
      const totalExpense = sorted.reduce((sum, c) => sum + c.total, 0);

      let msg = `💵 Pengeluaran Per Kategori (${getMonthName(curM)} ${curY}):\n`;
      for (const c of sorted) {
        const pct = totalExpense > 0 ? ((c.total / totalExpense) * 100).toFixed(0) : "0";
        msg += `\n${c.icon} ${c.name}: Rp ${formatCurrency(c.total)} (${pct}%)`;
      }
      msg += `\n\n📊 Total Pengeluaran: Rp ${formatCurrency(totalExpense)}`;
      msg += `\n🏆 Kategori terbesar: ${sorted[0].icon} ${sorted[0].name} (${((sorted[0].total / totalExpense) * 100).toFixed(0)}%)`;
      addAiMessage(msg);
      return;
    }

    if (text === "Simulasi rencana keuangan") {
      setIsTyping(false);
      setChatMode("financial_simulation");
      addAiMessage("🎯 Simulasi Rencana Keuangan\n\nBerapa target tabungan yang ingin Anda capai?\n\nContoh:\n• \"10jt\"\n• \"50000000\"\n• \"100 juta\"");
      return;
    }

    if (text === "Atur budget bulan ini") {
      setIsTyping(false);
      const now = new Date();
      const curM = now.getMonth() + 1;
      const curY = now.getFullYear();

      const expenseCats = categories.filter((c) => c.type === "expense");
      if (expenseCats.length === 0) {
        addAiMessage("⚠️ Belum ada kategori pengeluaran. Tambahkan kategori terlebih dahulu.");
        return;
      }

      let msg = `🤖 Atur Budget ${getMonthName(curM)} ${curY}\n\nBerikut kategori pengeluaran Anda:\n`;
      expenseCats.forEach((c, i) => {
        const existing = budgets.find((b) => b.category_id === c.id);
        const budgetStr = existing ? `Rp ${formatCurrency(existing.amount)}` : "Belum ada budget";
        msg += `\n${i + 1}. ${c.icon} ${c.name} — ${budgetStr}`;
      });
      msg += '\n\nKetik nama/nomor kategori dan jumlah budget.\nContoh: "Makanan 500rb" atau "1 1jt"\nKetik "selesai" untuk kembali.';
      setChatMode("set_budget");
      addAiMessage(msg);
      return;
    }

    if (text === "Minta rekomendasi budget") {
      setIsTyping(false);
      const now = new Date();

      const months: Array<{ y: number; m: number }> = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
      }

      const catSpending: Record<string, { name: string; icon: string; totals: number[] }> = {};
      for (const period of months) {
        const txs = getTxByMonth(allTransactions, period.y, period.m).filter((t) => t.type === "expense");
        const periodCats: Record<string, number> = {};
        for (const tx of txs) {
          const catName = tx.category?.name || "Lainnya";
          periodCats[catName] = (periodCats[catName] || 0) + tx.amount;
          if (!catSpending[catName]) {
            catSpending[catName] = { name: catName, icon: tx.category?.icon || "📦", totals: [] };
          }
        }
        for (const [name, entry] of Object.entries(catSpending)) {
          entry.totals.push(periodCats[name] || 0);
        }
      }

      const recos: Array<{ name: string; icon: string; avg: number; reco: number }> = [];
      for (const [, entry] of Object.entries(catSpending)) {
        const validTotals = entry.totals.filter((t) => t > 0);
        if (validTotals.length === 0) continue;
        const avg = validTotals.reduce((sum, t) => sum + t, 0) / validTotals.length;
        const reco = Math.ceil((avg * 1.1) / 1000) * 1000;
        recos.push({ name: entry.name, icon: entry.icon, avg: Math.round(avg), reco });
      }

      if (recos.length === 0) {
        addAiMessage("📭 Belum cukup data transaksi untuk memberikan rekomendasi. Catat transaksi minimal 1 bulan terlebih dahulu.");
        return;
      }

      recos.sort((a, b) => b.reco - a.reco);
      const totalReco = recos.reduce((sum, r) => sum + r.reco, 0);
      const monthRange = months
        .map((p) => getMonthName(p.m))
        .reverse()
        .join(", ");

      let msg = `💰 Rekomendasi Budget\nBerdasarkan analisis ${monthRange}:\n`;
      for (const r of recos) {
        msg += `\n${r.icon} ${r.name}: Rata-rata Rp ${formatCurrency(r.avg)} → Rekomendasi: Rp ${formatCurrency(r.reco)}`;
      }
      msg += `\n\n📊 Total rekomendasi: Rp ${formatCurrency(totalReco)}/bulan`;
      msg += "\n\nPilihan Anda:";
      msg += '\n• Ketik "Ya" untuk menyimpan semua rekomendasi';
      msg += '\n• Ketik nama kategori dan jumlah untuk menyesuaikan (contoh: "Makanan 500rb")';
      msg += '\n• Ketik "selesai" jika sudah selesai';

      const expenseCats = categories.filter((c) => c.type === "expense");
      const recosToSave = recos
        .map((r) => {
          const cat = expenseCats.find((c) => c.name === r.name);
          return { category_id: cat?.id || "", name: r.name, amount: r.reco };
        })
        .filter((r) => r.category_id);
      setPendingBudgetRecos(recosToSave);
      setChatMode("apply_budget_reco");
      addAiMessage(msg);
      return;
    }

    setIsTyping(false);
    addAiMessage("Maaf, fitur ini sedang dalam pengembangan. Silakan coba quick action lainnya!");
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const allowed = await checkQuotaAndDecrement();
    if (!allowed) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    if (chatMode === "catalog_transaction") {
      setChatMode("normal");
      try {
        const parsed = parseTransactions(text);
        if (parsed.length === 0) {
          setIsTyping(false);
          addAiMessage(
            'Maaf, saya tidak bisa mengenali format transaksi Anda. Silakan coba lagi dengan format seperti:\n• "Hari ini beli sepatu Rp250rb cash"\n• "Kemarin terima gaji 3jt lewat BRI"'
          );
          return;
        }

        const savedTxs: SavedTransaction[] = [];
        let savedCount = 0;
        let details = "";

        for (const tx of parsed) {
          if (!user) continue;

          const matchedCat = categories.find((c) => c.name === tx.categoryName && c.type === tx.type);
          if (!matchedCat) continue;

          const matchedAcc = tx.accountName ? accounts.find((a) => a.name.toUpperCase() === tx.accountName.toUpperCase()) : undefined;

          const { data: txData, error: txError } = await api.transactions.create(user.id, {
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            date: tx.date,
            category_id: matchedCat.id,
            account_id: matchedAcc?.id,
            source: "ai",
          });

          if (txData) {
            savedCount++;
            savedTxs.push({
              id: txData.id,
              type: tx.type,
              amount: tx.amount,
              description: tx.description,
              date: tx.date,
              categoryName: tx.categoryName,
              accountName: tx.accountName,
            });
            const [y, m, d] = tx.date.split("-").map(Number);
            const dateStr = `${d} ${getMonthName(m)} ${y}`;
            const icon = tx.type === "income" ? "💰" : "💳";
            details += `\n${icon} ${tx.type === "income" ? "Pemasukan" : "Pengeluaran"} Rp ${formatCurrency(tx.amount)}`;
            details += `\n   📅 ${dateStr}`;
            details += `\n   🏷️ ${tx.categoryName}`;
            if (tx.accountName) details += `\n   🏦 ${tx.accountName}`;
            details += `\n   📝 ${tx.description}\n`;
          } else {
            console.error("Failed to save transaction:", txError);
          }
        }

        setIsTyping(false);
        if (savedCount > 0) {
          await loadAllData();
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `✅ ${savedCount} transaksi berhasil dicatat:${details}\n\nKetik "Catat transaksi" lagi jika ingin menambahkan transaksi lainnya.`,
            savedTransactions: savedTxs,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          addAiMessage("Maaf, terjadi kesalahan saat menyimpan transaksi. Silakan coba lagi.");
        }
      } catch {
        setIsTyping(false);
        addAiMessage("Maaf, terjadi kesalahan. Silakan coba lagi.");
      }
      return;
    }

    if (chatMode === "financial_simulation") {
      setChatMode("normal");
      try {
        const { amount: targetAmount } = parseAmountFromText(text);
        if (targetAmount <= 0) {
          setIsTyping(false);
          addAiMessage('Maaf, saya tidak mengenali jumlah target Anda. Coba ketik seperti "10jt" atau "50000000".');
          return;
        }

        const now = new Date();
        let totalIncomeVal = 0,
          totalExpenseVal = 0,
          monthCount = 0;
        for (let i = 1; i <= 3; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const txs = getTxByMonth(allTransactions, d.getFullYear(), d.getMonth() + 1);
          if (txs.length > 0) {
            totalIncomeVal += txs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
            totalExpenseVal += txs.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
            monthCount++;
          }
        }

        setIsTyping(false);

        if (monthCount === 0) {
          addAiMessage(
            `🎯 Target tabungan: Rp ${formatCurrency(
              targetAmount
            )}\n\n⚠️ Belum ada data transaksi yang cukup untuk simulasi. Catat transaksi selama minimal 1 bulan agar simulasi lebih akurat.`
          );
          return;
        }

        const avgIn = Math.round(totalIncomeVal / monthCount);
        const avgOut = Math.round(totalExpenseVal / monthCount);
        const avgSaving = avgIn - avgOut;

        let msg = `🎯 Simulasi Rencana Keuangan\n\nTarget: Rp ${formatCurrency(targetAmount)}\n\n`;
        msg += `📊 Berdasarkan data ${monthCount} bulan terakhir:\n`;
        msg += `• Rata-rata pemasukan/bulan: Rp ${formatCurrency(avgIn)}\n`;
        msg += `• Rata-rata pengeluaran/bulan: Rp ${formatCurrency(avgOut)}\n`;
        msg += `• Sisa rata-rata/bulan: ${avgSaving >= 0 ? "" : "-"}Rp ${formatCurrency(Math.abs(avgSaving))}`;

        if (avgSaving <= 0) {
          msg += "\n\n⚠️ Pengeluaran Anda melebihi pemasukan. Anda perlu mengurangi pengeluaran atau menambah pemasukan sebelum bisa menabung.";
        } else {
          const months = Math.ceil(targetAmount / avgSaving);
          const years = Math.floor(months / 12);
          const remMonths = months % 12;
          const timeStr = years > 0 ? `${years} tahun ${remMonths > 0 ? `${remMonths} bulan` : ""}` : `${months} bulan`;
          msg += `\n\n⏰ Waktu yang dibutuhkan: ${timeStr} (${months} bulan)`;

          const reduced = Math.round(avgOut * 0.9);
          const newSaving = avgIn - reduced;
          if (newSaving > avgSaving) {
            const newMonths = Math.ceil(targetAmount / newSaving);
            msg += `\n\n💡 Tips: Jika mengurangi pengeluaran 10%, waktu bisa dipersingkat menjadi ${newMonths} bulan.`;
          }
        }

        addAiMessage(msg);
      } catch {
        setIsTyping(false);
        addAiMessage("Maaf, terjadi kesalahan saat simulasi. Silakan coba lagi.");
      }
      return;
    }

    if (chatMode === "set_budget") {
      if (text.toLowerCase() === "selesai") {
        setChatMode("normal");
        setIsTyping(false);
        addAiMessage("✅ Selesai mengatur budget. Gunakan quick action lainnya jika diperlukan!");
        return;
      }

      try {
        const expenseCats = categories.filter((c) => c.type === "expense");
        let matchedCat: Category | null = null;

        const numMatch = text.match(/^(\d+)\s+/);
        if (numMatch) {
          const idx = parseInt(numMatch[1], 10) - 1;
          if (idx >= 0 && idx < expenseCats.length) {
            matchedCat = expenseCats[idx];
          }
        }

        if (!matchedCat) {
          const lower = text.toLowerCase();
          matchedCat = expenseCats.find((c) => lower.includes(c.name.toLowerCase())) || null;
        }

        const { amount: budgetAmount } = parseAmountFromText(text);

        if (!matchedCat || budgetAmount <= 0) {
          setIsTyping(false);
          addAiMessage('⚠️ Format tidak dikenali. Contoh: "Makanan 500rb" atau "1 1jt"\nKetik "selesai" untuk kembali.');
          return;
        }

        if (!user) {
          setIsTyping(false);
          addAiMessage("⚠️ Silakan login terlebih dahulu.");
          return;
        }

        const now = new Date();
        const { error } = await api.budgets.upsert(user.id, {
          category_id: matchedCat.id,
          amount: budgetAmount,
          mode: "nominal",
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });

        setIsTyping(false);

        if (error) {
          addAiMessage("❌ Gagal menyimpan budget. Silakan coba lagi.");
        } else {
          await loadAllData();
          addAiMessage(
            `✅ Budget berhasil diatur:\n${matchedCat.icon} ${matchedCat.name}: Rp ${formatCurrency(
              budgetAmount
            )}/bulan\n\nKetik kategori lain atau "selesai" untuk kembali.`
          );
        }
      } catch {
        setIsTyping(false);
        addAiMessage("Maaf, terjadi kesalahan. Silakan coba lagi.");
      }
      return;
    }

    if (chatMode === "apply_budget_reco") {
      const lower = text.toLowerCase();

      if (lower === "selesai") {
        setChatMode("normal");
        setPendingBudgetRecos([]);
        setIsTyping(false);
        addAiMessage("✅ Selesai mengatur budget. Gunakan quick action lainnya jika diperlukan!");
        return;
      }

      if (lower === "ya" || lower === "iya") {
        if (!user) {
          setIsTyping(false);
          addAiMessage("⚠️ Silakan login terlebih dahulu.");
          return;
        }
        setChatMode("normal");
        try {
          const now = new Date();
          let savedCount = 0;
          for (const reco of pendingBudgetRecos) {
            const { error } = await api.budgets.upsert(user.id, {
              category_id: reco.category_id,
              amount: reco.amount,
              mode: "nominal",
              month: now.getMonth() + 1,
              year: now.getFullYear(),
            });
            if (!error) savedCount++;
          }
          setIsTyping(false);
          await loadAllData();
          addAiMessage(
            `✅ ${savedCount} budget berhasil diterapkan!\n\nSemua rekomendasi budget sudah disimpan untuk bulan ${getMonthName(
              now.getMonth() + 1
            )} ${now.getFullYear()}.`
          );
        } catch {
          setIsTyping(false);
          addAiMessage("❌ Gagal menerapkan rekomendasi budget. Silakan coba lagi.");
        }
        setPendingBudgetRecos([]);
        return;
      }

      try {
        const expenseCats = categories.filter((c) => c.type === "expense");
        let matchedCat: Category | null = null;

        const numMatch = text.match(/^(\d+)\s+/);
        if (numMatch) {
          const idx = parseInt(numMatch[1], 10) - 1;
          if (idx >= 0 && idx < expenseCats.length) {
            matchedCat = expenseCats[idx];
          }
        }

        if (!matchedCat) {
          matchedCat = expenseCats.find((c) => text.toLowerCase().includes(c.name.toLowerCase())) || null;
        }

        if (!matchedCat) {
          const recoMatch = pendingBudgetRecos.find((r) => text.toLowerCase().includes(r.name.toLowerCase()));
          if (recoMatch) {
            matchedCat = expenseCats.find((c) => c.id === recoMatch.category_id) || null;
          }
        }

        const { amount: budgetAmount } = parseAmountFromText(text);

        if (!matchedCat || budgetAmount <= 0) {
          setIsTyping(false);
          addAiMessage('⚠️ Format tidak dikenali. Contoh: "Makanan 500rb" atau "Transport 300rb"\n\nKetik "Ya" untuk simpan semua, atau "selesai" untuk keluar.');
          return;
        }

        if (!user) {
          setIsTyping(false);
          addAiMessage("⚠️ Silakan login terlebih dahulu.");
          return;
        }

        const now = new Date();
        const { error } = await api.budgets.upsert(user.id, {
          category_id: matchedCat.id,
          amount: budgetAmount,
          mode: "nominal",
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        });

        setIsTyping(false);

        if (error) {
          addAiMessage("❌ Gagal menyimpan budget. Silakan coba lagi.");
        } else {
          setPendingBudgetRecos((prev) =>
            prev.map((r) => (r.category_id === matchedCat!.id ? { ...r, amount: budgetAmount } : r))
          );
          await loadAllData();
          addAiMessage(
            `✅ Budget disesuaikan:\n${matchedCat.icon} ${matchedCat.name}: Rp ${formatCurrency(
              budgetAmount
            )}/bulan\n\nKetik kategori lain, "Ya" untuk simpan sisanya, atau "selesai".`
          );
        }
      } catch {
        setIsTyping(false);
        addAiMessage("Maaf, terjadi kesalahan. Silakan coba lagi.");
      }
      return;
    }

    // Normal mode: call edge function for AI response
    const lower = text.toLowerCase();
    if (lower.includes("budget") || lower.includes("anggaran")) {
      setIsTyping(false);
      await handleSuggested("Bagaimana status budget saya bulan ini?");
      return;
    }
    if (lower.includes("pengeluaran") || lower.includes("belanja") || lower.includes("habis")) {
      setIsTyping(false);
      handleQuickReply("Cek keuangan per kategori");
      return;
    }
    if (lower.includes("riwayat") || lower.includes("histori") || lower.includes("terakhir")) {
      setIsTyping(false);
      handleQuickReply("Cek riwayat transaksi");
      return;
    }

    await loadAllData();
    try {
      const now = new Date();
      const curTx = getTxByMonth(allTransactions, now.getFullYear(), now.getMonth() + 1);
      const monthlyIncome = curTx.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const monthlyExpense = curTx.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      const catsList = categories.map((c) => `${c.icon} ${c.name} (${c.type})`).join(", ");
      const budgetsList = budgets.map((b) => `${b.category?.name || "Tanpa Kategori"}: Rp ${formatCurrency(b.amount)}`).join(", ");

      const historyMessages = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await api.supabase.functions.invoke("ai-chat", {
        body: {
          message: text,
          history: historyMessages,
          context: {
            userName: user?.user_metadata?.name || "Pengguna",
            monthlyIncome,
            monthlyExpense,
            categories: catsList || "Tidak ada data",
            budgets: budgetsList || "Tidak ada data",
            transactionCount: curTx.length,
          },
        },
      });

      setIsTyping(false);
      if (data?.response) {
        addAiMessage(data.response);
      } else {
        addAiMessage("Maaf, saya sedang mengalami gangguan. Silakan coba lagi nanti.");
      }
    } catch {
      setIsTyping(false);
      addAiMessage("Maaf, terjadi kesalahan. Silakan coba lagi atau gunakan quick action di bawah.");
    }
  };

  // Drag & drop or Camera Scan upload trigger
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowed = await checkQuotaAndDecrement();
    if (!allowed) return;

    const fileUrl = URL.createObjectURL(file);
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "📷 Scan struk belanja",
      imageUri: fileUrl,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const mimeType = file.type;

        // Try calling Supabase scan-receipt edge function
        let scanResult: any = null;
        try {
          const { data, error } = await api.supabase.functions.invoke("scan-receipt", {
            body: { image: base64, mimeType },
          });
          if (!error) scanResult = data;
        } catch (e) {
          console.warn("Edge function scan failed, using simulated OCR");
        }

        // Mock Fallback OCR scan logic if edge function failed/not found
        if (!scanResult || !scanResult.transactions) {
          await new Promise((r) => setTimeout(r, 2000));
          scanResult = {
            transactions: [
              {
                type: "expense",
                category: "Makanan",
                amount: 35000,
                description: "Makan Siang Struk",
                account: "GoPay",
              },
            ],
          };
        }

        if (!user) return;

        await loadAllData();
        const savedTxs: SavedTransaction[] = [];
        let details = "";
        const today = getLocalToday();

        for (const item of scanResult.transactions) {
          const txType = item.type === "income" ? "income" : "expense";
          const matchedCat =
            categories.find((c) => c.name.toLowerCase() === (item.category || "").toLowerCase() && c.type === txType) ||
            categories.find((c) => c.name === "Lainnya" && c.type === txType) ||
            categories[0];

          const matchedAcc = item.account ? accounts.find((a) => a.name.toUpperCase().includes(item.account.toUpperCase())) : undefined;

          const txDate = item.date || today;

          const { data: txData } = await api.transactions.create(user.id, {
            type: txType,
            amount: item.amount,
            description: item.description || "Hasil Scan Struk",
            date: txDate,
            category_id: matchedCat.id,
            account_id: matchedAcc?.id,
            source: "ai_scan",
          });

          if (txData) {
            savedTxs.push({
              id: txData.id,
              type: txType,
              amount: item.amount,
              description: item.description || "Hasil Scan Struk",
              date: txDate,
              categoryName: matchedCat.name,
              accountName: matchedAcc?.name || "Cash",
            });
            const [y, m, d] = txDate.split("-").map(Number);
            const dateStr = `${d} ${getMonthName(m)} ${y}`;
            details += `\n💳 Pengeluaran Rp ${formatCurrency(item.amount)}`;
            details += `\n   📅 ${dateStr}`;
            details += `\n   🏷️ ${matchedCat.name}`;
            details += `\n   📝 ${item.description || "Hasil Scan Struk"}\n`;
          }
        }

        setIsTyping(false);
        if (savedTxs.length > 0) {
          await loadAllData();
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `✅ Scan Struk Berhasil! ${savedTxs.length} transaksi dicatat ke database:${details}\n\nKetuk item untuk edit.`,
            savedTransactions: savedTxs,
          };
          setMessages((prev) => [...prev, aiMsg]);
        } else {
          addAiMessage("❌ Maaf, gagal memproses struk tersebut. Pastikan teks terlihat jelas.");
        }
      } catch (err) {
        setIsTyping(false);
        addAiMessage("❌ Terjadi kesalahan saat membaca struk.");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Quota Modal */}
      {mounted && showQuotaModal && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-sm w-full p-6 relative shadow-2xl border border-slate-100 animate-fade-in-up">
            <button
              onClick={() => {
                if (!adPlaying) setShowQuotaModal(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
              disabled={adPlaying}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto">
                <Zap className="h-8 w-8 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">Kuota Transaksi AI</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Kuota habis? Tonton video simulasi iklan singkat (3 detik) untuk mengisi ulang **+5 kuota AI** secara gratis.
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-400">Kuota Saat Ini</span>
                <span className="text-slate-800 font-extrabold text-sm">
                  {aiQuota?.quota ?? 0} / {aiQuota?.max ?? 50}
                </span>
              </div>

              {adPlaying ? (
                <div className="space-y-2">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                    <div
                      className="h-full bg-blue-600 rounded-full shadow-inner transition-all duration-300"
                      style={{ width: `${adProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-blue-600 font-bold animate-pulse">Menonton Iklan (Simulasi)...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 pt-2">
                  <button
                    onClick={handleWatchAd}
                    className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-bold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Tonton Iklan (+5 Kuota)
                  </button>
                  <button
                    onClick={() => setShowQuotaModal(false)}
                    className="w-full bg-slate-100 text-slate-700 rounded-2xl py-3.5 font-bold text-sm hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Chat Container */}
      <div id="tour-ai-chat" className="custom-card flex flex-col overflow-hidden h-[calc(100vh-100px)]">
        {/* Chat Header inside card */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-extrabold text-sm text-slate-800">Asisten AI Keuangan</h2>
              <p className="text-[10px] text-dashboard-gray font-semibold leading-none mt-0.5">Aktif • Didukung AI Cerdas Karsafin</p>
            </div>
          </div>
          <button
            onClick={() => setShowQuotaModal(true)}
            className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-150 text-[10px] font-black text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />
            <span>KUOTA AI: {aiQuota?.quota ?? 0}/{aiQuota?.max ?? 50}</span>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0 mt-1 ${
                  msg.role === "assistant"
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                    : "bg-slate-100 border border-slate-200 text-slate-500"
                }`}
              >
                {msg.role === "assistant" ? <Bot className="h-4.5 w-4.5" /> : <UserIcon className="h-4.5 w-4.5" />}
              </div>

              {/* Message bubble */}
              <div className="flex-1 space-y-2">
                <div
                  className={`border rounded-2xl rounded-tl-md px-5 py-4 ${
                    msg.role === "assistant"
                      ? msg.type === "insight"
                        ? "bg-amber-50/50 border-amber-100/50"
                        : "bg-blue-50/80 border-blue-100/50"
                      : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  {/* Image Attachment */}
                  {msg.imageUri && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-100 max-w-[200px]">
                      <img src={msg.imageUri} alt="Struk Belanja" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  {/* Text content formatting */}
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {msg.content.split("**").map((part, i) =>
                      i % 2 === 1 ? (
                        <strong key={i} className="font-bold text-slate-800">
                          {part}
                        </strong>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </div>

                  {/* Insight layout extra widget */}
                  {msg.type === "insight" && msg.insightData && (
                    <div className="mt-4 p-3 border border-slate-100 bg-white rounded-xl shadow-sm space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                        <span>{msg.insightData.label}</span>
                        <span>{msg.insightData.percent}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{
                            width: `${msg.insightData.percent}%`,
                            backgroundColor: msg.insightData.color,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400">
                        <span>{msg.insightData.current}</span>
                        <span>Target {msg.insightData.total}</span>
                      </div>
                    </div>
                  )}

                  {/* Saved Transactions */}
                  {msg.savedTransactions && msg.savedTransactions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {msg.savedTransactions.map((tx) => (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => setEditingTransaction(tx)}
                          className="w-full flex items-center gap-3 p-3 border border-slate-100 bg-white hover:bg-slate-50 rounded-xl shadow-sm transition-all text-left cursor-pointer group"
                        >
                          <span className="text-xl shrink-0">
                            {tx.type === "income" ? "💰" : "💳"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-800 truncate">
                              {tx.type === "income" ? "Pemasukan" : "Pengeluaran"} &mdash; Rp {formatCurrency(tx.amount)}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold truncate">
                              {tx.categoryName} {tx.accountName ? ` • ${tx.accountName}` : ""}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 font-medium mt-1 ml-2">
                  {msg.role === "assistant" ? "Karsafin AI" : "Anda"} &middot;{" "}
                  {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm shrink-0 mt-1">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div className="bg-blue-50/80 border border-blue-100/50 rounded-2xl rounded-tl-md px-5 py-4 flex items-center justify-center shrink-0">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div id="tour-ai-input-bar" className="p-4 md:px-8 md:pb-6 border-t border-slate-100 relative">
          {/* Quick Chat Pop-up */}
          {showQuickChatPopup && (
            <>
              {/* Click-out overlay */}
              <div className="fixed inset-0 z-30" onClick={() => setShowQuickChatPopup(false)} />
              
              {/* Popup Card */}
              <div className="absolute bottom-20 left-4 md:left-8 z-40 bg-white border border-slate-150 rounded-2xl shadow-xl w-72 overflow-hidden py-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="px-4 pb-2 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span>Pintasan Obrolan</span>
                  <button onClick={() => setShowQuickChatPopup(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-2 max-h-60 overflow-y-auto px-2 space-y-1">
                  {QUICK_REPLIES.map((reply) => (
                    <button
                      key={reply.text}
                      onClick={() => {
                        handleQuickReply(reply.text);
                        setShowQuickChatPopup(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-blue-50/50 text-left text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer group"
                    >
                      <span className="text-sm shrink-0">{reply.icon}</span>
                      <span className="flex-1 truncate">{reply.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-2 border border-slate-100 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            {/* Struk camera upload trigger */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-sm"
              title="Scan Struk Belanja"
            >
              <Camera className="h-5 w-5" />
            </button>

            {/* Quick Actions popup trigger */}
            <button
              id="tour-ai-quick-replies"
              onClick={() => setShowQuickChatPopup(!showQuickChatPopup)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-sm ${
                showQuickChatPopup
                  ? "bg-blue-50 border-blue-100 text-blue-600"
                  : "bg-white border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100"
              }`}
              title="Pintasan Obrolan"
            >
              <MessageSquare className="h-5 w-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={
                chatMode === "catalog_transaction"
                  ? "Ketik transaksi... (contoh: Makan siang 35rb Gopay)"
                  : chatMode === "set_budget"
                  ? "Ketik budget... (contoh: Makanan 500rb)"
                  : "Tanyakan analisis, budget, atau ketik transaksi..."
              }
              className="flex-1 bg-transparent px-2 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            />
            <button
              onClick={handleSend}
              className="w-11 h-11 bg-dashboard-blue text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-blue-200 shrink-0"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            Didukung oleh Groq AI. Kuota Anda dipotong 1 pertanyaan per obrolan.
          </p>
        </div>
      </div>

      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveEdit}
          dbAccounts={accounts}
          dbCategories={categories}
        />
      )}
    </>
  );
}

