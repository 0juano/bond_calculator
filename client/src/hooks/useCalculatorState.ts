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
    price: initialBondResult?.analytics?.marketPrice || 100, // Always default to 100 (par percentage)
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
          // Override with user inputs - adjust for amortizing bonds
          ...(input.price && { 
            marketPrice: (() => {
              // For amortizing bonds, adjust market price to account for principal already paid
              if (bond.isAmortizing && predefinedCashFlows && predefinedCashFlows.length > 0) {
                const settlementDate = new Date(input.settlementDate);
                const pastCFs = predefinedCashFlows
                  .filter(cf => new Date(cf.date) <= settlementDate)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                if (pastCFs.length > 0) {
                  const mostRecentCF = pastCFs[pastCFs.length - 1];
                  const currentOutstanding = mostRecentCF.remainingNotional;
                  const originalFaceValue = bond.faceValue ? parseFloat(bond.faceValue) : 1000;
                  const adjustedPrice = input.price * (currentOutstanding / originalFaceValue);
                  
                  console.log(`🔧 Amortizing bond price adjustment: ${input.price}% × (${currentOutstanding}/${originalFaceValue}) = ${adjustedPrice.toFixed(4)}%`);
                  return adjustedPrice;
                }
              }
              return input.price;
            })()
          }),
          ...(input.yieldValue && { targetYield: input.yieldValue }),
          ...(input.spread && { targetSpread: input.spread }),
        };

        console.log('💰 Sending calculation request with price:', input.price);
        console.log('📊 Has predefined cash flows:', !!(calculationRequest as any).predefinedCashFlows);
        console.log('📊 Number of predefined cash flows:', ((calculationRequest as any).predefinedCashFlows || []).length);
        console.log('📊 Full request:', JSON.stringify(calculationRequest, null, 2));
        
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
    setInput({ price });
  }, [setInput]);

  const setYieldValue = useCallback((yieldValue: number) => {
    setInput({ 
      yieldValue, 
      price: undefined, 
      spread: undefined, 
      lockedField: 'YIELD' 
    });
  }, [setInput]);

  const setSpread = useCallback((spread: number) => {
    setInput({ 
      spread, 
      price: undefined, 
      yieldValue: undefined, 
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
      price: bondResult?.analytics?.marketPrice || 100, // Always reset to 100 (par percentage)
      yieldValue: undefined,
      spread: undefined,
      lockedField: undefined,
    });
  }, [bondResult?.analytics?.marketPrice, setInput]);

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