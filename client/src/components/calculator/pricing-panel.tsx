import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, RotateCcw } from "lucide-react";
import { CalculatorState } from "@/hooks/useCalculatorState";

interface PricingPanelProps {
  calculatorState: CalculatorState;
  className?: string;
}

/**
 * Simple pricing panel - enter price and hit Enter to calculate yield and spread
 */
export function PricingPanel({ calculatorState, className }: PricingPanelProps) {
  const { input, analytics, isCalculating, setPrice, setYieldValue, setSpread, setSettlementDate, resetToMarket } = calculatorState;
  
  // Local input state for price, yield, and spread
  const [priceInput, setPriceInput] = useState<string>('');
  const [yieldInput, setYieldInput] = useState<string>('');
  const [spreadInput, setSpreadInput] = useState<string>('');
  const [focusedField, setFocusedField] = useState<'price' | 'yield' | 'spread' | null>(null);

  // Sync price input with calculator state when not focused
  useEffect(() => {
    if (focusedField !== 'price') {
      const currentPrice = input.price ?? analytics?.marketPrice ?? 100;
      setPriceInput(currentPrice.toFixed(4));
    }
  }, [input.price, analytics?.marketPrice, focusedField]);

  // Sync yield input with calculator state when not focused
  useEffect(() => {
    if (focusedField !== 'yield') {
      const currentYield = input.yieldValue ?? analytics?.yieldToMaturity ?? 0;
      setYieldInput(currentYield.toFixed(3));
    }
  }, [input.yieldValue, analytics?.yieldToMaturity, focusedField]);

  // Sync spread input with calculator state when not focused
  useEffect(() => {
    if (focusedField !== 'spread') {
      const currentSpread = input.spread ?? analytics?.spread ?? 0;
      setSpreadInput(currentSpread.toFixed(0));
    }
  }, [input.spread, analytics?.spread, focusedField]);

  // Handle price input changes
  const handlePriceChange = (value: string) => {
    setPriceInput(value);
  };

  // Handle yield input changes
  const handleYieldChange = (value: string) => {
    setYieldInput(value);
  };

  // Handle spread input changes
  const handleSpreadChange = (value: string) => {
    setSpreadInput(value);
  };

  // Handle Enter key or blur to trigger calculation
  const handlePriceCommit = () => {
    const price = parseFloat(priceInput);
    if (!isNaN(price) && price > 0) {
      setPrice(price);
    }
    setFocusedField(null);
  };

  const handleYieldCommit = () => {
    const yieldValue = parseFloat(yieldInput);
    if (!isNaN(yieldValue) && yieldValue >= 0) {
      setYieldValue(yieldValue);
    }
    setFocusedField(null);
  };

  const handleSpreadCommit = () => {
    const spreadValue = parseFloat(spreadInput);
    if (!isNaN(spreadValue)) {
      setSpread(spreadValue);
    }
    setFocusedField(null);
  };

  // Keyboard handlers for Enter key
  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePriceCommit();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleYieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleYieldCommit();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleSpreadKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSpreadCommit();
      (e.target as HTMLInputElement).blur();
    }
  };

  // Get calculated values with fallbacks
  const spreadValue = analytics?.spread ?? null;

  return (
    <Card className={`bg-gray-900 border-green-600 ${className}`}>
      <CardHeader>
        <CardTitle className="text-green-400 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Bond Pricing Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Input Field */}
        <div className="space-y-2">
          <Label htmlFor="price" className="text-gray-300 font-medium">
            Price
          </Label>
          <Input
            id="price"
            type="number"
            step="0.0001"
            min="0"
            value={priceInput}
            onChange={e => handlePriceChange(e.target.value)}
            onBlur={handlePriceCommit}
            onKeyDown={handlePriceKeyDown}
            onFocus={() => setFocusedField('price')}
            placeholder="Enter bond price..."
            disabled={isCalculating}
            className="font-mono border-gray-600 bg-gray-800 text-white focus:border-green-500"
          />
          <p className="text-xs text-gray-500">Enter bond price and press Enter to calculate</p>
        </div>

        {/* Yield to Maturity - Editable */}
        <div className="space-y-2">
          <Label htmlFor="yield" className="text-gray-300 font-medium">
            Yield to Maturity
          </Label>
          <Input
            id="yield"
            type="number"
            step="0.001"
            min="0"
            max="100"
            value={yieldInput}
            onChange={e => handleYieldChange(e.target.value)}
            onBlur={handleYieldCommit}
            onKeyDown={handleYieldKeyDown}
            onFocus={() => setFocusedField('yield')}
            placeholder="Enter yield %..."
            disabled={isCalculating}
            className="font-mono border-gray-600 bg-gray-800 text-white focus:border-green-500"
          />
          <p className="text-xs text-gray-500">Enter yield and press Enter to calculate price</p>
        </div>

        {/* Spread to Treasury - Editable */}
        <div className="space-y-2">
          <Label htmlFor="spread" className="text-gray-300 font-medium">
            Spread to Treasury
          </Label>
          <div className="relative">
            <Input
              id="spread"
              type="number"
              step="1"
              value={spreadInput}
              onChange={e => handleSpreadChange(e.target.value)}
              onBlur={handleSpreadCommit}
              onKeyDown={handleSpreadKeyDown}
              onFocus={() => setFocusedField('spread')}
              placeholder="Enter spread in bp..."
              disabled={isCalculating}
              className="font-mono border-gray-600 bg-gray-800 text-white focus:border-green-500 pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">bp</span>
          </div>
          <p className="text-xs text-gray-500">Enter spread and press Enter to calculate price</p>
        </div>

        {/* Settlement Date */}
        <div className="space-y-2">
          <Label htmlFor="settlement" className="text-gray-300 font-medium">
            Settlement Date
          </Label>
          <Input
            id="settlement"
            type="date"
            value={input.settlementDate}
            onChange={e => setSettlementDate(e.target.value)}
            className="border-gray-600 bg-gray-800 text-white focus:border-green-500"
          />
          <p className="text-xs text-gray-500">Date for calculation and accrued interest</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToMarket}
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Market
          </Button>
        </div>

        {/* Calculation Status */}
        {isCalculating && (
          <div className="flex items-center justify-center py-2 text-sm text-yellow-400">
            <div className="animate-spin h-4 w-4 border-2 border-yellow-400 border-t-transparent rounded-full mr-2"></div>
            Calculating...
          </div>
        )}
      </CardContent>
    </Card>
  );
} 