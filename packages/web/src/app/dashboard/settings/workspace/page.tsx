"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Copy,
  Share2,
  RefreshCw,
  MoreVertical,
  Crown,
  Shield,
  User,
  LogOut,
  Trash2,
  Check,
  AlertTriangle,
} from "lucide-react";

const members = [
  {
    id: 1,
    name: "Fahmi Amirullah",
    email: "fahmi@karsafin.id",
    role: "Owner" as const,
    initials: "FA",
    gradient: "from-dashboard-blue to-blue-400",
    joinedAt: "Jan 2024",
  },
  {
    id: 2,
    name: "Sarah Rahma",
    email: "sarah.rahma@gmail.com",
    role: "Admin" as const,
    initials: "SR",
    gradient: "from-purple-500 to-pink-400",
    joinedAt: "Mar 2024",
  },
  {
    id: 3,
    name: "Budi Hartono",
    email: "budi.h@outlook.com",
    role: "Member" as const,
    initials: "BH",
    gradient: "from-emerald-500 to-teal-400",
    joinedAt: "Jun 2024",
  },
  {
    id: 4,
    name: "Dewi Lestari",
    email: "dewi.lestari@yahoo.com",
    role: "Member" as const,
    initials: "DL",
    gradient: "from-amber-500 to-orange-400",
    joinedAt: "Sep 2024",
  },
];

const roleBadgeStyles = {
  Owner: "bg-amber-50 text-amber-700 border-amber-200",
  Admin: "bg-purple-50 text-purple-700 border-purple-200",
  Member: "bg-slate-50 text-slate-600 border-slate-200",
};

const roleIcons = {
  Owner: Crown,
  Admin: Shield,
  Member: User,
};

export default function WorkspacePage() {
  const [copied, setCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const inviteCode = "KRS-7F2A-9X4B";

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <span className="text-xs font-bold text-dashboard-gray uppercase tracking-widest">
            Manajemen Tim
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
          Anggota Workspace
        </h1>
        <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
          Kelola anggota, atur peran, dan undang orang baru ke workspace Anda.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Members */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Workspace Info */}
          <div className="custom-card p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-dashboard-blue to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Keluarga Amirullah</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold bg-blue-50 text-dashboard-blue px-2.5 py-0.5 rounded-full">
                      Keluarga
                    </span>
                    <span className="text-xs text-dashboard-gray">
                      · {members.length} anggota
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-600 px-3 py-1 rounded-full flex items-center gap-1 border border-amber-200">
                <Crown className="h-3 w-3" />
                Owner
              </span>
            </div>
          </div>

          {/* Member List */}
          <div className="custom-card p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest">
                Daftar Anggota
              </h3>
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                {members.length} orang
              </span>
            </div>
            <div className="space-y-2">
              {members.map((member) => {
                const RoleIcon = roleIcons[member.role];
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group relative"
                  >
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-sm font-bold shadow-sm`}
                    >
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">
                          {member.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${roleBadgeStyles[member.role]}`}
                        >
                          <RoleIcon className="h-2.5 w-2.5" />
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs text-dashboard-gray mt-0.5 truncate">
                        {member.email}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium shrink-0 hidden sm:block">
                      Bergabung {member.joinedAt}
                    </span>
                    {member.role !== "Owner" && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId(openMenuId === member.id ? null : member.id)
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-300 hover:text-slate-500"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenuId === member.id && (
                          <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-10 py-1 animate-in fade-in slide-in-from-top-1">
                            <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                              <Shield className="h-3.5 w-3.5" />
                              {member.role === "Admin"
                                ? "Turunkan ke Member"
                                : "Naikkan ke Admin"}
                            </button>
                            <button className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 cursor-pointer">
                              <Trash2 className="h-3.5 w-3.5" />
                              Keluarkan
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Invite + Danger */}
        <div className="flex flex-col gap-6">
          {/* Invite Code */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
              Kode Undangan
            </h3>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center mb-5">
              <p className="text-3xl font-black text-slate-800 tracking-[0.15em] mb-2 font-mono">
                {inviteCode}
              </p>
              <p className="text-xs text-dashboard-gray">
                Bagikan kode ini untuk mengundang anggota baru
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-dashboard-blue text-white hover:bg-blue-700 shadow-md shadow-blue-200"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Salin
                  </>
                )}
              </button>
              <button className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer">
                <Share2 className="h-4 w-4" />
                Bagikan
              </button>
            </div>
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-dashboard-gray hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer">
              <RefreshCw className="h-4 w-4" />
              Buat Kode Baru
            </button>
          </div>

          {/* Danger Zone */}
          <div className="custom-card p-8 border-2 border-red-100">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-xs font-black text-red-500 uppercase tracking-widest">
                Zona Bahaya
              </h3>
            </div>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer">
                <LogOut className="h-4 w-4" />
                Keluar dari Workspace
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer shadow-md shadow-red-200">
                <Trash2 className="h-4 w-4" />
                Hapus Workspace
              </button>
            </div>
            <p className="text-[10px] text-red-400 mt-3 text-center leading-relaxed">
              Menghapus workspace akan menghapus semua data secara permanen.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
