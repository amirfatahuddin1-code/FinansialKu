import React from "react";
import { Landmark, Wallet, Coins, TrendingUp } from "lucide-react";

interface InstitutionLogoProps {
  name: string;
  icon?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function InstitutionLogo({ name, icon, className = "", size = "md" }: InstitutionLogoProps) {
  const norm = (name || "").toLowerCase().trim();

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base"
  };

  // If custom icon is a base64 image or image path, render it directly
  if (icon && (icon.startsWith("data:image/") || icon.startsWith("http://") || icon.startsWith("https://") || icon.startsWith("/"))) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src={icon} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  // If custom icon is an emoji, render the emoji
  const isEmoji = icon && /\p{Emoji}/u.test(icon) && icon.length <= 4;
  if (isEmoji) {
    return (
      <div className={`rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm ${sizeClasses[size]} ${className}`}>
        <span style={{ fontSize: size === "lg" ? "20px" : size === "md" ? "16px" : "12px" }}>{icon}</span>
      </div>
    );
  }

  // 1. BANK LOGOS (Using real PNGs copied from mobile package)
  if (norm.includes("bca") || norm.includes("klikbca") || norm.includes("mybca")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/bca.png" alt="BCA" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("mandiri")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/mandiri.png" alt="Mandiri" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("bni")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/bni.png" alt="BNI" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("bri")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/bri.png" alt="BRI" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("bsi")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/bsi.png" alt="BSI" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("btn")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/btn.png" alt="BTN" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("cimb")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/cimb.png" alt="CIMB" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("danamon")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/danamon.png" alt="Danamon" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("ocbc")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/ocbc.png" alt="OCBC" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("permata")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100/80 shrink-0 ${sizeClasses[size]} ${className}`}>
        <img src="/banks/permata.png" alt="Permata" className="w-full h-full object-cover" />
      </div>
    );
  }

  if (norm.includes("jago")) {
    return (
      <div className={`rounded-full bg-[#FFE800] flex items-center justify-center font-black text-[#1D2129] shrink-0 shadow-sm border border-[#FFE800]/50 tracking-tighter ${sizeClasses[size]} ${className}`}>
        <span className="font-sans font-black tracking-tight" style={{ fontSize: size === "lg" ? "14px" : size === "md" ? "12px" : "10px" }}>jago</span>
      </div>
    );
  }

  // 2. E-WALLET LOGOS (Custom premium vectors/designs)
  if (norm.includes("gopay")) {
    return (
      <div className={`rounded-full bg-[#00AED6] flex items-center justify-center shrink-0 shadow-sm border border-sky-300/20 ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 100 100" className="w-[60%] h-[60%] text-white fill-current">
          <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="11" />
          <circle cx="50" cy="50" r="10" />
        </svg>
      </div>
    );
  }

  if (norm.includes("ovo")) {
    return (
      <div className={`rounded-full bg-[#4C3494] flex items-center justify-center shrink-0 shadow-sm border border-violet-400/20 ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 100 100" className="w-[65%] h-[65%] text-white fill-none stroke-current stroke-[8]">
          <circle cx="50" cy="50" r="32" />
        </svg>
      </div>
    );
  }

  if (norm.includes("dana")) {
    return (
      <div className={`rounded-full bg-[#108EE9] flex items-center justify-center font-black text-white italic shrink-0 shadow-sm border border-blue-300/20 ${sizeClasses[size]} ${className}`}>
        <span className="font-sans font-black tracking-tight" style={{ fontSize: size === "lg" ? "13px" : size === "md" ? "11px" : "9px" }}>DANA</span>
      </div>
    );
  }

  if (norm.includes("shopee") || norm.includes("spay")) {
    return (
      <div className={`rounded-full bg-[#EE4D2D] flex items-center justify-center shrink-0 shadow-sm border border-orange-300/20 ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 24 24" className="w-[55%] h-[55%] text-white fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
          <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
          <path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6H18z" />
          <circle cx="20" cy="15" r="1" fill="currentColor" />
        </svg>
      </div>
    );
  }

  if (norm.includes("linkaja") || norm.includes("link aja")) {
    return (
      <div className={`rounded-full bg-[#E21B22] flex flex-col items-center justify-center font-black text-white shrink-0 shadow-sm border border-red-300/20 ${sizeClasses[size]} ${className}`}>
        <span className="leading-none text-[8px] font-sans font-black tracking-tight uppercase">Link</span>
        <span className="leading-none text-[8px] font-sans font-black text-[#FFD400] tracking-tight uppercase">Aja!</span>
      </div>
    );
  }

  if (norm.includes("isaku")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-200 ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 100 100" className="w-[60%] h-[60%]">
          <circle cx="50" cy="30" r="12" fill="#F5A623" />
          <rect x="38" y="48" width="24" height="36" rx="6" fill="#00AED6" />
        </svg>
      </div>
    );
  }

  if (norm.includes("sakuku")) {
    return (
      <div className={`rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-200 ${sizeClasses[size]} ${className}`}>
        <span className="font-sans font-black text-[#0066AE]" style={{ fontSize: size === "lg" ? "12px" : size === "md" ? "10px" : "8px" }}>sakuku</span>
      </div>
    );
  }

  if (norm.includes("doku")) {
    return (
      <div className={`rounded-full bg-[#E21B22] flex items-center justify-center font-black text-white shrink-0 shadow-sm border border-red-300/20 ${sizeClasses[size]} ${className}`}>
        <span className="font-sans font-black tracking-tight" style={{ fontSize: size === "lg" ? "11px" : size === "md" ? "9px" : "7px" }}>DOKU</span>
      </div>
    );
  }

  // 3. INVESTMENT LOGOS (Custom premium vectors/designs)
  if (norm.includes("bibit")) {
    return (
      <div className={`rounded-full bg-[#00E676] flex items-center justify-center shrink-0 shadow-sm border border-emerald-300/20 ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 24 24" className="w-[55%] h-[55%] text-white fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V12M12 12c0-3-2-5-5-5S2 9 2 12s2 5 5 5c3 0 5-2 5-5z" />
          <path d="M12 12c0-3 2-5 5-5s5 2 5 5-2 5-5 5c-3 0-5-2-5-5z" />
        </svg>
      </div>
    );
  }

  if (norm.includes("ajaib")) {
    return (
      <div className={`rounded-full bg-[#00D0B6] flex items-center justify-center shrink-0 shadow-sm border border-teal-300/20 ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 24 24" className="w-[60%] h-[60%] text-white fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12.5C19 10 16 9 13 9c-3 0-5 1-5 3v1h11v-0.5z" />
          <path d="M5 9.5C6.5 9.5 8 11 8 12.5" />
          <path d="M19 12c1.5 0 2.5-1 2.5-2.5S20.5 7 19 8" />
          <path d="M10 16.5h6v1.5h-6z" />
          <path d="M4 6.5s1.5-1 2.5 0" />
        </svg>
      </div>
    );
  }

  if (norm.includes("stockbit")) {
    return (
      <div className={`rounded-full bg-[#1A1A1A] flex items-center justify-center shrink-0 shadow-sm border border-zinc-800 ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 24 24" className="w-[55%] h-[55%] text-[#00E676] fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l6-6 4 4 8-9" />
          <path d="M17 6h4v4" />
        </svg>
      </div>
    );
  }

  if (norm.includes("ipot")) {
    return (
      <div className={`rounded-full bg-[#1A3F7A] flex items-center justify-center font-black text-[#FFD400] shrink-0 shadow-sm border border-blue-900 ${sizeClasses[size]} ${className}`}>
        <span className="font-sans font-black tracking-tight" style={{ fontSize: size === "lg" ? "12px" : size === "md" ? "10px" : "8px" }}>ipot</span>
      </div>
    );
  }

  if (norm.includes("akseleran") || norm.includes("aksel")) {
    return (
      <div className={`rounded-full bg-[#0C58A5] flex items-center justify-center shrink-0 shadow-sm border border-blue-700 ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 24 24" className="w-[50%] h-[50%] text-white fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15l8-8 8 8" />
          <path d="M4 9l8 8 8-8" />
        </svg>
      </div>
    );
  }

  if (norm.includes("amartha")) {
    return (
      <div className={`rounded-full bg-[#2E5894] flex items-center justify-center shrink-0 shadow-sm border border-blue-800 ${sizeClasses[size]} ${className}`}>
        <svg viewBox="0 0 24 24" className="w-[60%] h-[60%] text-white fill-none stroke-current stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
        </svg>
      </div>
    );
  }

  // 4. CASH / TUNAI
  if (norm.includes("tunai") || norm.includes("cash") || norm === "💵") {
    return (
      <div className={`rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 ${sizeClasses[size]} ${className}`}>
        <Coins className="h-1/2 w-1/2" />
      </div>
    );
  }

  // Fallbacks
  if (norm.includes("bank")) {
    return (
      <div className={`rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 ${sizeClasses[size]} ${className}`}>
        <Landmark className="h-1/2 w-1/2" />
      </div>
    );
  }

  if (norm.includes("wallet") || norm.includes("dompet")) {
    return (
      <div className={`rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 ${sizeClasses[size]} ${className}`}>
        <Wallet className="h-1/2 w-1/2" />
      </div>
    );
  }

  if (norm.includes("invest")) {
    return (
      <div className={`rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 ${sizeClasses[size]} ${className}`}>
        <TrendingUp className="h-1/2 w-1/2" />
      </div>
    );
  }

  // Generic fallback
  return (
    <div className={`rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 ${sizeClasses[size]} ${className}`}>
      <Landmark className="h-1/2 w-1/2" />
    </div>
  );
}
