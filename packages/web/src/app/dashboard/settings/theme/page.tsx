"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Check,
  Palette,
  Save,
  X,
} from "lucide-react";
import { useTheme } from "@/providers";

const themeOptions = [
  {
    id: "light" as const,
    label: "Terang",
    description: "Tampilan cerah untuk penggunaan sehari-hari",
    icon: Sun,
    preview: "bg-white border-slate-200",
  },
  {
    id: "dark" as const,
    label: "Gelap",
    description: "Nyaman untuk mata di malam hari",
    icon: Moon,
    preview: "bg-slate-900 border-slate-700",
  },
  {
    id: "system" as const,
    label: "Sistem",
    description: "Ikuti pengaturan perangkat Anda",
    icon: Monitor,
    preview: "bg-gradient-to-r from-white to-slate-900 border-slate-300",
  },
];

const accentColors = [
  { id: "blue", label: "Biru", color: "#2563eb", ring: "ring-blue-300" },
  { id: "green", label: "Hijau", color: "#16a34a", ring: "ring-green-300" },
  { id: "purple", label: "Ungu", color: "#9333ea", ring: "ring-purple-300" },
  { id: "orange", label: "Oranye", color: "#ea580c", ring: "ring-orange-300" },
  { id: "red", label: "Merah", color: "#dc2626", ring: "ring-red-300" },
  { id: "pink", label: "Pink", color: "#db2777", ring: "ring-pink-300" },
  { id: "teal", label: "Teal", color: "#0d9488", ring: "ring-teal-300" },
  { id: "indigo", label: "Indigo", color: "#4f46e5", ring: "ring-indigo-300" },
  { id: "amber", label: "Amber", color: "#d97706", ring: "ring-amber-300" },
  { id: "cyan", label: "Sian", color: "#0891b2", ring: "ring-cyan-300" },
  { id: "rose", label: "Mawar", color: "#e11d48", ring: "ring-rose-300" },
  { id: "emerald", label: "Zamrud", color: "#059669", ring: "ring-emerald-300" },
];

type ThemeMode = "light" | "dark" | "system";

export default function ThemePage() {
  const { primaryColor, setPrimaryColor, themeMode, setThemeMode } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(themeMode);
  const [selectedColor, setSelectedColor] = useState(() => {
    const found = accentColors.find((c) => c.color === primaryColor);
    return found ? found.id : "blue";
  });
  const [saved, setSaved] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [customHex, setCustomHex] = useState(
    accentColors.find((c) => c.color === primaryColor) ? "" : primaryColor
  );

  useEffect(() => {
    setMounted(true);
    setSelectedTheme(themeMode);
    const found = accentColors.find((c) => c.color === primaryColor);
    if (found) {
      setSelectedColor(found.id);
      setCustomHex("");
    } else {
      setSelectedColor("custom");
      setCustomHex(primaryColor);
    }
  }, [primaryColor, themeMode]);

  const activeAccent = selectedColor === "custom"
    ? { id: "custom", label: "Kustom", color: customHex || "#2563eb", ring: "ring-dashboard-blue" }
    : accentColors.find((c) => c.id === selectedColor)!;

  const handleSave = () => {
    setPrimaryColor(activeAccent.color);
    setThemeMode(selectedTheme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      {/* Header */}
      <section className="mb-10">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-bold text-dashboard-gray hover:text-dashboard-blue transition-colors mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Pengaturan
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
            <Palette className="h-5 w-5 text-purple-500" />
          </div>
          <span className="text-xs font-bold text-dashboard-gray uppercase tracking-widest">
            Personalisasi
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
          Tema & Warna
        </h1>
        <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
          Sesuaikan tampilan Karsafin dengan gaya Anda.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Theme + Colors */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Theme Mode */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
              Mode Tampilan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map((theme) => {
                const Icon = theme.icon;
                const isActive = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer group text-left ${
                      isActive
                        ? "border-dashboard-blue bg-blue-50/50 shadow-lg shadow-blue-100"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-dashboard-blue rounded-full flex items-center justify-center">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className={`w-14 h-10 rounded-xl mb-4 border ${theme.preview}`}
                    />
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? "text-dashboard-blue" : "text-slate-400"
                        }`}
                      />
                      <span
                        className={`font-bold text-sm ${
                          isActive ? "text-dashboard-blue" : "text-slate-800"
                        }`}
                      >
                        {theme.label}
                      </span>
                    </div>
                    <p className="text-xs text-dashboard-gray">{theme.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2">
              Warna Aksen
            </h3>
            <p className="text-sm text-dashboard-gray mb-6">
              Pilih warna utama yang akan digunakan di seluruh aplikasi.
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
              {accentColors.map((color) => {
                const isActive = selectedColor === color.id;
                return (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className="flex flex-col items-center gap-2 group cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl transition-all group-hover:scale-110 shadow-md ${
                        isActive ? `ring-4 ${color.ring} scale-110` : ""
                      }`}
                      style={{ backgroundColor: color.color }}
                    >
                      {isActive && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Check className="h-5 w-5 text-white drop-shadow-sm" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isActive ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {color.label}
                    </span>
                  </button>
                );
              })}
              {/* Custom Color */}
              <button
                onClick={() => setShowCustomPicker(true)}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-2xl transition-all group-hover:scale-110 shadow-md flex items-center justify-center ${
                    selectedColor === "custom" ? "ring-4 ring-dashboard-blue scale-110" : ""
                  }`}
                  style={{ backgroundColor: selectedColor === "custom" ? activeAccent.color : "#f1f5f9" }}
                >
                  {selectedColor === "custom" ? (
                    <Check className="h-5 w-5 text-white drop-shadow-sm" />
                  ) : (
                    <span className="text-lg">🎨</span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    selectedColor === "custom" ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  Kustom
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Preview + Save */}
        <div className="flex flex-col gap-6">
          {/* Preview Card */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
              Pratinjau
            </h3>
            <div
              className={`rounded-2xl p-6 border ${
                selectedTheme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              } transition-colors`}
            >
              {/* Mini preview header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-xl"
                  style={{ backgroundColor: activeAccent.color }}
                />
                <div>
                  <div
                    className={`h-2.5 w-20 rounded-full ${
                      selectedTheme === "dark" ? "bg-slate-600" : "bg-slate-300"
                    }`}
                  />
                  <div
                    className={`h-2 w-14 rounded-full mt-1.5 ${
                      selectedTheme === "dark" ? "bg-slate-700" : "bg-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* Mini preview cards */}
              <div className="space-y-2">
                <div
                  className={`h-10 rounded-xl ${
                    selectedTheme === "dark" ? "bg-slate-800" : "bg-white"
                  }`}
                />
                <div className="flex gap-2">
                  <div
                    className="h-16 flex-1 rounded-xl"
                    style={{ backgroundColor: activeAccent.color, opacity: 0.15 }}
                  />
                  <div
                    className={`h-16 flex-1 rounded-xl ${
                      selectedTheme === "dark" ? "bg-slate-800" : "bg-white"
                    }`}
                  />
                </div>
                <div
                  className="h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: activeAccent.color }}
                >
                  <span className="text-white text-[10px] font-bold">Tombol Aksi</span>
                </div>
              </div>

              {/* Mini nav */}
              <div
                className={`flex justify-around mt-4 pt-3 border-t ${
                  selectedTheme === "dark"
                    ? "border-slate-700"
                    : "border-slate-200"
                }`}
              >
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`w-5 h-5 rounded-lg ${
                      i === 1
                        ? ""
                        : selectedTheme === "dark"
                        ? "bg-slate-700"
                        : "bg-slate-200"
                    }`}
                    style={i === 1 ? { backgroundColor: activeAccent.color } : {}}
                  />
                ))}
              </div>
            </div>

            {/* Theme info */}
            <div className="mt-5 flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: activeAccent.color }}
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800">{activeAccent.label}</span>
                <span className="text-dashboard-gray ml-1">
                  · {themeOptions.find((t) => t.id === selectedTheme)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={`w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              saved
                ? "bg-green-500 shadow-green-200"
                : "bg-dashboard-blue hover:bg-blue-700 shadow-blue-200 active:scale-[0.98]"
            }`}
          >
            {saved ? (
              <>
                <Check className="h-5 w-5" />
                Tersimpan!
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Custom Color Picker Modal ─── */}
      {mounted && showCustomPicker && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setShowCustomPicker(false)}
        >
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800">Warna Kustom</h3>
              <button
                onClick={() => setShowCustomPicker(false)}
                className="cursor-pointer p-1 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-2">
                  Pilih Warna
                </label>
                <input
                  type="color"
                  value={customHex || "#2563eb"}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    setSelectedColor("custom");
                  }}
                  className="w-full h-20 rounded-2xl cursor-pointer border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-dashboard-gray mb-1.5">
                  Kode Warna (Hex)
                </label>
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomHex(val);
                    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                      setSelectedColor("custom");
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue"
                  placeholder="#2563eb"
                  maxLength={7}
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div
                  className="w-8 h-8 rounded-xl shrink-0 border border-slate-200"
                  style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : "#2563eb" }}
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">
                    {/^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : "Masukkan hex valid"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) {
                  setSelectedColor("custom");
                  setShowCustomPicker(false);
                }
              }}
              disabled={!/^#[0-9A-Fa-f]{6}$/.test(customHex)}
              className="w-full mt-6 py-3.5 rounded-2xl bg-dashboard-blue text-white font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Pilih Warna
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
