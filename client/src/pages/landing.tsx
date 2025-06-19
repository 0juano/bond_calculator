import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useHotkeys } from "react-hotkeys-hook";
import { motion, AnimatePresence } from "framer-motion";
import { BondSearch } from "@/components/BondSearch";
import { SuggestedBonds } from "@/components/SuggestedBonds";

/**
 * Landing Page Component
 * Google-style hero search with suggested bonds
 * Separate from calculator to allow direct calculator access
 */
export default function Landing() {
  const [, setLocation] = useLocation();
  const heroSearchRef = useRef<HTMLInputElement>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        if (heroSearchRef.current) {
          heroSearchRef.current.focus();
          heroSearchRef.current.select();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Alternative hotkey implementation (keeping as backup)
  useHotkeys(['/', 'cmd+k', 'ctrl+k'], (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (heroSearchRef.current) {
      heroSearchRef.current.focus();
      if (heroSearchRef.current.value) {
        heroSearchRef.current.select();
      }
    }
    
    return false;
  }, {
    preventDefault: true,
    enableOnFormTags: false,
    enableOnContentEditable: false,
  });

  const handleBondSelect = (bondId: string) => {
    // Navigate to calculator with selected bond
    setLocation(`/calculator/${encodeURIComponent(bondId)}`);
  };

  const handleSearchChange = (query: string) => {
    // Show suggested bonds when user starts typing
    setHasSearched(query.length > 0);
  };

  return (
    <main className="fixed inset-0 top-[var(--topbar-h)] flex flex-col items-center justify-center px-4 overflow-hidden bg-gradient-to-br from-[#0a0f1c] via-[#111a2b] to-[#0a0f1c]">
      {/* Hero Section with Better Centering */}
      <div className="flex flex-col items-center justify-center mb-8 sm:mb-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-3xl text-center space-y-10"
        >
          {/* Title Section */}
          <div className="space-y-4 pt-8 sm:pt-0">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-terminal-accent leading-tight"
            >
              Bond Calculator
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-lg sm:text-xl md:text-2xl text-terminal-txt/60"
            >
              Professional fixed-income analysis
            </motion.p>
          </div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="w-full max-w-2xl mx-auto"
          >
            <BondSearch 
              ref={heroSearchRef}
              autoFocus
              onSelect={handleBondSelect}
              onChange={handleSearchChange}
              className="w-full"
            />
          </motion.div>

          {/* Helper Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="space-y-3"
          >
            <p className="text-base text-terminal-txt/40">
              Type ticker, CUSIP, or issuer name to begin bond analysis
            </p>
            <p className="text-sm text-terminal-txt/30">
              Press <kbd className="px-2 py-1 bg-terminal-panel/50 border border-terminal-line/50 rounded text-xs">⁄</kbd> or <kbd className="px-2 py-1 bg-terminal-panel/50 border border-terminal-line/50 rounded text-xs">⌘K</kbd> to focus search
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Progressive Disclosure - Show Suggested Bonds Initially */}
      <AnimatePresence>
        {!hasSearched && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="mt-12 lg:absolute lg:bottom-8 px-4 w-full"
          >
            <div className="max-w-4xl mx-auto">
              <SuggestedBonds onSelect={handleBondSelect} />
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}