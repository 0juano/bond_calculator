/**
 * BondTerminal Core - A robust, generalized bond analytics engine
 * 
 * Design Principles:
 * 1. JSON-first: Accepts bonds with predefined cash flows
 * 2. Accuracy: Uses precise financial mathematics
 * 3. Robustness: Multiple solver algorithms with automatic fallback
 * 4. Generality: Handles any bond type (vanilla, amortizing, callable, etc.)
 * 5. Performance: Efficient algorithms with convergence guarantees
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for high precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Bond definition with predefined cash flows
 */
export interface BondDefinition {
  bondInfo: {
    faceValue: number;
    issueDate: string;
    maturityDate: string;
    settlementDays: number;
    dayCountConvention: string;
  };
  cashFlows: CashFlow[];
}

/**
 * Individual cash flow
 */
export interface CashFlow {
  date: string;
  couponPayment: number;
  principalPayment: number;
  totalPayment: number;
  remainingNotional: number;
}

/**
 * Market data inputs
 */
export interface MarketData {
  settlementDate: Date;
  cleanPrice?: number;
  dirtyPrice?: number;
  yield?: number;
  treasuryCurve?: TreasuryCurve;
}

/**
 * Treasury curve for spread calculations
 */
export interface TreasuryCurve {
  date: string;
  points: Array<{ tenor: number; yield: number }>;
}

/**
 * Bond analytics output
 */
export interface BondAnalytics {
  // Pricing
  cleanPrice: number;
  dirtyPrice: number;
  accruedInterest: number;
  
  // Yields
  yieldToMaturity: number;
  yieldToWorst: number;
  currentYield: number;
  
  // Risk Metrics
  modifiedDuration: number;
  macaulayDuration: number;
  effectiveDuration: number;
  convexity: number;
  dollarDuration: number;
  
  // Spread
  spread?: number;
  zSpread?: number;
  assetSwapSpread?: number;
  
  // Other
  averageLife: number;
  totalCashFlows: number;
  daysToNextCoupon: number;
  
  // Metadata
  calculationDate: Date;
  convergenceInfo: {
    algorithm: string;
    iterations: number;
    precision: number;
  };
}

/**
 * Core BondTerminal Class
 */
export class BondCalculator {
  private readonly MAX_ITERATIONS = 100;
  private readonly PRECISION = 1e-10;
  
  /**
   * Calculate all bond analytics given price
   */
  calculateFromPrice(
    bond: BondDefinition,
    marketData: MarketData
  ): BondAnalytics {
    // Validate inputs
    this.validateInputs(bond, marketData);
    
    // Get settlement date
    const settlementDate = marketData.settlementDate;
    
    // Calculate accrued interest
    const accruedInterest = this.calculateAccruedInterest(bond, settlementDate);
    
    // Determine prices
    let cleanPrice: number;
    let dirtyPrice: number;
    
    if (marketData.cleanPrice !== undefined) {
      cleanPrice = marketData.cleanPrice;
      dirtyPrice = cleanPrice + accruedInterest;
    } else if (marketData.dirtyPrice !== undefined) {
      dirtyPrice = marketData.dirtyPrice;
      cleanPrice = dirtyPrice - accruedInterest;
    } else {
      throw new Error('Either cleanPrice or dirtyPrice must be provided');
    }
    
    // Get future cash flows
    const futureCashFlows = this.getFutureCashFlows(bond, settlementDate);
    
    // Calculate YTM
    const ytmResult = this.calculateYTM(futureCashFlows, dirtyPrice, settlementDate);
    
    // Calculate other metrics
    const currentYield = this.calculateCurrentYield(bond, cleanPrice, settlementDate);
    const { macaulay, modified, effective } = this.calculateDurations(
      futureCashFlows, ytmResult.yield, settlementDate, cleanPrice
    );
    const convexity = this.calculateConvexity(futureCashFlows, ytmResult.yield, settlementDate);
    const dollarDuration = this.calculateDollarDuration(modified, cleanPrice);
    const averageLife = this.calculateAverageLife(futureCashFlows, settlementDate);
    const daysToNextCoupon = this.calculateDaysToNextCoupon(futureCashFlows, settlementDate);
    
    // Calculate spread if treasury curve provided
    let spread: number | undefined;
    let zSpread: number | undefined;
    if (marketData.treasuryCurve) {
      spread = this.calculateSpread(ytmResult.yield, averageLife, marketData.treasuryCurve);
      zSpread = this.calculateZSpread(futureCashFlows, dirtyPrice, settlementDate, marketData.treasuryCurve);
    }
    
    return {
      cleanPrice,
      dirtyPrice,
      accruedInterest,
      yieldToMaturity: ytmResult.yield * 100, // Convert to percentage
      yieldToWorst: ytmResult.yield * 100, // TODO: Handle callable bonds
      currentYield: currentYield * 100,
      modifiedDuration: modified,
      macaulayDuration: macaulay,
      effectiveDuration: effective,
      convexity,
      dollarDuration,
      spread: spread ? spread * 10000 : undefined, // Convert to basis points
      zSpread: zSpread ? zSpread * 10000 : undefined,
      assetSwapSpread: undefined, // TODO: Implement
      averageLife,
      totalCashFlows: futureCashFlows.reduce((sum, cf) => sum + cf.amount, 0),
      daysToNextCoupon,
      calculationDate: settlementDate,
      convergenceInfo: {
        algorithm: ytmResult.algorithm,
        iterations: ytmResult.iterations,
        precision: ytmResult.precision
      }
    };
  }
  
  /**
   * Calculate bond price given yield
   */
  calculateFromYield(
    bond: BondDefinition,
    yield_: number,
    settlementDate: Date
  ): { cleanPrice: number; dirtyPrice: number; accruedInterest: number } {
    const futureCashFlows = this.getFutureCashFlows(bond, settlementDate);
    const dirtyPrice = this.calculatePresentValue(futureCashFlows, yield_, settlementDate);
    const accruedInterest = this.calculateAccruedInterest(bond, settlementDate);
    const cleanPrice = dirtyPrice - accruedInterest;
    
    return { cleanPrice, dirtyPrice, accruedInterest };
  }
  
  /**
   * Validate inputs
   */
  private validateInputs(bond: BondDefinition, marketData: MarketData): void {
    if (!bond || !bond.cashFlows || bond.cashFlows.length === 0) {
      throw new Error('Invalid bond definition: missing cash flows');
    }
    
    if (!marketData.settlementDate) {
      throw new Error('Settlement date is required');
    }
    
    if (marketData.cleanPrice === undefined && marketData.dirtyPrice === undefined) {
      throw new Error('Either clean price or dirty price must be provided');
    }
  }
  
  /**
   * Get future cash flows from settlement date
   */
  private getFutureCashFlows(
    bond: BondDefinition,
    settlementDate: Date
  ): Array<{ date: Date; amount: number; principal: number }> {
    return bond.cashFlows
      .filter(cf => new Date(cf.date) > settlementDate)
      .map(cf => ({
        date: new Date(cf.date),
        amount: cf.totalPayment,
        principal: cf.principalPayment
      }));
  }
  
  /**
   * Calculate YTM using multiple solver algorithms
   */
  private calculateYTM(
    cashFlows: Array<{ date: Date; amount: number }>,
    price: number,
    settlementDate: Date
  ): { yield: number; algorithm: string; iterations: number; precision: number } {
    // Try Newton-Raphson first
    try {
      const result = this.solveYTMNewtonRaphson(cashFlows, price, settlementDate);
      if (result.converged) {
        return {
          yield: result.yield,
          algorithm: 'Newton-Raphson',
          iterations: result.iterations,
          precision: result.precision
        };
      }
    } catch (e) {
      // Continue to next method
    }
    
    // Try Brent's method
    try {
      const result = this.solveYTMBrent(cashFlows, price, settlementDate);
      if (result.converged) {
        return {
          yield: result.yield,
          algorithm: 'Brent',
          iterations: result.iterations,
          precision: result.precision
        };
      }
    } catch (e) {
      // Continue to next method
    }
    
    // Fallback to bisection (always converges)
    const result = this.solveYTMBisection(cashFlows, price, settlementDate);
    return {
      yield: result.yield,
      algorithm: 'Bisection',
      iterations: result.iterations,
      precision: result.precision
    };
  }
  
  /**
   * Newton-Raphson solver for YTM
   */
  private solveYTMNewtonRaphson(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date
  ): { yield: number; converged: boolean; iterations: number; precision: number } {
    // Smart initial guess
    const initialGuess = this.getInitialYieldGuess(cashFlows, targetPrice, settlementDate);
    let yield_ = new Decimal(initialGuess);
    let iterations = 0;
    
    while (iterations < this.MAX_ITERATIONS) {
      const { pv, duration } = this.calculatePVAndDuration(cashFlows, yield_, settlementDate);
      const error = pv.minus(targetPrice);
      
      if (error.abs().lt(this.PRECISION)) {
        return {
          yield: yield_.toNumber(),
          converged: true,
          iterations,
          precision: error.abs().toNumber()
        };
      }
      
      // Newton-Raphson update with dampening
      const derivative = duration.mul(pv).neg();
      if (derivative.abs().lt(1e-10)) {
        return { yield: 0, converged: false, iterations, precision: 0 };
      }
      
      let adjustment = error.div(derivative);
      
      // Dampening for large adjustments
      const maxAdjustment = yield_.abs().mul(0.5);
      if (adjustment.abs().gt(maxAdjustment)) {
        adjustment = adjustment.gt(0) ? maxAdjustment : maxAdjustment.neg();
      }
      
      yield_ = yield_.minus(adjustment);
      
      // Keep yield reasonable
      if (yield_.lt(-0.5)) yield_ = new Decimal(-0.5);
      if (yield_.gt(10)) yield_ = new Decimal(10);
      
      iterations++;
    }
    
    return { yield: 0, converged: false, iterations, precision: 0 };
  }
  
  /**
   * Brent's method for YTM (combines bisection, secant, and inverse quadratic interpolation)
   */
  private solveYTMBrent(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date
  ): { yield: number; converged: boolean; iterations: number; precision: number } {
    // Initial bracketing
    let a = -0.5;
    let b = 10.0;
    let fa = this.calculatePresentValue(cashFlows, a, settlementDate) - targetPrice;
    let fb = this.calculatePresentValue(cashFlows, b, settlementDate) - targetPrice;
    
    if (fa * fb > 0) {
      // Try to find a bracket
      const bracket = this.findBracket(cashFlows, targetPrice, settlementDate);
      if (!bracket) {
        return { yield: 0, converged: false, iterations: 0, precision: 0 };
      }
      a = bracket.lower;
      b = bracket.upper;
      fa = bracket.fLower;
      fb = bracket.fUpper;
    }
    
    let c = a;
    let fc = fa;
    let d = b - a;
    let e = d;
    let iterations = 0;
    
    while (iterations < this.MAX_ITERATIONS) {
      if (fb === 0) {
        return { yield: b, converged: true, iterations, precision: 0 };
      }
      
      if (fa === fb) {
        return { yield: 0, converged: false, iterations, precision: 0 };
      }
      
      // Ensure b is the best approximation
      if (Math.abs(fa) < Math.abs(fb)) {
        [a, b] = [b, a];
        [fa, fb] = [fb, fa];
      }
      
      const tol = this.PRECISION;
      const m = 0.5 * (c - b);
      
      if (Math.abs(m) <= tol || fb === 0) {
        return { yield: b, converged: true, iterations, precision: Math.abs(fb) };
      }
      
      if (Math.abs(e) < tol || Math.abs(fa) <= Math.abs(fb)) {
        // Bisection
        d = m;
        e = m;
      } else {
        // Interpolation
        let s = fb / fa;
        let p: number, q: number;
        
        if (a === c) {
          // Linear interpolation
          p = 2 * m * s;
          q = 1 - s;
        } else {
          // Inverse quadratic interpolation
          const r = fb / fc;
          const t = fa / fc;
          p = s * (2 * m * t * (t - r) - (b - a) * (r - 1));
          q = (t - 1) * (r - 1) * (s - 1);
        }
        
        if (p > 0) q = -q;
        else p = -p;
        
        if (2 * p < Math.min(3 * m * q - Math.abs(tol * q), Math.abs(e * q))) {
          e = d;
          d = p / q;
        } else {
          // Interpolation failed, use bisection
          d = m;
          e = m;
        }
      }
      
      a = b;
      fa = fb;
      b += Math.abs(d) > tol ? d : (m > 0 ? tol : -tol);
      fb = this.calculatePresentValue(cashFlows, b, settlementDate) - targetPrice;
      
      if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
        c = a;
        fc = fa;
        d = b - a;
        e = d;
      }
      
      iterations++;
    }
    
    return { yield: b, converged: true, iterations, precision: Math.abs(fb) };
  }
  
  /**
   * Bisection method for YTM (guaranteed convergence)
   */
  private solveYTMBisection(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date
  ): { yield: number; converged: boolean; iterations: number; precision: number } {
    let lower = -0.99;
    let upper = 10.0;
    let iterations = 0;
    
    // Find initial bracket
    let fLower = this.calculatePresentValue(cashFlows, lower, settlementDate) - targetPrice;
    let fUpper = this.calculatePresentValue(cashFlows, upper, settlementDate) - targetPrice;
    
    if (fLower * fUpper > 0) {
      const bracket = this.findBracket(cashFlows, targetPrice, settlementDate);
      if (!bracket) {
        throw new Error('Cannot find yield bracket');
      }
      lower = bracket.lower;
      upper = bracket.upper;
      fLower = bracket.fLower;
      fUpper = bracket.fUpper;
    }
    
    while (iterations < this.MAX_ITERATIONS) {
      const mid = (lower + upper) / 2;
      const fMid = this.calculatePresentValue(cashFlows, mid, settlementDate) - targetPrice;
      
      if (Math.abs(fMid) < this.PRECISION) {
        return { yield: mid, converged: true, iterations, precision: Math.abs(fMid) };
      }
      
      if (fLower * fMid < 0) {
        upper = mid;
        fUpper = fMid;
      } else {
        lower = mid;
        fLower = fMid;
      }
      
      iterations++;
    }
    
    const final = (lower + upper) / 2;
    const error = this.calculatePresentValue(cashFlows, final, settlementDate) - targetPrice;
    return { yield: final, converged: true, iterations, precision: Math.abs(error) };
  }
  
  /**
   * Find a bracket for root finding
   */
  private findBracket(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date
  ): { lower: number; upper: number; fLower: number; fUpper: number } | null {
    const testYields = [-0.99, -0.5, -0.2, 0, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0];
    
    for (let i = 0; i < testYields.length - 1; i++) {
      const y1 = testYields[i];
      const y2 = testYields[i + 1];
      const f1 = this.calculatePresentValue(cashFlows, y1, settlementDate) - targetPrice;
      const f2 = this.calculatePresentValue(cashFlows, y2, settlementDate) - targetPrice;
      
      if (f1 * f2 < 0) {
        return { lower: y1, upper: y2, fLower: f1, fUpper: f2 };
      }
    }
    
    return null;
  }
  
  /**
   * Get smart initial yield guess
   */
  private getInitialYieldGuess(
    cashFlows: Array<{ date: Date; amount: number }>,
    price: number,
    settlementDate: Date
  ): number {
    // Calculate total cash flows and weighted average time
    let totalCF = 0;
    let weightedTime = 0;
    
    for (const cf of cashFlows) {
      totalCF += cf.amount;
      const years = this.yearsBetween(settlementDate, cf.date);
      weightedTime += cf.amount * years;
    }
    
    const avgTime = weightedTime / totalCF;
    
    // Simple approximation: (Total CF / Price)^(1/time) - 1
    const totalReturn = totalCF / price;
    const annualizedReturn = Math.pow(totalReturn, 1 / avgTime) - 1;
    
    // Bound the guess
    return Math.max(-0.5, Math.min(0.5, annualizedReturn));
  }
  
  /**
   * Calculate present value of cash flows
   */
  private calculatePresentValue(
    cashFlows: Array<{ date: Date; amount: number }>,
    yield_: number,
    settlementDate: Date
  ): number {
    const yieldDecimal = new Decimal(yield_);
    let pv = new Decimal(0);
    
    for (const cf of cashFlows) {
      const years = new Decimal(this.yearsBetween(settlementDate, cf.date));
      const df = Decimal.pow(yieldDecimal.plus(1), years);
      pv = pv.plus(new Decimal(cf.amount).div(df));
    }
    
    return pv.toNumber();
  }
  
  /**
   * Calculate PV and duration for Newton-Raphson
   */
  private calculatePVAndDuration(
    cashFlows: Array<{ date: Date; amount: number }>,
    yield_: Decimal,
    settlementDate: Date
  ): { pv: Decimal; duration: Decimal } {
    let pv = new Decimal(0);
    let weightedTime = new Decimal(0);
    
    for (const cf of cashFlows) {
      const years = new Decimal(this.yearsBetween(settlementDate, cf.date));
      const df = Decimal.pow(yield_.plus(1), years);
      const cfPV = new Decimal(cf.amount).div(df);
      
      pv = pv.plus(cfPV);
      weightedTime = weightedTime.plus(cfPV.mul(years));
    }
    
    const duration = pv.gt(0) ? weightedTime.div(pv) : new Decimal(0);
    return { pv, duration };
  }
  
  /**
   * Calculate accrued interest
   */
  private calculateAccruedInterest(bond: BondDefinition, settlementDate: Date): number {
    // Find last and next coupon dates
    let lastCouponDate: Date | null = null;
    let nextCouponDate: Date | null = null;
    let nextCouponAmount = 0;
    
    for (const cf of bond.cashFlows) {
      const cfDate = new Date(cf.date);
      
      if (cfDate <= settlementDate && cf.couponPayment > 0) {
        lastCouponDate = cfDate;
      }
      
      if (cfDate > settlementDate && cf.couponPayment > 0 && !nextCouponDate) {
        nextCouponDate = cfDate;
        nextCouponAmount = cf.couponPayment;
      }
    }
    
    if (!lastCouponDate || !nextCouponDate) {
      return 0;
    }
    
    // Calculate accrued fraction based on day count convention
    const dayCount = bond.bondInfo.dayCountConvention;
    let accrualFraction: number;
    
    if (dayCount === '30/360') {
      accrualFraction = this.dayCount30360(lastCouponDate, settlementDate) /
                        this.dayCount30360(lastCouponDate, nextCouponDate);
    } else {
      // Default to ACT/ACT
      const daysSinceLast = this.daysBetween(lastCouponDate, settlementDate);
      const daysInPeriod = this.daysBetween(lastCouponDate, nextCouponDate);
      accrualFraction = daysSinceLast / daysInPeriod;
    }
    
    return nextCouponAmount * accrualFraction;
  }
  
  /**
   * Calculate current yield
   */
  private calculateCurrentYield(
    bond: BondDefinition,
    cleanPrice: number,
    settlementDate: Date
  ): number {
    // Get next 12 months of coupon payments
    const oneYearLater = new Date(settlementDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    let annualCoupon = 0;
    for (const cf of bond.cashFlows) {
      const cfDate = new Date(cf.date);
      if (cfDate > settlementDate && cfDate <= oneYearLater) {
        annualCoupon += cf.couponPayment;
      }
    }
    
    return annualCoupon / cleanPrice;
  }
  
  /**
   * Calculate duration metrics
   */
  private calculateDurations(
    cashFlows: Array<{ date: Date; amount: number }>,
    yield_: number,
    settlementDate: Date,
    price: number
  ): { macaulay: number; modified: number; effective: number } {
    const yieldDecimal = new Decimal(yield_);
    let weightedTime = new Decimal(0);
    let totalPV = new Decimal(0);
    
    for (const cf of cashFlows) {
      const years = new Decimal(this.yearsBetween(settlementDate, cf.date));
      const df = Decimal.pow(yieldDecimal.plus(1), years);
      const pv = new Decimal(cf.amount).div(df);
      
      weightedTime = weightedTime.plus(pv.mul(years));
      totalPV = totalPV.plus(pv);
    }
    
    const macaulay = totalPV.gt(0) ? weightedTime.div(totalPV).toNumber() : 0;
    const modified = macaulay / (1 + yield_);
    
    // Effective duration (using 1bp shock)
    const bpShock = 0.0001;
    const priceUp = this.calculatePresentValue(cashFlows, yield_ - bpShock, settlementDate);
    const priceDown = this.calculatePresentValue(cashFlows, yield_ + bpShock, settlementDate);
    const effective = (priceUp - priceDown) / (2 * price * bpShock);
    
    return { macaulay, modified, effective };
  }
  
  /**
   * Calculate convexity
   */
  private calculateConvexity(
    cashFlows: Array<{ date: Date; amount: number }>,
    yield_: number,
    settlementDate: Date
  ): number {
    const yieldDecimal = new Decimal(yield_);
    let convexity = new Decimal(0);
    let totalPV = new Decimal(0);
    
    for (const cf of cashFlows) {
      const years = new Decimal(this.yearsBetween(settlementDate, cf.date));
      const df = Decimal.pow(yieldDecimal.plus(1), years);
      const pv = new Decimal(cf.amount).div(df);
      
      const timeSquared = years.mul(years.plus(1));
      const convexityComponent = pv.mul(timeSquared).div(df.mul(df));
      
      convexity = convexity.plus(convexityComponent);
      totalPV = totalPV.plus(pv);
    }
    
    return totalPV.gt(0) ? convexity.div(totalPV).toNumber() : 0;
  }
  
  /**
   * Calculate dollar duration (DV01)
   */
  private calculateDollarDuration(modifiedDuration: number, price: number): number {
    return modifiedDuration * price * 0.0001; // Price change for 1bp move
  }
  
  /**
   * Calculate weighted average life (principal payments only)
   */
  private calculateAverageLife(
    cashFlows: Array<{ date: Date; amount: number; principal: number }>,
    settlementDate: Date
  ): number {
    let weightedPrincipal = 0;
    let totalPrincipal = 0;
    
    for (const cf of cashFlows) {
      if (cf.principal > 0) {
        const years = this.yearsBetween(settlementDate, cf.date);
        weightedPrincipal += cf.principal * years;
        totalPrincipal += cf.principal;
      }
    }
    
    return totalPrincipal > 0 ? weightedPrincipal / totalPrincipal : 0;
  }
  
  /**
   * Calculate days to next coupon
   */
  private calculateDaysToNextCoupon(
    cashFlows: Array<{ date: Date; amount: number }>,
    settlementDate: Date
  ): number {
    for (const cf of cashFlows) {
      if (cf.date > settlementDate) {
        return this.daysBetween(settlementDate, cf.date);
      }
    }
    return 0;
  }
  
  /**
   * Calculate spread over treasury curve
   */
  private calculateSpread(
    yield_: number,
    averageLife: number,
    treasuryCurve: TreasuryCurve
  ): number {
    // Interpolate treasury yield at average life
    const treasuryYield = this.interpolateTreasury(averageLife, treasuryCurve);
    return yield_ - treasuryYield;
  }
  
  /**
   * Calculate Z-spread (constant spread to treasury curve)
   */
  private calculateZSpread(
    cashFlows: Array<{ date: Date; amount: number }>,
    price: number,
    settlementDate: Date,
    treasuryCurve: TreasuryCurve
  ): number {
    // Binary search for z-spread
    let lower = -0.05; // -500bp
    let upper = 0.20;  // 2000bp
    
    for (let i = 0; i < 50; i++) {
      const mid = (lower + upper) / 2;
      const pv = this.calculatePVWithSpread(cashFlows, settlementDate, treasuryCurve, mid);
      
      if (Math.abs(pv - price) < 0.01) {
        return mid;
      }
      
      if (pv > price) {
        lower = mid;
      } else {
        upper = mid;
      }
    }
    
    return (lower + upper) / 2;
  }
  
  /**
   * Calculate PV using treasury curve + spread
   */
  private calculatePVWithSpread(
    cashFlows: Array<{ date: Date; amount: number }>,
    settlementDate: Date,
    treasuryCurve: TreasuryCurve,
    spread: number
  ): number {
    let pv = 0;
    
    for (const cf of cashFlows) {
      const years = this.yearsBetween(settlementDate, cf.date);
      const treasuryYield = this.interpolateTreasury(years, treasuryCurve);
      const discountRate = treasuryYield + spread;
      const df = Math.pow(1 + discountRate, -years);
      pv += cf.amount * df;
    }
    
    return pv;
  }
  
  /**
   * Interpolate treasury yield for given maturity
   */
  private interpolateTreasury(years: number, curve: TreasuryCurve): number {
    const points = curve.points.sort((a, b) => a.tenor - b.tenor);
    
    // Exact match
    const exact = points.find(p => Math.abs(p.tenor - years) < 0.01);
    if (exact) return exact.yield / 100; // Convert to decimal
    
    // Find surrounding points
    let lower = points[0];
    let upper = points[points.length - 1];
    
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].tenor <= years && points[i + 1].tenor >= years) {
        lower = points[i];
        upper = points[i + 1];
        break;
      }
    }
    
    // Linear interpolation
    if (years <= lower.tenor) return lower.yield / 100;
    if (years >= upper.tenor) return upper.yield / 100;
    
    const weight = (years - lower.tenor) / (upper.tenor - lower.tenor);
    return (lower.yield + weight * (upper.yield - lower.yield)) / 100;
  }
  
  /**
   * Calculate years between dates
   */
  private yearsBetween(date1: Date, date2: Date): number {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    return (date2.getTime() - date1.getTime()) / msPerYear;
  }
  
  /**
   * Calculate days between dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
  }
  
  /**
   * 30/360 day count
   */
  private dayCount30360(date1: Date, date2: Date): number {
    const d1 = date1.getDate();
    const m1 = date1.getMonth() + 1;
    const y1 = date1.getFullYear();
    
    const d2 = date2.getDate();
    const m2 = date2.getMonth() + 1;
    const y2 = date2.getFullYear();
    
    const d1Adj = Math.min(d1, 30);
    const d2Adj = d1Adj === 30 && d2 === 31 ? 30 : d2;
    
    return 360 * (y2 - y1) + 30 * (m2 - m1) + (d2Adj - d1Adj);
  }
}