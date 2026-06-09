"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Mail, MessageSquare, Phone, MapPin, Send, Clock } from "lucide-react";

export default function KontakKamiPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-dashboard-gray hover:text-dashboard-blue transition-colors mb-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Link>

        <div className="custom-card p-6 sm:p-10 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0">
              <MessageSquare className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                Kontak Kami
              </h1>
              <p className="text-xs font-semibold text-dashboard-gray uppercase tracking-widest mt-1">
                Kami siap membantu Anda
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="custom-card p-6 text-center hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Mail className="h-6 w-6 text-dashboard-blue" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Email</h3>
            <p className="text-sm text-dashboard-gray">support@karsafin.com</p>
          </div>
          <div className="custom-card p-6 text-center hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Telepon</h3>
            <p className="text-sm text-dashboard-gray">+62 812-3456-7890</p>
          </div>
          <div className="custom-card p-6 text-center hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Jam Operasional</h3>
            <p className="text-sm text-dashboard-gray">Sen-Jum 09:00 - 17:00</p>
          </div>
        </div>

        <div className="custom-card p-5 sm:p-8">
          <h2 className="font-black text-xl text-slate-800 mb-6">
            Kirim Pesan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Nama
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/20 focus:border-dashboard-blue transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/20 focus:border-dashboard-blue transition-all"
              />
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Subjek
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Tentang apa?"
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/20 focus:border-dashboard-blue transition-all"
            />
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Pesan
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis pesan Anda..."
              rows={5}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-dashboard-blue/20 focus:border-dashboard-blue transition-all resize-none"
            />
          </div>
          <button className="bg-dashboard-blue text-white rounded-2xl px-8 py-4 font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer">
            <Send className="h-4 w-4" />
            Kirim Pesan
          </button>
        </div>
      </div>
    </div>
  );
}
