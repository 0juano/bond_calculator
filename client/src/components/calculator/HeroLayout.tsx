import { ReactNode } from "react";

interface HeroLayoutProps {
  children: ReactNode;
}

/**
 * Hero Layout Component
 * Centers content vertically in the viewport minus TopBar height
 * Used for Google-style landing page with centered search
 */
export function HeroLayout({ children }: HeroLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-var(--topbar-h))] flex flex-col items-center justify-center gap-6 px-4">
      {children}
      
      {/* Tagline */}
      <p className="text-sm text-slate-400 text-center max-w-md">
        Type ticker, CUSIP, or issuer name to begin bond analysis
      </p>
      
      {/* Keyboard hint */}
      <div className="text-xs text-gray-500 text-center">
        <span className="inline-flex items-center gap-1">
          Press <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-300">/</kbd> to focus search
        </span>
      </div>
    </div>
  );
}