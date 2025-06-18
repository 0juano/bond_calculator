import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BondDefinition } from "@shared/schema";
import { TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/bond-utils";

interface PriceSensitivityPanelProps {
  bond: BondDefinition;
  currentPrice: number;
  settlementDate: string;
  predefinedCashFlows?: any[];
  className?: string;
}

interface PriceScenario {
  priceChange: string;
  price: number;
  ytm?: number;
  spread?: number;
  isLoading: boolean;
  error?: string;
}

export function PriceSensitivityPanel({ 
  bond, 
  currentPrice, 
  settlementDate,
  predefinedCashFlows,
  className 
}: PriceSensitivityPanelProps) {
  const [scenarios, setScenarios] = useState<PriceScenario[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Define price changes
  const priceChanges = ["-5%", "-3%", "-2%", "-1%", "current", "+1%", "+2%", "+3%", "+5%"];
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

            const response = await fetch('/api/bonds/calculate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            

            return {
              ...scenario,
              ytm: result.analytics?.yieldToMaturity,
              spread: result.analytics?.spread,
              isLoading: false,
            };
          } catch (error) {
            console.error(`Error calculating scenario for ${scenario.priceChange}:`, error);
            return {
              ...scenario,
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false,
            };
          }
        })
      );

      setScenarios(updatedScenarios);
      setIsCalculating(false);
    };

    calculateScenarios().catch(console.error);
  }, [bond, currentPrice, settlementDate, predefinedCashFlows]);

  return (
    <Card className={`bg-gray-900 border-green-600 ${className}`}>
      <CardHeader>
        <CardTitle className="text-green-400 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Price Sensitivity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-green-800/30 hover:bg-transparent">
                <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center w-20">Px % Chg</TableHead>
                <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center w-20">Price</TableHead>
                <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center w-20">YTM</TableHead>
                <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center w-20">SoT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((scenario, index) => (
                <TableRow 
                  key={index} 
                  className={`border-green-800/30 h-7 ${
                    scenario.priceChange === "current" 
                      ? "bg-green-900/30 border-green-600/50" 
                      : "hover:bg-gray-800/30"
                  }`}
                >
                  <TableCell className={`font-mono text-xs px-2 py-1 text-center align-middle ${
                    scenario.priceChange === "current" 
                      ? "text-green-300 font-medium" 
                      : "text-gray-500"
                  }`}>
                    {scenario.priceChange === "current" ? "0%" : scenario.priceChange}
                  </TableCell>
                  <TableCell className={`font-mono text-xs px-2 py-1 text-center align-middle ${
                    scenario.priceChange === "current" 
                      ? "text-green-300 font-medium" 
                      : "text-green-400"
                  }`}>
                    {formatNumber(scenario.price, 2)}
                  </TableCell>
                  <TableCell className="text-center align-middle font-mono text-xs px-2 py-1">
                    {scenario.isLoading ? (
                      <span className="text-gray-500">...</span>
                    ) : scenario.error ? (
                      <span className="text-red-400">-</span>
                    ) : (
                      <span className={`${
                        scenario.priceChange === "current" 
                          ? "text-green-300 font-medium" 
                          : "text-green-400"
                      }`}>
                        {scenario.ytm ? `${formatNumber(scenario.ytm, 1)}%` : '-'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center align-middle font-mono text-xs px-2 py-1">
                    {scenario.isLoading ? (
                      <span className="text-gray-500">...</span>
                    ) : scenario.error || scenario.spread === undefined ? (
                      <span className="text-red-400">-</span>
                    ) : (
                      <span className={`${
                        scenario.priceChange === "current" 
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