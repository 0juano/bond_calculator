import { ReactNode } from "react";

interface HeroLayoutProps {
  children: ReactNode;
  suggestedBonds?: ReactNode;
}

/**
 * Hero Layout Component
 * Centers content vertically in the viewport minus TopBar height
 * Used for Google-style landing page with centered search
 */
export function HeroLayout({ children, suggestedBonds }: HeroLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-var(--topbar-h))] flex flex-col items-center justify-center gap-6 px-4">
      {children}
      
      {/* Tagline */}
      <p className="text-sm text-terminal-txt/60 text-center max-w-md">
        Type ticker, CUSIP, or issuer name to begin bond analysis
      </p>
      
      {/* Suggested Bonds */}
      {suggestedBonds && (
        <div className="mt-4">
          {suggestedBonds}
        </div>
      )}
      
      {/* Keyboard hint */}
      <div className="text-xs text-terminal-txt/40 text-center">
        <span className="inline-flex items-center gap-1">
          Press <kbd className="px-2 py-1 bg-terminal-panel border border-terminal-line rounded text-terminal-txt">/</kbd> to focus search
        </span>
      </div>
    </div>
  );
}