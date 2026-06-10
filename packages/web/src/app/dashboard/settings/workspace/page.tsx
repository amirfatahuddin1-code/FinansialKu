"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/providers";
import { useWorkspace } from "@/providers";

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-amber-50 text-amber-700 border-amber-200",
  member: "bg-slate-50 text-slate-600 border-slate-200",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  member: "Member",
};

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("id");
  const { user, api } = useAuth();
  const { workspaces, refreshWorkspaces } = useWorkspace();

  const [members, setMembers] = useState<any[]>([]);
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isOwner = workspace?.owner_id === user?.id;

  useEffect(() => {
    if (!workspaceId || workspaces.length === 0) return;
    loadData();
  }, [workspaceId, workspaces]);

  const loadData = async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (ws) {
        if (ws.type === "personal") {
          setWorkspace(ws);
          setLoading(false);
          return;
        }
        setWorkspace(ws);
      } else {
        setLoading(false);
        return;
      }

      const { data, error: membersErr } = await api.workspaces.getMembers(workspaceId);
      if (membersErr) throw membersErr;
      setMembers(data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (workspace?.invite_code) {
      navigator.clipboard.writeText(workspace.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (workspace?.invite_code && navigator.share) {
      navigator.share({
        title: `Bergabung ke workspace ${workspace.name}`,
        text: `Gunakan kode ${workspace.invite_code} untuk bergabung ke workspace ${workspace.name} di Karsafin.`,
      });
    }
  };

  const handleRegenerateCode = async () => {
    if (!workspaceId) return;
    setActionLoading("regen");
    try {
      const { data, error } = await api.workspaces.regenerateInviteCode(workspaceId);
      if (error) throw error;
      if (data) setWorkspace(data);
      setSuccessMsg("Kode undangan baru berhasil dibuat.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Gagal membuat kode baru.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (memberId: string, currentRole: string) => {
    if (!workspaceId) return;
    const newRole = currentRole === "admin" ? "member" : "admin";
    setActionLoading(memberId);
    try {
      const { error } = await api.workspaces.updateMemberRole(workspaceId, memberId, newRole);
      if (error) throw error;
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      setOpenMenuId(null);
    } catch (err: any) {
      setError(err.message || "Gagal mengubah peran.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspaceId) return;
    setActionLoading(memberId);
    try {
      const { error } = await api.workspaces.removeMember(workspaceId, memberId);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setOpenMenuId(null);
      setSuccessMsg("Anggota berhasil dikeluarkan.");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Gagal mengeluarkan anggota.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async () => {
    if (!workspaceId || !user) return;
    setActionLoading("leave");
    try {
      const { error } = await api.workspaces.leave(workspaceId, user.id);
      if (error) throw error;
      await refreshWorkspaces();
      window.location.href = "/dashboard/settings";
    } catch (err: any) {
      setError(err.message || "Gagal keluar dari workspace.");
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!workspaceId) return;
    setActionLoading("delete");
    try {
      const { error } = await api.workspaces.delete(workspaceId);
      if (error) throw error;
      await refreshWorkspaces();
      window.location.href = "/dashboard/settings";
    } catch (err: any) {
      setError(err.message || "Gagal menghapus workspace.");
      setActionLoading(null);
    }
  };

  if (!workspaceId || (!loading && (!workspace || workspace.type === "personal"))) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
        <p className="text-slate-500 font-bold">
          {workspace?.type === "personal"
            ? "Workspace Catatan Pribadi tidak dapat dikelola."
            : "Workspace tidak ditemukan."}
        </p>
        <Link href="/dashboard/settings" className="mt-4 text-sm font-bold text-dashboard-blue hover:underline">
          Kembali ke Pengaturan
        </Link>
      </div>
    );
  }

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
            Manajemen Workspace
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
          {loading ? "Memuat..." : workspace?.name || "Kelola Workspace"}
        </h1>
        <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
          Kelola anggota, atur peran, dan undang orang baru ke workspace ini.
        </p>
      </section>

      {/* Success / Error alerts */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-semibold animate-fade-in">
          <Check className="h-5 w-5 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-dashboard-blue mb-3" />
          <p className="text-sm font-bold text-slate-400">Memuat data workspace...</p>
        </div>
      ) : (
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
                    <h2 className="text-xl font-black text-slate-800">{workspace?.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold bg-blue-50 text-dashboard-blue px-2.5 py-0.5 rounded-full">
                        {workspace?.type === "family" ? "Keluarga" : "Pribadi"}
                      </span>
                      <span className="text-xs text-dashboard-gray">
                        · {members.length} anggota
                      </span>
                    </div>
                  </div>
                </div>
                {isOwner && (
                  <span className="text-xs font-bold bg-amber-50 text-amber-600 px-3 py-1 rounded-full flex items-center gap-1 border border-amber-200">
                    <Crown className="h-3 w-3" />
                    Owner
                  </span>
                )}
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
                  const isCurrentUser = member.user_id === user?.id;
                  const isAdmin = member.role === "admin";
                  const isOwnerMember = workspace?.owner_id === member.user_id;
                  const name = member.profiles?.name || member.profiles?.email || "Pengguna";
                  const email = member.profiles?.email || "";
                  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group relative"
                    >
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-dashboard-blue to-blue-400 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-800">{name}</span>
                          {isOwnerMember ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200">
                              <Crown className="h-2.5 w-2.5" /> Owner
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${roleBadgeStyles[member.role] || roleBadgeStyles.member}`}>
                              {isAdmin ? <Shield className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                              {roleLabels[member.role] || member.role}
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">Kamu</span>
                          )}
                        </div>
                        <p className="text-xs text-dashboard-gray mt-0.5 truncate">{email}</p>
                      </div>

                      {/* Actions: only owner can manage non-owner members */}
                      {isOwner && !isOwnerMember && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors cursor-pointer text-slate-300 hover:text-slate-500"
                          >
                            {actionLoading === member.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </button>
                          {openMenuId === member.id && (
                            <div
                              className="absolute right-0 top-10 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-10 py-1"
                              onMouseLeave={() => setOpenMenuId(null)}
                            >
                              <button
                                onClick={() => handleChangeRole(member.id, member.role)}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Shield className="h-3.5 w-3.5" />
                                {member.role === "admin" ? "Turunkan ke Member" : "Naikkan ke Admin"}
                              </button>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Keluarkan dari Workspace
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {members.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-8">Belum ada anggota di workspace ini.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Invite + Danger */}
          <div className="flex flex-col gap-6">
            {/* Invite Code — only for family workspaces */}
            {workspace?.type === "family" && workspace?.invite_code && (
              <div className="custom-card p-8">
                <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
                  Kode Undangan
                </h3>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center mb-5">
                  <p className="text-3xl font-black text-slate-800 tracking-[0.15em] mb-2 font-mono">
                    {workspace.invite_code}
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
                      <><Check className="h-4 w-4" />Tersalin!</>
                    ) : (
                      <><Copy className="h-4 w-4" />Salin</>
                    )}
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Share2 className="h-4 w-4" />
                    Bagikan
                  </button>
                </div>
                {isOwner && (
                  <button
                    onClick={handleRegenerateCode}
                    disabled={actionLoading === "regen"}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-dashboard-gray hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${actionLoading === "regen" ? "animate-spin" : ""}`} />
                    Buat Kode Baru
                  </button>
                )}
              </div>
            )}

            {/* Danger Zone */}
            <div className="custom-card p-8 border-2 border-red-100">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h3 className="text-xs font-black text-red-500 uppercase tracking-widest">
                  Zona Bahaya
                </h3>
              </div>
              <div className="space-y-3">
                {!isOwner && (
                  <>
                    {!leaveConfirm ? (
                      <button
                        onClick={() => setLeaveConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        Keluar dari Workspace
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-red-500 font-semibold text-center">Kamu yakin ingin keluar?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setLeaveConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">Batal</button>
                          <button
                            onClick={handleLeave}
                            disabled={actionLoading === "leave"}
                            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 cursor-pointer disabled:opacity-60"
                          >
                            {actionLoading === "leave" ? "Keluar..." : "Ya, Keluar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {isOwner && (
                  <>
                    {!deleteConfirm ? (
                      <button
                        onClick={() => setDeleteConfirm(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer shadow-md shadow-red-200"
                      >
                        <Trash2 className="h-4 w-4" />
                        Hapus Workspace
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-red-500 font-semibold text-center">Yakin hapus workspace ini? Semua data akan hilang.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">Batal</button>
                          <button
                            onClick={handleDelete}
                            disabled={actionLoading === "delete"}
                            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 cursor-pointer disabled:opacity-60"
                          >
                            {actionLoading === "delete" ? "Menghapus..." : "Hapus"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <p className="text-[10px] text-red-400 mt-3 text-center leading-relaxed">
                {isOwner
                  ? "Menghapus workspace akan menghapus semua data secara permanen."
                  : "Kamu akan kehilangan akses ke workspace ini."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-dashboard-blue" />
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}
