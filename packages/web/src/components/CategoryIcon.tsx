import React from "react";
import {
  Briefcase,
  Laptop,
  Gift,
  Store,
  TrendingUp,
  PiggyBank,
  Utensils,
  Car,
  Zap,
  Wifi,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Home,
  CreditCard,
  Hotel,
  Ticket,
  Camera,
  Coffee,
  Shirt,
  Sparkles,
  Plane,
  Coins,
  HelpCircle,
  LucideIcon
} from "lucide-react";

interface CategoryStyle {
  Icon: LucideIcon;
  bgClass: string;
  textClass: string;
  borderClass: string;
  emoji: string;
}

export function getCategoryStyle(nameOrEmoji: string): CategoryStyle {
  const norm = (nameOrEmoji || "").toLowerCase().trim();

  if (norm.includes("gaji") || norm === "💼") {
    return { Icon: Briefcase, bgClass: "bg-emerald-50", textClass: "text-emerald-600", borderClass: "border-emerald-100/80", emoji: "💼" };
  }
  if (norm.includes("freelance") || norm === "💻" || norm.includes("kerja")) {
    return { Icon: Laptop, bgClass: "bg-teal-50", textClass: "text-teal-600", borderClass: "border-teal-100/80", emoji: "💻" };
  }
  if (norm.includes("bonus") || norm === "🎁") {
    return { Icon: Gift, bgClass: "bg-green-50", textClass: "text-green-600", borderClass: "border-green-100/80", emoji: "🎁" };
  }
  if (norm.includes("bisnis") || norm === "🏪" || norm.includes("usaha")) {
    return { Icon: Store, bgClass: "bg-cyan-50", textClass: "text-cyan-600", borderClass: "border-cyan-100/80", emoji: "🏪" };
  }
  if (norm.includes("invest") || norm.includes("saham") || norm === "📈" || norm.includes("reksa") || norm === "📊") {
    return { Icon: TrendingUp, bgClass: "bg-indigo-50", textClass: "text-indigo-600", borderClass: "border-indigo-100/80", emoji: "📈" };
  }
  if (norm.includes("tabung") || norm === "🏦" || norm.includes("darurat") || norm === "🎯") {
    return { Icon: PiggyBank, bgClass: "bg-blue-50", textClass: "text-blue-600", borderClass: "border-blue-100/80", emoji: "🏦" };
  }
  if (norm.includes("makan") || norm.includes("minum") || norm === "🍽️" || norm === "🍕" || norm === "🍔") {
    return { Icon: Utensils, bgClass: "bg-rose-50", textClass: "text-rose-500", borderClass: "border-rose-100/80", emoji: "🍽️" };
  }
  if (norm.includes("transport") || norm === "🚗" || norm === "🚌" || norm.includes("bensin") || norm === "✈️" || norm.includes("jalan")) {
    return { Icon: Car, bgClass: "bg-amber-50", textClass: "text-amber-600", borderClass: "border-amber-100/80", emoji: "🚗" };
  }
  if (norm.includes("tagihan") || norm === "⚡" || norm.includes("listrik") || norm.includes("air") || norm === "💡") {
    return { Icon: Zap, bgClass: "bg-yellow-50", textClass: "text-yellow-600", borderClass: "border-yellow-100/80", emoji: "⚡" };
  }
  if (norm.includes("internet") || norm === "📱" || norm.includes("wifi") || norm === "📶" || norm.includes("net")) {
    return { Icon: Wifi, bgClass: "bg-sky-50", textClass: "text-sky-600", borderClass: "border-sky-100/80", emoji: "📱" };
  }
  if (norm.includes("belanja") || norm === "🛍️" || norm.includes("oleh")) {
    return { Icon: ShoppingBag, bgClass: "bg-pink-50", textClass: "text-pink-600", borderClass: "border-pink-100/80", emoji: "🛍️" };
  }
  if (norm.includes("hiburan") || norm === "🎮" || norm.includes("game") || norm === "🎬" || norm.includes("nonton")) {
    return { Icon: Gamepad2, bgClass: "bg-purple-50", textClass: "text-purple-600", borderClass: "border-purple-100/80", emoji: "🎮" };
  }
  if (norm.includes("sehat") || norm === "❤️" || norm.includes("obat") || norm.includes("dokter") || norm === "🏥") {
    return { Icon: HeartPulse, bgClass: "bg-red-50", textClass: "text-red-600", borderClass: "border-red-100/80", emoji: "❤️" };
  }
  if (norm.includes("didik") || norm === "🎓" || norm.includes("sekolah") || norm.includes("kursus") || norm === "📚") {
    return { Icon: GraduationCap, bgClass: "bg-violet-50", textClass: "text-violet-600", borderClass: "border-violet-100/80", emoji: "🎓" };
  }
  if (norm.includes("sewa") || norm === "🏠" || norm.includes("kos") || norm.includes("kontrak")) {
    return { Icon: Home, bgClass: "bg-slate-50", textClass: "text-slate-600", borderClass: "border-slate-200/60", emoji: "🏠" };
  }
  if (norm.includes("langganan") || norm === "🎵" || norm.includes("sub") || norm === "💳") {
    return { Icon: CreditCard, bgClass: "bg-fuchsia-50", textClass: "text-fuchsia-600", borderClass: "border-fuchsia-100/80", emoji: "💳" };
  }
  if (norm.includes("akomodasi") || norm.includes("hotel") || norm === "🏨") {
    return { Icon: Hotel, bgClass: "bg-blue-50", textClass: "text-blue-600", borderClass: "border-blue-100/80", emoji: "🏨" };
  }
  if (norm.includes("wisata") || norm.includes("tiket") || norm === "🎟️") {
    return { Icon: Ticket, bgClass: "bg-orange-50", textClass: "text-orange-600", borderClass: "border-orange-100/80", emoji: "🎟️" };
  }
  if (norm.includes("dokumen") || norm.includes("foto") || norm === "📷" || norm === "📸") {
    return { Icon: Camera, bgClass: "bg-lime-50", textClass: "text-lime-600", borderClass: "border-lime-100/80", emoji: "📷" };
  }
  if (norm.includes("kopi") || norm === "☕" || norm.includes("cafe")) {
    return { Icon: Coffee, bgClass: "bg-amber-50", textClass: "text-amber-700", borderClass: "border-amber-100/80", emoji: "☕" };
  }
  if (norm.includes("pakaian") || norm === "👕" || norm.includes("baju")) {
    return { Icon: Shirt, bgClass: "bg-emerald-50", textClass: "text-emerald-600", borderClass: "border-emerald-100/80", emoji: "👕" };
  }
  if (norm.includes("rawat") || norm === "💇" || norm.includes("salon")) {
    return { Icon: Sparkles, bgClass: "bg-pink-50", textClass: "text-pink-500", borderClass: "border-pink-100/80", emoji: "💇" };
  }
  if (norm.includes("liburan") || norm.includes("jalan") || norm === "✈️") {
    return { Icon: Plane, bgClass: "bg-sky-50", textClass: "text-sky-500", borderClass: "border-sky-100/80", emoji: "✈️" };
  }
  if (norm.includes("emas") || norm === "🪙") {
    return { Icon: Coins, bgClass: "bg-yellow-50", textClass: "text-yellow-700", borderClass: "border-yellow-100/80", emoji: "🪙" };
  }

  return { Icon: HelpCircle, bgClass: "bg-slate-50", textClass: "text-slate-500", borderClass: "border-slate-200/60", emoji: "📦" };
}

interface CategoryIconProps {
  name: string;
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
}

export function CategoryIcon({ name, className = "", iconClassName = "", size = "md" }: CategoryIconProps) {
  const { Icon, bgClass, textClass, borderClass } = getCategoryStyle(name);

  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg text-xs",
    md: "w-10 h-10 rounded-xl text-sm",
    lg: "w-12 h-12 rounded-2xl text-base"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  return (
    <div className={`${sizeClasses[size]} ${bgClass} ${borderClass} border flex items-center justify-center shrink-0 transition-transform ${className}`}>
      <Icon className={`${iconSizes[size]} ${textClass} ${iconClassName}`} />
    </div>
  );
}
