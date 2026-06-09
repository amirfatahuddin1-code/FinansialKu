"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Grid,
  List,
  Video,
  Play,
  Pause,
  X,
  RotateCcw,
  Volume2,
  Clock,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";

interface TutorialVideo {
  id: string;
  title: string;
  duration: string;
  description: string;
  category: string;
  accentColor: string;
  bgColor: string;
}

const TUTORIALS_LIST: TutorialVideo[] = [
  {
    id: "main-tour",
    title: "Dasbor & Net Worth (Tur Utama)",
    duration: "02:15",
    description: "Pelajari cara membaca grafik keuangan, ringkasan saldo bulanan, dan total akumulasi kekayaan bersih Anda di dashboard.",
    category: "Dasar",
    accentColor: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    id: "ai-input",
    title: "Catat Cepat dengan Asisten AI",
    duration: "01:45",
    description: "Panduan lengkap mencatat transaksi pemasukan dan pengeluaran secara instan menggunakan suara atau chat asisten AI.",
    category: "Karsafin AI",
    accentColor: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  {
    id: "tx-filters",
    title: "Filter Transaksi & Kalender",
    duration: "01:20",
    description: "Mengatur saringan berdasarkan kategori, rekening, atau membatasi riwayat transaksi ke bulan tertentu.",
    category: "Transaksi",
    accentColor: "text-teal-600",
    bgColor: "bg-teal-50"
  },
  {
    id: "budgeting",
    title: "Menyusun Anggaran & Budget Cerdas",
    duration: "02:30",
    description: "Cara menyusun budget bulanan per kategori dan menyerap rekomendasi alokasi dana otomatis dari asisten AI.",
    category: "Perencanaan",
    accentColor: "text-emerald-600",
    bgColor: "bg-emerald-50"
  },
  {
    id: "telegram-bot",
    title: "Integrasi Bot Telegram Karsafin",
    duration: "01:50",
    description: "Menghubungkan bot Telegram resmi untuk mencatat pengeluaran harian langsung lewat ruang obrolan Telegram.",
    category: "Integrasi",
    accentColor: "text-sky-600",
    bgColor: "bg-sky-50"
  },
  {
    id: "collaboration",
    title: "Workspace & Anggota Keluarga",
    duration: "02:05",
    description: "Mengundang anggota keluarga, membagikan kode workspace, dan mencatat keuangan secara kolaboratif bersama.",
    category: "Kolaborasi",
    accentColor: "text-indigo-600",
    bgColor: "bg-indigo-50"
  }
];

export default function TutorialsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedVideo, setSelectedVideo] = useState<TutorialVideo | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Video simulation states
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle simulated video player progress
  useEffect(() => {
    if (isVideoPlaying) {
      videoIntervalRef.current = setInterval(() => {
        setVideoProgress((prev) => {
          if (prev >= 100) {
            setIsVideoPlaying(false);
            if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
            return 100;
          }
          return prev + 1;
        });
      }, 150);
    } else {
      if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
      }
    }

    return () => {
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    };
  }, [isVideoPlaying]);

  const handleOpenVideo = (video: TutorialVideo) => {
    setSelectedVideo(video);
    setIsVideoPlaying(true);
    setVideoProgress(0);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
    setIsVideoPlaying(false);
  };

  const togglePlayVideo = () => {
    setIsVideoPlaying(!isVideoPlaying);
  };

  const restartVideo = () => {
    setVideoProgress(0);
    setIsVideoPlaying(true);
  };

  // Filter video list based on search query
  const filteredVideos = TUTORIALS_LIST.filter(
    (vid) =>
      vid.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      vid.description.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      vid.category.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <>
      {/* Header */}
      <section className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-1.5 text-xs font-black text-dashboard-gray hover:text-dashboard-blue uppercase tracking-widest mb-3.5 group cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Pengaturan
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3 text-slate-800">
            Video Tutorial & Panduan
          </h1>
          <p className="text-dashboard-gray text-lg leading-relaxed">
            Pelajari cara memaksimalkan fitur Karsafin untuk keuangan pribadi dan keluarga Anda.
          </p>
        </div>
      </section>

      {/* Controls Bar (Search & Toggles) */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center mb-8">
        {/* Search Input */}
        <div className="flex-1 max-w-md flex items-center gap-3 bg-white border border-slate-150 rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Cari video tutorial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-800 font-bold placeholder:text-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-end sm:self-auto shrink-0 gap-1 select-none">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              viewMode === "grid"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Tampilan Kolom (Grid)"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              viewMode === "list"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Tampilan Baris (List)"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Videos Layout */}
      {filteredVideos.length === 0 ? (
        <div className="custom-card p-12 text-center text-slate-400 font-semibold text-sm">
          Video tutorial tidak ditemukan. Coba cari kata kunci lain.
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW (Berkolom-kolom) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => handleOpenVideo(video)}
              className="custom-card group overflow-hidden hover:shadow-lg transition-all hover:scale-[1.01] cursor-pointer flex flex-col"
            >
              {/* Aspect Video Mock Thumbnail */}
              <div className="aspect-video w-full bg-slate-900 relative flex items-center justify-center group overflow-hidden border-b border-slate-100">
                <div className={`absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 opacity-90 group-hover:scale-105 transition-transform duration-500`} />
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-12 h-12 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shadow-slate-950/20">
                    <Play className="w-5 h-5 fill-current ml-0.5 text-slate-800" />
                  </div>
                </div>

                {/* Category Badge & Duration */}
                <div className="absolute top-4 left-4 z-10">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${video.bgColor} ${video.accentColor}`}>
                    {video.category}
                  </span>
                </div>
                <div className="absolute bottom-4 right-4 z-10 bg-slate-950/70 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-slate-200">
                  <Clock className="w-3 h-3" />
                  {video.duration}
                </div>
              </div>

              {/* Text Info */}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="font-extrabold text-base text-slate-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-dashboard-gray leading-relaxed flex-1">
                  {video.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW (Baris melintang) */
        <div className="flex flex-col gap-4">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => handleOpenVideo(video)}
              className="custom-card p-4 group hover:shadow-lg transition-all hover:scale-[1.005] cursor-pointer flex flex-col sm:flex-row gap-6"
            >
              {/* Aspect Video Mock Thumbnail */}
              <div className="aspect-video w-full sm:w-56 bg-slate-900 relative flex items-center justify-center group overflow-hidden rounded-2xl shrink-0 border border-slate-100/5">
                <div className={`absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 opacity-90 group-hover:scale-105 transition-transform duration-500`} />
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-10 h-10 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-4.5 h-4.5 fill-current ml-0.5 text-slate-800" />
                  </div>
                </div>

                {/* Duration */}
                <div className="absolute bottom-3 right-3 z-10 bg-slate-950/70 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-slate-200">
                  <Clock className="w-3 h-3" />
                  {video.duration}
                </div>
              </div>

              {/* Text Info */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${video.bgColor} ${video.accentColor}`}>
                    {video.category}
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-slate-800 mb-2 leading-tight group-hover:text-blue-600 transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-dashboard-gray leading-relaxed max-w-xl">
                  {video.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SLEEK VIDEO PLAYER MODAL */}
      {mounted && selectedVideo && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-xl transition-all duration-300" onClick={handleCloseVideo} />
          
          <div className="relative bg-slate-900 text-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4.5 h-4.5 text-teal-400" />
                <span className="text-sm font-black tracking-tight">{selectedVideo.title}</span>
              </div>
              <button
                onClick={handleCloseVideo}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player Display Screen */}
            <div className="aspect-video w-full bg-black relative flex items-center justify-center overflow-hidden group">
              {/* Animated Demo Content matching video progress */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between z-10 pointer-events-none">
                {videoProgress < 25 && (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                    <span className="text-2xl font-black bg-blue-600/90 text-white px-4 py-2 rounded-2xl w-fit">Karsafin Demo Video</span>
                    <span className="text-xs text-slate-300">Memproses simulasi data pergerakan grafik Anda...</span>
                  </div>
                )}
                {videoProgress >= 25 && videoProgress < 55 && (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-300 self-end text-right">
                    <span className="text-2xl font-black bg-emerald-600/90 text-white px-4 py-2 rounded-2xl w-fit self-end">Fitur {selectedVideo.category}</span>
                    <span className="text-xs text-slate-300">{selectedVideo.description.slice(0, 50)}...</span>
                  </div>
                )}
                {videoProgress >= 55 && videoProgress < 85 && (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                    <span className="text-2xl font-black bg-indigo-600/90 text-white px-4 py-2 rounded-2xl w-fit">Sinkronisasi Instan</span>
                    <span className="text-xs text-slate-300">Semua riwayat terhubung langsung ke database lokal Anda.</span>
                  </div>
                )}
                {videoProgress >= 85 && (
                  <div className="flex flex-col gap-2 items-center justify-center w-full h-full text-center animate-in zoom-in duration-300">
                    <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-emerald-500/20 mb-3">
                      ✓
                    </div>
                    <span className="text-xl font-black text-white">Panduan Selesai!</span>
                    <span className="text-xs text-slate-400">Silakan gunakan fitur ini di modul terkait.</span>
                  </div>
                )}
              </div>

              {/* Playback overlay controls on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 z-20">
                <button
                  onClick={togglePlayVideo}
                  className="w-16 h-16 rounded-full bg-white/95 text-slate-900 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-xl"
                >
                  {isVideoPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </button>
              </div>

              {/* Graphic background lines representing video content */}
              <div className="w-[80%] h-[60%] border border-white/10 rounded-2xl overflow-hidden flex flex-col bg-slate-900/50 backdrop-blur-sm p-4 relative z-0">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <div className="h-4 w-28 bg-white/10 rounded-lg" />
                </div>
                
                {/* Dynamic visual graph based on videoProgress */}
                <div className="flex-1 flex gap-2 items-end">
                  <div
                    className="flex-1 bg-blue-500/40 border border-blue-500/30 rounded-lg transition-all duration-300"
                    style={{ height: `${Math.min(90, Math.max(10, videoProgress * 0.8))}%` }}
                  />
                  <div
                    className="flex-1 bg-teal-500/40 border border-teal-500/30 rounded-lg transition-all duration-300"
                    style={{ height: `${Math.min(75, Math.max(15, (videoProgress - 20) * 1.2))}%` }}
                  />
                  <div
                    className="flex-1 bg-amber-500/40 border border-amber-500/30 rounded-lg transition-all duration-300"
                    style={{ height: `${Math.min(85, Math.max(5, (videoProgress - 40) * 0.9))}%` }}
                  />
                  <div
                    className="flex-1 bg-purple-500/40 border border-purple-500/30 rounded-lg transition-all duration-300"
                    style={{ height: `${Math.min(95, Math.max(25, (videoProgress - 60) * 1.5))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Custom Video Player Control Bar */}
            <div className="p-5 bg-slate-950 flex flex-col gap-4">
              {/* Progress Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400">
                  {Math.floor((videoProgress * 15) / 100)}s
                </span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative cursor-pointer">
                  <div
                    className="h-full bg-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-slate-400">15s</span>
              </div>

              {/* Player buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <button
                    onClick={togglePlayVideo}
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {isVideoPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>
                  <button
                    onClick={restartVideo}
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Mulai Ulang"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-white/10" />
                  <button className="text-slate-300 hover:text-white transition-colors cursor-pointer">
                    <Volume2 className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">HD</span>
                  <span className="text-[10px] bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded text-teal-400 font-bold">1.25x</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
