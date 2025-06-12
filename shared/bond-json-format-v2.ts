/**
 * Improved Bond JSON Format V2
 * 
 * Design goals:
 * 1. Self-contained: All information needed for calculations
 * 2. Efficient: Pre-calculated values where helpful
 * 3. Flexible: Support for all bond types
 * 4. Clear: Unambiguous field names and units
 */

export interface BondDefinitionV2 {
  // Bond identification
  id: string;
  name: string;
  identifiers: {
    isin?: string;
    cusip?: string;
    sedol?: string;
    bloomberg?: string;
  };
  
  // Basic bond terms
  terms: {
    issuer: string;
    currency: string;
    faceValue: number;
    issueDate: string;      // ISO date
    maturityDate: string;   // ISO date
    settlementDays: number;
    dayCountConvention: '30/360' | 'ACT/ACT' | 'ACT/360' | 'ACT/365';
  };
  
  // Cash flow schedule with enhanced metadata
  cashFlows: CashFlowV2[];
  
  // Pre-calculated values for expensive operations
  analytics?: {
    weightedAverageLife?: number;      // WAL at issue
    weightedAverageCoupon?: number;    // For variable coupon bonds
    totalCouponPayments?: number;
    totalPrincipalPayments?: number;
  };
  
  // Optional features
  features?: {
    callable?: CallSchedule[];
    puttable?: PutSchedule[];
    convertible?: ConversionTerms;
    inflationLinked?: InflationTerms;
  };
  
  // Metadata
  metadata: {
    source: string;
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}

export interface CashFlowV2 {
  // Date information
  date: string;                    // ISO date
  dayCountFraction?: number;       // Pre-calculated if needed
  
  // Payment breakdown
  payment: {
    coupon: number;
    principal: number;
    total: number;
  };
  
  // State after payment
  outstandingNotional: number;     // Remaining principal after this payment
  
  // Rate information (for variable coupon bonds)
  rates?: {
    couponRate: number;           // Annual rate in decimal (0.05 = 5%)
    referenceRate?: number;       // For floating rate bonds
    spread?: number;              // Spread over reference rate
  };
  
  // Payment type for clarity
  type: 'COUPON' | 'PRINCIPAL' | 'MATURITY' | 'CALL' | 'PUT' | 'AMORTIZATION';
  
  // Optional metadata
  notes?: string;
}

export interface CallSchedule {
  startDate: string;
  endDate: string;
  price: number;              // As % of face value (e.g., 100.5 = 100.5%)
  type: 'AMERICAN' | 'EUROPEAN' | 'BERMUDA';
  callDates?: string[];       // For Bermuda style
}

export interface PutSchedule {
  startDate: string;
  endDate: string;  
  price: number;              // As % of face value
  type: 'AMERICAN' | 'EUROPEAN' | 'BERMUDA';
  putDates?: string[];        // For Bermuda style
}

export interface ConversionTerms {
  conversionRatio: number;
  conversionPrice: number;
  startDate: string;
  endDate: string;
}

export interface InflationTerms {
  indexName: string;          // e.g., "CPI-U"
  baseIndexValue: number;
  lagMonths: number;
  floor?: number;
  cap?: number;
}

/**
 * Example: Convert existing format to V2
 */
export function convertToV2Format(oldBond: any): BondDefinitionV2 {
  // Calculate analytics
  const cashFlows = oldBond.cashFlowSchedule || [];
  const totalCoupons = cashFlows.reduce((sum: number, cf: any) => sum + (cf.couponPayment || 0), 0);
  const totalPrincipal = cashFlows.reduce((sum: number, cf: any) => sum + (cf.principalPayment || 0), 0);
  
  // Calculate weighted average life
  let walSum = 0;
  let principalSum = 0;
  const issueDate = new Date(oldBond.bondInfo.issueDate);
  
  for (const cf of cashFlows) {
    if (cf.principalPayment > 0) {
      const years = (new Date(cf.date).getTime() - issueDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      walSum += cf.principalPayment * years;
      principalSum += cf.principalPayment;
    }
  }
  
  const wal = principalSum > 0 ? walSum / principalSum : 0;
  
  return {
    id: oldBond.metadata?.id || `bond_${Date.now()}`,
    name: oldBond.metadata?.name || `${oldBond.bondInfo.issuer} ${oldBond.bondInfo.couponRate}% ${oldBond.bondInfo.maturityDate}`,
    
    identifiers: {
      isin: oldBond.bondInfo.isin,
      cusip: oldBond.bondInfo.cusip
    },
    
    terms: {
      issuer: oldBond.bondInfo.issuer,
      currency: oldBond.bondInfo.currency || 'USD',
      faceValue: oldBond.bondInfo.faceValue,
      issueDate: oldBond.bondInfo.issueDate,
      maturityDate: oldBond.bondInfo.maturityDate,
      settlementDays: oldBond.bondInfo.settlementDays || 2,
      dayCountConvention: oldBond.bondInfo.dayCountConvention || '30/360'
    },
    
    cashFlows: cashFlows.map((cf: any, index: number) => {
      // Calculate implied coupon rate for this period
      let couponRate: number | undefined;
      if (cf.couponPayment > 0 && cf.remainingNotional > 0) {
        // Annual rate = (coupon payment * frequency) / notional
        const frequency = oldBond.bondInfo.paymentFrequency || 2;
        couponRate = (cf.couponPayment * frequency) / cf.remainingNotional;
      }
      
      return {
        date: cf.date,
        payment: {
          coupon: cf.couponPayment || 0,
          principal: cf.principalPayment || 0,
          total: cf.totalPayment || (cf.couponPayment + cf.principalPayment)
        },
        outstandingNotional: cf.remainingNotional || 0,
        rates: couponRate !== undefined ? { couponRate } : undefined,
        type: cf.paymentType || 'COUPON'
      };
    }),
    
    analytics: {
      weightedAverageLife: wal,
      totalCouponPayments: totalCoupons,
      totalPrincipalPayments: totalPrincipal
    },
    
    metadata: {
      source: oldBond.metadata?.source || 'CONVERTED',
      createdAt: oldBond.metadata?.created || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '2.0'
    }
  };
}

/**
 * Example V2 bond for Argentina 2038
 */
export const ARGENTINA_2038_V2_EXAMPLE: Partial<BondDefinitionV2> = {
  id: 'arg_2038_ae38d',
  name: 'Republic of Argentina 0.125% 2038',
  
  identifiers: {
    isin: 'ARARGE3209U2',
    bloomberg: 'AE38D'
  },
  
  terms: {
    issuer: 'REPUBLIC OF ARGENTINA',
    currency: 'USD',
    faceValue: 1000,
    issueDate: '2020-09-04',
    maturityDate: '2038-01-09',
    settlementDays: 2,
    dayCountConvention: '30/360'
  },
  
  // Cash flows would include rate information
  cashFlows: [
    {
      date: '2025-07-09',
      payment: { coupon: 25, principal: 0, total: 25 },
      outstandingNotional: 1000,
      rates: { couponRate: 0.05 }, // 5% annual rate
      type: 'COUPON'
    },
    // ... more cash flows
  ],
  
  analytics: {
    weightedAverageLife: 7.33,
    weightedAverageCoupon: 0.045, // 4.5% average
    totalCouponPayments: 387.53,
    totalPrincipalPayments: 1000
  }
};