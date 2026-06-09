"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Calendar,
  Repeat,
  User,
  Settings,
} from "lucide-react";

const sidebarItems = [
  { icon: LayoutGrid, href: "/dashboard", title: "Dashboard", active: true },
  { icon: Calendar, href: "/dashboard/planning/events", title: "Event" },
  { icon: Repeat, href: "/dashboard/routine-expenses", title: "Pengeluaran Rutin" },
  { icon: User, href: "/dashboard/financial-profile", title: "Profil Keuangan" },
];

export function LeftSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside id="tour-left-sidebar" className="fixed left-4 top-24 z-50 hidden lg:flex flex-col gap-4 p-2 floating-nav rounded-3xl">
      {sidebarItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-icon-btn ${
              active
                ? "bg-dashboard-blue text-white shadow-lg shadow-blue-500/20"
                : "text-dashboard-gray"
            }`}
            title={item.title}
          >
            <Icon className="h-6 w-6" />
          </Link>
        );
      })}
      <Link
        href="/dashboard/settings"
        className={`sidebar-icon-btn ${
          pathname.startsWith("/dashboard/settings")
            ? "bg-dashboard-blue text-white shadow-lg shadow-blue-500/20"
            : "text-dashboard-gray"
        }`}
        title="Pengaturan"
      >
        <Settings className="h-6 w-6" />
      </Link>
    </aside>
  );
}
