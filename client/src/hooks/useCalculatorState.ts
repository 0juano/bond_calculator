import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { BondDefinition, BondAnalytics, BondResult } from "@shared/schema";
import { useCalculatorAPI, CalculationRequest } from "./useCalculatorAPI";
import { useCalculatorValidation } from "./useCalculatorValidation";
import { getDefaultSettlementDate } from "@shared/day-count";

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
  fetchLivePrice: (ticker?: string, isin?: string, issuer?: string) => Promise<{ price: number; source: 'live' | 'reference' | 'default' }>;
}

export function useCalculatorState(
  bond?: BondDefinition,
  initialBondResult?: BondResult,
  predefinedCashFlows?: any[] // Add support for predefined cash flows
): CalculatorState {
  const api = useCalculatorAPI(bond);
  const validation = useCalculatorValidation();
  const calculationCount = useRef(0);
  
  // Memoize predefinedCashFlows to prevent unnecessary re-renders
  const memoizedCashFlows = useMemo(() => predefinedCashFlows, [predefinedCashFlows]);
  const lastCalculationId = useRef<string>('');
  const [input, setInputState] = useState<CalculatorInput>({
    price: initialBondResult?.analytics?.cleanPrice || 100, // Default to par if no initial result
    yieldValue: initialBondResult?.analytics?.yieldToMaturity || undefined,
    spread: initialBondResult?.analytics?.spread || undefined,
    settlementDate: getDefaultSettlementDate(),
    priceFormat: 'DECIMAL',
    yieldPrecision: 3,
    lockedField: 'PRICE', // Default to price mode
    calculationId: undefined
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
      setInputState(prev => ({
        ...prev,
        price: initialBondResult.analytics.cleanPrice,
        yieldValue: initialBondResult.analytics.yieldToMaturity,
        spread: initialBondResult.analytics.spread,
      }));
    }
  }, [initialBondResult]);

  // Use fetchLivePrice from API hook
  const fetchLivePrice = api.fetchLivePrice;

  // Reset calculator state when bond changes (for bond switching)
  useEffect(() => {
    if (!bond) return;
    
    const initializeBondPrice = async () => {
      calculationCount.current = 0; // Reset calculation counter
      
      // Fetch live price for the bond
      const priceInfo = await fetchLivePrice(undefined, bond.isin || undefined, bond.issuer);
      
      // Reset calculator state for new bond
      setInputState(prev => ({
        ...prev,
        price: priceInfo.price,
        yieldValue: undefined, // Clear yield to recalculate from price
        spread: undefined,     // Clear spread to recalculate from price
        lockedField: 'PRICE',  // Reset to price mode
        calculationId: undefined // Clear calculationId to trigger fresh calculation
      }));
      
      setError(undefined); // Clear any previous errors
    };
    
    initializeBondPrice();
  }, [bond?.issuer, bond?.maturityDate, bond?.isin, fetchLivePrice]); // Watch for bond changes

  // Debounced calculation effect
  useEffect(() => {
    if (!bond) return;

    // Check if we have valid calculation inputs
    if (!validation.hasValidCalculationInputs(input)) {
      return;
    }

    // Generate unique calculation ID
    const calculationId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Skip if this is a result of our own calculation update
    if (input.calculationId && input.calculationId === lastCalculationId.current) {
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
        const calculationRequest: CalculationRequest = {
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
          isAmortizing: bond.isAmortizing ?? false,
          isCallable: bond.isCallable ?? false,
          isPuttable: bond.isPuttable ?? false,
          isVariableCoupon: bond.isVariableCoupon ?? false,
          amortizationSchedule: bond.amortizationSchedule || [],
          callSchedule: bond.callSchedule || [],
          putSchedule: bond.putSchedule || [],
          couponRateChanges: bond.couponRateChanges || [],
          settlementDate: input.settlementDate,
          // CRITICAL: Include predefined cash flows for JSON-first architecture
          ...(memoizedCashFlows && memoizedCashFlows.length > 0 && { 
            predefinedCashFlows: memoizedCashFlows.map(cf => ({
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


        
        const result = await api.calculateBond(calculationRequest);
        
        // Update the input state with the calculated values
        // ONLY update the fields that weren't the input to avoid infinite loops
        setInputState(prev => {
            const updates: Partial<CalculatorInput> = {};
            
            // Only update fields that weren't locked (i.e., weren't the input)
            // Always update calculated fields to show current results
            if (prev.lockedField !== 'PRICE') {
              const newPrice = result.analytics.cleanPrice;
              // Always update price when it's calculated
              updates.price = newPrice;
            }
            if (prev.lockedField !== 'YIELD') {
              const newYield = result.analytics.yieldToMaturity;
              // Always update yield when it's calculated
              updates.yieldValue = newYield;
            }
            if (prev.lockedField !== 'SPREAD') {
              const newSpread = result.analytics.spread;
              // Always update spread when it's calculated
              if (newSpread !== undefined) {
                updates.spread = newSpread;
              }
            }
            
            // Add the calculationId to track this update
            updates.calculationId = calculationId;
            
            return { ...prev, ...updates };
          });
          
        setBondResult(prev => ({
          bond: bond,
          cashFlows: prev?.cashFlows || result.cashFlows || [],
          analytics: result.analytics,
          buildTime: result.calculationTime || Date.now(),
          status: result.status || 'success',
        }));
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
    memoizedCashFlows,
    input.lockedField,
    input.price,
    input.yieldValue,
    input.spread,
    input.calculationId,
    api,
    validation
  ]);

  // Action handlers
  const setInput = useCallback((partial: Partial<CalculatorInput>) => {
    setInputState(prev => ({ ...prev, ...partial }));
  }, []);

  const setPrice = useCallback((price: number) => {
    // Reset calculation counter when user manually enters a value
    calculationCount.current = 0;
    
    // Validate price input
    const validationResult = validation.validatePrice(price);
    if (!validationResult.isValid) {
      setError(validationResult.error);
      return;
    }
    
    setInput({ 
      price,
      lockedField: 'PRICE',
      calculationId: undefined // Clear calculationId for user input
    });
    setError(undefined); // Clear any previous errors
  }, [setInput, validation]);

  const setYieldValue = useCallback((yieldValue: number) => {
    // Reset calculation counter when user manually enters a value
    calculationCount.current = 0;
    
    // Validate yield input
    const validationResult = validation.validateYield(yieldValue);
    if (!validationResult.isValid) {
      setError(validationResult.error);
      return;
    }
    
    setInput({ 
      yieldValue, 
      lockedField: 'YIELD',
      calculationId: undefined // Clear calculationId for user input
    });
    setError(undefined); // Clear any previous errors
  }, [setInput, validation]);

  const setSpread = useCallback((spread: number) => {
    // Reset calculation counter when user manually enters a value
    calculationCount.current = 0;
    
    // Validate spread input
    const validationResult = validation.validateSpread(spread);
    if (!validationResult.isValid) {
      setError(validationResult.error);
      return;
    }
    
    setInput({ 
      spread, 
      lockedField: 'SPREAD',
      calculationId: undefined // Clear calculationId for user input
    });
    setError(undefined); // Clear any previous errors
  }, [setInput, validation]);

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
    
    // Try to get Bloomberg reference price
    let marketPrice = bondResult?.analytics?.cleanPrice || input.price || 100; // Default to current or par
    
    const fallback = api.getBloombergFallback(bond?.issuer, bond?.maturityDate);
    if (fallback) {
      marketPrice = fallback.price;
      console.log(`📊 Reset to Bloomberg reference price: ${marketPrice}`);
    }
    
    // Reset to reference price
    setInput({
      price: marketPrice,
      yieldValue: undefined, // Clear yield to recalculate from price
      spread: undefined,     // Clear spread to recalculate from price
      lockedField: 'PRICE',
      calculationId: undefined // Clear calculationId on reset
    });
    setError(undefined); // Clear any errors
  }, [bondResult?.analytics, input, setInput, bond, api]);

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
    fetchLivePrice,
  };
} 