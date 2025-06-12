import Decimal from 'decimal.js';
import { CleanBondDefinition, CleanCashFlow } from './bond-definition';
import { BondAnalytics } from './schema';
import { DecimalMath, FinancialMath } from './decimal-utils';
import { getDayCountConvention } from './day-count';
import { YieldCurve } from './yield-curve';

/**
 * Market inputs for bond calculations
 */
export interface MarketInputs {
  price?: number;
  yieldCurve?: YieldCurve;
  volatility?: number;
}

/**
 * Calculation result with error handling
 */
export interface CalculationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
}

/**
 * Bond calculator interface - Strategy pattern
 */
export interface BondCalculator {
  calculateYTM(
    bond: CleanBondDefinition, 
    price: number, 
    settlementDate: Date
  ): CalculationResult<number>;
  
  calculateDuration(
    bond: CleanBondDefinition, 
    ytm: number, 
    settlementDate: Date
  ): CalculationResult<{ macaulay: number; modified: number }>;
  
  calculateSpread(
    bond: CleanBondDefinition, 
    ytm: number, 
    curve: YieldCurve
  ): CalculationResult<number>;
  
  validateBond(bond: CleanBondDefinition): CalculationResult<boolean>;
}

/**
 * Main Bond Analytics Engine - Level 1 Core Calculator
 */
export class BondAnalyticsEngine {
  /**
   * Calculate comprehensive bond analytics from clean bond definition
   */
  calculate(
    bond: CleanBondDefinition,
    marketPrice: number,
    settlementDate: Date = new Date(),
    yieldCurve?: YieldCurve
  ): CalculationResult<BondAnalytics> {
    try {
      // Route to appropriate calculator based on bond features
      const calculator = this.getBondCalculator(bond);
      
      // Validate bond first
      const validation = calculator.validateBond(bond);
      if (!validation.success) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Core calculations
      const ytmResult = calculator.calculateYTM(bond, marketPrice, settlementDate);
      if (!ytmResult.success || ytmResult.data === undefined) {
        return {
          success: false,
          errors: ['Failed to calculate YTM'].concat(ytmResult.errors || [])
        };
      }
      const ytm = ytmResult.data;

      const durationResult = calculator.calculateDuration(bond, ytm, settlementDate);
      if (!durationResult.success || durationResult.data === undefined) {
        return {
          success: false,
          errors: ['Failed to calculate duration'].concat(durationResult.errors || [])
        };
      }
      const { macaulay: macaulayDuration, modified: modifiedDuration } = durationResult.data;

      // Universal calculations that don't depend on bond type
      const accruedInterest = this.calculateAccruedInterest(bond, settlementDate);
      const cleanPrice = marketPrice - accruedInterest;
      const dirtyPrice = marketPrice;
      const convexity = this.calculateConvexity(bond, ytm, settlementDate);
      const currentYield = this.calculateCurrentYield(bond, marketPrice);
      const dollarDuration = this.calculateDollarDuration(modifiedDuration, marketPrice);
      const daysToNextCoupon = this.calculateDaysToNextCoupon(bond, settlementDate);
      const totalCoupons = this.calculateTotalCoupons(bond, settlementDate);
      const averageLife = this.calculateAverageLife(bond, settlementDate);

      // Spread calculation if yield curve provided
      let spread: number | undefined;
      if (yieldCurve) {
        const spreadResult = calculator.calculateSpread(bond, ytm, yieldCurve);
        if (spreadResult.success && spreadResult.data !== undefined) {
          spread = spreadResult.data;
        }
      }

      // Build analytics result
      const analytics: BondAnalytics = {
        yieldToMaturity: ytm * 100, // Convert to percentage
        yieldToWorst: ytm * 100, // For now, same as YTM (will be overridden by specialized calculators)
        duration: modifiedDuration,
        macaulayDuration,
        averageLife,
        convexity,
        totalCoupons,
        presentValue: (cleanPrice / bond.bondInfo.faceValue) * 100,
        marketPrice,
        cleanPrice,
        dirtyPrice,
        accruedInterest,
        daysToNextCoupon,
        dollarDuration,
        currentYield: currentYield * 100,
        ...(spread && { spread: spread / 100 }) // Convert to decimal
      };

      return {
        success: true,
        data: analytics
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown calculation error']
      };
    }
  }

  /**
   * Route to appropriate calculator based on bond features
   */
  private getBondCalculator(bond: CleanBondDefinition): BondCalculator {
    // If bond has predefined cash flows, use the predefined cash flow calculator
    // This supports complex bonds (amortizing, callable, variable coupon) with precomputed cash flows
    if (bond.cashFlowSchedule && bond.cashFlowSchedule.length > 0) {
      return new PredefinedCashFlowCalculator();
    }
    
    // For traditional bond parameter calculations
    if (bond.features.isCallable) {
      // Future: return new CallableBondCalculator();
      throw new Error('Callable bonds not yet supported - use predefined cash flows');
    }
    if (bond.features.isAmortizing) {
      // Future: return new AmortizingBondCalculator();
      throw new Error('Amortizing bonds not yet supported - use predefined cash flows');
    }
    if (bond.features.isVariableCoupon) {
      // Future: return new VariableCouponCalculator();
      throw new Error('Variable coupon bonds not yet supported - use predefined cash flows');
    }
    
    return new VanillaBondCalculator();
  }

  /**
   * Calculate accrued interest since last coupon payment
   */
  private calculateAccruedInterest(bond: CleanBondDefinition, settlementDate: Date): number {
    const dayCount = getDayCountConvention(bond.bondInfo.dayCountConvention);
    
    // Find the last coupon payment before settlement
    const settlement = new Date(settlementDate);
    let lastCouponDate: Date | null = null;
    let nextCouponDate: Date | null = null;

    for (const cashFlow of bond.cashFlowSchedule) {
      const flowDate = new Date(cashFlow.date);
      if (flowDate <= settlement && cashFlow.couponPayment > 0) {
        if (!lastCouponDate || flowDate > lastCouponDate) {
          lastCouponDate = flowDate;
        }
      }
      if (flowDate > settlement && cashFlow.couponPayment > 0) {
        if (!nextCouponDate || flowDate < nextCouponDate) {
          nextCouponDate = flowDate;
        }
      }
    }

    if (!lastCouponDate || !nextCouponDate) {
      return 0; // No accrued interest if we can't find coupon dates
    }

    // Calculate accrued interest
    const daysSinceLastCoupon = dayCount.yearFraction(lastCouponDate, settlement);
    const daysInCouponPeriod = dayCount.yearFraction(lastCouponDate, nextCouponDate);
    
    if (daysInCouponPeriod.isZero()) {
      return 0;
    }

    const accruedFraction = daysSinceLastCoupon.div(daysInCouponPeriod);
    const nextCouponFlow = bond.cashFlowSchedule.find(cf => 
      new Date(cf.date).getTime() === nextCouponDate!.getTime()
    );
    
    if (!nextCouponFlow) {
      return 0;
    }

    return DecimalMath.toNumber(
      DecimalMath.multiply(nextCouponFlow.couponPayment, accruedFraction)
    );
  }

  /**
   * Calculate bond convexity
   */
  private calculateConvexity(bond: CleanBondDefinition, ytm: number, settlementDate: Date): number {
    // Use cash flows for convexity calculation
    const settlement = new Date(settlementDate);
    let convexity = new Decimal(0);
    const ytmDecimal = DecimalMath.toDecimal(ytm);
    const freq = bond.bondInfo.paymentFrequency;

    for (const cashFlow of bond.cashFlowSchedule) {
      const flowDate = new Date(cashFlow.date);
      if (flowDate <= settlement) continue;

      const yearsToFlow = this.calculateYearsToDate(settlement, flowDate);
      const periodsToFlow = yearsToFlow * freq;
      
      // Convexity formula: CF * t * (t + 1) / ((1 + y/n)^(t+2))
      const cashFlowDecimal = DecimalMath.toDecimal(cashFlow.totalPayment);
      const timeComponent = DecimalMath.multiply(periodsToFlow, periodsToFlow + 1);
      const discountRate = DecimalMath.add(1, DecimalMath.divide(ytmDecimal, freq));
      const discountFactor = DecimalMath.power(discountRate, periodsToFlow + 2);
      
      const termContribution = DecimalMath.divide(
        DecimalMath.multiply(cashFlowDecimal, timeComponent),
        discountFactor
      );
      
      convexity = convexity.plus(termContribution);
    }

    // Adjust for frequency squared
    const freqSquared = DecimalMath.power(freq, 2);
    convexity = DecimalMath.divide(convexity, freqSquared);
    
    // Scale by face value
    convexity = DecimalMath.divide(convexity, bond.bondInfo.faceValue);

    return DecimalMath.toNumber(convexity);
  }

  /**
   * Calculate current yield (annual coupon / market price)
   */
  private calculateCurrentYield(bond: CleanBondDefinition, marketPrice: number): number {
    const annualCoupon = bond.bondInfo.faceValue * (bond.bondInfo.couponRate / 100);
    return annualCoupon / marketPrice;
  }

  /**
   * Calculate dollar duration (DV01)
   */
  private calculateDollarDuration(modifiedDuration: number, marketPrice: number): number {
    return (modifiedDuration * marketPrice) / 10000;
  }

  /**
   * Calculate days to next coupon payment
   */
  private calculateDaysToNextCoupon(bond: CleanBondDefinition, settlementDate: Date): number {
    const settlement = new Date(settlementDate);
    let nextCouponDate: Date | null = null;

    for (const cashFlow of bond.cashFlowSchedule) {
      const flowDate = new Date(cashFlow.date);
      if (flowDate > settlement && cashFlow.couponPayment > 0) {
        if (!nextCouponDate || flowDate < nextCouponDate) {
          nextCouponDate = flowDate;
        }
      }
    }

    if (!nextCouponDate) {
      return 0;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((nextCouponDate.getTime() - settlement.getTime()) / msPerDay);
  }

  /**
   * Calculate total remaining coupons from settlement date
   */
  private calculateTotalCoupons(bond: CleanBondDefinition, settlementDate: Date): number {
    const settlement = new Date(settlementDate);
    return bond.cashFlowSchedule
      .filter(cf => new Date(cf.date) > settlement)
      .reduce((sum, cf) => sum + cf.couponPayment, 0);
  }

  /**
   * Calculate average life (weighted average time to principal payments)
   */
  private calculateAverageLife(bond: CleanBondDefinition, settlementDate: Date): number {
    const settlement = new Date(settlementDate);
    let weightedSum = 0;
    let totalPrincipal = 0;

    for (const cashFlow of bond.cashFlowSchedule) {
      const flowDate = new Date(cashFlow.date);
      if (flowDate <= settlement || cashFlow.principalPayment <= 0) continue;

      const yearsToFlow = this.calculateYearsToDate(settlement, flowDate);
      weightedSum += cashFlow.principalPayment * yearsToFlow;
      totalPrincipal += cashFlow.principalPayment;
    }

    return totalPrincipal > 0 ? weightedSum / totalPrincipal : 0;
  }

  /**
   * Calculate years between two dates using ACT/365 convention
   */
  private calculateYearsToDate(fromDate: Date, toDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = (toDate.getTime() - fromDate.getTime()) / msPerDay;
    return days / 365.25; // Using 365.25 to account for leap years
  }
}

/**
 * Vanilla Bond Calculator - Phase 1 Implementation
 * Handles standard fixed-rate bonds without options or complex features
 */
export class VanillaBondCalculator implements BondCalculator {
  /**
   * Calculate Yield to Maturity using Newton-Raphson method
   */
  calculateYTM(
    bond: CleanBondDefinition,
    price: number,
    settlementDate: Date
  ): CalculationResult<number> {
    try {
      const settlement = new Date(settlementDate);
      
      // Build cash flow array for YTM calculation
      const futureCashFlows: Array<{ date: Date; amount: number }> = [];
      
      for (const cashFlow of bond.cashFlowSchedule) {
        const flowDate = new Date(cashFlow.date);
        if (flowDate > settlement) {
          futureCashFlows.push({
            date: flowDate,
            amount: cashFlow.totalPayment
          });
        }
      }

      if (futureCashFlows.length === 0) {
        return {
          success: false,
          errors: ['No future cash flows found']
        };
      }

      // Use Newton-Raphson to solve for yield
      const ytmDecimal = this.solveYTMNewtonRaphson(futureCashFlows, price, settlement);
      
      return {
        success: true,
        data: DecimalMath.toNumber(ytmDecimal)
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'YTM calculation failed']
      };
    }
  }

  /**
   * Calculate Macaulay and Modified Duration
   */
  calculateDuration(
    bond: CleanBondDefinition,
    ytm: number,
    settlementDate: Date
  ): CalculationResult<{ macaulay: number; modified: number }> {
    try {
      const settlement = new Date(settlementDate);
      const ytmDecimal = DecimalMath.toDecimal(ytm);
      const freq = bond.bondInfo.paymentFrequency;
      
      let weightedCashFlows = new Decimal(0);
      let totalPresentValue = new Decimal(0);

      for (const cashFlow of bond.cashFlowSchedule) {
        const flowDate = new Date(cashFlow.date);
        if (flowDate <= settlement) continue;

        const yearsToFlow = this.calculateYearsToDate(settlement, flowDate);
        const periodsToFlow = yearsToFlow * freq;
        
        const cashFlowDecimal = DecimalMath.toDecimal(cashFlow.totalPayment);
        const discountRate = DecimalMath.add(1, DecimalMath.divide(ytmDecimal, freq));
        const discountFactor = DecimalMath.power(discountRate, periodsToFlow);
        const presentValue = DecimalMath.divide(cashFlowDecimal, discountFactor);
        
        weightedCashFlows = weightedCashFlows.plus(
          DecimalMath.multiply(presentValue, periodsToFlow)
        );
        totalPresentValue = totalPresentValue.plus(presentValue);
      }

      if (totalPresentValue.isZero()) {
        return {
          success: false,
          errors: ['No present value found for duration calculation']
        };
      }

      // Macaulay Duration in periods, then convert to years
      const macaulayDurationPeriods = DecimalMath.divide(weightedCashFlows, totalPresentValue);
      const macaulayDuration = DecimalMath.divide(macaulayDurationPeriods, freq);
      
      // Modified Duration = Macaulay Duration / (1 + YTM/frequency)
      const modifiedDuration = DecimalMath.divide(
        macaulayDuration,
        DecimalMath.add(1, DecimalMath.divide(ytmDecimal, freq))
      );

      return {
        success: true,
        data: {
          macaulay: DecimalMath.toNumber(macaulayDuration),
          modified: DecimalMath.toNumber(modifiedDuration)
        }
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Duration calculation failed']
      };
    }
  }

  /**
   * Calculate spread over benchmark yield curve
   */
  calculateSpread(
    bond: CleanBondDefinition,
    ytm: number,
    curve: YieldCurve
  ): CalculationResult<number> {
    try {
      // Calculate bond's weighted average life for interpolation
      const averageLife = this.calculateBondAverageLife(bond);
      
      // Interpolate Treasury yield at the bond's average life
      const treasuryYield = curve.interpolateYield(averageLife);
      
      // Spread = Bond YTM - Treasury Yield (in basis points)
      const spreadBps = (ytm - treasuryYield / 100) * 10000;
      
      return {
        success: true,
        data: spreadBps
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Spread calculation failed']
      };
    }
  }

  /**
   * Validate vanilla bond structure
   */
  validateBond(bond: CleanBondDefinition): CalculationResult<boolean> {
    const errors: string[] = [];

    // Basic structure validation
    if (!bond.bondInfo) {
      errors.push('Missing bond info');
    }
    if (!bond.cashFlowSchedule || bond.cashFlowSchedule.length === 0) {
      errors.push('Missing or empty cash flow schedule');
    }
    if (bond.bondInfo.faceValue <= 0) {
      errors.push('Face value must be positive');
    }
    if (bond.bondInfo.couponRate < 0) {
      errors.push('Coupon rate cannot be negative');
    }

    // Vanilla bond specific validation
    if (bond.features.isCallable) {
      errors.push('Vanilla calculator does not support callable bonds');
    }
    if (bond.features.isAmortizing) {
      errors.push('Vanilla calculator does not support amortizing bonds');
    }
    if (bond.features.isVariableCoupon) {
      errors.push('Vanilla calculator does not support variable coupon bonds');
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Newton-Raphson solver for YTM
   */
  private solveYTMNewtonRaphson(
    cashFlows: Array<{ date: Date; amount: number }>,
    price: number,
    settlementDate: Date,
    tolerance: number = 1e-8,
    maxIterations: number = 100
  ): Decimal {
    // Initial guess: coupon rate or 5%
    let yieldGuess = new Decimal(0.05);
    const priceDecimal = DecimalMath.toDecimal(price);
    const settlement = new Date(settlementDate);

    for (let i = 0; i < maxIterations; i++) {
      const { pv, duration } = this.calculatePVAndDuration(cashFlows, yieldGuess, settlement);
      
      const priceDiff = pv.minus(priceDecimal);
      
      if (DecimalMath.abs(priceDiff).lte(tolerance)) {
        return yieldGuess;
      }

      // Newton-Raphson: y_new = y_old - f(y) / f'(y)
      // f(y) = PV(y) - Price, f'(y) = -Duration * PV(y)
      const derivative = DecimalMath.multiply(duration, pv).negated();
      
      if (DecimalMath.abs(derivative).lte(1e-12)) {
        throw new Error('YTM calculation failed: derivative too small');
      }

      const adjustment = DecimalMath.divide(priceDiff, derivative);
      yieldGuess = yieldGuess.minus(adjustment);

      // Prevent negative yields
      if (yieldGuess.lt(0)) {
        yieldGuess = new Decimal(0.001);
      }
    }

    throw new Error('YTM calculation failed to converge');
  }

  /**
   * Calculate present value and duration for Newton-Raphson
   */
  private calculatePVAndDuration(
    cashFlows: Array<{ date: Date; amount: number }>,
    yieldGuess: Decimal,
    settlementDate: Date
  ): { pv: Decimal; duration: Decimal } {
    let pv = new Decimal(0);
    let weightedTime = new Decimal(0);
    const settlement = new Date(settlementDate);

    for (const cashFlow of cashFlows) {
      const years = this.calculateYearsToDate(settlement, cashFlow.date);
      const yearsDecimal = DecimalMath.toDecimal(years);
      const cashFlowDecimal = DecimalMath.toDecimal(cashFlow.amount);
      
      const discountFactor = DecimalMath.power(
        DecimalMath.add(1, yieldGuess),
        yearsDecimal
      );
      
      const presentValue = DecimalMath.divide(cashFlowDecimal, discountFactor);
      
      pv = pv.plus(presentValue);
      weightedTime = weightedTime.plus(
        DecimalMath.multiply(presentValue, yearsDecimal)
      );
    }

    const duration = pv.gt(0) ? DecimalMath.divide(weightedTime, pv) : new Decimal(0);
    
    return { pv, duration };
  }

  /**
   * Calculate bond's average life for spread calculation
   */
  private calculateBondAverageLife(bond: CleanBondDefinition): number {
    let weightedSum = 0;
    let totalPrincipal = 0;
    const issueDate = new Date(bond.bondInfo.issueDate);

    for (const cashFlow of bond.cashFlowSchedule) {
      const flowDate = new Date(cashFlow.date);
      const years = this.calculateYearsToDate(issueDate, flowDate);
      
      weightedSum += cashFlow.principalPayment * years;
      totalPrincipal += cashFlow.principalPayment;
    }

    return totalPrincipal > 0 ? weightedSum / totalPrincipal : this.calculateYearsToDate(
      issueDate, 
      new Date(bond.bondInfo.maturityDate)
    );
  }

  /**
   * Calculate years between dates using day count convention
   */
  private calculateYearsToDate(fromDate: Date, toDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = (toDate.getTime() - fromDate.getTime()) / msPerDay;
    return days / 365.25;
  }
}

/**
 * Predefined Cash Flow Calculator - Handles complex bonds with predefined cash flows
 * Supports amortizing, callable, puttable, and variable coupon bonds with JSON-provided cash flows
 */
export class PredefinedCashFlowCalculator implements BondCalculator {
  /**
   * Calculate Yield to Maturity using predefined cash flows
   */
  calculateYTM(
    bond: CleanBondDefinition,
    price: number,
    settlementDate: Date
  ): CalculationResult<number> {
    try {
      const settlement = new Date(settlementDate);
      
      // Build cash flow array for YTM calculation from predefined cash flows
      const futureCashFlows: Array<{ date: Date; amount: number }> = [];
      
      for (const cashFlow of bond.cashFlowSchedule) {
        const flowDate = new Date(cashFlow.date);
        if (flowDate > settlement) {
          futureCashFlows.push({
            date: flowDate,
            amount: cashFlow.totalPayment
          });
        }
      }

      if (futureCashFlows.length === 0) {
        return {
          success: false,
          errors: ['No future cash flows found in predefined schedule']
        };
      }

      // Use Newton-Raphson to solve for yield
      const ytmDecimal = this.solveYTMNewtonRaphson(futureCashFlows, price, settlement);
      
      return {
        success: true,
        data: DecimalMath.toNumber(ytmDecimal)
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'YTM calculation failed']
      };
    }
  }

  /**
   * Calculate Macaulay and Modified Duration using predefined cash flows
   */
  calculateDuration(
    bond: CleanBondDefinition,
    ytm: number,
    settlementDate: Date
  ): CalculationResult<{ macaulay: number; modified: number }> {
    try {
      const settlement = new Date(settlementDate);
      const ytmDecimal = DecimalMath.toDecimal(ytm);
      const freq = bond.bondInfo.paymentFrequency;
      
      let weightedCashFlows = new Decimal(0);
      let totalPresentValue = new Decimal(0);

      for (const cashFlow of bond.cashFlowSchedule) {
        const flowDate = new Date(cashFlow.date);
        if (flowDate <= settlement) continue;

        const yearsToFlow = this.calculateYearsToDate(settlement, flowDate);
        const periodsToFlow = yearsToFlow * freq;
        
        const cashFlowDecimal = DecimalMath.toDecimal(cashFlow.totalPayment);
        const discountRate = DecimalMath.add(1, DecimalMath.divide(ytmDecimal, freq));
        const discountFactor = DecimalMath.power(discountRate, periodsToFlow);
        const presentValue = DecimalMath.divide(cashFlowDecimal, discountFactor);
        
        weightedCashFlows = weightedCashFlows.plus(
          DecimalMath.multiply(presentValue, periodsToFlow)
        );
        totalPresentValue = totalPresentValue.plus(presentValue);
      }

      if (totalPresentValue.isZero()) {
        return {
          success: false,
          errors: ['No present value found for duration calculation']
        };
      }

      // Macaulay Duration in periods, then convert to years
      const macaulayDurationPeriods = DecimalMath.divide(weightedCashFlows, totalPresentValue);
      const macaulayDuration = DecimalMath.divide(macaulayDurationPeriods, freq);
      
      // Modified Duration = Macaulay Duration / (1 + YTM/frequency)
      const modifiedDuration = DecimalMath.divide(
        macaulayDuration,
        DecimalMath.add(1, DecimalMath.divide(ytmDecimal, freq))
      );

      return {
        success: true,
        data: {
          macaulay: DecimalMath.toNumber(macaulayDuration),
          modified: DecimalMath.toNumber(modifiedDuration)
        }
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Duration calculation failed']
      };
    }
  }

  /**
   * Calculate spread over benchmark yield curve
   */
  calculateSpread(
    bond: CleanBondDefinition,
    ytm: number,
    curve: YieldCurve
  ): CalculationResult<number> {
    try {
      // Calculate bond's weighted average life for interpolation
      const averageLife = this.calculateBondAverageLife(bond);
      
      // Interpolate Treasury yield at the bond's average life
      const treasuryYield = curve.interpolateYield(averageLife);
      
      // Spread = Bond YTM - Treasury Yield (in basis points)
      const spreadBps = (ytm - treasuryYield / 100) * 10000;
      
      return {
        success: true,
        data: spreadBps
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Spread calculation failed']
      };
    }
  }

  /**
   * Validate predefined cash flow bond structure
   */
  validateBond(bond: CleanBondDefinition): CalculationResult<boolean> {
    const errors: string[] = [];

    // Basic structure validation
    if (!bond.bondInfo) {
      errors.push('Missing bond info');
    }
    if (!bond.cashFlowSchedule || bond.cashFlowSchedule.length === 0) {
      errors.push('Missing or empty predefined cash flow schedule');
    }
    if (bond.bondInfo.faceValue <= 0) {
      errors.push('Face value must be positive');
    }
    if (bond.bondInfo.couponRate < 0) {
      errors.push('Coupon rate cannot be negative');
    }

    // Predefined cash flow specific validation
    if (bond.cashFlowSchedule) {
      for (let i = 0; i < bond.cashFlowSchedule.length; i++) {
        const cf = bond.cashFlowSchedule[i];
        if (cf.totalPayment <= 0) {
          errors.push(`Cash flow ${i + 1}: Total payment must be positive`);
        }
        if (cf.remainingNotional < 0) {
          errors.push(`Cash flow ${i + 1}: Remaining notional cannot be negative`);
        }
        if (!cf.date || isNaN(new Date(cf.date).getTime())) {
          errors.push(`Cash flow ${i + 1}: Invalid date`);
        }
      }

      // Check that cash flows are chronologically ordered
      for (let i = 1; i < bond.cashFlowSchedule.length; i++) {
        const prevDate = new Date(bond.cashFlowSchedule[i - 1].date);
        const currDate = new Date(bond.cashFlowSchedule[i].date);
        if (currDate <= prevDate) {
          errors.push('Cash flows must be in chronological order');
          break;
        }
      }

      // Check that final cash flow has zero remaining notional
      const finalCashFlow = bond.cashFlowSchedule[bond.cashFlowSchedule.length - 1];
      if (finalCashFlow.remainingNotional !== 0) {
        errors.push('Final cash flow must have zero remaining notional');
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Newton-Raphson solver for YTM using predefined cash flows
   */
  private solveYTMNewtonRaphson(
    cashFlows: Array<{ date: Date; amount: number }>,
    price: number,
    settlementDate: Date,
    tolerance: number = 1e-8,
    maxIterations: number = 100
  ): Decimal {
    // Initial guess: 5%
    let yieldGuess = new Decimal(0.05);
    const priceDecimal = DecimalMath.toDecimal(price);
    const settlement = new Date(settlementDate);

    for (let i = 0; i < maxIterations; i++) {
      const { pv, duration } = this.calculatePVAndDuration(cashFlows, yieldGuess, settlement);
      
      const priceDiff = pv.minus(priceDecimal);
      
      if (DecimalMath.abs(priceDiff).lte(tolerance)) {
        return yieldGuess;
      }

      // Newton-Raphson: y_new = y_old - f(y) / f'(y)
      // f(y) = PV(y) - Price, f'(y) = -Duration * PV(y)
      const derivative = DecimalMath.multiply(duration, pv).negated();
      
      if (DecimalMath.abs(derivative).lte(1e-12)) {
        throw new Error('YTM calculation failed: derivative too small');
      }

      const adjustment = DecimalMath.divide(priceDiff, derivative);
      yieldGuess = yieldGuess.minus(adjustment);

      // Prevent negative yields
      if (yieldGuess.lt(0)) {
        yieldGuess = new Decimal(0.001);
      }
    }

    throw new Error('YTM calculation failed to converge');
  }

  /**
   * Calculate present value and duration for Newton-Raphson
   */
  private calculatePVAndDuration(
    cashFlows: Array<{ date: Date; amount: number }>,
    yieldGuess: Decimal,
    settlementDate: Date
  ): { pv: Decimal; duration: Decimal } {
    let pv = new Decimal(0);
    let weightedTime = new Decimal(0);
    const settlement = new Date(settlementDate);

    for (const cashFlow of cashFlows) {
      const years = this.calculateYearsToDate(settlement, cashFlow.date);
      const yearsDecimal = DecimalMath.toDecimal(years);
      const cashFlowDecimal = DecimalMath.toDecimal(cashFlow.amount);
      
      const discountFactor = DecimalMath.power(
        DecimalMath.add(1, yieldGuess),
        yearsDecimal
      );
      
      const presentValue = DecimalMath.divide(cashFlowDecimal, discountFactor);
      
      pv = pv.plus(presentValue);
      weightedTime = weightedTime.plus(
        DecimalMath.multiply(presentValue, yearsDecimal)
      );
    }

    const duration = pv.gt(0) ? DecimalMath.divide(weightedTime, pv) : new Decimal(0);
    
    return { pv, duration };
  }

  /**
   * Calculate bond's average life for spread calculation
   */
  private calculateBondAverageLife(bond: CleanBondDefinition): number {
    let weightedSum = 0;
    let totalPrincipal = 0;
    const issueDate = new Date(bond.bondInfo.issueDate);

    for (const cashFlow of bond.cashFlowSchedule) {
      const flowDate = new Date(cashFlow.date);
      const years = this.calculateYearsToDate(issueDate, flowDate);
      
      weightedSum += cashFlow.principalPayment * years;
      totalPrincipal += cashFlow.principalPayment;
    }

    return totalPrincipal > 0 ? weightedSum / totalPrincipal : this.calculateYearsToDate(
      issueDate, 
      new Date(bond.bondInfo.maturityDate)
    );
  }

  /**
   * Calculate years between dates using ACT/365 convention
   */
  private calculateYearsToDate(fromDate: Date, toDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = (toDate.getTime() - fromDate.getTime()) / msPerDay;
    return days / 365.25;
  }
} 