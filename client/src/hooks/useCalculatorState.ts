import { useState, useEffect, useCallback } from "react";
import { BondDefinition, BondAnalytics, BondResult } from "@shared/schema";

export interface CalculatorInput {
  price?: number;
  yieldValue?: number;
  spread?: number;
  settlementDate: string;
  priceFormat: 'DECIMAL' | 'FRACTIONAL';
  yieldPrecision: number;
  lockedField?: 'PRICE' | 'YIELD' | 'SPREAD';
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
  const [input, setInputState] = useState<CalculatorInput>({
    price: initialBondResult?.analytics?.cleanPrice || undefined,
    yieldValue: initialBondResult?.analytics?.yieldToMaturity || undefined,
    spread: initialBondResult?.analytics?.spread || undefined,
    settlementDate: new Date().toISOString().split('T')[0],
    priceFormat: 'DECIMAL',
    yieldPrecision: 3,
    lockedField: 'PRICE' // Default to price mode
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

  // Debounced calculation effect
  useEffect(() => {
    if (!bond) return;

    const calculateAnalytics = async () => {
      setIsCalculating(true);
      setError(undefined);

      try {
        // Debug logging for predefined cash flows
        if (predefinedCashFlows && predefinedCashFlows.length > 0) {
          console.log('🔥 Calculator State: Using predefined cash flows', predefinedCashFlows.length, 'flows');
        } else {
          console.log('⚠️ Calculator State: No predefined cash flows available');
        }
        
        // Debug current state
        console.log('🔍 Current input state:', {
          price: input.price,
          yieldValue: input.yieldValue,
          spread: input.spread,
          lockedField: input.lockedField
        });
        
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

        console.log('📤 Sending calculation request:', {
          lockedField: input.lockedField,
          hasMarketPrice: 'marketPrice' in calculationRequest,
          hasTargetYield: 'targetYield' in calculationRequest,
          hasTargetSpread: 'targetSpread' in calculationRequest,
          targetSpread: calculationRequest.targetSpread,
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
          console.log('📥 Frontend received result:', {
            hasAnalytics: !!result.analytics,
            price: result.analytics?.cleanPrice,
            ytm: result.analytics?.yieldToMaturity,
            spread: result.analytics?.spread
          });
          
          // Validate the result before updating state
          if (!result.analytics || typeof result.analytics.cleanPrice !== 'number') {
            throw new Error('Invalid calculation result received');
          }
          
          // Update the input state with the calculated values
          setInputState(prev => ({
            ...prev,
            price: result.analytics.cleanPrice,
            yieldValue: result.analytics.yieldToMaturity,
            spread: result.analytics.spread,
          }));
          
          setBondResult(prev => ({
            bond: bond,
            cashFlows: prev?.cashFlows || result.cashFlows || [],
            analytics: result.analytics,
            buildTime: result.calculationTime || Date.now(),
            status: result.status || 'success',
          }));
        }
      } catch (err) {
        console.error('❌ Frontend calculation error:', err);
        console.error('❌ Input state at error:', input);
        setError(err instanceof Error ? err.message : 'Calculation failed');
      } finally {
        setIsCalculating(false);
      }
    };

    // Debounce calculations to avoid excessive API calls
    const timeoutId = setTimeout(calculateAnalytics, 300);
    return () => clearTimeout(timeoutId);
  }, [bond, input.price, input.yieldValue, input.spread, input.settlementDate, predefinedCashFlows]);

  // Action handlers
  const setInput = useCallback((partial: Partial<CalculatorInput>) => {
    setInputState(prev => ({ ...prev, ...partial }));
  }, []);

  const setPrice = useCallback((price: number) => {
    setInput({ 
      price,
      lockedField: 'PRICE'
    });
  }, [setInput]);

  const setYieldValue = useCallback((yieldValue: number) => {
    setInput({ 
      yieldValue, 
      lockedField: 'YIELD' 
    });
  }, [setInput]);

  const setSpread = useCallback((spread: number) => {
    console.log('🎯 setSpread called with:', spread);
    
    // Validate spread input
    if (isNaN(spread)) {
      setError('Invalid spread value');
      return;
    }
    
    // Reasonable spread limits (-1000 to 10000 basis points)
    if (spread < -1000 || spread > 10000) {
      setError('Spread must be between -1000 and 10000 basis points');
      return;
    }
    
    console.log('🎯 Setting input with spread:', spread, 'and lockedField: SPREAD');
    setInput({ 
      spread, 
      lockedField: 'SPREAD' 
    });
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
    // Reset to the last calculated values
    setInput({
      price: bondResult?.analytics?.cleanPrice || input.price || 100,
      yieldValue: bondResult?.analytics?.yieldToMaturity || input.yieldValue,
      spread: bondResult?.analytics?.spread || input.spread,
      lockedField: 'PRICE',
    });
  }, [bondResult?.analytics, input, setInput]);

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