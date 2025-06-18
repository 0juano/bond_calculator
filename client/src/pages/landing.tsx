import { useRef } from "react";
import { useLocation } from "wouter";
import { useHotkeys } from "react-hotkeys-hook";
import { BondSearch } from "@/components/BondSearch";
import { HeroLayout } from "@/components/calculator/HeroLayout";
import { SuggestedBonds } from "@/components/SuggestedBonds";

/**
 * Landing Page Component
 * Google-style hero search with suggested bonds
 * Separate from calculator to allow direct calculator access
 */
export default function Landing() {
  const [, setLocation] = useLocation();
  const heroSearchRef = useRef<HTMLInputElement>(null);

  // Global hotkey for search focus
  useHotkeys('/', (e) => {
    e.preventDefault();
    if (heroSearchRef.current) {
      heroSearchRef.current.focus();
    }
  }, { enableOnContentEditable: true, enableOnFormTags: true });

  const handleBondSelect = (bondId: string) => {
    // Navigate to calculator with selected bond
    setLocation(`/calculator/${encodeURIComponent(bondId)}`);
  };

  const handleSearchChange = (query: string) => {
    // Could add analytics here if needed
  };

  return (
    <>
      <HeroLayout>
        <BondSearch 
          ref={heroSearchRef}
          autoFocus
          onSelect={handleBondSelect}
          onChange={handleSearchChange}
          className="w-full"
        />
      </HeroLayout>
      
      {/* Suggested bonds in separate content section */}
      <section className="py-8 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <SuggestedBonds onSelect={handleBondSelect} />
        </div>
      </section>
    </>
  );
}