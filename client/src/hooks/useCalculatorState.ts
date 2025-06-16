import { useState, useEffect, useCallback, useRef } from "react";
import { BondDefinition, BondAnalytics, BondResult } from "@shared/schema";

export interface CalculatorInput {
  price?: number;
  yieldValue?: number;
  spread?: number;
  settlementDate: string;
  priceFormat: 'DECIMAL' | 'FRACTIONAL';
  yieldPrecision: number;
  lockedField?: 'PRICE' | 'YIELD' | 'SPREAD';
  calculationId?: string; // Track which calculation triggered updates
}

export interface CalculatorState {
  input: CalculatorInput;
  analytics?: BondAnalytics;
  bondResult?: BondResult;
  isCalculating: boolean;
  error?: string;
  
  // Actions
  setInput: (input: Partial<CalculatorInput>) => void;
  setPrice: (price: number) => void;
  setYieldValue: (yieldValue: number) => void;
  setSpread: (spread: number) => void;
  setSettlementDate: (date: string) => void;
  lockField: (field: 'PRICE' | 'YIELD' | 'SPREAD') => void;
  unlockField: () => void;
  resetToMarket: () => void;
  runScenario: (shockBp: number) => void;
}

export function useCalculatorState(
  bond?: BondDefinition,
  initialBondResult?: BondResult,
  predefinedCashFlows?: any[] // Add support for predefined cash flows
): CalculatorState {
  const calculationCount = useRef(0);
  const lastCalculationId = useRef<string>('');
  const [input, setInputState] = useState<CalculatorInput>({
    price: initialBondResult?.analytics?.cleanPrice || 100, // Default to par if no initial result
    yieldValue: initialBondResult?.analytics?.yieldToMaturity || undefined,
    spread: initialBondResult?.analytics?.spread || undefined,
    settlementDate: new Date().toISOString().split('T')[0],
    priceFormat: 'DECIMAL',
    yieldPrecision: 3,
    lockedField: 'PRICE', // Default to price mode
    calculationId: undefined
  });
  
  // DEBUG: Log initialization
  console.log('🔍 CALCULATOR STATE: Initializing with:', {
    bondIssuer: bond?.issuer,
    hasPredefinedCashFlows: !!predefinedCashFlows,
    cashFlowCount: predefinedCashFlows?.length || 0,
    initialPrice: input.price,
    hasInitialBondResult: !!initialBondResult
  });

  const [bondResult, setBondResult] = useState<BondResult | undefined>(initialBondResult);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string>();

  // Initialize with existing bond result
  useEffect(() => {
    if (initialBondResult && !bondResult) {
      setBondResult(initialBondResult);
    }
  }, [initialBondResult, bondResult]);

  // Update price when initial bond result becomes available
  useEffect(() => {
    if (initialBondResult?.analytics?.cleanPrice && input.price === 100) {
      console.log('📊 Updating initial price from bond result:', initialBondResult.analytics.cleanPrice);
      setInputState(prev => ({
        ...prev,
        price: initialBondResult.analytics.cleanPrice,
        yieldValue: initialBondResult.analytics.yieldToMaturity,
        spread: initialBondResult.analytics.spread,
      }));
    }
  }, [initialBondResult]);

  // Reset calculator state when bond changes (for bond switching)
  useEffect(() => {
    if (!bond) return;
    
    // Bloomberg reference prices for Argentina bonds
    const bloombergRefPrices: Record<string, number> = {
      'GD29': 84.10,  // Argentina 2029
      'GD30': 80.19,  // Argentina 2030
      'GD38': 72.25,  // Argentina 2038
      'GD46': 66.13,  // Argentina 2046
      'GD35': 68.24,  // Argentina 2035
      'GD41': 63.13,  // Argentina 2041
    };
    
    // Determine appropriate market price for the new bond
    let marketPrice = 100; // Default to par for non-Argentina bonds
    
    if (bond.issuer === 'REPUBLIC OF ARGENTINA') {
      // Try to extract ticker from bond maturity year
      const maturityYear = bond.maturityDate ? new Date(bond.maturityDate).getFullYear() : null;
      
      const tickerMap: Record<number, string> = {
        2029: 'GD29',
        2030: 'GD30',
        2035: 'GD35',
        2038: 'GD38',
        2041: 'GD41',
        2046: 'GD46'
      };
      
      if (maturityYear && tickerMap[maturityYear]) {
        const ticker = tickerMap[maturityYear];
        marketPrice = bloombergRefPrices[ticker] || 100;
        console.log(`📊 Bond switch: Setting Bloomberg reference price for ${ticker}: ${marketPrice}`);
      }
    }
    
    // Reset calculator state for new bond
    console.log(`🔄 Bond changed to ${bond.issuer} - resetting calculator state`);
    calculationCount.current = 0; // Reset calculation counter
    
    setInputState(prev => ({
      ...prev,
      price: marketPrice,
      yieldValue: undefined, // Clear yield to recalculate from price
      spread: undefined,     // Clear spread to recalculate from price
      lockedField: 'PRICE',  // Reset to price mode
      calculationId: undefined // Clear calculationId to trigger fresh calculation
    }));
    
    setError(undefined); // Clear any previous errors
  }, [bond?.issuer, bond?.maturityDate]); // Watch for bond changes by issuer and maturity date

  // Debounced calculation effect
  useEffect(() => {
    if (!bond) return;

    // Check if we need to calculate based on locked field
    const hasInputValue = (
      (input.lockedField === 'PRICE' && input.price !== undefined) ||
      (input.lockedField === 'YIELD' && input.yieldValue !== undefined) ||
      (input.lockedField === 'SPREAD' && input.spread !== undefined) ||
      (!input.lockedField && input.price !== undefined)
    );

    if (!hasInputValue) {
      return;
    }

    // Generate unique calculation ID
    const calculationId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Skip if this is a result of our own calculation update
    if (input.calculationId && input.calculationId === lastCalculationId.current) {
      console.log('🔄 Skipping calculation - triggered by own update');
      return;
    }
    
    calculationCount.current += 1;
    const currentCallNumber = calculationCount.current;
    
    // Circuit breaker - prevent infinite loops
    if (calculationCount.current > 10) {
      console.warn('🔄 Too many calculations, pausing to prevent infinite loop');
      setError('Too many calculations detected. Please refresh the page if the calculator becomes unresponsive.');
      return;
    }
    
    // Store this calculation ID
    lastCalculationId.current = calculationId;

    const calculateAnalytics = async () => {
      setIsCalculating(true);
      setError(undefined);

      try {
        
        // Build enhanced request with calculator inputs
        const calculationRequest = {
          issuer: bond.issuer,
          cusip: bond.cusip,
          isin: bond.isin,
          faceValue: parseFloat(bond.faceValue),
          couponRate: parseFloat(bond.couponRate),
          issueDate: bond.issueDate,
          maturityDate: bond.maturityDate,
          firstCouponDate: bond.firstCouponDate,
          paymentFrequency: bond.paymentFrequency,
          dayCountConvention: bond.dayCountConvention,
          currency: bond.currency,
          settlementDays: bond.settlementDays,
          isAmortizing: bond.isAmortizing,
          isCallable: bond.isCallable,
          isPuttable: bond.isPuttable,
          isVariableCoupon: bond.isVariableCoupon,
          amortizationSchedule: bond.amortizationSchedule || [],
          callSchedule: bond.callSchedule || [],
          putSchedule: bond.putSchedule || [],
          couponRateChanges: bond.couponRateChanges || [],
          settlementDate: input.settlementDate,
          // CRITICAL: Include predefined cash flows for JSON-first architecture
          ...(predefinedCashFlows && predefinedCashFlows.length > 0 && { 
            predefinedCashFlows: predefinedCashFlows.map(cf => ({
              date: cf.date,
              couponPayment: cf.couponPayment,
              principalPayment: cf.principalPayment,
              totalPayment: cf.totalPayment,
              remainingNotional: cf.remainingNotional,
              paymentType: cf.paymentType,
            }))
          }),
          // Override with user inputs based on locked field
          // Only send the input that's currently being edited
          ...(input.lockedField === 'PRICE' && input.price !== undefined && { 
            marketPrice: input.price
          }),
          ...(input.lockedField === 'YIELD' && input.yieldValue !== undefined && { 
            targetYield: input.yieldValue 
          }),
          ...(input.lockedField === 'SPREAD' && input.spread !== undefined && { 
            targetSpread: input.spread 
          }),
          // If no field is locked but we have a price, send it
          ...(!input.lockedField && input.price !== undefined && { 
            marketPrice: input.price
          }),
          // Fallback: if nothing is provided, use a reasonable default
          ...(!input.price && !input.yieldValue && !input.spread && !input.lockedField && {
            marketPrice: 100 // Par as last resort
          }),
        };

        console.log('🔍 CALCULATOR STATE: About to send calculation request:', {
          bondIssuer: calculationRequest.issuer,
          hasPredefinedCashFlows: !!calculationRequest.predefinedCashFlows,
          cashFlowCount: calculationRequest.predefinedCashFlows?.length || 0,
          marketPrice: calculationRequest.marketPrice,
          targetYield: calculationRequest.targetYield,
          targetSpread: calculationRequest.targetSpread,
          lockedField: input.lockedField,
          settlementDate: calculationRequest.settlementDate,
          calculationCount: currentCallNumber
        });

        
        const response = await fetch('/api/bonds/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calculationRequest),
        });

        if (!response.ok) {
          const errorData = await response.text();
          let errorMessage = `Calculation failed: ${response.statusText}`;
          
          try {
            const errorJson = JSON.parse(errorData);
            errorMessage = errorJson.error || errorMessage;
          } catch {
            // If not JSON, use the text as is
            if (errorData) errorMessage = errorData;
          }
          
          // Special handling for spread calculation errors
          if (errorMessage.includes('Treasury curve') || errorMessage.includes('spread')) {
            setError('Treasury curve data is required for spread calculations. Please wait a moment and try again.');
            // Don't update bond result - keep previous valid state
            return;
          }
          
          throw new Error(errorMessage);
        } else {
          const result = await response.json();
          
          console.log('🔍 CALCULATOR STATE: Received calculation result:', {
            status: result.status,
            ytm: result.analytics?.yieldToMaturity,
            duration: result.analytics?.duration,
            cleanPrice: result.analytics?.cleanPrice,
            spread: result.analytics?.spread,
            hasAnalytics: !!result.analytics
          });
          
          // Validate the result before updating state
          if (!result.analytics || typeof result.analytics.cleanPrice !== 'number') {
            console.error('🔍 CALCULATOR STATE: Invalid result structure:', result);
            throw new Error('Invalid calculation result received');
          }
          
          // Update the input state with the calculated values
          // ONLY update the fields that weren't the input to avoid infinite loops
          setInputState(prev => {
            const updates: Partial<CalculatorInput> = {};
            
            // Only update fields that weren't locked (i.e., weren't the input)
            // Use more reasonable thresholds for meaningful changes
            if (prev.lockedField !== 'PRICE') {
              const newPrice = result.analytics.cleanPrice;
              // Use 0.01 threshold (1 cent per $100 face value)
              if (Math.abs((prev.price || 0) - newPrice) > 0.01) {
                updates.price = newPrice;
              }
            }
            if (prev.lockedField !== 'YIELD') {
              const newYield = result.analytics.yieldToMaturity;
              // Use 0.01% threshold for yield changes
              if (Math.abs((prev.yieldValue || 0) - newYield) > 0.01) {
                updates.yieldValue = newYield;
              }
            }
            if (prev.lockedField !== 'SPREAD') {
              const newSpread = result.analytics.spread;
              // Use 1bp threshold for spread changes
              if (newSpread !== undefined && Math.abs((prev.spread || 0) - newSpread) > 1) {
                updates.spread = newSpread;
              }
            }
            
            // Add the calculationId to track this update
            updates.calculationId = calculationId;
            
            // Only update if there are actual meaningful changes
            if (Object.keys(updates).length === 1 && updates.calculationId) {
              console.log('🔍 CALCULATOR STATE: No meaningful updates needed - values within threshold');
              return prev;
            }
            
            console.log('🔄 CALCULATOR STATE: Updating input state:', {
              updates,
              calculationId,
              lockedField: prev.lockedField,
              before: {
                price: prev.price,
                yieldValue: prev.yieldValue,
                spread: prev.spread
              }
            });
            return { ...prev, ...updates };
          });
          
          setBondResult(prev => ({
            bond: bond,
            cashFlows: prev?.cashFlows || result.cashFlows || [],
            analytics: result.analytics,
            buildTime: result.calculationTime || Date.now(),
            status: result.status || 'success',
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Calculation failed');
      } finally {
        setIsCalculating(false);
      }
    };

    // Debounce calculations to avoid excessive API calls
    const timeoutId = setTimeout(calculateAnalytics, 300);
    return () => clearTimeout(timeoutId);
  }, [
    bond, 
    input.settlementDate, 
    predefinedCashFlows,
    input.lockedField,
    input.price,
    input.yieldValue,
    input.spread,
    input.calculationId
  ]);

  // Action handlers
  const setInput = useCallback((partial: Partial<CalculatorInput>) => {
    setInputState(prev => ({ ...prev, ...partial }));
  }, []);

  const setPrice = useCallback((price: number) => {
    // Reset calculation counter when user manually enters a value
    calculationCount.current = 0;
    
    // Validate price input
    if (isNaN(price)) {
      setError('Invalid price value');
      return;
    }
    
    // Reasonable price limits (5 to 200 as percentage of face value)
    if (price < 5 || price > 200) {
      setError('Price must be between 5 and 200 (as % of face value)');
      return;
    }
    
    setInput({ 
      price,
      lockedField: 'PRICE',
      calculationId: undefined // Clear calculationId for user input
    });
    setError(undefined); // Clear any previous errors
  }, [setInput]);

  const setYieldValue = useCallback((yieldValue: number) => {
    // Reset calculation counter when user manually enters a value
    calculationCount.current = 0;
    
    // Validate yield input
    if (isNaN(yieldValue)) {
      setError('Invalid yield value');
      return;
    }
    
    // Reasonable yield limits (-5% to 50%)
    if (yieldValue < -5 || yieldValue > 50) {
      setError('Yield must be between -5% and 50%');
      return;
    }
    
    setInput({ 
      yieldValue, 
      lockedField: 'YIELD',
      calculationId: undefined // Clear calculationId for user input
    });
    setError(undefined); // Clear any previous errors
  }, [setInput]);

  const setSpread = useCallback((spread: number) => {
    // Reset calculation counter when user manually enters a value
    calculationCount.current = 0;
    
    // Validate spread input
    if (isNaN(spread)) {
      setError('Invalid spread value');
      return;
    }
    
    // Reasonable spread limits (-1000 to 5000 basis points)
    if (spread < -1000 || spread > 5000) {
      setError('Spread must be between -1000 and 5000 basis points');
      return;
    }
    
    setInput({ 
      spread, 
      lockedField: 'SPREAD',
      calculationId: undefined // Clear calculationId for user input
    });
    setError(undefined); // Clear any previous errors
  }, [setInput]);

  const setSettlementDate = useCallback((date: string) => {
    setInput({ settlementDate: date });
  }, [setInput]);

  const lockField = useCallback((field: 'PRICE' | 'YIELD' | 'SPREAD') => {
    setInput({ lockedField: field });
  }, [setInput]);

  const unlockField = useCallback(() => {
    setInput({ lockedField: undefined });
  }, [setInput]);

  const resetToMarket = useCallback(() => {
    // Reset calculation counter when user manually resets
    calculationCount.current = 0;
    
    // Bloomberg reference prices for Argentina bonds
    const bloombergRefPrices: Record<string, number> = {
      'GD29': 84.10,  // Argentina 2029
      'GD30': 80.19,  // Argentina 2030
      'GD38': 72.25,  // Argentina 2038
      'GD46': 66.13,  // Argentina 2046
      'GD35': 68.24,  // Argentina 2035
      'GD41': 63.13,  // Argentina 2041
    };
    
    // Try to determine Bloomberg reference price for Argentina bonds
    let marketPrice = bondResult?.analytics?.cleanPrice || input.price || 100; // Default to current or par
    
    if (bond && bond.issuer === 'REPUBLIC OF ARGENTINA') {
      // Try to extract ticker from bond maturity year
      const maturityYear = bond.maturityDate ? new Date(bond.maturityDate).getFullYear() : null;
      
      const tickerMap: Record<number, string> = {
        2029: 'GD29',
        2030: 'GD30',
        2035: 'GD35',
        2038: 'GD38',
        2041: 'GD41',
        2046: 'GD46'
      };
      
      if (maturityYear && tickerMap[maturityYear]) {
        const ticker = tickerMap[maturityYear];
        marketPrice = bloombergRefPrices[ticker] || marketPrice;
        console.log(`📊 Reset to Bloomberg reference price for ${ticker}: ${marketPrice}`);
      }
    }
    
    // Reset to Bloomberg reference price for Argentina bonds, or last calculated values for others
    setInput({
      price: marketPrice,
      yieldValue: undefined, // Clear yield to recalculate from price
      spread: undefined,     // Clear spread to recalculate from price
      lockedField: 'PRICE',
      calculationId: undefined // Clear calculationId on reset
    });
    setError(undefined); // Clear any errors
  }, [bondResult?.analytics, input, setInput, bond]);

  const runScenario = useCallback((shockBp: number) => {
    if (bondResult?.analytics?.yieldToMaturity) {
      const newYieldValue = bondResult.analytics.yieldToMaturity + shockBp / 100;
      setYieldValue(newYieldValue);
    }
  }, [bondResult?.analytics?.yieldToMaturity, setYieldValue]);

  return {
    input,
    analytics: bondResult?.analytics,
    bondResult,
    isCalculating,
    error,
    setInput,
    setPrice,
    setYieldValue,
    setSpread,
    setSettlementDate,
    lockField,
    unlockField,
    resetToMarket,
    runScenario,
  };
} 