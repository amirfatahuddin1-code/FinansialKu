import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Karsafin — Kelola Keuangan Pribadi Cerdas",
  description:
    "Pantau portofolio, kendalikan pengeluaran, dan capai target tabungan Anda dari satu dasbor keuangan pintar. Gratis untuk memulai.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
