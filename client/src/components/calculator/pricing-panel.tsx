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
  const { input, analytics, isCalculating, error, setPrice, setYieldValue, setSpread, setSettlementDate, resetToMarket } = calculatorState;
  
  // Track which field is being edited to show proper formatting
  const [editingField, setEditingField] = useState<'price' | 'yield' | 'spread' | null>(null);
  const [tempValues, setTempValues] = useState<{ price?: string; yield?: string; spread?: string }>({});

  // Get display values
  const displayPrice = editingField === 'price' && tempValues.price !== undefined 
    ? tempValues.price 
    : (input.price ?? 100).toFixed(4);
    
  const displayYield = editingField === 'yield' && tempValues.yield !== undefined
    ? tempValues.yield
    : (input.yieldValue ?? 0).toFixed(3);
    
  const displaySpread = editingField === 'spread' && tempValues.spread !== undefined
    ? tempValues.spread
    : (input.spread ?? 0).toFixed(0);

  // Handle input changes while editing
  const handlePriceChange = (value: string) => {
    setTempValues(prev => ({ ...prev, price: value }));
  };

  const handleYieldChange = (value: string) => {
    setTempValues(prev => ({ ...prev, yield: value }));
  };

  const handleSpreadChange = (value: string) => {
    setTempValues(prev => ({ ...prev, spread: value }));
  };

  // Handle Enter key or blur to trigger calculation
  const handlePriceCommit = () => {
    const price = parseFloat(tempValues.price || displayPrice);
    if (!isNaN(price) && price > 0) {
      setPrice(price);
    }
    setEditingField(null);
    setTempValues(prev => ({ ...prev, price: undefined }));
  };

  const handleYieldCommit = () => {
    const yieldValue = parseFloat(tempValues.yield || displayYield);
    if (!isNaN(yieldValue)) {
      setYieldValue(yieldValue);
    }
    setEditingField(null);
    setTempValues(prev => ({ ...prev, yield: undefined }));
  };

  const handleSpreadCommit = () => {
    const spreadValue = parseFloat(tempValues.spread || displaySpread);
    if (!isNaN(spreadValue)) {
      setSpread(spreadValue);
    }
    setEditingField(null);
    setTempValues(prev => ({ ...prev, spread: undefined }));
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
            value={displayPrice}
            onChange={e => handlePriceChange(e.target.value)}
            onBlur={handlePriceCommit}
            onKeyDown={handlePriceKeyDown}
            onFocus={() => setEditingField('price')}
            placeholder="Enter bond price..."
            disabled={isCalculating}
            className="font-mono border-gray-600 bg-gray-800 text-white focus:border-green-500"
          />
          <p className="text-xs text-gray-500">
            {error?.includes('Price') 
              ? <span className="text-red-400">{error}</span>
              : 'Enter bond price (5-200) and press Enter to calculate'
            }
          </p>
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
            value={displayYield}
            onChange={e => handleYieldChange(e.target.value)}
            onBlur={handleYieldCommit}
            onKeyDown={handleYieldKeyDown}
            onFocus={() => setEditingField('yield')}
            placeholder="Enter yield %..."
            disabled={isCalculating}
            className="font-mono border-gray-600 bg-gray-800 text-white focus:border-green-500"
          />
          <p className="text-xs text-gray-500">
            {error?.includes('Yield') || error?.includes('yield')
              ? <span className="text-red-400">{error}</span>
              : 'Enter yield (-5% to 50%) and press Enter to calculate price'
            }
          </p>
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
              min="-1000"
              max="5000"
              value={displaySpread}
              onChange={e => handleSpreadChange(e.target.value)}
              onBlur={handleSpreadCommit}
              onKeyDown={handleSpreadKeyDown}
              onFocus={() => setEditingField('spread')}
              placeholder="Enter spread in bp..."
              disabled={isCalculating}
              className={`font-mono border-gray-600 bg-gray-800 text-white focus:border-green-500 pr-12 ${
                error?.includes('spread') || error?.includes('Treasury') || error?.includes('Spread')
                  ? 'border-red-500 focus:border-red-500' 
                  : ''
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">bp</span>
          </div>
          <p className="text-xs text-gray-500">
            {error?.includes('Treasury') 
              ? <span className="text-yellow-400">Treasury curve data loading...</span>
              : error?.includes('Spread')
              ? <span className="text-red-400">{error}</span>
              : 'Enter spread (-1000 to 5000 bp) and press Enter to calculate price'
            }
          </p>
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
        
        {/* General Error Display */}
        {error && !error.includes('Price') && !error.includes('Yield') && !error.includes('yield') && !error.includes('Spread') && !error.includes('spread') && !error.includes('Treasury') && (
          <div className="p-3 bg-red-900/20 border border-red-600 rounded text-sm text-red-400">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 