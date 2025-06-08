import { useState, useEffect, useMemo, useCallback } from "react";
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
  setYield: (yield: number) => void;
  setSpread: (spread: number) => void;
  setSettlementDate: (date: string) => void;
  lockField: (field: 'PRICE' | 'YIELD' | 'SPREAD') => void;
  unlockField: () => void;
  resetToMarket: () => void;
  runScenario: (shockBp: number) => void;
}

export function useCalculatorState(
  bond?: BondDefinition,
  initialBondResult?: BondResult
): CalculatorState {
  const [input, setInputState] = useState<CalculatorInput>({
    price: initialBondResult?.analytics?.marketPrice || bond?.faceValue || 100,
    settlementDate: new Date().toISOString().split('T')[0],
    priceFormat: 'DECIMAL',
    yieldPrecision: 3,
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
        // Build enhanced request with calculator inputs
        const calculationRequest = {
          ...bond,
          settlementDate: input.settlementDate,
          // Override with user inputs
          ...(input.price && { marketPrice: input.price }),
          ...(input.yield && { targetYield: input.yield }),
          ...(input.spread && { targetSpread: input.spread }),
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
  }, [bond, input.price, input.yield, input.spread, input.settlementDate]);

  // Action handlers
  const setInput = useCallback((partial: Partial<CalculatorInput>) => {
    setInputState(prev => ({ ...prev, ...partial }));
  }, []);

  const setPrice = useCallback((price: number) => {
    setInput({ 
      price, 
      yield: undefined, 
      spread: undefined, 
      lockedField: 'PRICE' 
    });
  }, [setInput]);

  const setYield = useCallback((yield: number) => {
    setInput({ 
      yield, 
      price: undefined, 
      spread: undefined, 
      lockedField: 'YIELD' 
    });
  }, [setInput]);

  const setSpread = useCallback((spread: number) => {
    setInput({ 
      spread, 
      price: undefined, 
      yield: undefined, 
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
    setInput({
      price: bondResult?.analytics?.marketPrice || bond?.faceValue || 100,
      yield: undefined,
      spread: undefined,
      lockedField: undefined,
    });
  }, [bondResult?.analytics?.marketPrice, bond?.faceValue, setInput]);

  const runScenario = useCallback((shockBp: number) => {
    if (bondResult?.analytics?.yieldToMaturity) {
      const newYield = bondResult.analytics.yieldToMaturity + shockBp / 100;
      setYield(newYield);
    }
  }, [bondResult?.analytics?.yieldToMaturity, setYield]);

  return {
    input,
    analytics: bondResult?.analytics,
    bondResult,
    isCalculating,
    error,
    setInput,
    setPrice,
    setYield,
    setSpread,
    setSettlementDate,
    lockField,
    unlockField,
    resetToMarket,
    runScenario,
  };
} 