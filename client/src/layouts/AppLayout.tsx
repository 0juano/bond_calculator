import { ReactNode } from "react";
import { TopBar } from "@/components/TopBar";
import { MobileTopBar } from "@/components/navigation/MobileTopBar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      {/* Desktop navigation */}
      <TopBar />
      {/* Mobile navigation */}
      <MobileTopBar />
      <main className="pt-[var(--topbar-h)] min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="px-4 pb-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </>
  );
}