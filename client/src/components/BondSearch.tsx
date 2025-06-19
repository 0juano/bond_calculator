import { useState, useEffect, useRef, forwardRef } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Search, User, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface BondOption {
  id: string;
  filename?: string;
  category: 'user_created' | 'golden_bonds' | 'imported';
  metadata?: {
    name: string;
    issuer: string;
    couponRate: number;
    maturityDate: string;
    created: string;
    source: string;
  };
  bondInfo?: {
    issuer: string;
    couponRate: number;
    maturityDate: string;
  };
  // For golden bonds
  name?: string;
  description?: string;
}

interface BondSearchProps {
  selectedBond?: BondOption | null;
  onSelect: (bondId: string) => void;
  onChange?: (query: string) => void;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Standalone Bond Search Component
 * Clean, reusable search input with dropdown for bond selection
 */
export const BondSearch = forwardRef<HTMLInputElement, BondSearchProps>(({ 
  selectedBond, 
  onSelect, 
  onChange,
  autoFocus = false,
  className 
}, ref) => {
  const [, setLocation] = useLocation();
  const [bonds, setBonds] = useState<BondOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredBonds, setFilteredBonds] = useState<BondOption[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [width, setWidth] = useState(window.innerWidth);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track window width for responsive placeholder
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && ref && 'current' in ref && ref.current) {
      ref.current.focus();
    }
  }, [autoFocus, ref]);

  // Load available bonds
  useEffect(() => {
    loadAvailableBonds();
  }, []);

  // Filter bonds based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBonds([]); // Show nothing when no search query
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = bonds.filter(bond => {
        const issuer = (bond.metadata?.issuer || bond.bondInfo?.issuer || bond.name || '').toLowerCase();
        const couponRate = (bond.metadata?.couponRate || bond.bondInfo?.couponRate || 0).toString();
        const maturityYear = bond.metadata?.maturityDate || bond.bondInfo?.maturityDate;
        const year = maturityYear ? new Date(maturityYear).getFullYear().toString() : '';
        const category = bond.category;
        
        return issuer.includes(query) || 
               couponRate.includes(query) || 
               year.includes(query) ||
               category.includes(query);
      }).slice(0, 8); // Limit to 8 results
      
      setFilteredBonds(filtered);
    }
    setHighlightedIndex(-1);
  }, [searchQuery, bonds]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => 
            prev < filteredBonds.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && filteredBonds[highlightedIndex]) {
            handleBondSelect(filteredBonds[highlightedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (ref && 'current' in ref && ref.current) {
            ref.current.focus();
          }
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredBonds]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAvailableBonds = async () => {
    setIsLoading(true);
    try {
      const bondOptions: BondOption[] = [];

      // Load saved bonds
      try {
        const savedResponse = await apiRequest("GET", "/api/bonds/saved");
        const savedData = await savedResponse.json();
        
        const savedBonds: BondOption[] = savedData.bonds.map((bond: any) => ({
          id: bond.metadata.id,
          filename: bond.filename,
          category: bond.category as 'user_created' | 'golden_bonds' | 'imported',
          metadata: bond.metadata,
          bondInfo: bond.bondInfo,
        }));
        
        bondOptions.push(...savedBonds);
      } catch (error) {
        console.warn("Failed to load saved bonds:", error);
      }

      setBonds(bondOptions);
    } catch (error) {
      console.error("Failed to load bonds:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBondSelect = (bondId: string) => {
    onSelect(bondId);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    onChange?.(value);
  };

  const formatBondDisplay = (bond: BondOption): string => {
    const issuer = bond.metadata?.issuer || bond.bondInfo?.issuer || bond.name || 'Unknown';
    const coupon = bond.metadata?.couponRate || bond.bondInfo?.couponRate || 0;
    const maturityYear = bond.metadata?.maturityDate || bond.bondInfo?.maturityDate;
    const year = maturityYear ? new Date(maturityYear).getFullYear() : 'Unknown';
    
    // Use ticker format for Argentina bonds
    if (issuer === 'REPUBLIC OF ARGENTINA' && bond.metadata?.name) {
      return bond.metadata.name; // This is the ticker format like "ARGENT 5 38"
    }
    
    return `${issuer} ${coupon}% ${year}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user_created':
        return <User className="h-3 w-3 text-blue-400" />;
      case 'imported':
        return <FileText className="h-3 w-3 text-purple-400" />;
      default:
        return null;
    }
  };

  const placeholder =
    width < 400
      ? "Search bonds…"
      : width < 640
      ? "Ticker / CUSIP / Issuer"
      : "Search bonds by ticker, CUSIP, or issuer name";

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 sm:left-4 md:left-5 top-1/2 transform -translate-y-1/2 h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-terminal-txt/60 z-10" />
        <Input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          tabIndex={0}
          className={cn(
            "h-12 sm:h-14 md:h-16 pl-10 sm:pl-12 md:pl-14 pr-4 rounded-full",
            "border-terminal-line bg-terminal-panel/50 backdrop-blur-sm",
            "text-terminal-accent placeholder:text-terminal-txt/50 text-base sm:text-lg md:text-xl",
            "focus:ring-2 focus:ring-terminal-accent/50 focus:border-terminal-accent/50",
            "transition-all duration-200",
            "shadow-lg shadow-black/20",
            !searchQuery && "caret" // Apply caret animation when empty
          )}
          disabled={isLoading}
        />
      </div>
      
      {/* Dropdown Results */}
      {isOpen && (searchQuery.trim() || isLoading || filteredBonds.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-terminal-panel/95 backdrop-blur-sm border border-terminal-line rounded-lg shadow-xl max-h-[400px] overflow-y-auto z-50 terminal-scrollbar">
          {isLoading ? (
            <div className="p-4 text-center text-terminal-txt/60">
              Loading bonds...
            </div>
          ) : filteredBonds.length === 0 ? (
            <div className="p-4 text-center text-terminal-txt/60">
              {searchQuery ? `No bonds found matching "${searchQuery}"` : "Start typing to search bonds..."}
            </div>
          ) : (
            filteredBonds.map((bond, index) => (
              <button
                key={bond.id}
                onClick={() => handleBondSelect(bond.id)}
                className={cn(
                  "w-full text-left p-4 hover:bg-gray-700/50 transition-colors",
                  "border-b border-terminal-line/50 last:border-b-0",
                  index === highlightedIndex && "bg-gray-700/50",
                  bond.id === selectedBond?.id && "bg-green-900/20 border-green-600"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-terminal-accent text-sm mb-1">
                      {formatBondDisplay(bond)}
                    </div>
                    <div className="text-xs text-terminal-txt/60 flex items-center gap-2">
                      {getCategoryIcon(bond.category)}
                      <span>{bond.category === 'user_created' ? 'User Created' : 'Imported'}</span>
                    </div>
                  </div>
                  {bond.id === selectedBond?.id && (
                    <div className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                      Current
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
});

BondSearch.displayName = 'BondSearch';