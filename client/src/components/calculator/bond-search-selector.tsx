import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  Calendar, 
  Percent, 
  Search, 
  ChevronDown,
  ChevronUp,
  Star,
  User,
  FileText
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

interface BondSearchSelectorProps {
  currentBondId?: string;
  currentBondData?: {
    issuer: string;
    couponRate: number;
    maturityDate: string;
    isin?: string;
  };
}

/**
 * Bond Search Selector Component
 * Provides search-based bond selection with auto-complete functionality
 */
export function BondSearchSelector({ currentBondId, currentBondData }: BondSearchSelectorProps) {
  const [, setLocation] = useLocation();
  const [bonds, setBonds] = useState<BondOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredBonds, setFilteredBonds] = useState<BondOption[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available bonds
  useEffect(() => {
    loadAvailableBonds();
  }, []);

  // Filter bonds based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBonds(bonds.slice(0, 10)); // Show first 10 bonds when no search
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
      }).slice(0, 10); // Limit to 10 results
      
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
          setIsOpen(false);
          setSearchQuery("");
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
        setSearchQuery("");
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

      // Skip loading golden bonds - user only wants saved bonds

      setBonds(bondOptions);
    } catch (error) {
      console.error("Failed to load bonds:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBondSelect = (bondId: string) => {
    if (bondId === currentBondId) return;
    
    // Navigate to the selected bond
    setLocation(`/calculator/${encodeURIComponent(bondId)}`);
    setIsOpen(false);
    setSearchQuery("");
  };

  const formatBondDisplay = (bond: BondOption): string => {
    const issuer = bond.metadata?.issuer || bond.bondInfo?.issuer || bond.name || 'Unknown';
    const coupon = bond.metadata?.couponRate || bond.bondInfo?.couponRate || 0;
    const maturityYear = bond.metadata?.maturityDate || bond.bondInfo?.maturityDate;
    const year = maturityYear ? new Date(maturityYear).getFullYear() : 'Unknown';
    
    return `${issuer} ${coupon}% ${year}`;
  };

  const formatBondSubtitle = (bond: BondOption): string => {
    const category = bond.category === 'user_created' ? 'User Created' : 'Imported';
    return bond.description || `${category} Bond`;
  };

  const getCurrentBondDisplay = (): string => {
    if (currentBondData) {
      const year = new Date(currentBondData.maturityDate).getFullYear();
      return `📊 ${currentBondData.issuer} ${currentBondData.couponRate}% ${year}`;
    }
    return "📊 Select Bond";
  };

  const getCurrentBondSubtitle = (): string => {
    return currentBondData?.isin || "Choose a bond to analyze";
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

  return (
    <Card className="bg-gray-900 border-green-600">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-green-400 mb-1">
              {getCurrentBondDisplay()}
            </h1>
            <p className="text-sm text-gray-400">
              {getCurrentBondSubtitle()}
            </p>
          </div>
          
          <div className="ml-4 relative" ref={dropdownRef}>
            <div className="relative">
              <Input
                ref={searchRef}
                placeholder="Search bonds..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsOpen(true)}
                className="w-[300px] bg-gray-800 border-gray-700 text-green-400 pr-10"
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <Search className="h-4 w-4 text-gray-400" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(!isOpen)}
                  className="h-6 w-6 p-0 hover:bg-gray-700"
                >
                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </div>
            </div>
            
            {/* Dropdown Results */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-[400px] overflow-y-auto z-50">
                {isLoading ? (
                  <div className="p-3 text-center text-gray-400">
                    Loading bonds...
                  </div>
                ) : filteredBonds.length === 0 ? (
                  <div className="p-3 text-center text-gray-400">
                    {searchQuery ? `No bonds found matching "${searchQuery}"` : "No bonds available"}
                  </div>
                ) : (
                  filteredBonds.map((bond, index) => (
                    <button
                      key={bond.id}
                      onClick={() => handleBondSelect(bond.id)}
                      className={`w-full text-left p-3 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 ${
                        index === highlightedIndex ? 'bg-gray-700' : ''
                      } ${bond.id === currentBondId ? 'bg-green-900/20 border-green-600' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-green-400 text-sm">
                            {formatBondDisplay(bond)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                            {getCategoryIcon(bond.category)}
                            <span>{formatBondSubtitle(bond)}</span>
                          </div>
                        </div>
                        {bond.id === currentBondId && (
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
        </div>
        
        {/* Quick info bar */}
        {currentBondData && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                <span>{currentBondData.issuer}</span>
              </div>
              <div className="flex items-center gap-1">
                <Percent className="h-4 w-4" />
                <span>{currentBondData.couponRate}% Coupon</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Matures {new Date(currentBondData.maturityDate).getFullYear()}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 