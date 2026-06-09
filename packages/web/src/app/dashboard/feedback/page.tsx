"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Star,
  Check,
  Bug,
  Sparkles,
  Paintbrush,
  Gauge,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const categories = [
  { id: "bug", label: "Bug", icon: Bug, color: "text-red-500 bg-red-50 border-red-200" },
  {
    id: "fitur",
    label: "Fitur Baru",
    icon: Sparkles,
    color: "text-purple-500 bg-purple-50 border-purple-200",
  },
  {
    id: "tampilan",
    label: "Tampilan",
    icon: Paintbrush,
    color: "text-blue-500 bg-blue-50 border-blue-200",
  },
  {
    id: "performa",
    label: "Performa",
    icon: Gauge,
    color: "text-amber-500 bg-amber-50 border-amber-200",
  },
  {
    id: "lainnya",
    label: "Lainnya",
    icon: MoreHorizontal,
    color: "text-slate-500 bg-slate-50 border-slate-200",
  },
];

const emojis = [
  { value: 1, emoji: "😞", label: "Sangat Buruk" },
  { value: 2, emoji: "😕", label: "Buruk" },
  { value: 3, emoji: "😐", label: "Biasa" },
  { value: 4, emoji: "😊", label: "Baik" },
  { value: 5, emoji: "🤩", label: "Sangat Baik" },
];

const previousFeedback = [
  {
    id: 1,
    category: "Fitur Baru",
    message: "Mohon ditambahkan fitur export laporan ke PDF agar bisa dibagikan.",
    date: "15 Mei 2026",
    status: "Diproses" as const,
    rating: 4,
  },
  {
    id: 2,
    category: "Bug",
    message: "Grafik pendapatan tidak muncul ketika memilih filter bulan Maret.",
    date: "2 Apr 2026",
    status: "Selesai" as const,
    rating: 3,
  },
  {
    id: 3,
    category: "Tampilan",
    message: "Tampilan di mobile perlu perbaikan, beberapa tombol terlalu kecil.",
    date: "18 Mar 2026",
    status: "Ditinjau" as const,
    rating: 4,
  },
];

const statusStyles = {
  Diproses: {
    bg: "bg-blue-50 text-blue-600 border-blue-200",
    icon: Clock,
  },
  Selesai: {
    bg: "bg-green-50 text-green-600 border-green-200",
    icon: CheckCircle2,
  },
  Ditinjau: {
    bg: "bg-amber-50 text-amber-600 border-amber-200",
    icon: AlertCircle,
  },
};

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating > 0 && selectedCategory && message.trim()) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setSelectedCategory("");
        setMessage("");
      }, 3000);
    }
  };

  const activeEmoji = emojis.find((e) => e.value === (hoverRating || rating));

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
          <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
          </div>
          <span className="text-xs font-bold text-dashboard-gray uppercase tracking-widest">
            Hubungi Kami
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
          Masukan & Saran
        </h1>
        <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
          Bantu kami meningkatkan Karsafin dengan masukan berharga dari Anda.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Success State */}
          {submitted && (
            <div className="custom-card p-8 border-2 border-green-200 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">
                Terima kasih! 🎉
              </h3>
              <p className="text-sm text-dashboard-gray">
                Masukan Anda telah berhasil dikirim. Tim kami akan meninjau dan
                merespons sesegera mungkin.
              </p>
            </div>
          )}

          {/* Rating Section */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2">
              Penilaian Keseluruhan
            </h3>
            <p className="text-sm text-dashboard-gray mb-6">
              Bagaimana pengalaman Anda menggunakan Karsafin?
            </p>

            {/* Emoji Rating */}
            <div className="flex justify-center gap-3 sm:gap-5 mb-4">
              {emojis.map((item) => {
                const isActive = rating === item.value;
                const isHovered = hoverRating === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => setRating(item.value)}
                    onMouseEnter={() => setHoverRating(item.value)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer ${
                      isActive
                        ? "bg-dashboard-blue/10 scale-110"
                        : isHovered
                        ? "bg-slate-50 scale-105"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`text-4xl transition-transform ${
                        isActive ? "scale-110" : ""
                      }`}
                    >
                      {item.emoji}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeEmoji && (
              <p className="text-center text-sm font-bold text-slate-600">
                {activeEmoji.label}
              </p>
            )}

            {/* Star Rating */}
            <div className="flex justify-center gap-1 mt-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="cursor-pointer transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Category + Message */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2">
              Kategori
            </h3>
            <p className="text-sm text-dashboard-gray mb-5">
              Pilih kategori yang paling sesuai dengan masukan Anda.
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                      isActive
                        ? "bg-dashboard-blue text-white border-dashboard-blue shadow-md shadow-blue-200"
                        : `${cat.color} hover:shadow-sm`
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : ""}`} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2">
              Pesan Anda
            </h3>
            <p className="text-sm text-dashboard-gray mb-4">
              Jelaskan masukan atau saran Anda secara detail.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tuliskan masukan, saran, atau laporan bug Anda di sini..."
              rows={5}
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm resize-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-dashboard-blue/30 focus:border-dashboard-blue transition-all placeholder:text-slate-300 leading-relaxed"
            />

            {/* Character count */}
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-dashboard-gray">
                {message.length > 0 && `${message.length} karakter`}
              </p>
              <button
                onClick={handleSubmit}
                disabled={!(rating > 0 && selectedCategory && message.trim())}
                className={`px-8 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                  rating > 0 && selectedCategory && message.trim()
                    ? "bg-dashboard-blue text-white hover:bg-blue-700 shadow-blue-200 active:scale-[0.98]"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                }`}
              >
                <Send className="h-4 w-4" />
                Kirim Masukan
              </button>
            </div>
          </div>
        </div>

        {/* Right: Previous Feedback */}
        <div className="flex flex-col gap-6">
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
              Masukan Sebelumnya
            </h3>
            <div className="space-y-4">
              {previousFeedback.map((fb) => {
                const statusConfig = statusStyles[fb.status];
                const StatusIcon = statusConfig.icon;
                return (
                  <div
                    key={fb.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500">
                        {fb.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusConfig.bg}`}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {fb.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed mb-3 line-clamp-2">
                      {fb.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-dashboard-gray">{fb.date}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              s <= fb.rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="custom-card p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
            <div className="text-center">
              <span className="text-3xl mb-3 block">💬</span>
              <h4 className="font-bold text-slate-800 mb-1">
                Butuh bantuan langsung?
              </h4>
              <p className="text-xs text-dashboard-gray mb-4">
                Tim support kami siap membantu Anda kapan saja.
              </p>
              <Link
                href="/kontak-kami"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-dashboard-blue text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
              >
                Hubungi Kami
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
