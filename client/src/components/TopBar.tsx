import { Link, useLocation } from "wouter";
import { Calculator, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar() {
  const [location] = useLocation();
  
  return (
    <header className="fixed top-0 left-0 right-0 h-[var(--topbar-h)] z-50 bg-black/80 backdrop-blur-sm border-b border-green-900/30">
      <div className="h-full px-4 mx-auto max-w-7xl flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
            <Calculator className="w-5 h-5 text-green-500" />
          </div>
          <span className="text-lg font-semibold text-gray-100">Bond Calculator</span>
        </div>
        
        {/* Navigation */}
        <nav className="flex items-center gap-6">
          <Link href="/">
            <a className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
              location === "/" || location.startsWith("/calculator")
                ? "bg-green-900/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                : "text-gray-500 hover:text-green-400 hover:bg-green-900/10"
            )}>
              <Calculator className="w-4 h-4" />
              <span className="text-sm font-medium">Calculator</span>
            </a>
          </Link>
          
          <Link href="/builder">
            <a className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
              location === "/builder"
                ? "bg-green-900/20 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                : "text-gray-500 hover:text-green-400 hover:bg-green-900/10"
            )}>
              <Hammer className="w-4 h-4" />
              <span className="text-sm font-medium">Builder</span>
            </a>
          </Link>
        </nav>
      </div>
    </header>
  );
}