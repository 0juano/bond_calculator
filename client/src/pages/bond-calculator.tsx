import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, AlertTriangle } from "lucide-react";
import { BondDefinition, BondResult } from "@shared/schema";
import { useCalculatorState } from "@/hooks/useCalculatorState";
import { PricingPanel } from "@/components/calculator/pricing-panel";
import { RiskMetricsPanel } from "@/components/calculator/risk-metrics-panel";

export default function BondCalculator() {
  const { bondId } = useParams<{ bondId?: string }>();
  const [, setLocation] = useLocation();
  const [bond, setBond] = useState<BondDefinition | null>(null);
  const [bondResult, setBondResult] = useState<BondResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize calculator state once bond is loaded
  const calculatorState = useCalculatorState(bond || undefined, bondResult || undefined);

  // Load bond data on mount
  useEffect(() => {
    if (!bondId) return;

    const loadBond = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let response;
        
        // Handle golden bonds vs regular bonds
        if (bondId.startsWith('golden:')) {
          const goldenId = bondId.replace('golden:', '');
          response = await fetch(`/api/bonds/golden/${goldenId}/build`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          response = await fetch(`/api/bonds/${bondId}`);
        }

        if (!response.ok) {
          throw new Error(`Failed to load bond: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (bondId.startsWith('golden:')) {
          setBondResult(data);
          setBond(data.bond);
        } else {
          setBond(data);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/builder')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-green-400">
                📊 {bond.issuer} {bond.couponRate}% {new Date(bond.maturityDate).getFullYear()}
              </h1>
              <p className="text-sm text-gray-400">{bond.isin}</p>
            </div>
          </div>
        </div>

        {/* Calculator Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pricing Panel */}
          <PricingPanel calculatorState={calculatorState} />

          {/* Risk Metrics Panel */}
          <RiskMetricsPanel 
            analytics={calculatorState.analytics} 
            isCalculating={calculatorState.isCalculating} 
          />
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

        {/* Scenario Analysis Panel */}
        <Card className="bg-gray-900 border-green-600">
          <CardHeader>
            <CardTitle className="text-green-400">Scenario Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-400">
              Scenario analysis panel coming soon...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 