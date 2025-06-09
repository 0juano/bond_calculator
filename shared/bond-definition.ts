/**
 * Clean Bond Definition - EXOGENOUS VARIABLES ONLY
 * This schema contains ONLY the inputs that describe how a bond behaves.
 * NO calculated values like YTM, duration, spread, etc.
 */

export interface CleanBondDefinition {
  // Metadata
  metadata: {
    id: string;
    name: string;
    created: string;
    modified: string;
    version: "1.0";
    source: "USER_CREATED" | "GOLDEN_BOND" | "IMPORTED";
  };

  // Core Bond Information (Exogenous)
  bondInfo: {
    issuer: string;
    cusip?: string;
    isin?: string;
    faceValue: number;
    couponRate: number;
    issueDate: string;
    maturityDate: string;
    firstCouponDate?: string;
    paymentFrequency: number; // 1=annual, 2=semi-annual, 4=quarterly, 12=monthly
    dayCountConvention: string; // "30/360", "ACT/ACT", etc.
    currency: string;
    settlementDays: number;
  };

  // Bond Behavior Flags (Exogenous)
  features: {
    isAmortizing: boolean;
    isCallable: boolean;
    isPuttable: boolean;
    isVariableCoupon: boolean;
    isInflationLinked: boolean;
  };

  // Predefined Cash Flow Schedule (Exogenous)
  cashFlowSchedule: CleanCashFlow[];

  // Optional Behavior Rules (Exogenous)
  schedules?: {
    amortizationSchedule?: AmortizationRule[];
    callSchedule?: CallRule[];
    putSchedule?: PutRule[];
    couponRateChanges?: CouponRateChange[];
  };
}

/**
 * Clean Cash Flow - EXOGENOUS ONLY
 * Contains the contractual cash flows, not market-dependent calculations
 */
export interface CleanCashFlow {
  date: string; // ISO date string
  couponPayment: number; // Contractual coupon amount
  principalPayment: number; // Scheduled principal payment
  totalPayment: number; // couponPayment + principalPayment
  remainingNotional: number; // Outstanding principal after this payment
  paymentType: "COUPON" | "AMORTIZATION" | "MATURITY" | "CALL" | "PUT";
  notes?: string; // Optional description
}

/**
 * Amortization Rule - Describes scheduled principal payments
 */
export interface AmortizationRule {
  date: string;
  principalPercent: number; // Percentage of original face value
  description?: string;
}

/**
 * Call Option Rule - Describes call features
 */
export interface CallRule {
  firstCallDate: string;
  lastCallDate: string;
  callPrice: number; // As percentage of face value
  callType: "AMERICAN" | "EUROPEAN" | "BERMUDA";
  description?: string;
}

/**
 * Put Option Rule - Describes put features  
 */
export interface PutRule {
  firstPutDate: string;
  lastPutDate: string;
  putPrice: number; // As percentage of face value
  putType: "AMERICAN" | "EUROPEAN" | "BERMUDA";
  description?: string;
}

/**
 * Coupon Rate Change Rule - For floating rate bonds
 */
export interface CouponRateChange {
  effectiveDate: string;
  newCouponRate: number;
  rateType: "FIXED" | "FLOATING";
  referenceRate?: string; // e.g., "3M_LIBOR", "SOFR"
  spread?: number; // Spread over reference rate in basis points
  description?: string;
}

/**
 * Utility functions for bond JSON handling
 */
export class BondJsonUtils {
  /**
   * Generate a clean filename for saving bond JSON
   */
  static generateFilename(bond: CleanBondDefinition): string {
    const issuer = bond.bondInfo.issuer.replace(/[^a-zA-Z0-9]/g, '_');
    const coupon = bond.bondInfo.couponRate.toString().replace('.', '_');
    const maturity = bond.bondInfo.maturityDate.replace(/-/g, '');
    const timestamp = new Date().toISOString().split('T')[0];
    return `${issuer}_${coupon}pct_${maturity}_${timestamp}.json`;
  }

  /**
   * Validate bond JSON structure
   */
  static validateBondJson(data: any): data is CleanBondDefinition {
    return (
      data &&
      data.metadata &&
      data.bondInfo &&
      data.features &&
      data.cashFlowSchedule &&
      Array.isArray(data.cashFlowSchedule) &&
      typeof data.bondInfo.faceValue === 'number' &&
      typeof data.bondInfo.couponRate === 'number'
    );
  }

  /**
   * Create a clean bond from legacy format
   */
  static fromLegacyBond(legacyBond: any, cashFlows: any[]): CleanBondDefinition {
    const id = `bond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    return {
      metadata: {
        id,
        name: `${legacyBond.issuer} ${legacyBond.couponRate}% ${legacyBond.maturityDate}`,
        created: now,
        modified: now,
        version: "1.0",
        source: "USER_CREATED"
      },
      bondInfo: {
        issuer: legacyBond.issuer || "",
        cusip: legacyBond.cusip,
        isin: legacyBond.isin,
        faceValue: Number(legacyBond.faceValue) || 1000,
        couponRate: Number(legacyBond.couponRate) || 0,
        issueDate: legacyBond.issueDate,
        maturityDate: legacyBond.maturityDate,
        firstCouponDate: legacyBond.firstCouponDate,
        paymentFrequency: legacyBond.paymentFrequency || 2,
        dayCountConvention: legacyBond.dayCountConvention || "30/360",
        currency: legacyBond.currency || "USD",
        settlementDays: legacyBond.settlementDays || 3,
      },
      features: {
        isAmortizing: Boolean(legacyBond.isAmortizing),
        isCallable: Boolean(legacyBond.isCallable),
        isPuttable: Boolean(legacyBond.isPuttable),
        isVariableCoupon: Boolean(legacyBond.isVariableCoupon),
        isInflationLinked: false,
      },
      cashFlowSchedule: cashFlows.map(flow => ({
        date: flow.date,
        couponPayment: flow.couponPayment,
        principalPayment: flow.principalPayment,
        totalPayment: flow.totalPayment,
        remainingNotional: flow.remainingNotional,
        paymentType: flow.paymentType,
      })),
      schedules: {
        amortizationSchedule: legacyBond.amortizationSchedule,
        callSchedule: legacyBond.callSchedule,
        putSchedule: legacyBond.putSchedule,
        couponRateChanges: legacyBond.couponRateChanges,
      }
    };
  }
} 