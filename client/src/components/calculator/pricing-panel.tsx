import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, Download, Wifi } from "lucide-react";
import { CalculatorState } from "@/hooks/useCalculatorState";
import { BondDefinition } from "@shared/schema";
import { formatNumber, formatPercent } from "@/lib/bond-utils";

interface PricingPanelProps {
  calculatorState: CalculatorState;
  bond?: BondDefinition;
  className?: string;
}

/**
 * Simple pricing panel - enter price and hit Enter to calculate yield and spread
 */
export function PricingPanel({ calculatorState, bond, className }: PricingPanelProps) {
  const { input, analytics, isCalculating, error, setPrice, setYieldValue, setSpread, setSettlementDate, fetchLivePrice } = calculatorState;
  
  // Track which field is being edited to show proper formatting
  const [editingField, setEditingField] = useState<'price' | 'yield' | 'spread' | null>(null);
  const [tempValues, setTempValues] = useState<{ price?: string; yield?: string; spread?: string }>({});
  
  // Live price state
  const [isLoadingLivePrice, setIsLoadingLivePrice] = useState(false);
  const [priceSource, setPriceSource] = useState<'live' | 'reference' | 'default' | null>(null);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  // Get display values
  const displayPrice = editingField === 'price' && tempValues.price !== undefined 
    ? tempValues.price 
    : (input.price ?? 100).toFixed(2);
    
  const displayYield = editingField === 'yield' && tempValues.yield !== undefined
    ? tempValues.yield
    : input.yieldValue !== undefined ? input.yieldValue.toFixed(2) : '';
    
  const displaySpread = editingField === 'spread' && tempValues.spread !== undefined
    ? tempValues.spread
    : input.spread !== undefined ? input.spread.toFixed(2) : '';

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

  // Handle live price fetching
  const handleFetchLivePrice = async () => {
    if (!bond || !fetchLivePrice) return;
    
    setIsLoadingLivePrice(true);
    
    try {
      const priceInfo = await fetchLivePrice(undefined, bond.isin || undefined, bond.issuer);
      
      setPrice(priceInfo.price);
      setPriceSource(priceInfo.source);
      setLastPriceUpdate(new Date());
      
      
    } catch (error) {
      console.error('Failed to fetch live price:', error);
      // Don't update price on error, just clear loading state
    } finally {
      setIsLoadingLivePrice(false);
    }
  };

  // Check if bond supports live pricing
  const isArgentinaBond = bond?.issuer?.includes('ARGENTINA');
  const canFetchLivePrice = isArgentinaBond && !isCalculating && !isLoadingLivePrice;

  return (
    <Card className={`bg-terminal-panel border-terminal-line ${className}`}>
      <CardHeader>
        <div className="border-l-2 border-terminal-orange pl-3">
          <CardTitle className="text-lg font-bold header-muted flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Bond Pricing Calculator
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 flex-1">
        {/* Price Input Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="price" className="text-gray-300 font-medium">
              Price
            </Label>
            {priceSource && lastPriceUpdate && (
              <div className="flex items-center gap-1 text-xs">
                {priceSource === 'live' ? (
                  <Wifi className="h-3 w-3 text-green-400" />
                ) : (
                  <Download className="h-3 w-3 text-yellow-400" />
                )}
                <span className={priceSource === 'live' ? 'text-green-400' : 'text-yellow-400'}>
                  {priceSource === 'live' ? 'Live' : 'Reference'}
                </span>
                <span className="text-gray-500">
                  {lastPriceUpdate.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
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
              className="font-mono border-gray-600 bg-gray-800 text-white focus:border-green-500 flex-1"
            />
            {isArgentinaBond && (
              <Button
                onClick={handleFetchLivePrice}
                disabled={!canFetchLivePrice}
                variant="outline"
                size="sm"
                className="border-green-600 text-green-400 hover:bg-green-900/20 px-3"
              >
                {isLoadingLivePrice ? (
                  <div className="animate-spin h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full"></div>
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {error?.includes('Price') 
              ? <span className="text-red-400">{error}</span>
              : isArgentinaBond 
              ? 'Enter price or click live price button for bonds'
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