"use client";

import { usePathname } from "next/navigation";

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <div key={pathname} className="animate-fade-in-up">
      {children}
    </div>
  );
}
