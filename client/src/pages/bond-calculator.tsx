import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, AlertTriangle, TrendingUp, CalendarDays } from "lucide-react";
import { BondDefinition, BondResult } from "@shared/schema";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { PricingPanel } from "@/components/calculator/pricing-panel";
import { RiskMetricsPanel } from "@/components/calculator/risk-metrics-panel";
import { BondSearchSelector } from "@/components/calculator/bond-search-selector";
import { PriceSensitivityPanel } from "@/components/calculator/price-sensitivity-panel";
import { CashFlowSchedulePanel } from "@/components/calculator/cash-flow-schedule-panel";

export default function BondCalculator() {
  const { bondId } = useParams<{ bondId?: string }>();
  const [, setLocation] = useLocation();
  const [bond, setBond] = useState<BondDefinition | null>(null);
  const [bondResult, setBondResult] = useState<BondResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store predefined cash flows for complex bonds
  const [predefinedCashFlows, setPredefinedCashFlows] = useState<any[] | undefined>();

  // Initialize calculator state once bond is loaded
  const calculatorState = useCalculatorState(bond || undefined, bondResult || undefined, predefinedCashFlows);

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
          console.log('🔥 Bond Loading: Cash flows available?', hasCashFlows, 'count:', bondDefinition.cashFlowSchedule?.length || 0);
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
            console.log(`📊 Using Bloomberg reference price for ${ticker}: ${defaultPrice}`);
          }
          
          const buildRequest = {
            ...apiBond,
            marketPrice: defaultPrice,
            settlementDate: new Date().toISOString().split('T')[0]
          };
          
          console.log('🔥 Building bond with request:', {
            issuer: buildRequest.issuer,
            hasPredefinedCashFlows: !!buildRequest.predefinedCashFlows,
            cashFlowCount: buildRequest.predefinedCashFlows?.length || 0,
            marketPrice: buildRequest.marketPrice
          });
          
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

  if (!bondId) {
    return (
      <div className="min-h-screen bg-gray-950 text-green-400 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-6">
            <Calculator className="h-16 w-16 mx-auto text-green-400" />
            <h1 className="text-3xl font-bold">📊 BOND CALCULATOR</h1>
            <p className="text-gray-400">
              Select a bond to begin interactive analysis
            </p>
            <Button 
              onClick={() => setLocation('/builder')}
              className="bg-green-600 hover:bg-green-700"
            >
              Go to Bond Builder
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-green-400 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto"></div>
          <p>Loading bond data...</p>
        </div>
      </div>
    );
  }

  if (error || !bond) {
    return (
      <div className="min-h-screen bg-gray-950 text-green-400 flex items-center justify-center">
        <Card className="bg-gray-900 border-red-600 max-w-md">
          <CardHeader>
            <CardTitle className="text-red-400">Error Loading Bond</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400">{error || 'Bond not found'}</p>
            <Button 
              onClick={() => setLocation('/builder')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Builder
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-green-400 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/builder')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Bond Selector */}
        <BondSearchSelector 
          currentBondId={bondId}
          currentBondData={{
            issuer: bond.issuer,
            couponRate: parseFloat(bond.couponRate),
            maturityDate: bond.maturityDate,
            isin: bond.isin || undefined
          }}
        />

        {/* Calculator Interface - 2x2 Grid */}
        <div className="grid gap-4 md:grid-cols-2 md:auto-rows-min">
          {/* Row 1: Bond Pricing Calculator */}
          <PricingPanel 
            calculatorState={calculatorState} 
            bond={bond} 
            className="flex flex-col md:h-full"
          />
          
          {/* Row 1: Key Metrics */}
          <RiskMetricsPanel 
            analytics={calculatorState.analytics} 
            isCalculating={calculatorState.isCalculating} 
            className="flex flex-col md:h-full"
          />
          
          {/* Row 2: Price Sensitivity */}
          {calculatorState.input.price ? (
            <PriceSensitivityPanel 
              bond={bond}
              currentPrice={calculatorState.input.price}
              settlementDate={calculatorState.input.settlementDate}
              predefinedCashFlows={predefinedCashFlows}
            />
          ) : (
            <div className="bg-gray-900 border border-green-600 rounded-lg p-6 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Enter a price to see sensitivity analysis</p>
              </div>
            </div>
          )}
          
          {/* Row 2: Cash Flow Schedule */}
          {bondResult?.cashFlows ? (
            <CashFlowSchedulePanel 
              cashFlows={bondResult.cashFlows}
              isLoading={calculatorState.isCalculating}
              bond={{
                faceValue: bond.faceValue,
                paymentFrequency: bond.paymentFrequency,
                couponRate: bond.couponRate,
                couponRateChanges: bond.couponRateChanges || []
              }}
            />
          ) : (
            <div className="bg-gray-900 border border-green-600 rounded-lg p-6 flex items-center justify-center">
              <div className="text-center">
                <CalendarDays className="h-8 w-8 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Cash flow schedule will appear here</p>
              </div>
            </div>
          )}
        </div>

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
    </div>
  );
} 