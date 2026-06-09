"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Info,
  Check,
  Save,
  Wallet,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";

export default function IncomeDatePage() {
  const [selectedDay, setSelectedDay] = useState(25);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
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
          <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-green-500" />
          </div>
          <span className="text-xs font-bold text-dashboard-gray uppercase tracking-widest">
            Konfigurasi
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">
          Atur Tanggal Pemasukan
        </h1>
        <p className="text-dashboard-gray text-lg mt-2 max-w-xl">
          Tentukan tanggal gajian bulanan Anda untuk perhitungan budget yang lebih akurat.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info + Picker */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Info Banner */}
          <div className="custom-card p-6 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-dashboard-blue/10 rounded-xl flex items-center justify-center shrink-0">
                <Info className="h-5 w-5 text-dashboard-blue" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">
                  Mengapa tanggal pemasukan penting?
                </h3>
                <p className="text-sm text-dashboard-gray leading-relaxed">
                  Dengan mengetahui tanggal gajian Anda, Karsafin dapat menghitung sisa
                  budget harian secara otomatis, mengirim pengingat tagihan tepat waktu,
                  dan menghasilkan laporan keuangan yang sesuai dengan siklus pendapatan
                  Anda.
                </p>
              </div>
            </div>
          </div>

          {/* Day Picker */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-2">
              Pilih Tanggal
            </h3>
            <p className="text-sm text-dashboard-gray mb-6">
              Klik tanggal di bawah untuk mengatur kapan Anda menerima gaji setiap
              bulannya.
            </p>

            <div className="grid grid-cols-7 gap-2.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const isSelected = day === selectedDay;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative aspect-square rounded-2xl flex items-center justify-center text-sm font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-dashboard-blue text-white shadow-lg shadow-blue-200 scale-110 z-10"
                        : "bg-slate-50 text-slate-600 border border-slate-100 hover:bg-blue-50 hover:text-dashboard-blue hover:border-blue-200 hover:scale-105"
                    }`}
                  >
                    {day}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center border-2 border-white">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Special dates info */}
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-700">
                <span className="font-bold">Catatan:</span> Jika Anda memilih tanggal
                29, 30, atau 31 dan bulan tersebut tidak memiliki tanggal itu, sistem
                akan menggunakan tanggal terakhir bulan tersebut.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Current Setting + Summary */}
        <div className="flex flex-col gap-6">
          {/* Current Setting */}
          <div className="custom-card p-8">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-6">
              Pengaturan Saat Ini
            </h3>
            <div className="bg-gradient-to-br from-dashboard-blue to-blue-600 rounded-2xl p-6 text-white text-center shadow-xl shadow-blue-200">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarCheck className="h-7 w-7 text-white" />
              </div>
              <p className="text-sm font-medium text-blue-100 mb-1">
                Pemasukan diterima setiap
              </p>
              <p className="text-5xl font-black mb-1">{selectedDay}</p>
              <p className="text-sm font-bold text-blue-200">
                setiap bulannya
              </p>
            </div>

            {/* Timeline */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Wallet className="h-4 w-4 text-green-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Pemasukan Berikutnya
                  </p>
                  <p className="text-[10px] text-dashboard-gray">
                    {selectedDay} Juni 2026
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Sisa Hari Budget
                  </p>
                  <p className="text-[10px] text-dashboard-gray">
                    {selectedDay > 0 ? selectedDay - 1 : 30} hari tersisa
                  </p>
                </div>
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

          {/* Tip */}
          <div className="custom-card p-6">
            <h3 className="text-xs font-black text-dashboard-gray uppercase tracking-widest mb-3">
              💡 Tips
            </h3>
            <p className="text-sm text-dashboard-gray leading-relaxed">
              Atur tanggal pemasukan agar Karsafin bisa menghitung budget harian Anda
              secara otomatis. Misalnya, jika gajian tanggal 25, budget dihitung dari
              tanggal 25 bulan ini hingga tanggal 24 bulan depan.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
