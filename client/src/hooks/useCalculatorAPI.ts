import { useCallback, useMemo } from 'react';
import { BondDefinition } from '@shared/schema';

export interface LivePriceInfo {
  price: number;
  source: 'live' | 'reference' | 'default';
}

export interface CalculationRequest {
  issuer: string;
  cusip?: string | null;
  isin?: string | null;
  faceValue: number;
  couponRate: number;
  issueDate: string;
  maturityDate: string;
  firstCouponDate?: string | null;
  paymentFrequency: number;
  dayCountConvention: string;
  currency: string;
  settlementDays?: number | null;
  isAmortizing: boolean;
  isCallable: boolean;
  isPuttable: boolean;
  isVariableCoupon: boolean;
  amortizationSchedule?: any[];
  callSchedule?: any[];
  putSchedule?: any[];
  couponRateChanges?: any[];
  settlementDate: string;
  predefinedCashFlows?: any[];
  marketPrice?: number;
  targetYield?: number;
  targetSpread?: number;
}

export interface CalculationResponse {
  status: string;
  analytics: any;
  cashFlows?: any[];
  calculationTime?: number;
}

// Bloomberg reference prices for fallback
const BLOOMBERG_REFERENCE_PRICES: Record<string, number> = {
  'GD29D': 74.93,
  'GD30D': 69.40,
  'GD35D': 68.40,
  'GD38D': 73.10,
  'GD41D': 63.40,
  'GD46D': 65.78
};

// Stable ticker mapping to avoid recreating on every call
const TICKER_MAP: Record<number, string> = {
  2029: 'GD29D',
  2030: 'GD30D',
  2035: 'GD35D',
  2038: 'GD38D',
  2041: 'GD41D',
  2046: 'GD46D'
};

export function useCalculatorAPI(bond?: BondDefinition) {
  
  // Check if bond supports live pricing
  const checkLiveSupport = useCallback(async (
    ticker?: string,
    isin?: string,
    issuer?: string
  ) => {
    const response = await fetch('/api/bonds/check-live-support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, isin, issuer })
    });
    
    if (!response.ok) {
      throw new Error('Failed to check live price support');
    }
    
    return response.json();
  }, []);

  // Fetch live price from data912
  const fetchLivePriceData = useCallback(async (data912Symbol: string) => {
    const response = await fetch(`/api/bonds/live-price/${data912Symbol}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch live price');
    }
    
    return response.json();
  }, []);

  // Get Bloomberg fallback price for Argentina bonds
  const getBloombergFallback = useCallback((issuer?: string, maturityDate?: string): LivePriceInfo | null => {
    if (!issuer?.includes('ARGENTINA') || !maturityDate) {
      return null;
    }

    const maturityYear = new Date(maturityDate).getFullYear();
    const fallbackTicker = TICKER_MAP[maturityYear];
    const fallbackPrice = fallbackTicker ? BLOOMBERG_REFERENCE_PRICES[fallbackTicker] : null;
    
    if (fallbackPrice) {
      console.log(`📊 Using Bloomberg fallback price for ${fallbackTicker}: ${fallbackPrice}`);
      return { price: fallbackPrice, source: 'reference' };
    }
    
    return null;
  }, []);

  // Main fetch live price function
  const fetchLivePrice = useCallback(async (
    ticker?: string,
    isin?: string,
    issuer?: string
  ): Promise<LivePriceInfo> => {
    try {
      // Check support
      const supportInfo = await checkLiveSupport(ticker, isin, issuer);
      
      if (!supportInfo.isSupported) {
        console.log(`📊 Live pricing not supported for ${ticker || 'bond'}, using default`);
        return { price: 100, source: 'default' };
      }
      
      // Fetch live price
      const priceData = await fetchLivePriceData(supportInfo.data912Symbol);
      
      console.log(`📊 Fetched ${priceData.priceSource} price for ${supportInfo.data912Symbol}: ${priceData.price}`);
      
      return {
        price: priceData.price,
        source: priceData.priceSource === 'live' ? 'live' : 'reference'
      };
      
    } catch (error) {
      console.warn('Failed to fetch live price:', error);
      
      // Try Bloomberg fallback
      const fallback = getBloombergFallback(issuer || bond?.issuer, bond?.maturityDate);
      if (fallback) {
        return fallback;
      }
      
      return { price: 100, source: 'default' };
    }
  }, [bond?.issuer, bond?.maturityDate, checkLiveSupport, fetchLivePriceData, getBloombergFallback]);

  // Calculate bond analytics
  const calculateBond = useCallback(async (request: CalculationRequest): Promise<CalculationResponse> => {
    const response = await fetch('/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = `Calculation failed: ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorData);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        if (errorData) errorMessage = errorData;
      }
      
      // Special handling for spread calculation errors
      if (errorMessage.includes('Treasury curve') || errorMessage.includes('spread')) {
        throw new Error('Treasury curve data is required for spread calculations. Please wait a moment and try again.');
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    
    console.log('🔍 API: Received calculation result:', {
      status: result.status,
      ytm: result.analytics?.yieldToMaturity,
      duration: result.analytics?.duration,
      cleanPrice: result.analytics?.cleanPrice,
      spread: result.analytics?.spread,
      hasAnalytics: !!result.analytics
    });
    
    // Validate the result
    if (!result.analytics || typeof result.analytics.cleanPrice !== 'number') {
      console.error('🔍 API: Invalid result structure:', result);
      throw new Error('Invalid calculation result received');
    }
    
    return result;
  }, []);

  return useMemo(() => ({
    fetchLivePrice,
    calculateBond,
    getBloombergFallback,
  }), [fetchLivePrice, calculateBond, getBloombergFallback]);
}