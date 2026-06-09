import Link from "next/link";
import { ChevronLeft, Shield, FileText, Users, Database, Globe, Lock, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Syarat & Ketentuan - Karsafin",
  description: "Syarat dan Ketentuan penggunaan layanan Karsafin.",
};

const sections = [
  {
    icon: FileText,
    title: "1. Penerimaan Ketentuan",
    content:
      "Dengan mengakses dan menggunakan layanan Karsafin, Anda menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju dengan bagian mana pun dari ketentuan ini, Anda tidak diperkenankan menggunakan layanan kami.",
  },
  {
    icon: Users,
    title: "2. Akun Pengguna",
    content:
      "Anda bertanggung jawab untuk menjaga kerahasiaan akun dan kata sandi Anda. Anda setuju untuk menerima tanggung jawab atas semua aktivitas yang terjadi di bawah akun Anda. Setiap pengguna hanya diperbolehkan memiliki satu akun aktif.",
  },
  {
    icon: Database,
    title: "3. Penggunaan Data",
    content:
      "Data keuangan yang Anda masukkan ke dalam Karsafin disimpan secara aman dan terenkripsi. Kami tidak akan membagikan data pribadi Anda kepada pihak ketiga tanpa persetujuan Anda, kecuali diwajibkan oleh hukum yang berlaku.",
  },
  {
    icon: Globe,
    title: "4. Layanan & Ketersediaan",
    content:
      "Kami berusaha menyediakan layanan 24/7, namun tidak menjamin ketersediaan tanpa gangguan. Kami berhak melakukan pemeliharaan berkala yang dapat menyebabkan gangguan sementara pada layanan.",
  },
  {
    icon: Lock,
    title: "5. Keamanan",
    content:
      "Kami menerapkan langkah-langkah keamanan tingkat industri untuk melindungi data Anda, termasuk enkripsi end-to-end, autentikasi multi-faktor, dan audit keamanan berkala.",
  },
  {
    icon: AlertTriangle,
    title: "6. Batasan Tanggung Jawab",
    content:
      "Karsafin adalah alat bantu pencatatan keuangan dan bukan merupakan penasihat keuangan. Segala keputusan keuangan yang Anda buat berdasarkan informasi dari aplikasi ini sepenuhnya menjadi tanggung jawab Anda.",
  },
];

export default function SyaratKetentuanPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-dashboard-gray hover:text-dashboard-blue transition-colors mb-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Kembali
        </Link>

        {/* Header */}
        <div className="custom-card p-6 sm:p-10 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-dashboard-blue/10 rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="h-6 w-6 text-dashboard-blue" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                Syarat & Ketentuan
              </h1>
              <p className="text-xs font-semibold text-dashboard-gray uppercase tracking-widest mt-1">
                Terakhir diperbarui: 1 Mei 2026
              </p>
            </div>
          </div>
          <p className="text-sm text-dashboard-gray leading-relaxed">
            Dokumen ini menjelaskan syarat dan ketentuan penggunaan layanan
            Karsafin. Harap baca dengan seksama sebelum menggunakan aplikasi kami.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title} className="custom-card p-5 sm:p-8 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100">
                    <Icon className="h-5 w-5 text-dashboard-blue" />
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-slate-800 mb-3">
                      {section.title}
                    </h2>
                    <p className="text-sm text-dashboard-gray leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
