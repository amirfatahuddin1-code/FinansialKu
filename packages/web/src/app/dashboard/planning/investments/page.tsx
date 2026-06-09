"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronDown,
  Save,
  X,
  Briefcase,
  Coins,
  BarChart3,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Lock,
  Crown,
  CalendarDays,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useAuth, useWorkspace } from "@/providers";
import { InstitutionLogo } from "@/components/InstitutionLogo";
import { TagSelector } from "@/components/TagSelector";
import { serializeDescriptionAndTags } from "@/utils/tagUtils";

interface InvestmentAsset {
  id: string;
  name: string;
  type: "saham" | "reksadana" | "emas" | "obligasi" | "crypto";
  units: number;
  avgBuyPrice: number;
  currentPrice: number;
  platform: string;
  purchaseDate?: string;
  createdAt: string;
}

const ASSET_TYPES = [
  { key: "saham" as const, label: "Saham", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "reksadana" as const, label: "Reksadana", icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "emas" as const, label: "Emas", icon: Coins, color: "text-yellow-600", bg: "bg-yellow-50" },
  { key: "obligasi" as const, label: "Obligasi", icon: Shield, color: "text-indigo-600", bg: "bg-indigo-50" },
  { key: "crypto" as const, label: "Crypto", icon: Activity, color: "text-rose-600", bg: "bg-rose-50" },
];

const DEFAULT_PLATFORMS = ["Bibit", "Ajaib", "Stockbit", "Tokopedia Emas", "Pluang"];

const CATEGORIES_SAVINGS = [
  { emoji: "📊", label: "Reksadana" },
  { emoji: "📈", label: "Saham" },
  { emoji: "🪙", label: "Emas" },
  { emoji: "🏦", label: "Tabungan" },
  { emoji: "🏠", label: "Properti" },
  { emoji: "🎯", label: "Dana Darurat" },
];

const FALLBACK_ACCOUNTS = [
  { emoji: "🏦", label: "BCA" },
  { emoji: "🏦", label: "Mandiri" },
  { emoji: "📱", label: "GoPay" },
  { emoji: "📱", label: "OVO" },
  { emoji: "📈", label: "Bibit" },
  { emoji: "💵", label: "Cash" },
];

function formatRupiah(value: number) {
  const isNeg = value < 0;
  const abs = Math.abs(value);
  return `${isNeg ? "-" : ""}Rp${abs.toLocaleString("id-ID")}`;
}

export default function InvestmentsPage() {
  const { user, api } = useAuth();
  const { activeWorkspace } = useWorkspace();

  // State
  const [mounted, setMounted] = useState(false);
  const [assets, setAssets] = useState<InvestmentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"portfolio" | "allocation">("portfolio");

  // DB State
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Modal State (Aset Baru)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"saham" | "reksadana" | "emas" | "obligasi" | "crypto">("saham");
  const [formUnits, setFormUnits] = useState("");
  const [formAvgBuy, setFormAvgBuy] = useState("");
  const [formCurrentPrice, setFormCurrentPrice] = useState("");
  const [formPlatform, setFormPlatform] = useState("");
  const [formPurchaseDate, setFormPurchaseDate] = useState("");
  const [formPurchaseTime, setFormPurchaseTime] = useState("");
  const [formCatatTransaksi, setFormCatatTransaksi] = useState(false);
  const [formSumberDana, setFormSumberDana] = useState("");
  const [isFormAccountDropdownOpen, setIsFormAccountDropdownOpen] = useState(false);

  // Custom platforms state
  const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);
  const [newPlatformInput, setNewPlatformInput] = useState("");
  const [isAddingPlatform, setIsAddingPlatform] = useState(false);

  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const platformDropdownRef = useRef<HTMLDivElement>(null);
  const formAccountDropdownRef = useRef<HTMLDivElement>(null);

  // Transaction Modal State (Catat Investasi)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txAccount, setTxAccount] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txTime, setTxTime] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txSelectedTags, setTxSelectedTags] = useState<string[]>([]);
  const [isTxAccountDropdownOpen, setIsTxAccountDropdownOpen] = useState(false);
  const [isTxCategoryDropdownOpen, setIsTxCategoryDropdownOpen] = useState(false);
  
  // Optional Portfolio Asset integration
  const [addToPortfolio, setAddToPortfolio] = useState(true);
  const [txAssetTicker, setTxAssetTicker] = useState("");
  const [txAssetPlatform, setTxAssetPlatform] = useState("");
  const [txAssetUnits, setTxAssetUnits] = useState("1");
  const [isTxPlatformDropdownOpen, setIsTxPlatformDropdownOpen] = useState(false);
  
  // Bulk update prices state
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkPrices, setBulkPrices] = useState<Record<string, string>>({});
  
  const txAccountDropdownRef = useRef<HTMLDivElement>(null);
  const txCategoryDropdownRef = useRef<HTMLDivElement>(null);
  const txPlatformDropdownRef = useRef<HTMLDivElement>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load from localStorage
  useEffect(() => {
    if (!user || !mounted) return;
    try {
      const key = `karsafin_investments_${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setAssets(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Gagal memuat portofolio investasi:", err);
    } finally {
      setLoading(false);
    }
  }, [user, mounted]);

  // Load custom platforms from localStorage
  useEffect(() => {
    if (!user || !mounted) return;
    try {
      const key = `karsafin_custom_platforms_${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setCustomPlatforms(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Gagal memuat platform kustom:", err);
    }
  }, [user, mounted]);

  // Load db accounts and categories
  useEffect(() => {
    async function loadDbData() {
      if (!user || !activeWorkspace || !mounted) return;
      try {
        const [accRes, catRes] = await Promise.all([
          api.accounts.getAll(),
          api.categories.getAll()
        ]);
        if (accRes.data) {
          setDbAccounts(accRes.data);
        }
        if (catRes.data) {
          setDbCategories(catRes.data);
        }
      } catch (err) {
        console.error("Gagal memuat data dari database:", err);
      }
    }
    loadDbData();
  }, [user, activeWorkspace, api, mounted]);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
        setIsPlatformDropdownOpen(false);
      }
      if (txAccountDropdownRef.current && !txAccountDropdownRef.current.contains(event.target as Node)) {
        setIsTxAccountDropdownOpen(false);
      }
      if (txCategoryDropdownRef.current && !txCategoryDropdownRef.current.contains(event.target as Node)) {
        setIsTxCategoryDropdownOpen(false);
      }
      if (txPlatformDropdownRef.current && !txPlatformDropdownRef.current.contains(event.target as Node)) {
        setIsTxPlatformDropdownOpen(false);
      }
      if (formAccountDropdownRef.current && !formAccountDropdownRef.current.contains(event.target as Node)) {
        setIsFormAccountDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open creation modal
  const handleOpenAddModal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;
    const hours = String(today.getHours()).padStart(2, "0");
    const minutes = String(today.getMinutes()).padStart(2, "0");

    setFormName("");
    setFormType("saham");
    setFormUnits("");
    setFormAvgBuy("");
    setFormCurrentPrice("");
    setFormPlatform("");
    setFormPurchaseDate(todayStr);
    setFormPurchaseTime(`${hours}:${minutes}`);
    setFormCatatTransaksi(false);
    setFormSumberDana(dbAccounts.find((a) => a.is_default)?.name || dbAccounts[0]?.name || "");
    setEditingId(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (asset: InvestmentAsset) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    let initialDate = asset.purchaseDate || asset.createdAt || "";
    let initialTime = "";
    if (initialDate.includes("T")) {
      const parts = initialDate.split("T");
      initialDate = parts[0];
      initialTime = parts[1].substring(0, 5); // get HH:MM
    }
    if (!initialTime) {
      const hours = String(today.getHours()).padStart(2, "0");
      const minutes = String(today.getMinutes()).padStart(2, "0");
      initialTime = `${hours}:${minutes}`;
    }

    setEditingId(asset.id);
    setFormName(asset.name);
    setFormType(asset.type);
    setFormUnits(String(asset.units));
    setFormAvgBuy(asset.avgBuyPrice.toLocaleString("id-ID"));
    setFormCurrentPrice(asset.currentPrice.toLocaleString("id-ID"));
    setFormPlatform(asset.platform);
    setFormPurchaseDate(initialDate || todayStr);
    setFormPurchaseTime(initialTime);
    setFormCatatTransaksi(false);
    setFormSumberDana("");
    setIsModalOpen(true);
  };

  // Open transaction modal
  const handleOpenTxModal = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const hours = String(today.getHours()).padStart(2, "0");
    const minutes = String(today.getMinutes()).padStart(2, "0");
    setTxDate(`${year}-${month}-${day}`);
    setTxTime(`${hours}:${minutes}`);
    
    setTxAmount("");
    setTxCategory("");
    setTxAccount(dbAccounts.find((a) => a.is_default)?.name || dbAccounts[0]?.name || "");
    setTxNotes("Pembelian Investasi");
    setTxSelectedTags([]);
    setAddToPortfolio(true);
    setTxAssetTicker("");
    setTxAssetPlatform("");
    setTxAssetUnits("1");
    setIsTxModalOpen(true);
  };

  // Open bulk price update modal
  const handleOpenBulkUpdateModal = () => {
    const initialPrices = assets.reduce((acc, curr) => {
      acc[curr.id] = curr.currentPrice.toLocaleString("id-ID");
      return acc;
    }, {} as Record<string, string>);
    setBulkPrices(initialPrices);
    setIsBulkUpdateModalOpen(true);
  };

  // Save bulk prices
  const handleSaveBulkPrices = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const updatedAssets = assets.map((asset) => {
      const rawPriceStr = bulkPrices[asset.id] || "";
      const numericPrice = Number(rawPriceStr.replace(/\D/g, ""));
      return {
        ...asset,
        currentPrice: isNaN(numericPrice) ? asset.currentPrice : numericPrice,
      };
    });

    setAssets(updatedAssets);
    const key = `karsafin_investments_${user.id}`;
    localStorage.setItem(key, JSON.stringify(updatedAssets));
    
    setIsBulkUpdateModalOpen(false);
    alert("Seluruh harga pasar aset portofolio berhasil diperbarui secara masal!");
  };

  // Save custom platform
  const handleSaveCustomPlatform = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const trimmed = newPlatformInput.trim();
    if (!trimmed) return;
    
    const normalizedInput = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    // Check if it already exists in default or custom list
    const allPlatforms = [...DEFAULT_PLATFORMS, ...customPlatforms];
    if (allPlatforms.some((p) => p.toLowerCase() === normalizedInput.toLowerCase())) {
      alert("Platform sudah terdaftar");
      return;
    }

    const updated = [...customPlatforms, normalizedInput];
    setCustomPlatforms(updated);
    if (user) {
      const key = `karsafin_custom_platforms_${user.id}`;
      localStorage.setItem(key, JSON.stringify(updated));
    }

    // Auto select it in the forms
    if (isPlatformDropdownOpen) {
      setFormPlatform(normalizedInput);
      setIsPlatformDropdownOpen(false);
    } else if (isTxPlatformDropdownOpen) {
      setTxAssetPlatform(normalizedInput);
      setIsTxPlatformDropdownOpen(false);
    }

    // Reset input state
    setNewPlatformInput("");
    setIsAddingPlatform(false);
  };

  // Save Asset
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formName.trim()) {
      alert("Nama aset/kode tidak boleh kosong");
      return;
    }
    const unitsNum = Number(formUnits.replace(/[^0-9.]/g, ""));
    if (unitsNum <= 0) {
      alert("Jumlah unit/lembar harus lebih besar dari 0");
      return;
    }
    const avgBuyNum = Number(formAvgBuy.replace(/\D/g, ""));
    if (avgBuyNum <= 0) {
      alert("Harga beli rata-rata harus lebih besar dari 0");
      return;
    }
    const currentPriceNum = Number(formCurrentPrice.replace(/\D/g, ""));
    if (currentPriceNum < 0) {
      alert("Harga saat ini tidak boleh negatif");
      return;
    }
    if (!formPlatform) {
      alert("Silakan pilih platform investasi");
      return;
    }
    if (!formPurchaseDate) {
      alert("Silakan tentukan tanggal beli");
      return;
    }
    const purchaseDateTimeStr = `${formPurchaseDate}T${formPurchaseTime || "00:00"}:00`;

    setLoading(true);
    try {
      // Record transaction if requested (only for new assets)
      if (!editingId && formCatatTransaksi) {
        if (!formSumberDana) {
          alert("Silakan pilih akun keuangan untuk mencatat transaksi");
          setLoading(false);
          return;
        }

        const categoryLabel = formType === "saham" ? "Saham" 
          : formType === "reksadana" ? "Reksadana" 
          : formType === "emas" ? "Emas" 
          : formType === "obligasi" ? "Obligasi" 
          : "Crypto";

        let categoryId = "";
        if (dbCategories.length > 0) {
          const found = dbCategories.find(
            (c) => c.name.toLowerCase() === categoryLabel.toLowerCase() && c.type === "savings"
          );
          if (found) {
            categoryId = found.id;
          }
        }

        if (!categoryId) {
          const matchingCat = CATEGORIES_SAVINGS.find(c => c.label === categoryLabel);
          const catConfig = {
            name: categoryLabel,
            type: "savings",
            icon: matchingCat?.emoji || "📈",
            color: "#3b82f6",
          };
          const { data: newCat, error: catErr } = await api.categories.getOrCreateByName(user.id, catConfig as any);
          if (catErr) throw catErr;
          if (newCat) {
            categoryId = newCat.id;
          }
        }

        let accountId = "";
        if (dbAccounts.length > 0) {
          const found = dbAccounts.find(
            (a) => a.name.toLowerCase() === formSumberDana.toLowerCase()
          );
          if (found) {
            accountId = found.id;
          }
        }

        const isDatabaseEmpty = dbAccounts.length === 0;
        if (!accountId && isDatabaseEmpty) {
          const typeMapped = (formSumberDana === "GoPay" || formSumberDana === "OVO" 
            ? "ewallet" 
            : formSumberDana === "Bibit" 
            ? "investment" 
            : formSumberDana === "Cash" 
            ? "other" 
            : "bank") as "other" | "bank" | "ewallet" | "investment";
          const colorMapped = typeMapped === "bank" ? "#0066AE" : typeMapped === "ewallet" ? "#00AED6" : typeMapped === "investment" ? "#00E676" : "#10b981";
          const emojiMapped = formSumberDana === "GoPay" || formSumberDana === "OVO" ? "📱" : formSumberDana === "Bibit" ? "📈" : formSumberDana === "Cash" ? "💵" : "🏦";
          
          const { data: newAcc, error: accErr } = await api.accounts.create(user.id, {
            name: formSumberDana,
            type: typeMapped,
            is_default: false,
            color: colorMapped,
            icon: emojiMapped,
            balance: 0,
          });
          if (accErr) throw accErr;
          if (newAcc) {
            accountId = newAcc.id;
          }
        }

        if (!accountId) {
          alert("Akun keuangan tidak ditemukan");
          setLoading(false);
          return;
        }

        const totalAmount = unitsNum * avgBuyNum;
        const { error: txErr } = await api.transactions.create(user.id, {
          type: "savings",
          amount: totalAmount,
          description: serializeDescriptionAndTags(`Pembelian Aset: ${formName.trim().toUpperCase()} (${unitsNum} unit)`, [formName.trim().toUpperCase()]),
          date: purchaseDateTimeStr,
          category_id: categoryId,
          account_id: accountId,
          source: "manual"
        });

        if (txErr) throw txErr;
      }

      let updatedAssets = [];
      if (editingId) {
        updatedAssets = assets.map((a) =>
          a.id === editingId
            ? {
                ...a,
                name: formName.trim().toUpperCase(),
                type: formType,
                units: unitsNum,
                avgBuyPrice: avgBuyNum,
                currentPrice: currentPriceNum,
                platform: formPlatform,
                purchaseDate: purchaseDateTimeStr,
              }
            : a
        );
      } else {
        const newAsset: InvestmentAsset = {
          id: crypto.randomUUID(),
          name: formName.trim().toUpperCase(),
          type: formType,
          units: unitsNum,
          avgBuyPrice: avgBuyNum,
          currentPrice: currentPriceNum,
          platform: formPlatform,
          purchaseDate: purchaseDateTimeStr,
          createdAt: new Date().toISOString(),
        };
        updatedAssets = [...assets, newAsset];
      }

      setAssets(updatedAssets);
      const key = `karsafin_investments_${user.id}`;
      localStorage.setItem(key, JSON.stringify(updatedAssets));

      setIsModalOpen(false);

      if (!editingId && formCatatTransaksi) {
        alert("Aset berhasil disimpan dan transaksi pembelian tercatat di riwayat keuangan!");
        // Reload db data to reflect changes
        if (activeWorkspace) {
          const [accRes, catRes] = await Promise.all([
            api.accounts.getAll(),
            api.categories.getAll()
          ]);
          if (accRes.data) setDbAccounts(accRes.data);
          if (catRes.data) setDbCategories(catRes.data);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menyimpan aset");
    } finally {
      setLoading(false);
    }
  };

  // Save Transaction
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!txAmount) {
      alert("Jumlah investasi tidak boleh kosong");
      return;
    }
    const amountNum = Number(txAmount.replace(/\D/g, ""));
    if (amountNum <= 0) {
      alert("Jumlah investasi harus lebih besar dari 0");
      return;
    }

    if (!txCategory) {
      alert("Silakan pilih kategori investasi");
      return;
    }

    if (!txAccount) {
      alert("Silakan pilih akun keuangan");
      return;
    }

    if (addToPortfolio) {
      if (!txAssetTicker.trim()) {
        alert("Nama aset/kode ticker tidak boleh kosong");
        return;
      }
      const unitsNum = Number(txAssetUnits.replace(/[^0-9.]/g, ""));
      if (unitsNum <= 0) {
        alert("Jumlah unit/lembar harus lebih besar dari 0");
        return;
      }
      if (!txAssetPlatform) {
        alert("Silakan pilih platform investasi");
        return;
      }
    }

    setLoading(true);
    try {
      // Find category ID
      let categoryId = "";
      if (dbCategories.length > 0) {
        const found = dbCategories.find(
          (c) => c.name.toLowerCase() === txCategory.toLowerCase() && c.type === "savings"
        );
        if (found) {
          categoryId = found.id;
        }
      }

      // If category not found, create/get it
      if (!categoryId) {
        const matchingCat = CATEGORIES_SAVINGS.find(c => c.label === txCategory);
        const catConfig = {
          name: txCategory,
          type: "savings",
          icon: matchingCat?.emoji || "📈",
          color: "#3b82f6",
        };
        const { data: newCat, error: catErr } = await api.categories.getOrCreateByName(user.id, catConfig as any);
        if (catErr) throw catErr;
        if (newCat) {
          categoryId = newCat.id;
        }
      }

      // Find account ID
      let accountId = "";
      if (dbAccounts.length > 0) {
        const found = dbAccounts.find(
          (a) => a.name.toLowerCase() === txAccount.toLowerCase()
        );
        if (found) {
          accountId = found.id;
        }
      }

      // If database is empty, create the account
      const isDatabaseEmpty = dbAccounts.length === 0;
      if (!accountId && isDatabaseEmpty) {
        const typeMapped = (txAccount === "GoPay" || txAccount === "OVO" 
          ? "ewallet" 
          : txAccount === "Bibit" 
          ? "investment" 
          : txAccount === "Cash" 
          ? "other" 
          : "bank") as "other" | "bank" | "ewallet" | "investment";
        const colorMapped = typeMapped === "bank" ? "#0066AE" : typeMapped === "ewallet" ? "#00AED6" : typeMapped === "investment" ? "#00E676" : "#10b981";
        const emojiMapped = txAccount === "GoPay" || txAccount === "OVO" ? "📱" : txAccount === "Bibit" ? "📈" : txAccount === "Cash" ? "💵" : "🏦";
        
        const { data: newAcc, error: accErr } = await api.accounts.create(user.id, {
          name: txAccount,
          type: typeMapped,
          is_default: false,
          color: colorMapped,
          icon: emojiMapped,
          balance: 0,
        });
        if (accErr) throw accErr;
        if (newAcc) {
          accountId = newAcc.id;
        }
      }

      if (!accountId) {
        alert("Akun tidak ditemukan");
        setLoading(false);
        return;
      }

      const txDateTimeStr = `${txDate}T${txTime || "00:00"}:00`;

      // Create transaction in Supabase
      const { error: txErr } = await api.transactions.create(user.id, {
        type: "savings",
        amount: amountNum,
        description: serializeDescriptionAndTags(txNotes || `Pembelian Investasi: ${txCategory}`, txSelectedTags),
        date: txDateTimeStr,
        category_id: categoryId,
        account_id: accountId,
        source: "manual"
      });

      if (txErr) throw txErr;

      // Add to portfolio if checkbox is active
      if (addToPortfolio) {
        const unitsNum = Number(txAssetUnits.replace(/[^0-9.]/g, ""));
        const avgPrice = amountNum / unitsNum;
        
        // Check if asset already exists in portfolio
        const existingAssetIndex = assets.findIndex(
          (a) => a.name.toUpperCase() === txAssetTicker.trim().toUpperCase()
        );

        let updatedAssets = [];
        if (existingAssetIndex > -1) {
          // Update existing asset
          updatedAssets = assets.map((a, idx) => {
            if (idx === existingAssetIndex) {
              const newUnits = a.units + unitsNum;
              const newTotalCost = (a.units * a.avgBuyPrice) + amountNum;
              const newAvgBuyPrice = newTotalCost / newUnits;
              return {
                ...a,
                units: newUnits,
                avgBuyPrice: newAvgBuyPrice,
                currentPrice: avgPrice, // Update current price to latest purchase price
              };
            }
            return a;
          });
        } else {
          // Map category to asset type
          let assetType: "saham" | "reksadana" | "emas" | "obligasi" | "crypto" = "saham";
          const normalizedCat = txCategory.toLowerCase();
          if (normalizedCat.includes("reksadana")) {
            assetType = "reksadana";
          } else if (normalizedCat.includes("emas") || normalizedCat.includes("gold")) {
            assetType = "emas";
          } else if (normalizedCat.includes("obligasi") || normalizedCat.includes("bond")) {
            assetType = "obligasi";
          } else if (normalizedCat.includes("crypto") || normalizedCat.includes("kripto")) {
            assetType = "crypto";
          }

          const newAsset: InvestmentAsset = {
            id: crypto.randomUUID(),
            name: txAssetTicker.trim().toUpperCase(),
            type: assetType,
            units: unitsNum,
            avgBuyPrice: avgPrice,
            currentPrice: avgPrice,
            platform: txAssetPlatform,
            purchaseDate: txDateTimeStr,
            createdAt: new Date().toISOString(),
          };
          updatedAssets = [...assets, newAsset];
        }

        setAssets(updatedAssets);
        const key = `karsafin_investments_${user.id}`;
        localStorage.setItem(key, JSON.stringify(updatedAssets));
      }

      alert("Transaksi investasi berhasil disimpan!");
      setIsTxModalOpen(false);
      
      // Reload db data to reflect any changes
      if (activeWorkspace) {
        const [accRes, catRes] = await Promise.all([
          api.accounts.getAll(),
          api.categories.getAll()
        ]);
        if (accRes.data) setDbAccounts(accRes.data);
        if (catRes.data) setDbCategories(catRes.data);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal menyimpan transaksi investasi");
    } finally {
      setLoading(false);
    }
  };

  // Delete Asset
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!confirm("Apakah Anda yakin ingin menghapus aset investasi ini dari portofolio?")) return;

    const updatedAssets = assets.filter((a) => a.id !== id);
    setAssets(updatedAssets);
    const key = `karsafin_investments_${user.id}`;
    localStorage.setItem(key, JSON.stringify(updatedAssets));
  };

  // Calculations
  const totalCost = assets.reduce((acc, curr) => acc + curr.units * curr.avgBuyPrice, 0);
  const totalCurrentValue = assets.reduce((acc, curr) => acc + curr.units * curr.currentPrice, 0);
  const totalProfitLoss = totalCurrentValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  // Type allocations
  const typeValues = assets.reduce(
    (acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + curr.units * curr.currentPrice;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalAllocValue = Object.values(typeValues).reduce((acc, curr) => acc + curr, 0);

  const allocationBreakdown = ASSET_TYPES.map((type) => {
    const val = typeValues[type.key] || 0;
    const percent = totalAllocValue > 0 ? (val / totalAllocValue) * 100 : 0;
    return {
      ...type,
      value: val,
      percentage: percent,
    };
  }).sort((a, b) => b.value - a.value);

  const portfolioCategories = assets.map((asset) => {
    let emoji = "📈";
    if (asset.type === "reksadana") emoji = "📊";
    else if (asset.type === "emas") emoji = "🪙";
    else if (asset.type === "obligasi") emoji = "🛡️";
    else if (asset.type === "crypto") emoji = "🪙";
    return {
      icon: emoji,
      name: asset.name,
      type: asset.type,
      isPortfolioAsset: true
    };
  });

  const isDatabaseEmpty = dbAccounts.length === 0;
  const accountsToUse = isDatabaseEmpty
    ? FALLBACK_ACCOUNTS.map((acc) => ({ icon: acc.emoji, name: acc.label }))
    : dbAccounts.map((acc) => ({
        icon: acc.icon || "🏦",
        name: acc.name,
      }));

  if (!mounted) return null;

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/dashboard/planning"
          className="inline-flex items-center gap-2 text-dashboard-gray hover:text-dashboard-blue transition-colors mb-6 text-sm font-bold"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali ke Perencanaan
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3 text-slate-800 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-dashboard-blue" />
            Portofolio Investasi
          </h1>
          <p className="text-dashboard-gray text-lg leading-relaxed">
            Pantau alokasi aset dan performa keuntungan/kerugian investasi Anda.
          </p>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Total Modal */}
        <div className="custom-card p-6 md:p-8 flex items-center justify-between bg-gradient-to-br from-slate-50 to-blue-50/20">
          <div className="space-y-1">
            <span className="text-xs font-black text-dashboard-gray uppercase tracking-widest block">
              Total Modal Investasi
            </span>
            <div className="text-2xl md:text-3xl font-black text-slate-800">
              {formatRupiah(totalCost)}
            </div>
            <span className="text-xs text-dashboard-gray block font-bold">
              Nilai modal akumulatif saat ini
            </span>
          </div>
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
            <Briefcase className="h-7 w-7" />
          </div>
        </div>

        {/* Current Value */}
        <div className="custom-card p-6 md:p-8 flex items-center justify-between bg-gradient-to-br from-slate-50 to-blue-50/20">
          <div className="space-y-1">
            <span className="text-xs font-black text-dashboard-gray uppercase tracking-widest block">
              Total Nilai Portofolio
            </span>
            <div className="text-2xl md:text-3xl font-black text-slate-800">
              {formatRupiah(totalCurrentValue)}
            </div>
            <span className="text-xs text-dashboard-gray block font-bold">
              Nilai pasar estimasi saat ini
            </span>
          </div>
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
            <TrendingUp className="h-7 w-7" />
          </div>
        </div>

        {/* Profit/Loss */}
        <div className="custom-card p-6 md:p-8 flex items-center justify-between bg-gradient-to-br from-slate-50 to-blue-50/20">
          <div className="space-y-1">
            <span className="text-xs font-black text-dashboard-gray uppercase tracking-widest block">
              Total Imbal Hasil (P&L)
            </span>
            <div className={`text-2xl md:text-3xl font-black flex items-center gap-1.5 ${
              totalProfitLoss >= 0 ? "text-emerald-600" : "text-rose-500"
            }`}>
              {totalProfitLoss >= 0 ? (
                <ArrowUpRight className="h-6 w-6 stroke-[3]" />
              ) : (
                <ArrowDownRight className="h-6 w-6 stroke-[3]" />
              )}
              {formatRupiah(totalProfitLoss)}
            </div>
            <span className={`text-xs font-black rounded-full px-2 py-0.5 inline-block ${
              totalProfitLoss >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
            }`}>
              {totalProfitLoss >= 0 ? "+" : ""}{profitLossPercent.toFixed(2)}%
            </span>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 ${
            totalProfitLoss >= 0
              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : "bg-rose-50 text-rose-500 border-rose-100"
          }`}>
            <Coins className="h-7 w-7" />
          </div>
        </div>
      </section>

      {/* Tabs and Actions Row */}
      <section className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left side: Tab Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-6 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer border-2 ${
              activeTab === "portfolio"
                ? "bg-dashboard-blue text-white border-dashboard-blue shadow-lg shadow-blue-500/20"
                : "border-slate-100 bg-slate-50 hover:border-slate-200 text-dashboard-gray hover:text-slate-800"
            }`}
          >
            Daftar Portofolio
          </button>
          <button
            onClick={() => setActiveTab("allocation")}
            className={`px-6 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer border-2 ${
              activeTab === "allocation"
                ? "bg-dashboard-blue text-white border-dashboard-blue shadow-lg shadow-blue-500/20"
                : "border-slate-100 bg-slate-50 hover:border-slate-200 text-dashboard-gray hover:text-slate-800"
            }`}
          >
            Alokasi Aset
          </button>
        </div>

        {/* Right side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenBulkUpdateModal}
            disabled={assets.length === 0}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl py-3 px-5 font-black text-xs border-2 transition-all cursor-pointer whitespace-nowrap ${
              assets.length === 0
                ? "bg-slate-50 border-slate-100 text-slate-350 cursor-not-allowed opacity-55"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:scale-[1.02] active:scale-95"
            }`}
          >
            <RefreshCw className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
            Update Harga Pasar
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 bg-dashboard-blue hover:bg-blue-700 text-white rounded-2xl py-3 px-5 font-black text-xs shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Tambah Aset Baru
          </button>
          <button
            onClick={handleOpenTxModal}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3 px-5 font-black text-xs shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Tambah Investasi
          </button>
        </div>
      </section>

      {/* Active Tab Content */}
      <section className="space-y-4">
        {loading ? (
          <div className="custom-card p-6 md:p-10 flex items-center justify-center text-dashboard-gray font-bold gap-3">
            <span className="w-6 h-6 border-3 border-dashboard-blue border-t-transparent rounded-full animate-spin" />
            Memuat portofolio...
          </div>
        ) : activeTab === "portfolio" ? (
          assets.length === 0 ? (
            <div className="custom-card p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-150 text-slate-400">
                <Briefcase className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-black text-slate-700">
                Belum ada aset investasi terdaftar
              </h3>
              <p className="text-dashboard-gray text-sm max-w-md">
                Tambahkan instrumen investasi Anda seperti Saham, Reksadana, Emas, Obligasi, atau Crypto untuk mulai memantau portofolio Anda.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="mt-2 inline-flex items-center gap-2 text-xs font-black text-dashboard-blue bg-blue-50 border-2 border-blue-100 hover:bg-blue-100 px-5 py-3 rounded-2xl transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Tambah Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {assets.map((item) => {
                const assetTypeInfo = ASSET_TYPES.find((t) => t.key === item.type);
                const AssetIcon = assetTypeInfo?.icon || Briefcase;
                const costBasis = item.units * item.avgBuyPrice;
                const currentVal = item.units * item.currentPrice;
                const profitLoss = currentVal - costBasis;
                const profitLossPct = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenEditModal(item)}
                    className="custom-card p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:scale-[1.01] cursor-pointer hover:border-slate-350 hover:bg-slate-50/40"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 ${assetTypeInfo?.bg}`}>
                        <AssetIcon className={`h-5 w-5 ${assetTypeInfo?.color}`} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-800 text-base leading-none">{item.name}</h4>
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                            {item.platform}
                          </span>
                        </div>
                        <div className="text-xs text-dashboard-gray font-bold">
                          {item.units.toLocaleString("id-ID")} unit • Rata-rata {formatRupiah(item.avgBuyPrice)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-x-8 gap-y-2 pt-3 md:pt-0 border-t border-slate-100 md:border-none">
                      {/* Price info */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-black text-dashboard-gray uppercase tracking-widest block">
                          Harga Saat Ini
                        </span>
                        <span className="text-sm font-bold text-slate-700">
                          {formatRupiah(item.currentPrice)}
                        </span>
                      </div>

                      {/* Profit/Loss */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-black text-dashboard-gray uppercase tracking-widest block">
                          Keuntungan / Kerugian
                        </span>
                        <span className={`text-sm font-extrabold flex items-center gap-1 md:justify-end ${
                          profitLoss >= 0 ? "text-emerald-600" : "text-rose-500"
                        }`}>
                          {profitLoss >= 0 ? "+" : ""}{formatRupiah(profitLoss)} ({profitLoss >= 0 ? "+" : ""}{profitLossPct.toFixed(1)}%)
                        </span>
                      </div>

                      {/* Total Value */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-black text-dashboard-gray uppercase tracking-widest block">
                          Nilai Aset
                        </span>
                        <span className="text-base font-black text-slate-850">
                          {formatRupiah(currentVal)}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-red-50 text-dashboard-gray hover:text-red-500 flex items-center justify-center border border-slate-150 hover:border-red-100 transition-colors cursor-pointer shrink-0 ml-auto md:ml-0"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Asset Allocation Tab */
          <div className="custom-card p-6 md:p-8 space-y-8">
            <div>
              <h3 className="font-extrabold text-slate-850 text-base mb-1">
                Alokasi Berdasarkan Instrumen
              </h3>
              <p className="text-xs text-dashboard-gray font-bold mb-6">
                Proporsi kepemilikan aset investasi saat ini
              </p>
            </div>

            {assets.length === 0 ? (
              <div className="py-6 text-center text-sm font-bold text-slate-400">
                Belum ada data alokasi aset.
              </div>
            ) : (
              <div className="space-y-5">
                {allocationBreakdown.map((alloc) => {
                  const Icon = alloc.icon;
                  if (alloc.value === 0) return null;
                  return (
                    <div key={alloc.key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                          <Icon className={`h-4 w-4 ${alloc.color}`} />
                          <span>{alloc.label}</span>
                        </div>
                        <div className="font-black text-slate-800">
                          {formatRupiah(alloc.value)} ({alloc.percentage.toFixed(1)}%)
                        </div>
                      </div>
                      {/* Custom progress bar */}
                      <div className="h-3.5 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-sm"
                          style={{
                            width: `${alloc.percentage}%`,
                            background: alloc.key === "saham" ? "#3b82f6" : alloc.key === "reksadana" ? "#10b981" : alloc.key === "emas" ? "#eab308" : alloc.key === "obligasi" ? "#6366f1" : "#f43f5e"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal Add/Edit Form */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />

            {/* Modal Box */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 relative z-10">
              <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-dashboard-blue" />
                    {editingId ? "Ubah Aset Investasi" : "Tambah Aset Investasi"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer border-none"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Asset Type grid */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Instrumen Investasi
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {ASSET_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.key}
                            type="button"
                            onClick={() => setFormType(type.key)}
                            className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                              formType === type.key
                                ? "bg-blue-50 border-blue-500 text-blue-600 font-extrabold shadow-sm"
                                : "bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Nama Aset / Kode (Ticker)
                    </label>
                    <input
                      type="text"
                      placeholder='Contoh: "BBCA", "Sucorinvest Equity Fund", "Antam"'
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Units Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Jumlah Unit / Lembar
                    </label>
                    <input
                      type="text"
                      placeholder="0"
                      value={formUnits}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        setFormUnits(raw);
                      }}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Average Buy Price */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Harga Beli Rata-Rata per Unit
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">
                        Rp
                      </span>
                      <input
                        type="text"
                        placeholder="0"
                        value={formAvgBuy}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setFormAvgBuy(raw ? Number(raw).toLocaleString("id-ID") : "");
                        }}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Current Price */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Harga Saat Ini per Unit
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">
                        Rp
                      </span>
                      <input
                        type="text"
                        placeholder="0"
                        value={formCurrentPrice}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setFormCurrentPrice(raw ? Number(raw).toLocaleString("id-ID") : "");
                        }}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Platform Dropdown */}
                  <div className="relative" ref={platformDropdownRef}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Platform Investasi (Broker)
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-sm font-bold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer flex items-center justify-between text-left"
                    >
                      {formPlatform ? (
                        <span>{formPlatform}</span>
                      ) : (
                        <span className="text-slate-400 font-bold">Pilih platform...</span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-dashboard-gray transition-transform duration-200 ${isPlatformDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isPlatformDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl z-[210] max-h-56 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto max-h-36 py-1.5 shrink-0">
                          {[...DEFAULT_PLATFORMS, ...customPlatforms].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setFormPlatform(p);
                                setIsPlatformDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm font-bold transition-colors cursor-pointer border-none bg-transparent ${
                                formPlatform === p
                                  ? "bg-blue-50/50 text-dashboard-blue font-black"
                                  : "text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>

                        {/* Custom platform addition inline */}
                        {isAddingPlatform ? (
                          <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-2 bg-slate-50 shrink-0">
                            <input
                              type="text"
                              placeholder="Nama platform..."
                              value={newPlatformInput}
                              onChange={(e) => setNewPlatformInput(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-100 bg-white"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleSaveCustomPlatform}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer border-none shrink-0"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsAddingPlatform(false);
                                setNewPlatformInput("");
                              }}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer border-none shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAddingPlatform(true);
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-black text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center gap-1.5 border-t border-slate-100 cursor-pointer border-none bg-transparent shrink-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Tambah Platform Investasi
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tanggal & Waktu Pembelian */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Tanggal Pembelian
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formPurchaseDate}
                          onChange={(e) => setFormPurchaseDate(e.target.value)}
                          required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                        />
                        <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-dashboard-gray pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                        <span>Waktu Pembelian</span>
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date();
                            const hours = String(today.getHours()).padStart(2, "0");
                            const minutes = String(today.getMinutes()).padStart(2, "0");
                            setFormPurchaseTime(`${hours}:${minutes}`);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 transition-colors font-bold normal-case flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
                        >
                          ⏱️ Saat Ini
                        </button>
                      </label>
                      <input
                        type="time"
                        value={formPurchaseTime}
                        onChange={(e) => setFormPurchaseTime(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Catat Transaksi (Only for new assets) */}
                  {!editingId && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formCatatTransaksi}
                          onChange={(e) => setFormCatatTransaksi(e.target.checked)}
                          className="h-4.5 w-4.5 text-blue-600 border-slate-350 rounded-lg focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="text-left">
                          <span className="text-xs font-black text-slate-700 group-hover:text-slate-900 transition-colors">
                            Catat sebagai transaksi pengeluaran/tabungan
                          </span>
                          <p className="text-[10px] text-dashboard-gray font-bold">
                            Akumulasi biaya beli ({formUnits || '0'} unit @ Rp {formAvgBuy || '0'}) otomatis tercatat di kas keuangan.
                          </p>
                        </div>
                      </label>

                      {formCatatTransaksi && (
                        <div className="relative" ref={formAccountDropdownRef}>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Akun Keuangan / Sumber Dana
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsFormAccountDropdownOpen(!isFormAccountDropdownOpen)}
                            className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-sm font-bold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer flex items-center justify-between text-left"
                          >
                            {formSumberDana ? (
                              <div className="flex items-center gap-2">
                                <InstitutionLogo
                                  name={formSumberDana}
                                  icon={accountsToUse.find((a) => a.name === formSumberDana)?.icon}
                                  size="sm"
                                />
                                <span>{formSumberDana}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold">Pilih akun...</span>
                            )}
                            <ChevronDown className="h-4 w-4 text-dashboard-gray" />
                          </button>

                          {isFormAccountDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl z-[210] max-h-48 overflow-y-auto py-1.5">
                              {accountsToUse.map((a) => (
                                <button
                                  key={a.name}
                                  type="button"
                                  onClick={() => {
                                    setFormSumberDana(a.name);
                                    setIsFormAccountDropdownOpen(false);
                                  }}
                                  className={`w-full px-4 py-2 text-left text-sm font-bold transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2.5 ${
                                    formSumberDana === a.name
                                      ? "bg-blue-50/50 text-dashboard-blue font-black"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <InstitutionLogo name={a.name} icon={a.icon} size="sm" />
                                  <span>{a.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    Simpan Aset
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Tambah Transaksi Investasi */}
      {isTxModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={() => setIsTxModalOpen(false)} />

            {/* Modal Box */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 relative z-10">
              <form onSubmit={handleSaveTx} className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Tambah Transaksi Investasi
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsTxModalOpen(false)}
                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer border-none"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Amount */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Jumlah Investasi
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">
                        Rp
                      </span>
                      <input
                        type="text"
                        placeholder="0"
                        value={txAmount}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setTxAmount(raw ? Number(raw).toLocaleString("id-ID") : "");
                        }}
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  {/* Category Dropdown */}
                  <div className="relative" ref={txCategoryDropdownRef}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Kategori Investasi
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTxCategoryDropdownOpen(!isTxCategoryDropdownOpen)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-sm font-bold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer flex items-center justify-between text-left"
                    >
                      {txCategory ? (
                        <span>{txCategory}</span>
                      ) : (
                        <span className="text-slate-400 font-bold">Pilih kategori...</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-dashboard-gray" />
                    </button>

                    {isTxCategoryDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl z-[210] max-h-48 overflow-y-auto py-1.5">
                        {portfolioCategories.length === 0 ? (
                          <div className="px-4 py-3 text-center text-xs font-bold text-slate-400">
                            Belum ada aset terdaftar. Silakan tambahkan aset portofolio terlebih dahulu.
                          </div>
                        ) : (
                          <>
                            <div className="px-4 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                              Aset Portofolio Anda
                            </div>
                            {portfolioCategories.map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => {
                                  setTxCategory(c.name);
                                  setIsTxCategoryDropdownOpen(false);
                                  
                                  // Pre-fill ticker and platform for this asset
                                  const matched = assets.find((a) => a.name.toUpperCase() === c.name.toUpperCase());
                                  if (matched) {
                                    setTxAssetTicker(matched.name);
                                    setTxAssetPlatform(matched.platform);
                                  }
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm font-bold transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2 ${
                                  txCategory === c.name
                                    ? "bg-blue-50/50 text-dashboard-blue font-black"
                                    : "text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span>{c.icon}</span>
                                <span>{c.name}</span>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Account Dropdown */}
                  <div className="relative" ref={txAccountDropdownRef}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Sumber Dana / Akun
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsTxAccountDropdownOpen(!isTxAccountDropdownOpen)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-2xl py-3 px-4 text-sm font-bold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer flex items-center justify-between text-left"
                    >
                      {txAccount ? (
                        <div className="flex items-center gap-2">
                          <InstitutionLogo
                            name={txAccount}
                            icon={accountsToUse.find((a) => a.name === txAccount)?.icon}
                            size="sm"
                          />
                          <span>{txAccount}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-bold">Pilih akun...</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-dashboard-gray" />
                    </button>

                    {isTxAccountDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-2xl shadow-xl z-[210] max-h-48 overflow-y-auto py-1.5">
                        {accountsToUse.map((a) => (
                          <button
                            key={a.name}
                            type="button"
                            onClick={() => {
                              setTxAccount(a.name);
                              setIsTxAccountDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm font-bold transition-colors cursor-pointer border-none bg-transparent flex items-center gap-2.5 ${
                              txAccount === a.name
                                ? "bg-blue-50/50 text-dashboard-blue font-black"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <InstitutionLogo name={a.name} icon={a.icon} size="sm" />
                            <span>{a.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tanggal & Waktu Pembelian */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Tanggal Pembelian
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={txDate}
                          onChange={(e) => setTxDate(e.target.value)}
                          required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                        />
                        <CalendarDays className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-dashboard-gray pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                        <span>Waktu Pembelian</span>
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date();
                            const hours = String(today.getHours()).padStart(2, "0");
                            const minutes = String(today.getMinutes()).padStart(2, "0");
                            setTxTime(`${hours}:${minutes}`);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 transition-colors font-bold normal-case flex items-center gap-0.5 bg-transparent border-none cursor-pointer"
                        >
                          ⏱️ Saat Ini
                        </button>
                      </label>
                      <input
                        type="time"
                        value={txTime}
                        onChange={(e) => setTxTime(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Notes Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Catatan
                    </label>
                    <input
                      type="text"
                      placeholder="Misal: Pembelian Investasi Bulanan"
                      value={txNotes}
                      onChange={(e) => setTxNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-150 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Tag Selector */}
                  {user && (
                    <TagSelector
                      selectedTags={txSelectedTags}
                      onChange={setTxSelectedTags}
                      userId={user.id}
                    />
                  )}

                  {/* Add to portfolio checkbox */}
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={addToPortfolio}
                        onChange={(e) => setAddToPortfolio(e.target.checked)}
                        className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        {assets.some((a) => a.name.toUpperCase() === txCategory.toUpperCase())
                          ? "Perbarui kuantitas & harga rata-rata aset di Portofolio"
                          : "Tambahkan juga sebagai aset di Portofolio saya"}
                      </span>
                    </label>

                    {addToPortfolio && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Ticker */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Kode Aset / Ticker (Contoh: "BBCA", "Sucor")
                          </label>
                          <input
                            type="text"
                            placeholder="Kode Ticker"
                            value={txAssetTicker}
                            onChange={(e) => setTxAssetTicker(e.target.value)}
                            required={addToPortfolio}
                            disabled={assets.some((a) => a.name.toUpperCase() === txCategory.toUpperCase())}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                          />
                        </div>

                        {/* Platform */}
                        <div className="relative" ref={txPlatformDropdownRef}>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Platform / Broker
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              if (!assets.some((a) => a.name.toUpperCase() === txCategory.toUpperCase())) {
                                setIsTxPlatformDropdownOpen(!isTxPlatformDropdownOpen);
                              }
                            }}
                            disabled={assets.some((a) => a.name.toUpperCase() === txCategory.toUpperCase())}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-755 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer flex items-center justify-between text-left disabled:bg-slate-100 disabled:text-slate-500"
                          >
                            {txAssetPlatform ? (
                              <span>{txAssetPlatform}</span>
                            ) : (
                              <span className="text-slate-400 font-bold">Pilih platform...</span>
                            )}
                            {!assets.some((a) => a.name.toUpperCase() === txCategory.toUpperCase()) && (
                              <ChevronDown className="h-4 w-4 text-dashboard-gray" />
                            )}
                          </button>

                          {isTxPlatformDropdownOpen && (
                            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-150 rounded-xl shadow-xl z-[220] max-h-56 overflow-hidden flex flex-col">
                              <div className="overflow-y-auto max-h-36 py-1 shrink-0">
                                {[...DEFAULT_PLATFORMS, ...customPlatforms].map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => {
                                      setTxAssetPlatform(p);
                                      setIsTxPlatformDropdownOpen(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent"
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>

                              {/* Custom platform addition inline */}
                              {isAddingPlatform ? (
                                <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-2 bg-slate-50 shrink-0">
                                  <input
                                    type="text"
                                    placeholder="Nama platform..."
                                    value={newPlatformInput}
                                    onChange={(e) => setNewPlatformInput(e.target.value)}
                                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-100 bg-white"
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveCustomPlatform}
                                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer border-none shrink-0"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsAddingPlatform(false);
                                      setNewPlatformInput("");
                                    }}
                                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer border-none shrink-0"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAddingPlatform(true);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-xs font-black text-blue-600 hover:bg-blue-50/50 transition-colors flex items-center gap-1.5 border-t border-slate-100 cursor-pointer border-none bg-transparent shrink-0"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Tambah Platform Investasi
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Units */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                            Jumlah Unit / Lembar
                          </label>
                          <input
                            type="text"
                            placeholder="1"
                            value={txAssetUnits}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9.]/g, "");
                              setTxAssetUnits(raw);
                            }}
                            required={addToPortfolio}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTxModalOpen(false)}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    Simpan Transaksi
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Update Harga Pasar Masal */}
      {isBulkUpdateModalOpen &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={() => setIsBulkUpdateModalOpen(false)} />

            {/* Modal Box */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 relative z-10">
              <form onSubmit={handleSaveBulkPrices} className="flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-slate-600" />
                    Update Harga Pasar Masal
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsBulkUpdateModalOpen(false)}
                    className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer border-none"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <p className="text-xs text-dashboard-gray font-bold mb-2">
                    Masukkan harga pasar terbaru per unit/lembar untuk setiap aset di portofolio Anda. Nilai portofolio dan estimasi untung/rugi akan dihitung ulang secara otomatis.
                  </p>
                  <div className="space-y-3.5">
                    {assets.map((asset) => {
                      const matchingType = ASSET_TYPES.find((t) => t.key === asset.type);
                      const Icon = matchingType?.icon || Coins;
                      return (
                        <div key={asset.id} className="flex items-center justify-between gap-4 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 ${matchingType?.bg || 'bg-slate-100'} ${matchingType?.color || 'text-slate-650'} rounded-xl flex items-center justify-center border border-slate-100 shrink-0`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-black text-slate-800 text-sm block truncate">
                                {asset.name}
                              </span>
                              <span className="text-[10px] font-bold text-dashboard-gray block">
                                {asset.platform} • {asset.units.toLocaleString("id-ID")} unit
                              </span>
                            </div>
                          </div>
                          
                          <div className="w-44 shrink-0">
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">
                                Rp
                              </span>
                              <input
                                type="text"
                                placeholder="0"
                                value={bulkPrices[asset.id] || ""}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, "");
                                  setBulkPrices({
                                    ...bulkPrices,
                                    [asset.id]: raw ? Number(raw).toLocaleString("id-ID") : "",
                                  });
                                }}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 text-right"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBulkUpdateModalOpen(false)}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-sm font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
