import { Link, useLocation } from "wouter";
import { Calculator, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar() {
  const [location] = useLocation();
  
  return (
    <header className="fixed top-0 left-0 right-0 h-[var(--topbar-h)] z-50 bg-terminal-bg/80 backdrop-blur-sm border-b border-terminal-line">
      <div className="h-full px-4 mx-auto max-w-7xl flex items-center justify-between">
        {/* Logo/Brand - Fixed width */}
        <div className="flex-basis-[200px] min-w-[200px]">
          <Link href="/">
            <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-terminal-accent/10 rounded-md flex items-center justify-center">
                <Calculator className="w-5 h-5 text-terminal-accent" />
              </div>
              <span className="text-base font-semibold text-terminal-txt">Bond Calculator</span>
            </a>
          </Link>
        </div>
        
        {/* Navigation - Fixed width container */}
        <nav className="flex items-center gap-4 min-w-[240px] justify-end">
          <Link href="/calculator">
            <a className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium min-w-[100px] justify-center",
              location.startsWith("/calculator")
                ? "bg-terminal-accent/20 text-terminal-accent"
                : "text-terminal-txt/70 hover:text-terminal-accent hover:bg-terminal-accent/10"
            )}>
              <Calculator className="w-4 h-4" />
              <span>Calculator</span>
            </a>
          </Link>
          
          <Link href="/builder">
            <a className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium min-w-[100px] justify-center",
              location === "/builder"
                ? "bg-terminal-accent/20 text-terminal-accent"
                : "text-terminal-txt/70 hover:text-terminal-accent hover:bg-terminal-accent/10"
            )}>
              <Hammer className="w-4 h-4" />
              <span>Builder</span>
            </a>
          </Link>
        </nav>
      </div>
    </header>
  );
}