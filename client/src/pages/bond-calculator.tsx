import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useHotkeys } from "react-hotkeys-hook";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Building2, Calendar, Percent } from "lucide-react";
import { BondDefinition, BondResult } from "@shared/schema";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { BondSearch } from "@/components/BondSearch";
import { Grid } from "@/components/calculator/Grid";
import { getDefaultSettlementDate } from "@shared/day-count";
import { cn } from "@/lib/utils";

export default function BondCalculator() {
  const { bondId } = useParams<{ bondId?: string }>();
  const [, setLocation] = useLocation();
  const [bond, setBond] = useState<BondDefinition | null>(null);
  const [bondResult, setBondResult] = useState<BondResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store predefined cash flows for complex bonds
  const [predefinedCashFlows, setPredefinedCashFlows] = useState<any[] | undefined>();

  // Refs for search inputs
  const stickySearchRef = useRef<HTMLInputElement>(null);

  // Initialize calculator state once bond is loaded
  const calculatorState = useCalculatorState(bond || undefined, bondResult || undefined, predefinedCashFlows);

  // Keyboard shortcut handler using native event listener (more reliable)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        if (stickySearchRef.current) {
          stickySearchRef.current.focus();
          stickySearchRef.current.select();
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
    
    if (stickySearchRef.current) {
      stickySearchRef.current.focus();
      if (stickySearchRef.current.value) {
        stickySearchRef.current.select();
      }
    }
    
    return false;
  }, {
    preventDefault: true,
    enableOnFormTags: false,
    enableOnContentEditable: false,
  });

  const handleBondSelect = (selectedBondId: string) => {
    // Navigate to the selected bond - this will trigger the useEffect to load the bond
    setLocation(`/calculator/${encodeURIComponent(selectedBondId)}`);
  };

  const handleSearchChange = (query: string) => {
    // Could add analytics here if needed
  };

  // Get recent bonds from localStorage
  const getRecentBonds = () => {
    try {
      const stored = localStorage.getItem('recentBonds');
      if (!stored) return [];
      
      const recent = JSON.parse(stored);
      // Filter out the current bond if it's in the list
      return recent.filter((b: any) => bond ? b.id !== bondId : true);
    } catch {
      return [];
    }
  };

  // Save bond to recent history when loaded
  const saveBondToRecent = (bondData: BondDefinition, bondId: string) => {
    try {
      const stored = localStorage.getItem('recentBonds') || '[]';
      const recent = JSON.parse(stored);
      
      // Create new entry
      const entry = {
        id: bondId,
        name: `${bondData.issuer} ${bondData.couponRate}%`,
        coupon: `${bondData.couponRate}%`,
        maturity: new Date(bondData.maturityDate).getFullYear().toString(),
        lastViewed: new Date()
      };
      
      // Remove if already exists and add to front
      const filtered = recent.filter((b: any) => b.id !== bondId);
      const updated = [entry, ...filtered].slice(0, 10); // Keep last 10
      
      localStorage.setItem('recentBonds', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent bond:', error);
    }
  };

  // Load bond data on mount
  useEffect(() => {
    if (!bondId) return;

    const loadBond = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let response;
        let data;
        
        // Handle different bond types
        if (bondId.startsWith('golden:')) {
          // Golden bonds
          const goldenId = bondId.replace('golden:', '');
          response = await fetch(`/api/bonds/golden/${goldenId}/build`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!response.ok) {
            throw new Error(`Failed to load golden bond: ${response.statusText}`);
          }
          
          data = await response.json();
          setBondResult(data);
          setBond(data.bond);
          saveBondToRecent(data.bond, bondId);
          
        } else if (bondId.startsWith('bond_')) {
          // Saved bonds (user_created, imported, etc.)
          // First, get all saved bonds to find the filename
          const savedBondsResponse = await fetch('/api/bonds/saved');
          if (!savedBondsResponse.ok) {
            throw new Error('Failed to load saved bonds list');
          }
          
          const savedBondsData = await savedBondsResponse.json();
          const bondMetadata = savedBondsData.bonds.find((b: any) => b.metadata.id === bondId);
          
          if (!bondMetadata) {
            throw new Error(`Saved bond with ID ${bondId} not found`);
          }
          
          // Load the specific saved bond
          response = await fetch(`/api/bonds/saved/${bondMetadata.filename}?category=${bondMetadata.category}`);
          if (!response.ok) {
            throw new Error(`Failed to load saved bond: ${response.statusText}`);
          }
          
          const bondDefinition = await response.json();
          
          // Convert clean bond definition to API format for building
          // CRITICAL: Include predefined cash flows to preserve JSON-first architecture
          const apiBond = {
            issuer: bondDefinition.bondInfo.issuer,
            cusip: bondDefinition.bondInfo.cusip,
            isin: bondDefinition.bondInfo.isin,
            faceValue: Number(bondDefinition.bondInfo.faceValue),
            couponRate: Number(bondDefinition.bondInfo.couponRate),
            issueDate: bondDefinition.bondInfo.issueDate,
            maturityDate: bondDefinition.bondInfo.maturityDate,
            firstCouponDate: bondDefinition.bondInfo.firstCouponDate,
            paymentFrequency: bondDefinition.bondInfo.paymentFrequency,
            dayCountConvention: bondDefinition.bondInfo.dayCountConvention,
            currency: bondDefinition.bondInfo.currency,
            settlementDays: bondDefinition.bondInfo.settlementDays,
            isAmortizing: bondDefinition.features.isAmortizing,
            isCallable: bondDefinition.features.isCallable,
            isPuttable: bondDefinition.features.isPuttable,
            isVariableCoupon: bondDefinition.features.isVariableCoupon,
            amortizationSchedule: bondDefinition.schedules?.amortizationSchedule || [],
            callSchedule: bondDefinition.schedules?.callSchedule || [],
            putSchedule: bondDefinition.schedules?.putSchedule || [],
            couponRateChanges: bondDefinition.schedules?.couponRateChanges || [],
            // PRESERVE PREDEFINED CASH FLOWS - Only include if they exist and have content
            ...(bondDefinition.cashFlowSchedule && bondDefinition.cashFlowSchedule.length > 0 && {
              predefinedCashFlows: bondDefinition.cashFlowSchedule
            }),
          };
          
          // Create legacy bond for display
          const legacyBond: BondDefinition = {
            id: 0, // Temporary ID for saved bonds
            issuer: bondDefinition.bondInfo.issuer,
            cusip: bondDefinition.bondInfo.cusip,
            isin: bondDefinition.bondInfo.isin,
            faceValue: bondDefinition.bondInfo.faceValue.toString(),
            couponRate: bondDefinition.bondInfo.couponRate.toString(),
            issueDate: bondDefinition.bondInfo.issueDate,
            maturityDate: bondDefinition.bondInfo.maturityDate,
            firstCouponDate: bondDefinition.bondInfo.firstCouponDate,
            paymentFrequency: bondDefinition.bondInfo.paymentFrequency,
            dayCountConvention: bondDefinition.bondInfo.dayCountConvention,
            currency: bondDefinition.bondInfo.currency,
            settlementDays: bondDefinition.bondInfo.settlementDays,
            isAmortizing: bondDefinition.features.isAmortizing,
            isCallable: bondDefinition.features.isCallable,
            isPuttable: bondDefinition.features.isPuttable,
            isVariableCoupon: bondDefinition.features.isVariableCoupon,
            amortizationSchedule: bondDefinition.schedules?.amortizationSchedule || null,
            callSchedule: bondDefinition.schedules?.callSchedule || null,
            putSchedule: bondDefinition.schedules?.putSchedule || null,
            couponRateChanges: bondDefinition.schedules?.couponRateChanges || null,
            createdAt: null,
          };
          
          setBond(legacyBond);
          saveBondToRecent(legacyBond, bondId);
          
          // CRITICAL: Store predefined cash flows for JSON-first architecture
          const hasCashFlows = bondDefinition.cashFlowSchedule && bondDefinition.cashFlowSchedule.length > 0;
          setPredefinedCashFlows(hasCashFlows ? bondDefinition.cashFlowSchedule : undefined);
          
          // Build the bond to get analytics with default market price
          // Use Bloomberg reference prices for Argentina bonds
          const argentinaDefaultPrices: Record<string, number> = {
            'GD29': 84.10,  // Argentina 2029
            'GD30': 80.19,  // Argentina 2030
            'GD38': 72.25,  // Argentina 2038
            'GD46': 66.13,  // Argentina 2046
            'GD35': 68.24,  // Argentina 2035
            'GD41': 63.13,  // Argentina 2041
          };
          
          // Determine default price based on bond ticker or filename
          let defaultPrice = 100; // Default to par for non-Argentina bonds
          
          // Check if this is an Argentina bond by filename pattern
          const filenameMatch = bondMetadata.filename.match(/^(GD\d{2})_/);
          if (filenameMatch) {
            const ticker = filenameMatch[1];
            defaultPrice = argentinaDefaultPrices[ticker] || 100;
          }
          
          const buildRequest = {
            ...apiBond,
            marketPrice: defaultPrice,
            settlementDate: getDefaultSettlementDate()
          };
          
          
          const buildResponse = await fetch('/api/bonds/build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildRequest),
          });
          
          if (buildResponse.ok) {
            const buildResult = await buildResponse.json();
            setBondResult(buildResult);
          }
          
        } else {
          // Database bonds (numeric IDs)
          response = await fetch(`/api/bonds/${bondId}`);
          
          if (!response.ok) {
            throw new Error(`Failed to load bond: ${response.statusText}`);
          }
          
          data = await response.json();
          setBond(data);
          saveBondToRecent(data, bondId);
          
          // Database bonds don't have predefined cash flows
          setPredefinedCashFlows(undefined);
          
          // Build the bond to get analytics
          const buildResponse = await fetch('/api/bonds/build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          
          if (buildResponse.ok) {
            const buildResult = await buildResponse.json();
            setBondResult(buildResult);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load bond';
        setError(errorMessage);
        
        // Log error for debugging
        if (err instanceof Error) {
          console.error('Bond loading error:', err, { bondId });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadBond();
  }, [bondId]);

  if (isLoading) {
    return (
      <div className="text-terminal-accent p-6 flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-terminal-accent border-t-transparent rounded-full mx-auto"></div>
          <p>Loading bond data...</p>
        </div>
      </div>
    );
  }

  if (error && bondId) {
    return (
      <div className="text-terminal-accent p-6 flex items-center justify-center min-h-96">
        <Card className="bg-terminal-panel border-terminal-warn max-w-md">
          <CardHeader>
            <CardTitle className="text-terminal-warn">Error Loading Bond</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-terminal-txt/60">{error || 'Bond not found'}</p>
            <Button 
              onClick={() => setLocation('/')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="text-terminal-accent pt-[var(--nav-height-mobile)] sm:pt-[var(--topbar-h)] lg:fixed lg:inset-0 lg:top-[var(--topbar-h)] lg:pt-0 lg:overflow-hidden lg:flex lg:flex-col bg-[#0a0f1c] px-6">
        {/* Bond Info + Search Bar - Now flush with nav */}
        <section className="lg:relative lg:flex-shrink-0 z-20 safe-top pt-4 pb-3 lg:pt-5 lg:pb-4 border-b border-terminal-accent/30 -mx-6 px-6">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
            {/* Left: Current Bond Info */}
            <div className="flex-1">
              {bond ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <h2 className="whitespace-nowrap font-bold text-lg sm:text-xl text-terminal-accent mb-1">
                      📊 {bond.issuer === 'REPUBLIC OF ARGENTINA' ? 
                        `ARGENT ${bond.couponRate} ${new Date(bond.maturityDate).getFullYear().toString().slice(-2)}` :
                        `${bond.issuer} ${bond.couponRate}% ${new Date(bond.maturityDate).getFullYear()}`
                      }
                    </h2>
                    <div className="w-full flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-x-2 gap-y-0.5 text-xs sm:text-xs text-terminal-txt/60 whitespace-normal break-words overflow-hidden">
                      <p className="text-xs opacity-80">
                        {bond.issuer} | {bond.couponRate}% | Matures&nbsp;{new Date(bond.maturityDate).getFullYear()}
                      </p>
                      {bond.isin && (
                        <span className="truncate sm:whitespace-nowrap">ISIN: {bond.isin}</span>
                      )}
                      {bond.cusip && (
                        <span className="hidden sm:inline truncate">CUSIP: {bond.cusip}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium text-terminal-txt/50">BondTerminal</h2>
                </div>
              )}
            </div>
            
            {/* Right: Search Bar */}
            <div className="lg:ml-6 lg:flex-shrink-0">
              <BondSearch 
                ref={stickySearchRef}
                selectedBond={bond ? {
                  id: bond.id?.toString() || '',
                  category: 'user_created' as const,
                  metadata: {
                    name: `${bond.issuer} ${bond.couponRate}% ${new Date(bond.maturityDate).getFullYear()}`,
                    issuer: bond.issuer,
                    couponRate: parseFloat(bond.couponRate),
                    maturityDate: bond.maturityDate,
                    created: bond.createdAt?.toString() || '',
                    source: 'calculator'
                  }
                } : null}
                onSelect={handleBondSelect}
                onChange={handleSearchChange}
                className="w-full lg:w-80"
              />
            </div>
          </div>
        </section>

        <div className="lg:flex-1 lg:overflow-y-auto lg:overflow-x-hidden py-4 sm:py-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Analytics Grid with Animation */}
            <Grid 
              show={true}
              bond={bond}
              bondResult={bondResult}
              calculatorState={calculatorState}
              predefinedCashFlows={predefinedCashFlows}
              onBondSelect={handleBondSelect}
              recentBonds={getRecentBonds()}
            />

            {/* Error Display */}
            {calculatorState.error && (
              <Card className="bg-terminal-panel border-terminal-warn">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 p-4 bg-terminal-warn/20 border border-terminal-warn rounded">
                    <AlertTriangle className="h-5 w-5 text-terminal-warn" />
                    <span className="text-terminal-warn">{calculatorState.error}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
    </main>
  );
} 