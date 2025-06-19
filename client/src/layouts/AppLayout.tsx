import { ReactNode } from "react";
import { useLocation } from "wouter";
import { TopBar } from "@/components/TopBar";
import { MobileTopBar } from "@/components/navigation/MobileTopBar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const isLanding = location === "/";
  const isCalculator = location.startsWith("/calculator");
  
  return (
    <div className={isLanding || isCalculator ? "no-scroll-desktop" : ""}>
      {/* Desktop navigation */}
      <TopBar />
      {/* Mobile navigation */}
      <MobileTopBar />
      {(isLanding || isCalculator) ? (
        // Landing and Calculator pages without wrapper
        children
      ) : (
        // Other pages with normal layout
        <main className="pt-[var(--topbar-h)] min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="px-4 pb-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      )}
    </div>
  );
}