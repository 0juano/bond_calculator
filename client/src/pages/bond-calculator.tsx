import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Building2, Calendar, Percent } from "lucide-react";
import { BondDefinition, BondResult } from "@shared/schema";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { BondSearch } from "@/components/BondSearch";
import { HeroLayout } from "@/components/calculator/HeroLayout";
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
  const hasTyped = useRef(false);

  // Store predefined cash flows for complex bonds
  const [predefinedCashFlows, setPredefinedCashFlows] = useState<any[] | undefined>();

  // Initialize calculator state once bond is loaded
  const calculatorState = useCalculatorState(bond || undefined, bondResult || undefined, predefinedCashFlows);

  const handleBondSelect = (selectedBondId: string) => {
    hasTyped.current = true;
    // Navigate to the selected bond - this will trigger the useEffect to load the bond
    setLocation(`/calculator/${encodeURIComponent(selectedBondId)}`);
  };

  const handleSearchChange = (query: string) => {
    if (query.length > 0) {
      hasTyped.current = true;
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

  // Progressive disclosure: Show hero search when no bond and haven't typed
  const showHero = !bond && !hasTyped.current && !bondId;

  if (isLoading) {
    return (
      <div className="text-green-400 p-6 flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto"></div>
          <p>Loading bond data...</p>
        </div>
      </div>
    );
  }

  if (error && bondId) {
    return (
      <div className="text-green-400 p-6 flex items-center justify-center min-h-96">
        <Card className="bg-gray-900 border-red-600 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-400">Error Loading Bond</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400">{error || 'Bond not found'}</p>
            <Button 
              onClick={() => setLocation('/')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calculator
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Hero Layout - Google-style centered search */}
      {showHero && (
        <HeroLayout>
          <BondSearch 
            autoFocus
            onSelect={handleBondSelect}
            onChange={handleSearchChange}
            className="w-[90%] md:w-1/2"
          />
        </HeroLayout>
      )}

      {/* Main Calculator Interface */}
      <main className={cn(showHero && 'hidden', 'text-green-400 p-6')}>
        {/* Sticky Bond Info + Search Bar */}
        <section className="sticky top-[var(--topbar-h)] z-20 bg-gray-900/90 backdrop-blur-sm px-4 py-3 shadow-lg border-b border-gray-700/50 -mx-6 mb-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: Current Bond Info */}
            <div className="flex-1">
              {bond ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-green-400 mb-1">
                      📊 {bond.issuer === 'REPUBLIC OF ARGENTINA' ? 
                        `ARGENT ${bond.couponRate} ${new Date(bond.maturityDate).getFullYear().toString().slice(-2)}` :
                        `${bond.issuer} ${bond.couponRate}% ${new Date(bond.maturityDate).getFullYear()}`
                      }
                    </h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {bond.issuer}
                      </span>
                      {bond.isin && (
                        <span>ISIN: {bond.isin}</span>
                      )}
                      {bond.cusip && (
                        <span>CUSIP: {bond.cusip}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {bond.couponRate}% Coupon
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Matures {new Date(bond.maturityDate).getFullYear()}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs bg-green-600 text-white px-2 py-1 rounded self-start">
                    Active
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-semibold text-gray-400">No Bond Selected</h2>
                  <p className="text-sm text-gray-500">Choose a bond to begin analysis</p>
                </div>
              )}
            </div>
            
            {/* Right: Search Bar */}
            <div className="md:ml-6">
              <BondSearch 
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
                className="w-full md:w-80"
              />
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto space-y-6">
          {/* Analytics Grid with Animation */}
          <Grid 
            show={!showHero}
            bond={bond}
            bondResult={bondResult}
            calculatorState={calculatorState}
            predefinedCashFlows={predefinedCashFlows}
          />

          {/* Error Display */}
          {calculatorState.error && (
            <Card className="bg-gray-900 border-red-600">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-600 rounded">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400">{calculatorState.error}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
} 