import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl mb-8">Halaman tidak ditemukan</p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
