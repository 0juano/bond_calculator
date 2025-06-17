import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BondDefinition, BondAnalytics } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/bond-utils";

interface ScenarioAnalysisPanelProps {
  bond: BondDefinition;
  currentPrice: number;
  settlementDate: string;
  predefinedCashFlows?: any[];
}

interface PriceScenario {
  priceChange: string;
  price: number;
  ytm?: number;
  spread?: number;
  isLoading: boolean;
  error?: string;
}

export function ScenarioAnalysisPanel({ 
  bond, 
  currentPrice, 
  settlementDate,
  predefinedCashFlows 
}: ScenarioAnalysisPanelProps) {
  const [scenarios, setScenarios] = useState<PriceScenario[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Define price changes
  const priceChanges = ["-5%", "-3%", "-2%", "-1%", "current price", "+1%", "+2%", "+3%", "+5%"];
  const priceMultipliers = [0.95, 0.97, 0.98, 0.99, 1.00, 1.01, 1.02, 1.03, 1.05];

  useEffect(() => {
    if (!bond || !currentPrice) return;

    // Initialize scenarios
    const initialScenarios: PriceScenario[] = priceChanges.map((change, index) => ({
      priceChange: change,
      price: currentPrice * priceMultipliers[index],
      isLoading: true,
    }));

    setScenarios(initialScenarios);
    setIsCalculating(true);

    // Calculate analytics for each price scenario
    const calculateScenarios = async () => {
      const updatedScenarios = await Promise.all(
        initialScenarios.map(async (scenario, index) => {
          // Add small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, index * 100));
          try {
            console.log(`📊 Calculating scenario for price ${scenario.price.toFixed(2)}`);
            
            // Transform bond data to correct types for API
            const requestBody = {
              ...bond,
              // Convert string fields to numbers
              faceValue: typeof bond.faceValue === 'string' ? parseFloat(bond.faceValue) : bond.faceValue,
              couponRate: typeof bond.couponRate === 'string' ? parseFloat(bond.couponRate) : bond.couponRate,
              // Ensure arrays are not null
              callSchedule: bond.callSchedule || [],
              putSchedule: bond.putSchedule || [],
              amortizationSchedule: bond.amortizationSchedule || [],
              couponRateChanges: bond.couponRateChanges || [],
              // Add scenario-specific data
              marketPrice: scenario.price,
              settlementDate,
              ...(predefinedCashFlows && { predefinedCashFlows }),
            };
            
            console.log(`📊 Request body for ${scenario.priceChange}:`, {
              issuer: requestBody.issuer,
              marketPrice: requestBody.marketPrice,
              settlementDate: requestBody.settlementDate,
              hasPredefinedCashFlows: !!requestBody.predefinedCashFlows
            });

            const response = await fetch('/api/bonds/calculate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`❌ API error for ${scenario.priceChange}:`, response.status, errorText);
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ Result for ${scenario.priceChange}:`, {
              ytm: result.analytics?.yieldToMaturity,
              spread: result.analytics?.spread,
              status: result.status
            });
            
            return {
              ...scenario,
              ytm: result.analytics?.yieldToMaturity,
              spread: result.analytics?.spread,
              isLoading: false,
            };
          } catch (error) {
            console.error(`❌ Error calculating ${scenario.priceChange}:`, error);
            return {
              ...scenario,
              isLoading: false,
              error: error instanceof Error ? error.message : 'Calculation error',
            };
          }
        })
      );

      setScenarios(updatedScenarios);
      setIsCalculating(false);
    };

    calculateScenarios();
  }, [bond, currentPrice, settlementDate, predefinedCashFlows]);

  return (
    <Card className="bg-gray-900 border-green-600">
      <CardHeader className="pb-3">
        <CardTitle className="text-green-400 flex items-center gap-2 text-base">
          Price Sensitivity Analysis
          {isCalculating && <Loader2 className="h-3 w-3 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-hidden rounded-md border border-green-800/30 w-80">
            <Table>
              <TableHeader>
                <TableRow className="border-green-800/50 bg-gray-800/50">
                  <TableHead className="text-green-400 font-mono text-xs h-8 px-2 w-24">
                    <div className="flex justify-between items-center">
                      <span>Px % Chg</span>
                      <span>Price</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center w-20">YTM</TableHead>
                  <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center w-20">SoT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.map((scenario, index) => (
                  <TableRow 
                    key={index} 
                    className={`border-green-800/30 h-7 ${
                      scenario.priceChange === "current price" 
                        ? "bg-green-900/30 border-green-600/50" 
                        : "hover:bg-gray-800/30"
                    }`}
                  >
                    <TableCell className="font-mono text-xs px-2 py-1 text-center">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs w-10 ${
                          scenario.priceChange === "current price" 
                            ? "text-green-300 font-medium" 
                            : "text-gray-500"
                        }`}>
                          {scenario.priceChange === "current price" ? "0%" : scenario.priceChange}
                        </span>
                        <span className={`${
                          scenario.priceChange === "current price" 
                            ? "text-green-300 font-medium" 
                            : "text-green-400"
                        }`}>
                          {formatNumber(scenario.price, 2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs px-2 py-1">
                      {scenario.isLoading ? (
                        <span className="text-gray-500">...</span>
                      ) : scenario.error ? (
                        <span className="text-red-400">-</span>
                      ) : (
                        <span className={`${
                          scenario.priceChange === "current price" 
                            ? "text-green-300 font-medium" 
                            : "text-green-400"
                        }`}>
                          {scenario.ytm ? `${formatNumber(scenario.ytm, 1)}%` : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs px-2 py-1">
                      {scenario.isLoading ? (
                        <span className="text-gray-500">...</span>
                      ) : scenario.error || scenario.spread === undefined ? (
                        <span className="text-red-400">-</span>
                      ) : (
                        <span className={`${
                          scenario.priceChange === "current price" 
                            ? "text-green-300 font-medium" 
                            : "text-green-400"
                        }`}>
                          {scenario.spread >= 0 ? '+' : ''}{formatNumber(Math.round(scenario.spread), 0)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}