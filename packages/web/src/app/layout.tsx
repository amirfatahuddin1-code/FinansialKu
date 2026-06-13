import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Karsafin - Personal Finance Dashboard",
  description: "Pantau kesehatan portofolio keuangan Anda, cek efisiensi pengeluaran harian, dan susun prioritas tabungan dari satu pusat kendali.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/karsafin-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/karsafin-logo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/karsafin-logo.png",
    apple: "/karsafin-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Karsafin",
  },
};

import { AppProviders } from "@/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)] selection:bg-blue-100" suppressHydrationWarning>
        <AppProviders>
          {children}
        </AppProviders>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('Karsafin PWA: Service Worker registered', reg.scope);
                  }).catch(function(err) {
                    console.warn('Karsafin PWA: Service Worker registration failed', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
