import { BondAnalyticsEngine, CalculationResult, VanillaBondCalculator } from './bond-analytics-engine';
import { CleanBondDefinition, BondJsonUtils } from './bond-definition';
import { BondAnalytics } from './schema';
import { TreasuryYieldCurve, USTCurveData } from './yield-curve';

/**
 * Legacy bond interface for backward compatibility
 */
export interface LegacyBond {
  issuer: string;
  cusip?: string;
  isin?: string;
  faceValue: number;
  couponRate: number;
  issueDate: string;
  maturityDate: string;
  firstCouponDate?: string;
  paymentFrequency: number;
  dayCountConvention: string;
  currency: string;
  settlementDays: number;
  isAmortizing?: boolean;
  isCallable?: boolean;
  isPuttable?: boolean;
  isVariableCoupon?: boolean;
  marketPrice?: number;
  targetYield?: number;
  settlementDate?: string;
}

/**
 * Legacy cash flow interface
 */
export interface LegacyCashFlow {
  date: string;
  couponPayment: number;
  principalPayment: number;
  totalPayment: number;
  remainingNotional: number;
  paymentType: string;
}

/**
 * Bond Calculator Integration Class
 * Bridges the new analytics engine with existing server infrastructure
 */
export class BondCalculatorIntegration {
  private analyticsEngine: BondAnalyticsEngine;

  constructor() {
    this.analyticsEngine = new BondAnalyticsEngine();
  }

  /**
   * Calculate analytics from legacy bond format (backward compatibility)
   */
  async calculateFromLegacyBond(
    legacyBond: LegacyBond,
    legacyCashFlows: LegacyCashFlow[],
    ustCurveData?: USTCurveData
  ): Promise<CalculationResult<BondAnalytics>> {
    try {
      // Convert legacy format to clean bond definition
      const cleanBond = BondJsonUtils.fromLegacyBond(legacyBond, legacyCashFlows);
      
      // Determine market price and settlement date
      const marketPrice = legacyBond.marketPrice || legacyBond.faceValue;
      const settlementDate = legacyBond.settlementDate 
        ? new Date(legacyBond.settlementDate) 
        : new Date();

      // Create yield curve if UST data provided
      let yieldCurve;
      if (ustCurveData) {
        try {
          yieldCurve = new TreasuryYieldCurve(ustCurveData);
        } catch (error) {
          console.warn('Failed to create yield curve:', error);
          // Continue without curve - spread calculation will be skipped
        }
      }

      // Calculate analytics using new engine
      return this.analyticsEngine.calculate(
        cleanBond,
        marketPrice,
        settlementDate,
        yieldCurve
      );

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Integration calculation failed']
      };
    }
  }

  /**
   * Calculate analytics from clean bond JSON
   */
  async calculateFromCleanBond(
    cleanBond: CleanBondDefinition,
    marketPrice: number,
    settlementDate?: Date,
    ustCurveData?: USTCurveData
  ): Promise<CalculationResult<BondAnalytics>> {
    try {
      const settlement = settlementDate || new Date();

      // Create yield curve if UST data provided
      let yieldCurve;
      if (ustCurveData) {
        try {
          yieldCurve = new TreasuryYieldCurve(ustCurveData);
        } catch (error) {
          console.warn('Failed to create yield curve:', error);
        }
      }

      return this.analyticsEngine.calculate(
        cleanBond,
        marketPrice,
        settlement,
        yieldCurve
      );

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Clean bond calculation failed']
      };
    }
  }

  /**
   * Validate bond structure before calculation
   */
  validateBond(bond: CleanBondDefinition): CalculationResult<boolean> {
    try {
      // Use VanillaBondCalculator for validation (Phase 1)
      const calculator = new VanillaBondCalculator();
      return calculator.validateBond(bond);
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Bond validation failed']
      };
    }
  }

  /**
   * Calculate scenario analysis (price sensitivity to yield changes)
   */
  async calculateScenarioAnalysis(
    cleanBond: CleanBondDefinition,
    basePrice: number,
    yieldShockBps: number[], // Array of yield shocks in basis points
    settlementDate?: Date,
    ustCurveData?: USTCurveData
  ): Promise<Array<{ shockBps: number; analytics: BondAnalytics | null; error?: string }>> {
    const settlement = settlementDate || new Date();
    const results: Array<{ shockBps: number; analytics: BondAnalytics | null; error?: string }> = [];

    // Get base analytics
    const baseResult = await this.calculateFromCleanBond(
      cleanBond,
      basePrice,
      settlement,
      ustCurveData
    );

    if (!baseResult.success || !baseResult.data) {
      // If base calculation fails, return empty results
      return yieldShockBps.map(shock => ({
        shockBps: shock,
        analytics: null,
        error: 'Base calculation failed'
      }));
    }

    const baseYtm = baseResult.data.yieldToMaturity / 100;

    for (const shockBps of yieldShockBps) {
      try {
        // Apply yield shock
        const shockedYtm = baseYtm + (shockBps / 10000);
        
        // Calculate new price that would result in the shocked yield
        // This is a simplified approach - in practice, we'd use duration approximation
        const modifiedDuration = baseResult.data.duration;
        const priceChange = -modifiedDuration * (shockBps / 10000) * basePrice;
        const shockedPrice = basePrice + priceChange;

        const scenarioResult = await this.calculateFromCleanBond(
          cleanBond,
          shockedPrice,
          settlement,
          ustCurveData
        );

        results.push({
          shockBps: shockBps,
          analytics: scenarioResult.success ? scenarioResult.data! : null,
          error: scenarioResult.success ? undefined : scenarioResult.errors?.join(', ')
        });

      } catch (error) {
        results.push({
          shockBps: shockBps,
          analytics: null,
          error: error instanceof Error ? error.message : 'Scenario calculation failed'
        });
      }
    }

    return results;
  }

  /**
   * Batch calculation for multiple bonds
   */
  async calculateBatch(
    bonds: Array<{
      bond: CleanBondDefinition;
      marketPrice: number;
      settlementDate?: Date;
    }>,
    ustCurveData?: USTCurveData
  ): Promise<Array<CalculationResult<BondAnalytics>>> {
    const results: Array<CalculationResult<BondAnalytics>> = [];

    for (const bondInput of bonds) {
      const result = await this.calculateFromCleanBond(
        bondInput.bond,
        bondInput.marketPrice,
        bondInput.settlementDate,
        ustCurveData
      );
      results.push(result);
    }

    return results;
  }
}

/**
 * Factory function to create calculator integration instance
 */
export function createBondCalculator(): BondCalculatorIntegration {
  return new BondCalculatorIntegration();
}

/**
 * Utility functions for common calculations
 */
export class CalculatorUtils {
  /**
   * Convert yield to price using duration approximation
   */
  static approximatePriceFromYield(
    basePrice: number,
    baseYield: number,
    targetYield: number,
    duration: number
  ): number {
    const yieldChange = targetYield - baseYield;
    const priceChange = -duration * yieldChange * basePrice;
    return basePrice + priceChange;
  }

  /**
   * Convert price to yield using duration approximation
   */
  static approximateYieldFromPrice(
    basePrice: number,
    baseYield: number,
    targetPrice: number,
    duration: number
  ): number {
    if (duration === 0) return baseYield;
    
    const priceChange = targetPrice - basePrice;
    const yieldChange = -priceChange / (duration * basePrice);
    return baseYield + yieldChange;
  }

  /**
   * Calculate basis point value (DV01)
   */
  static calculateBasisPointValue(price: number, duration: number): number {
    return (duration * price) / 10000;
  }

  /**
   * Format analytics for display
   */
  static formatAnalytics(analytics: BondAnalytics): Record<string, string> {
    return {
      'Yield to Maturity': `${analytics.yieldToMaturity.toFixed(3)}%`,
      'Modified Duration': analytics.duration.toFixed(4),
      'Macaulay Duration': analytics.macaulayDuration.toFixed(4),
      'Convexity': analytics.convexity.toFixed(4),
      'Current Yield': `${analytics.currentYield.toFixed(3)}%`,
      'Clean Price': analytics.cleanPrice.toFixed(4),
      'Dirty Price': analytics.dirtyPrice.toFixed(4),
      'Accrued Interest': analytics.accruedInterest.toFixed(4),
      'Dollar Duration': `$${analytics.dollarDuration.toFixed(6)}`,
      'Days to Next Coupon': analytics.daysToNextCoupon.toString(),
      ...(analytics.spread && { 'Spread': `${(analytics.spread * 10000).toFixed(0)}bp` })
    };
  }
} 