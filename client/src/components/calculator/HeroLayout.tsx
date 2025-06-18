import { ReactNode } from "react";

interface HeroLayoutProps {
  children: ReactNode;
  suggestedBonds?: ReactNode;
}

/**
 * Hero Layout Component  
 * Optimized hero area with better proportions for mobile-first design
 * 40% height gradient background with search positioned below logo area
 */
export function HeroLayout({ children, suggestedBonds }: HeroLayoutProps) {
  return (
    <div className="hero min-h-[40vh] bg-gradient-to-br from-[#0a0f1c] to-[#111a2b] flex flex-col justify-start pt-[calc(var(--topbar-h)+2rem)]">
      {/* Logo/Brand Area */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-terminal-accent mb-2">Bond Calculator</h1>
        <p className="text-sm text-terminal-txt/60">Professional fixed-income analysis</p>
      </div>
      
      {/* Search container with mobile-first responsive width */}
      <div className="w-[88%] lg:w-1/2 mx-auto mb-6">
        {children}
      </div>
      
      {/* Tagline */}
      <p className="text-sm text-terminal-txt/60 text-center max-w-md mx-auto mb-8 px-4">
        Type ticker, CUSIP, or issuer name to begin bond analysis
      </p>
      
      {/* Keyboard hint - hide on mobile */}
      <div className="text-xs text-terminal-txt/40 text-center hidden sm:block mb-8">
        <span className="inline-flex items-center gap-1">
          Press <kbd className="px-2 py-1 bg-terminal-panel border border-terminal-line rounded text-terminal-txt">/</kbd> to focus search
        </span>
      </div>
      
      {/* Suggested Bonds - Now in separate content area */}
    </div>
  );
}