import { TopNavigation } from "@/components/TopNavigation";
import { LeftSidebar } from "@/components/LeftSidebar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GuidedTour } from "@/components/GuidedTour";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative">
      <TopNavigation />
      <LeftSidebar />
      <BottomNavigation />
      <GuidedTour />
      <main className="min-h-screen pt-20 pb-32 px-4 sm:px-6 lg:px-8 lg:ml-20">
        {children}
      </main>
    </div>
  );
}
