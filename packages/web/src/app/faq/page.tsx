"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

const faqItems = [
  {
    question: "Apa itu Karsafin?",
    answer:
      "Karsafin adalah aplikasi manajemen keuangan pribadi yang membantu Anda mencatat pemasukan, pengeluaran, dan tabungan secara otomatis. Dilengkapi dengan fitur AI untuk analisis dan saran keuangan yang dipersonalisasi.",
  },
  {
    question: "Apakah data keuangan saya aman?",
    answer:
      "Ya, keamanan adalah prioritas utama kami. Semua data dienkripsi menggunakan standar AES-256 dan disimpan di server bersertifikasi internasional. Kami tidak pernah membagikan data Anda kepada pihak ketiga.",
  },
  {
    question: "Bagaimana cara menambah akun keuangan baru?",
    answer:
      "Buka menu Pengaturan > Akun Keuangan > Tambah Akun. Pilih jenis akun (Bank, E-Wallet, Investasi, atau Tunai), masukkan nama dan saldo awal, lalu simpan.",
  },
  {
    question: "Apa perbedaan paket Basic dan Pro?",
    answer:
      "Paket Basic menyediakan pencatatan transaksi dasar dan laporan bulanan. Paket Pro menambahkan fitur AI assistant, analisis lanjutan, workspace keluarga, integrasi Telegram, dan tanpa batasan jumlah transaksi.",
  },
  {
    question: "Bagaimana cara menggunakan fitur AI?",
    answer:
      "Buka tab AI di menu utama, ketik pertanyaan keuangan Anda, dan AI akan memberikan analisis serta saran. Anda memiliki kuota pertanyaan harian yang bisa ditambah dengan menonton iklan atau upgrade ke Pro.",
  },
  {
    question: "Bisakah saya mengelola keuangan bersama keluarga?",
    answer:
      "Ya! Dengan fitur Workspace Keluarga, Anda bisa mengundang anggota keluarga untuk bersama-sama mencatat dan memantau keuangan. Setiap anggota memiliki peran (Owner, Admin, Member) dengan hak akses berbeda.",
  },
  {
    question: "Bagaimana cara menghubungkan Telegram?",
    answer:
      "Buka Pengaturan > Integrasi > Telegram, lalu ikuti langkah-langkah yang ditampilkan: buka bot @FinanzaidBot, kirim /start, dan masukkan Telegram ID Anda.",
  },
  {
    question: "Bagaimana cara menghapus akun saya?",
    answer:
      "Buka Pengaturan > Akun > Hapus Akun. Tindakan ini bersifat permanen dan akan menghapus semua data keuangan Anda. Kami menyarankan untuk mengekspor data terlebih dahulu.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-dashboard-gray hover:text-dashboard-blue transition-colors mb-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Link>

        <div className="custom-card p-10 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">
                Pertanyaan Umum
              </h1>
              <p className="text-xs font-semibold text-dashboard-gray uppercase tracking-widest mt-1">
                FAQ - Frequently Asked Questions
              </p>
            </div>
          </div>
          <p className="text-sm text-dashboard-gray leading-relaxed">
            Temukan jawaban untuk pertanyaan yang sering diajukan tentang
            layanan Karsafin.
          </p>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="custom-card overflow-hidden hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
              >
                <span className="font-bold text-slate-800 pr-4">
                  {item.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="h-5 w-5 text-dashboard-blue shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-dashboard-gray shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6 -mt-1">
                  <p className="text-sm text-dashboard-gray leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
