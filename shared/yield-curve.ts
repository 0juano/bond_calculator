import { DecimalMath } from './decimal-utils';

/**
 * Yield curve interface for spread calculations
 */
export interface YieldCurve {
  interpolateYield(maturityYears: number): number;
  getCurveDate(): Date;
  getTenors(): Array<{ years: number; yield: number }>;
}

/**
 * Treasury yield curve point
 */
export interface TreasuryCurvePoint {
  tenor: string;
  maturityYears: number;
  yieldPercent: number;
}

/**
 * UST curve data structure matching existing API
 */
export interface USTCurveData {
  recordDate: string;
  tenors: Record<string, number>;
  marketTime?: string;
}

/**
 * Treasury Yield Curve implementation with interpolation
 */
export class TreasuryYieldCurve implements YieldCurve {
  private curvePoints: TreasuryCurvePoint[];
  private curveDate: Date;

  constructor(curveData: USTCurveData) {
    this.curveDate = new Date(curveData.recordDate);
    this.curvePoints = this.parseCurveData(curveData.tenors);
    
    // Sort by maturity for interpolation
    this.curvePoints.sort((a, b) => a.maturityYears - b.maturityYears);
    
    if (this.curvePoints.length === 0) {
      throw new Error('No valid curve points found');
    }
  }

  /**
   * Interpolate yield for given maturity in years
   */
  interpolateYield(maturityYears: number): number {
    if (this.curvePoints.length === 0) {
      throw new Error('No curve data available');
    }

    // Handle edge cases
    if (maturityYears <= this.curvePoints[0].maturityYears) {
      return this.curvePoints[0].yieldPercent;
    }
    
    if (maturityYears >= this.curvePoints[this.curvePoints.length - 1].maturityYears) {
      return this.curvePoints[this.curvePoints.length - 1].yieldPercent;
    }

    // Find the two points to interpolate between
    let lowerPoint: TreasuryCurvePoint | null = null;
    let upperPoint: TreasuryCurvePoint | null = null;

    for (let i = 0; i < this.curvePoints.length - 1; i++) {
      if (
        maturityYears >= this.curvePoints[i].maturityYears &&
        maturityYears <= this.curvePoints[i + 1].maturityYears
      ) {
        lowerPoint = this.curvePoints[i];
        upperPoint = this.curvePoints[i + 1];
        break;
      }
    }

    if (!lowerPoint || !upperPoint) {
      throw new Error('Unable to find interpolation points');
    }

    // Linear interpolation
    const timeDiff = upperPoint.maturityYears - lowerPoint.maturityYears;
    const yieldDiff = upperPoint.yieldPercent - lowerPoint.yieldPercent;
    const timeRatio = (maturityYears - lowerPoint.maturityYears) / timeDiff;
    
    return lowerPoint.yieldPercent + (yieldDiff * timeRatio);
  }

  /**
   * Get curve date
   */
  getCurveDate(): Date {
    return this.curveDate;
  }

  /**
   * Get all curve tenors
   */
  getTenors(): Array<{ years: number; yield: number }> {
    return this.curvePoints.map(point => ({
      years: point.maturityYears,
      yield: point.yieldPercent
    }));
  }

  /**
   * Parse UST curve data into standardized points
   */
  private parseCurveData(tenors: Record<string, number>): TreasuryCurvePoint[] {
    const points: TreasuryCurvePoint[] = [];

    for (const [tenor, yieldPercent] of Object.entries(tenors)) {
      const maturityYears = this.parseTenorToYears(tenor);
      if (maturityYears > 0 && !isNaN(yieldPercent)) {
        points.push({
          tenor,
          maturityYears,
          yieldPercent
        });
      }
    }

    return points;
  }

  /**
   * Convert tenor string to years (e.g., "3M" -> 0.25, "2Y" -> 2)
   */
  private parseTenorToYears(tenor: string): number {
    const cleanTenor = tenor.trim().toUpperCase();
    
    // Handle month tenors (e.g., "1M", "3M", "6M")
    if (cleanTenor.endsWith('M')) {
      const months = parseFloat(cleanTenor.replace('M', ''));
      return isNaN(months) ? 0 : months / 12;
    }
    
    // Handle year tenors (e.g., "1Y", "2Y", "10Y")
    if (cleanTenor.endsWith('Y')) {
      const years = parseFloat(cleanTenor.replace('Y', ''));
      return isNaN(years) ? 0 : years;
    }
    
    // Handle numeric-only tenors (assume years)
    const numeric = parseFloat(cleanTenor);
    return isNaN(numeric) ? 0 : numeric;
  }
}

/**
 * Factory function to create Treasury curve from UST data
 */
export function createTreasuryYieldCurve(ustData: USTCurveData): TreasuryYieldCurve {
  return new TreasuryYieldCurve(ustData);
}

/**
 * Utility functions for curve operations
 */
export class CurveUtils {
  /**
   * Calculate Z-Spread (Zero-volatility spread) for a bond
   * This is the constant spread added to each Treasury spot rate
   * that makes the bond's theoretical price equal to its market price
   */
  static calculateZSpread(
    cashFlows: Array<{ date: Date; amount: number }>,
    marketPrice: number,
    treasuryCurve: YieldCurve,
    settlementDate: Date,
    tolerance: number = 1e-4,
    maxIterations: number = 100
  ): number {
    let zSpread = 0; // Initial guess in decimal (0%)
    const priceTarget = DecimalMath.toDecimal(marketPrice);
    const settlement = new Date(settlementDate);

    for (let i = 0; i < maxIterations; i++) {
      const theoreticalPrice = this.calculatePriceWithSpread(
        cashFlows,
        treasuryCurve,
        zSpread,
        settlement
      );

      const priceDiff = DecimalMath.abs(
        DecimalMath.subtract(theoreticalPrice, priceTarget)
      );

      if (priceDiff.lte(tolerance)) {
        return zSpread * 10000; // Convert to basis points
      }

      // Use numerical derivative for Newton-Raphson
      const spreadBump = 0.0001; // 1 basis point
      const priceUp = this.calculatePriceWithSpread(
        cashFlows,
        treasuryCurve,
        zSpread + spreadBump,
        settlement
      );

      const derivative = DecimalMath.divide(
        DecimalMath.subtract(priceUp, theoreticalPrice),
        spreadBump
      );

      if (DecimalMath.abs(derivative).lte(1e-10)) {
        throw new Error('Z-Spread calculation failed: derivative too small');
      }

      const adjustment = DecimalMath.divide(
        DecimalMath.subtract(theoreticalPrice, priceTarget),
        derivative
      );

      zSpread = DecimalMath.toNumber(
        DecimalMath.subtract(zSpread, adjustment)
      );
    }

    throw new Error('Z-Spread calculation failed to converge');
  }

  /**
   * Calculate bond price using Treasury curve plus spread
   */
  private static calculatePriceWithSpread(
    cashFlows: Array<{ date: Date; amount: number }>,
    treasuryCurve: YieldCurve,
    spread: number,
    settlementDate: Date
  ) {
    let price = DecimalMath.toDecimal(0);
    const settlement = new Date(settlementDate);

    for (const cashFlow of cashFlows) {
      const years = this.calculateYearsToDate(settlement, cashFlow.date);
      const treasuryYield = treasuryCurve.interpolateYield(years) / 100;
      const discountRate = treasuryYield + spread;
      
      const discountFactor = DecimalMath.power(
        DecimalMath.add(1, discountRate),
        years
      );
      
      const presentValue = DecimalMath.divide(
        cashFlow.amount,
        discountFactor
      );
      
      price = price.plus(presentValue);
    }

    return price;
  }

  /**
   * Calculate years between dates
   */
  private static calculateYearsToDate(fromDate: Date, toDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = (toDate.getTime() - fromDate.getTime()) / msPerDay;
    return days / 365.25;
  }

  /**
   * Validate curve data quality
   */
  static validateCurveData(ustData: USTCurveData): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Check if we have any tenors
    if (!ustData.tenors || Object.keys(ustData.tenors).length === 0) {
      errors.push('No tenor data found');
      return { isValid: false, warnings, errors };
    }

    // Check for negative yields
    for (const [tenor, yieldValue] of Object.entries(ustData.tenors)) {
      if (yieldValue < 0) {
        warnings.push(`Negative yield detected for ${tenor}: ${yieldValue}%`);
      }
      if (isNaN(yieldValue)) {
        errors.push(`Invalid yield for ${tenor}: ${yieldValue}`);
      }
    }

    // Check for reasonable yield levels (0-20%)
    for (const [tenor, yieldValue] of Object.entries(ustData.tenors)) {
      if (yieldValue > 20) {
        warnings.push(`Unusually high yield for ${tenor}: ${yieldValue}%`);
      }
    }

    // Check curve date
    const curveDate = new Date(ustData.recordDate);
    const today = new Date();
    const daysOld = (today.getTime() - curveDate.getTime()) / (24 * 60 * 60 * 1000);
    
    if (daysOld > 7) {
      warnings.push(`Curve data is ${Math.floor(daysOld)} days old`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
} 