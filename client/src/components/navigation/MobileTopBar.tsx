import { Menu } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Calculator, Hammer, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * Mobile-first top navigation bar with hamburger menu
 * Only visible on mobile breakpoints (<640px)
 */
export const MobileTopBar = () => {
  const [location] = useLocation();

  return (
    <header className="fixed top-0 w-full z-50 bg-terminal-bg/90 backdrop-blur border-b border-terminal-line sm:hidden">
      <div className="flex items-center justify-between px-4 py-3 h-[var(--nav-height-mobile)]">
        <div className="text-lg font-semibold text-terminal-accent">
          <Link href="/">
            <a className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              <span>BondTerminal</span>
            </a>
          </Link>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="menu-trigger text-terminal-txt hover:text-terminal-accent">
              <Menu size={20} />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 bg-terminal-bg border-terminal-line">
            <SheetHeader>
              <SheetTitle className="text-terminal-accent">Navigation</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 mt-6">
              <Link href="/calculator">
                <a className={cn(
                  "flex items-center gap-3 px-4 py-4 rounded-md transition-colors text-base font-medium touch-target",
                  location.startsWith("/calculator")
                    ? "bg-terminal-orange/20 text-terminal-orange"
                    : "text-terminal-txt/70 hover:text-terminal-accent hover:bg-terminal-accent/10"
                )}>
                  <Calculator className="w-5 h-5" />
                  <span>Calculator</span>
                </a>
              </Link>
              
              <Link href="/builder">
                <a className={cn(
                  "flex items-center gap-3 px-4 py-4 rounded-md transition-colors text-base font-medium touch-target",
                  location === "/builder"
                    ? "bg-terminal-orange/20 text-terminal-orange"
                    : "text-terminal-txt/70 hover:text-terminal-accent hover:bg-terminal-accent/10"
                )}>
                  <Hammer className="w-5 h-5" />
                  <span>Builder</span>
                </a>
              </Link>
              
              <Link href="/comparables">
                <a className={cn(
                  "flex items-center gap-3 px-4 py-4 rounded-md transition-colors text-base font-medium touch-target",
                  location === "/comparables"
                    ? "bg-terminal-orange/20 text-terminal-orange"
                    : "text-terminal-txt/70 hover:text-terminal-accent hover:bg-terminal-accent/10"
                )}>
                  <BarChart2 className="w-5 h-5" />
                  <span>Comparables</span>
                </a>
              </Link>
              
              <Link href="/">
                <a className={cn(
                  "flex items-center gap-3 px-4 py-4 rounded-md transition-colors text-base font-medium touch-target",
                  location === "/"
                    ? "bg-terminal-orange/20 text-terminal-orange"
                    : "text-terminal-txt/70 hover:text-terminal-accent hover:bg-terminal-accent/10"
                )}>
                  <span>Home</span>
                </a>
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};