import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Building2, Calendar, Percent } from "lucide-react";
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

interface BondSelectorProps {
  currentBondId?: string;
  currentBondData?: {
    issuer: string;
    couponRate: number;
    maturityDate: string;
    isin?: string;
  };
}

/**
 * Bond Selector Component
 * Displays current bond and allows selection of different bonds
 * Initially implemented as dropdown, can be upgraded to search bar
 */
export function BondSelector({ currentBondId, currentBondData }: BondSelectorProps) {
  const [, setLocation] = useLocation();
  const [bonds, setBonds] = useState<BondOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Load available bonds
  useEffect(() => {
    loadAvailableBonds();
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

      // Load golden bonds
      try {
        const goldenResponse = await apiRequest("GET", "/api/bonds/golden");
        const goldenData = await goldenResponse.json();
        
        const goldenBonds: BondOption[] = Object.entries(goldenData).map(([id, bond]: [string, any]) => ({
          id: `golden:${id}`,
          category: 'golden_bonds' as const,
          name: bond.name,
          description: bond.description,
          bondInfo: {
            issuer: bond.issuer || id.toUpperCase(),
            couponRate: bond.couponRate || 0,
            maturityDate: bond.maturityDate || new Date().toISOString().split('T')[0],
          }
        }));
        
        bondOptions.push(...goldenBonds);
      } catch (error) {
        console.warn("Failed to load golden bonds:", error);
      }

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
  };

  const formatBondDisplay = (bond: BondOption): string => {
    const issuer = bond.metadata?.issuer || bond.bondInfo?.issuer || bond.name || 'Unknown';
    const coupon = bond.metadata?.couponRate || bond.bondInfo?.couponRate || 0;
    const maturityYear = bond.metadata?.maturityDate || bond.bondInfo?.maturityDate;
    const year = maturityYear ? new Date(maturityYear).getFullYear() : 'Unknown';
    
    return `${issuer} ${coupon}% ${year}`;
  };

  const formatBondSubtitle = (bond: BondOption): string => {
    const category = bond.category === 'golden_bonds' ? 'Golden' : 
                   bond.category === 'user_created' ? 'User Created' : 'Imported';
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
          
          <div className="ml-4">
            <Select 
              value={currentBondId || ""} 
              onValueChange={handleBondSelect}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[200px] bg-gray-800 border-gray-700 text-green-400">
                <SelectValue placeholder="Change Bond" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 max-h-[400px]">
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading bonds...
                  </SelectItem>
                ) : bonds.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    No bonds available
                  </SelectItem>
                ) : (
                  bonds.map((bond) => (
                    <SelectItem 
                      key={bond.id} 
                      value={bond.id}
                      className="text-green-400 hover:bg-gray-700 focus:bg-gray-700"
                    >
                      <div className="flex flex-col">
                        <div className="font-medium">
                          {formatBondDisplay(bond)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatBondSubtitle(bond)}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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