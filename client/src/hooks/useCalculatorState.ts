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
          ...(input.lockedField === 'PRICE' && input.price && { 
            marketPrice: input.price
          }),
          ...(input.lockedField === 'YIELD' && input.yieldValue && { 
            targetYield: input.yieldValue 
          }),
          ...(input.lockedField === 'SPREAD' && input.spread && { 
            targetSpread: input.spread 
          }),
          // If no field is locked but we have a price, send it
          ...(!input.lockedField && input.price && { 
            marketPrice: input.price
          }),
          // Fallback: if nothing is provided, use a reasonable default
          ...(!input.price && !input.yieldValue && !input.spread && !input.lockedField && {
            marketPrice: 100 // Par as last resort
          }),
        };

        
        const response = await fetch('/api/bonds/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calculationRequest),
        });

        if (!response.ok) {
          // Fallback to regular build endpoint
          const buildResponse = await fetch('/api/bonds/build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(calculationRequest),
          });
          
          if (buildResponse.ok) {
            const result = await buildResponse.json();
            setBondResult(result);
          } else {
            throw new Error(`Calculation failed: ${buildResponse.statusText}`);
          }
        } else {
          const result = await response.json();
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