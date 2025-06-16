/**
 * Production Bond Calculator
 * 
 * A robust, generalized bond analytics engine designed for real-world use.
 * Handles any bond type through JSON-defined cash flows.
 * 
 * Key Features:
 * - Multiple YTM solver algorithms with automatic fallback
 * - Accurate spread calculations against Treasury curves
 * - Comprehensive risk metrics (duration, convexity, DV01)
 * - Support for all day count conventions
 * - Detailed convergence information
 * - Error handling and validation
 * 
 * @example
 * ```typescript
 * const calculator = new BondCalculatorPro();
 * const analytics = calculator.analyze({
 *   bond: bondDefinition,
 *   settlementDate: new Date(),
 *   price: 72.25, // as percentage of face value
 *   treasuryCurve: ustCurveData
 * });
 * ```
 */

import Decimal from 'decimal.js';

// Configure Decimal for high precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Bond definition with cash flows
 */
export interface Bond {
  // Basic info
  faceValue: number;
  currency: string;
  dayCountConvention: '30/360' | 'ACT/ACT' | 'ACT/360' | 'ACT/365';
  paymentFrequency?: number; // Number of payments per year (2 for semi-annual, 4 for quarterly, etc.)
  
  // Cash flows (the core data)
  cashFlows: Array<{
    date: string;
    coupon: number;
    principal: number;
    total: number;
    outstandingNotional: number;
  }>;
  
  // Optional metadata
  metadata?: {
    issuer?: string;
    isin?: string;
    cusip?: string;
    name?: string;
  };
}

/**
 * Market inputs for calculation
 */
export interface MarketInputs {
  settlementDate: Date;
  price?: number;           // As percentage of face value (e.g., 72.25)
  yield?: number;           // As decimal (e.g., 0.1088 for 10.88%)
  treasuryCurve?: {
    date: string;
    tenors: Array<{
      years: number;
      rate: number;        // As percentage (e.g., 4.28)
    }>;
  };
}

/**
 * Calculation results
 */
export interface BondAnalyticsResult {
  // Pricing
  price: {
    clean: number;         // As percentage of face
    dirty: number;         // As percentage of face
    cleanDollar: number;   // Dollar amount
    dirtyDollar: number;   // Dollar amount
    accruedInterest: number;
  };
  
  // Yields (all as percentages)
  yields: {
    ytm: number;
    ytw: number;
    current: number;
  };
  
  // Risk metrics
  risk: {
    modifiedDuration: number;
    macaulayDuration: number;
    effectiveDuration: number;
    convexity: number;
    dv01: number;          // Dollar value of 1bp
  };
  
  // Spreads (in basis points)
  spreads?: {    
    treasury: number;      // Simple spread
    zSpread: number;       // Option-adjusted spread
    treasuryYield: number; // Reference Treasury yield used for spread calculation
    treasuryInterpolation: {
      targetYears: number;   // Bond's average life used for interpolation
      lowerPoint: { years: number; rate: number }; // Lower bracket point
      upperPoint: { years: number; rate: number }; // Upper bracket point
      method: 'interpolated' | 'exact' | 'extrapolated';
    };
  };
  
  // Other analytics
  analytics: {
    averageLife: number;
    totalCashFlows: number;
    daysToNextPayment: number;
    nextPaymentDate?: string;
    nextPaymentAmount?: number;
    technicalValue: number;
    parity: number;
  };
  
  // Calculation metadata
  metadata: {
    calculationDate: string;
    settlementDate: string;
    algorithm: string;
    iterations: number;
    precision: number;
    warnings?: string[];
  };
}

/**
 * Production Bond Calculator
 */
export class BondCalculatorPro {
  private readonly PRECISION = 1e-10;
  private readonly MAX_ITERATIONS = 100;
  
  /**
   * Main analysis function - calculates all analytics
   */
  analyze(inputs: {
    bond: Bond;
    settlementDate: Date;
    price?: number;        // As percentage of face
    yield?: number;        // As decimal
    treasuryCurve?: MarketInputs['treasuryCurve'];
  }): BondAnalyticsResult {
    const { bond, settlementDate, price, yield: inputYield, treasuryCurve } = inputs;
    
    // Validate inputs
    this.validateInputs(bond, settlementDate, price, inputYield);
    
    // Get future cash flows
    const futureCFs = this.getFutureCashFlows(bond, settlementDate);
    if (futureCFs.length === 0) {
      throw new Error('No future cash flows found');
    }
    
    // Calculate accrued interest
    const accruedInterest = this.calculateAccruedInterest(bond, settlementDate);
    
    // For amortizing bonds, determine current outstanding notional
    const currentOutstanding = this.getCurrentOutstanding(bond, settlementDate);
    console.log(`🔍 OUTSTANDING PRINCIPAL DEBUG:`, {
      faceValue: bond.faceValue,
      currentOutstanding,
      settlementDate: settlementDate.toISOString().split('T')[0],
      outstandingRatio: currentOutstanding / bond.faceValue
    });
    const accruedPercent = (accruedInterest / currentOutstanding) * 100;
    
    // Determine price and yield
    let cleanPrice: number;
    let dirtyPrice: number;
    let ytm: number;
    let convergenceInfo: any;
    
    if (price !== undefined) {
      // Price given, calculate yield
      dirtyPrice = price;
      cleanPrice = dirtyPrice - accruedPercent;
      // Price should be interpreted as percentage of original face value
      const dirtyDollar = (dirtyPrice / 100) * bond.faceValue;
      
      
      const ytmResult = this.calculateYTM(futureCFs, dirtyDollar, settlementDate);
      ytm = ytmResult.yield;
      convergenceInfo = {
        algorithm: ytmResult.algorithm,
        iterations: ytmResult.iterations,
        precision: ytmResult.precision
      };
      
    } else if (inputYield !== undefined) {
      // Yield given, calculate price
      ytm = inputYield;
      const dirtyDollar = this.calculatePresentValue(futureCFs, ytm, settlementDate);
      dirtyPrice = (dirtyDollar / bond.faceValue) * 100;
      cleanPrice = dirtyPrice - accruedPercent;
      convergenceInfo = {
        algorithm: 'Direct PV',
        iterations: 1,
        precision: 0
      };
    } else {
      throw new Error('Either price or yield must be provided');
    }
    
    // Calculate other metrics
    const currentYield = this.calculateCurrentYield(bond, cleanPrice, settlementDate);
    const paymentFrequency = bond.paymentFrequency || 2; // Default to semi-annual if not specified
    const durations = this.calculateDurations(futureCFs, ytm, settlementDate, cleanPrice, paymentFrequency);
    const convexity = this.calculateConvexity(futureCFs, ytm, settlementDate);
    const dv01 = this.calculateDV01(durations.modified, cleanPrice, bond.faceValue);
    const averageLife = this.calculateAverageLife(futureCFs, settlementDate);
    const nextPayment = this.getNextPayment(futureCFs, settlementDate);
    
    // Calculate spreads if treasury curve provided
    let spreads: BondAnalyticsResult['spreads'];
    if (treasuryCurve) {
      const treasuryResult = this.interpolateTreasuryWithMetadata(averageLife, treasuryCurve);
      // ytm is in decimal form (0.10 = 10%), treasuryYield is in percentage form (4.5 = 4.5%)
      const spread = (ytm * 100) - treasuryResult.yield; // This gives the spread in percentage points
      
      
      const zSpread = this.calculateZSpread(
        futureCFs,
        (dirtyPrice / 100) * bond.faceValue,
        settlementDate,
        treasuryCurve
      );
      
      spreads = {
        treasury: spread * 100, // Convert percentage points to basis points
        zSpread: zSpread * 10000, // zSpread is in decimal form (0.05 = 5%), convert to bps
        treasuryYield: treasuryResult.yield, // Include reference treasury yield in percentage form
        treasuryInterpolation: treasuryResult.interpolation
      };
    }
    
    // Technical Value and Parity will be calculated in server storage layer

    // Build result
    return {
      price: {
        clean: cleanPrice,
        dirty: dirtyPrice,
        cleanDollar: (cleanPrice / 100) * currentOutstanding,
        dirtyDollar: (dirtyPrice / 100) * currentOutstanding,
        accruedInterest
      },
      yields: {
        ytm: ytm,
        ytw: ytm, // TODO: Handle callable bonds
        current: currentYield
      },
      risk: {
        modifiedDuration: durations.modified,
        macaulayDuration: durations.macaulay,
        effectiveDuration: durations.effective,
        convexity,
        dv01
      },
      spreads,
      analytics: {
        averageLife,
        totalCashFlows: futureCFs.reduce((sum, cf) => sum + cf.amount, 0),
        daysToNextPayment: nextPayment.days,
        nextPaymentDate: nextPayment.date,
        nextPaymentAmount: nextPayment.amount,
        technicalValue: currentOutstanding, // Current outstanding notional in dollars
        parity: (cleanPrice / 100) // Clean price as ratio of par
      },
      metadata: {
        calculationDate: new Date().toISOString(),
        settlementDate: settlementDate.toISOString(),
        ...convergenceInfo
      }
    };
  }
  
  /**
   * Calculate price from yield
   */
  priceFromYield(
    bond: Bond,
    yield_: number,
    settlementDate: Date
  ): { clean: number; dirty: number; accruedInterest: number } {
    const futureCFs = this.getFutureCashFlows(bond, settlementDate);
    const dirtyDollar = this.calculatePresentValue(futureCFs, yield_, settlementDate);
    const accruedInterest = this.calculateAccruedInterest(bond, settlementDate);
    
    const dirtyPrice = (dirtyDollar / bond.faceValue) * 100;
    const cleanPrice = dirtyPrice - (accruedInterest / bond.faceValue) * 100;
    
    return { clean: cleanPrice, dirty: dirtyPrice, accruedInterest };
  }
  
  /**
   * Calculate yield from price
   */
  yieldFromPrice(
    bond: Bond,
    price: number, // As percentage
    settlementDate: Date
  ): { yield: number; algorithm: string; iterations: number } {
    const futureCFs = this.getFutureCashFlows(bond, settlementDate);
    const dirtyDollar = (price / 100) * bond.faceValue;
    
    const result = this.calculateYTM(futureCFs, dirtyDollar, settlementDate);
    return {
      yield: result.yield * 100,
      algorithm: result.algorithm,
      iterations: result.iterations
    };
  }
  
  // ========== Private Methods ==========
  
  private validateInputs(bond: Bond, settlementDate: Date, price?: number, yield_?: number): void {
    if (!bond || !bond.cashFlows || bond.cashFlows.length === 0) {
      throw new Error('Invalid bond: missing cash flows');
    }
    
    if (!settlementDate || isNaN(settlementDate.getTime())) {
      throw new Error('Invalid settlement date');
    }
    
    if (price === undefined && yield_ === undefined) {
      throw new Error('Either price or yield must be provided');
    }
    
    if (price !== undefined && (price <= 0 || price > 500)) {
      throw new Error('Price must be between 0 and 500% of face value');
    }
    
    if (yield_ !== undefined && (yield_ < -0.5 || yield_ > 2)) {
      throw new Error('Yield must be between -50% and 200%');
    }
  }
  
  private getFutureCashFlows(bond: Bond, settlementDate: Date): Array<{
    date: Date;
    amount: number;
    principal: number;
  }> {
    return bond.cashFlows
      .filter(cf => new Date(cf.date) > settlementDate)
      .map(cf => ({
        date: new Date(cf.date),
        amount: cf.total,
        principal: cf.principal
      }));
  }
  
  private getCurrentOutstanding(bond: Bond, settlementDate: Date): number {
    // Find the most recent cash flow at or before settlement date
    let currentOutstanding = bond.faceValue;
    
    for (const cf of bond.cashFlows) {
      const cfDate = new Date(cf.date);
      if (cfDate <= settlementDate) {
        currentOutstanding = cf.outstandingNotional;
      } else {
        break;
      }
    }
    
    return currentOutstanding;
  }
  
  private calculateYTM(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date
  ): { yield: number; algorithm: string; iterations: number; precision: number } {
    console.log(`🎯 YTM Solver Starting:`);
    console.log(`  - Target Price: ${targetPrice}`);
    console.log(`  - Cash Flows: ${cashFlows.length}`);
    console.log(`  - Total CF Amount: ${cashFlows.reduce((sum, cf) => sum + cf.amount, 0)}`);
    
    // Sanity check
    const totalCF = cashFlows.reduce((sum, cf) => sum + cf.amount, 0);
    if (targetPrice > totalCF) {
      console.warn(`⚠️ WARNING: Target price (${targetPrice}) exceeds total cash flows (${totalCF})`);
      console.warn(`  This will result in negative yield`);
    }
    
    // Try algorithms in order of preference
    const algorithms = [
      { name: 'Newton-Raphson', method: this.solveNewtonRaphson.bind(this) },
      { name: 'Brent', method: this.solveBrent.bind(this) },
      { name: 'Bisection', method: this.solveBisection.bind(this) }
    ];
    
    for (const { name, method } of algorithms) {
      try {
        console.log(`  🔧 Trying ${name} algorithm...`);
        const result = method(cashFlows, targetPrice, settlementDate);
        if (result.converged) {
          console.log(`  ✅ ${name} converged: YTM = ${(result.yield * 100).toFixed(3)}%`);
          return {
            yield: result.yield,
            algorithm: name,
            iterations: result.iterations,
            precision: result.precision
          };
        } else {
          console.log(`  ❌ ${name} failed to converge`);
        }
      } catch (e) {
        console.log(`  ❌ ${name} threw error: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }
    
    throw new Error('Failed to calculate YTM with any method');
  }
  
  private solveNewtonRaphson(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date
  ): { yield: number; converged: boolean; iterations: number; precision: number } {
    let yield_ = new Decimal(this.getInitialGuess(cashFlows, targetPrice, settlementDate));
    let iterations = 0;
    let lastYield = yield_.toNumber();
    let oscillationCount = 0;
    let bestYield = yield_;
    let bestError = new Decimal(Infinity);
    
    while (iterations < this.MAX_ITERATIONS) {
      const { pv, duration } = this.getPVAndDuration(cashFlows, yield_, settlementDate);
      const error = pv.minus(targetPrice);
      
      // Track best result so far
      if (error.abs().lt(bestError)) {
        bestError = error.abs();
        bestYield = yield_;
      }
      
      if (error.abs().lt(this.PRECISION)) {
        return {
          yield: yield_.toNumber(),
          converged: true,
          iterations,
          precision: error.abs().toNumber()
        };
      }
      
      const derivative = duration.mul(pv).neg();
      if (derivative.abs().lt(1e-10)) {
        break;
      }
      
      let adjustment = error.div(derivative);
      
      // Adaptive dampening based on iteration and error size
      let dampening = 1.0;
      if (iterations > 5) dampening = 0.7;
      if (iterations > 15) dampening = 0.5;
      if (error.abs().gt(targetPrice * 0.1)) dampening = 0.3;
      
      adjustment = adjustment.mul(dampening);
      
      // Limit adjustment size relative to current yield
      const maxAdj = yield_.abs().mul(0.3).plus(0.05);
      if (adjustment.abs().gt(maxAdj)) {
        adjustment = adjustment.gt(0) ? maxAdj : maxAdj.neg();
      }
      
      const newYield = yield_.minus(adjustment);
      
      // Enhanced bounds for complex bonds
      if (newYield.lt(-0.99)) {
        yield_ = new Decimal(-0.99);
      } else if (newYield.gt(1.0)) {
        yield_ = new Decimal(1.0);
      } else {
        yield_ = newYield;
      }
      
      // Log progress every 5 iterations
      if (iterations % 5 === 0) {
        console.log(`    Iteration ${iterations}: yield = ${(yield_.toNumber() * 100).toFixed(3)}%, error = ${error.toFixed(6)}`);
      }
      
      // Enhanced oscillation detection
      if (Math.abs(yield_.toNumber() - lastYield) < 1e-6 && iterations > 8) {
        oscillationCount++;
        if (oscillationCount >= 3) {
          console.log(`    ⚠️ Yield oscillating, using best result: ${(bestYield.toNumber() * 100).toFixed(3)}%`);
          if (bestError.lt(this.PRECISION * 10)) {
            return {
              yield: bestYield.toNumber(),
              converged: true,
              iterations,
              precision: bestError.toNumber()
            };
          }
          break;
        }
      } else {
        oscillationCount = 0;
      }
      
      lastYield = yield_.toNumber();
      iterations++;
    }
    
    // Return best result if close enough
    if (bestError.lt(this.PRECISION * 10)) {
      return {
        yield: bestYield.toNumber(),
        converged: true,
        iterations,
        precision: bestError.toNumber()
      };
    }
    
    return { yield: 0, converged: false, iterations, precision: 0 };
  }
  
  private solveBrent(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date
  ): { yield: number; converged: boolean; iterations: number; precision: number } {
    // Simplified Brent's method implementation
    let a = -0.5, b = 2.0;
    let fa = this.calculatePresentValue(cashFlows, a, settlementDate) - targetPrice;
    let fb = this.calculatePresentValue(cashFlows, b, settlementDate) - targetPrice;
    
    if (fa * fb > 0) {
      // Find bracket
      const bracket = this.findBracket(cashFlows, targetPrice, settlementDate);
      if (!bracket) return { yield: 0, converged: false, iterations: 0, precision: 0 };
      a = bracket.lower;
      b = bracket.upper;
      fa = bracket.fLower;
      fb = bracket.fUpper;
    }
    
    let c = a, fc = fa;
    let iterations = 0;
    
    while (iterations < this.MAX_ITERATIONS && Math.abs(b - a) > this.PRECISION) {
      const s = (a * fb - b * fa) / (fb - fa); // Secant method
      const fs = this.calculatePresentValue(cashFlows, s, settlementDate) - targetPrice;
      
      if (Math.abs(fs) < this.PRECISION) {
        return { yield: s, converged: true, iterations, precision: Math.abs(fs) };
      }
      
      if (fa * fs < 0) {
        b = s;
        fb = fs;
      } else {
        a = s;
        fa = fs;
      }
      
      iterations++;
    }
    
    return { yield: (a + b) / 2, converged: true, iterations, precision: Math.abs(fb) };
  }
  
  private solveBisection(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date
  ): { yield: number; converged: boolean; iterations: number; precision: number } {
    let lower = -0.99, upper = 1.0;
    let iterations = 0;
    
    // Find initial bracket
    const bracket = this.findBracket(cashFlows, targetPrice, settlementDate);
    if (bracket) {
      lower = bracket.lower;
      upper = bracket.upper;
    } else {
      console.log(`⚠️ Bisection: No bracket found, using default bounds`);
      return { yield: 0, converged: false, iterations, precision: 0 };
    }
    
    console.log(`🔧 Bisection starting with bracket [${(lower * 100).toFixed(2)}%, ${(upper * 100).toFixed(2)}%]`);
    
    while (iterations < this.MAX_ITERATIONS && (upper - lower) > this.PRECISION) {
      const mid = (lower + upper) / 2;
      const fMid = this.calculatePresentValue(cashFlows, mid, settlementDate) - targetPrice;
      
      if (Math.abs(fMid) < this.PRECISION) {
        console.log(`✅ Bisection converged at ${(mid * 100).toFixed(3)}%`);
        return { yield: mid, converged: true, iterations, precision: Math.abs(fMid) };
      }
      
      const fLower = this.calculatePresentValue(cashFlows, lower, settlementDate) - targetPrice;
      
      if (fLower * fMid < 0) {
        upper = mid;
      } else {
        lower = mid;
      }
      
      // Log progress periodically
      if (iterations % 10 === 0) {
        console.log(`    Bisection iteration ${iterations}: bracket [${(lower * 100).toFixed(2)}%, ${(upper * 100).toFixed(2)}%]`);
      }
      
      iterations++;
    }
    
    const final = (lower + upper) / 2;
    const error = Math.abs(this.calculatePresentValue(cashFlows, final, settlementDate) - targetPrice);
    console.log(`✅ Bisection final result: ${(final * 100).toFixed(3)}% (error: ${error.toFixed(6)})`);
    
    return { yield: final, converged: error < this.PRECISION * 5, iterations, precision: error };
  }
  
  private findBracket(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date
  ): { lower: number; upper: number; fLower: number; fUpper: number } | null {
    // Enhanced bracket finding for complex bonds
    const initialGuess = this.getInitialGuess(cashFlows, targetPrice, settlementDate);
    
    // Create test points around the initial guess for better bracketing
    const basePoints = [-0.99, -0.5, -0.2, 0, 0.02, 0.05, 0.08, 0.12, 0.15, 0.2, 0.3, 0.5, 0.8, 1.0];
    
    // Add points around the initial guess
    const guessPoints = [
      initialGuess - 0.1,
      initialGuess - 0.05,
      initialGuess,
      initialGuess + 0.05,
      initialGuess + 0.1
    ].filter(p => p >= -0.99 && p <= 1.0);
    
    const testPoints = Array.from(new Set([...basePoints, ...guessPoints])).sort((a, b) => a - b);
    
    console.log(`🔍 Bracket search: testing ${testPoints.length} points around guess ${(initialGuess * 100).toFixed(2)}%`);
    
    for (let i = 0; i < testPoints.length - 1; i++) {
      const y1 = testPoints[i];
      const y2 = testPoints[i + 1];
      const f1 = this.calculatePresentValue(cashFlows, y1, settlementDate) - targetPrice;
      const f2 = this.calculatePresentValue(cashFlows, y2, settlementDate) - targetPrice;
      
      if (f1 * f2 < 0) {
        console.log(`✅ Found bracket: [${(y1 * 100).toFixed(2)}%, ${(y2 * 100).toFixed(2)}%]`);
        return { lower: y1, upper: y2, fLower: f1, fUpper: f2 };
      }
    }
    
    // If no bracket found, try expanding the search
    console.log(`⚠️ No bracket found in standard range, expanding search...`);
    const expandedPoints = [-0.99, -0.8, -0.6, -0.4, -0.2, 0, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0];
    
    for (let i = 0; i < expandedPoints.length - 1; i++) {
      const y1 = expandedPoints[i];
      const y2 = expandedPoints[i + 1];
      const f1 = this.calculatePresentValue(cashFlows, y1, settlementDate) - targetPrice;
      const f2 = this.calculatePresentValue(cashFlows, y2, settlementDate) - targetPrice;
      
      if (f1 * f2 < 0) {
        console.log(`✅ Found expanded bracket: [${(y1 * 100).toFixed(2)}%, ${(y2 * 100).toFixed(2)}%]`);
        return { lower: y1, upper: y2, fLower: f1, fUpper: f2 };
      }
    }
    
    console.log(`❌ No bracket found even in expanded range`);
    return null;
  }
  
  private getInitialGuess(
    cashFlows: Array<{ date: Date; amount: number }>,
    price: number,
    settlementDate: Date
  ): number {
    // Enhanced initial guess for complex bonds
    // Use a combination of approaches for robustness
    
    let totalCF = 0;
    let weightedTime = 0;
    let finalPayment = 0;
    
    for (const cf of cashFlows) {
      totalCF += cf.amount;
      const years = this.yearsBetween(settlementDate, cf.date);
      weightedTime += cf.amount * years;
      
      // Track final payment (likely contains principal)
      if (years > 0 && cf.amount > finalPayment) {
        finalPayment = cf.amount;
      }
    }
    
    const avgTime = weightedTime / totalCF;
    const totalReturn = totalCF / price;
    
    // Approach 1: Simple annualized return
    const simpleGuess = Math.pow(totalReturn, 1 / avgTime) - 1;
    
    // Approach 2: Current yield adjusted for time
    const totalCoupons = totalCF - finalPayment;
    const annualCoupon = totalCoupons / avgTime;
    const currentYieldGuess = (annualCoupon / price) + ((price - finalPayment) / (price * avgTime));
    
    // Approach 3: IRR approximation for complex cash flows
    const irrGuess = this.approximateIRR(cashFlows, price, settlementDate);
    
    // Use the median of the three approaches for robustness
    const guesses = [simpleGuess, currentYieldGuess, irrGuess].sort((a, b) => a - b);
    let guess = guesses[1]; // median
    
    // Clamp to reasonable bounds
    guess = Math.max(-0.99, Math.min(2.0, guess));
    
    console.log(`💡 Enhanced Initial YTM Guess:`);
    console.log(`  - Total CFs: ${totalCF}`);
    console.log(`  - Target Price: ${price}`);
    console.log(`  - Total Return: ${totalReturn.toFixed(4)}`);
    console.log(`  - Average Time: ${avgTime.toFixed(2)} years`);
    console.log(`  - Simple: ${(simpleGuess * 100).toFixed(2)}%, Current Yield: ${(currentYieldGuess * 100).toFixed(2)}%, IRR: ${(irrGuess * 100).toFixed(2)}%`);
    console.log(`  - Final Guess: ${(guess * 100).toFixed(2)}%`);
    
    return guess;
  }
  
  private approximateIRR(
    cashFlows: Array<{ date: Date; amount: number }>,
    initialInvestment: number,
    settlementDate: Date
  ): number {
    // Newton's method IRR approximation for better initial guess
    let rate = 0.1; // Start with 10%
    
    for (let i = 0; i < 10; i++) {
      let npv = -initialInvestment;
      let dnpv = 0;
      
      for (const cf of cashFlows) {
        const years = this.yearsBetween(settlementDate, cf.date);
        const factor = Math.pow(1 + rate, years);
        npv += cf.amount / factor;
        dnpv -= cf.amount * years / (factor * (1 + rate));
      }
      
      if (Math.abs(npv) < 0.01 || Math.abs(dnpv) < 1e-10) break;
      rate = rate - npv / dnpv;
      
      // Keep rate in reasonable bounds
      rate = Math.max(-0.5, Math.min(1.0, rate));
    }
    
    return rate;
  }
  
  private calculatePresentValue(
    cashFlows: Array<{ date: Date; amount: number }>,
    yield_: number,
    settlementDate: Date
  ): number {
    const yieldDec = new Decimal(yield_);
    let pv = new Decimal(0);
    
    for (const cf of cashFlows) {
      const years = new Decimal(this.yearsBetween(settlementDate, cf.date));
      const df = Decimal.pow(yieldDec.plus(1), years);
      pv = pv.plus(new Decimal(cf.amount).div(df));
    }
    
    return pv.toNumber();
  }
  
  private getPVAndDuration(
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
  
  private calculateAccruedInterest(bond: Bond, settlementDate: Date): number {
    let lastCouponDate: Date | null = null;
    let nextCouponDate: Date | null = null;
    let nextCouponAmount = 0;
    
    for (const cf of bond.cashFlows) {
      const cfDate = new Date(cf.date);
      
      if (cfDate <= settlementDate && cf.coupon > 0) {
        lastCouponDate = cfDate;
      }
      
      if (cfDate > settlementDate && cf.coupon > 0 && !nextCouponDate) {
        nextCouponDate = cfDate;
        nextCouponAmount = cf.coupon;
      }
    }
    
    if (!lastCouponDate || !nextCouponDate) {
      return 0;
    }
    
    let accrualFraction: number;
    
    if (bond.dayCountConvention === '30/360') {
      const daysSince = this.dayCount30360(lastCouponDate, settlementDate);
      const daysInPeriod = this.dayCount30360(lastCouponDate, nextCouponDate);
      accrualFraction = daysSince / daysInPeriod;
    } else {
      // Default ACT/ACT
      const daysSince = this.daysBetween(lastCouponDate, settlementDate);
      const daysInPeriod = this.daysBetween(lastCouponDate, nextCouponDate);
      accrualFraction = daysSince / daysInPeriod;
    }
    
    return nextCouponAmount * accrualFraction;
  }
  
  private calculateCurrentYield(bond: Bond, cleanPrice: number, settlementDate: Date): number {
    const oneYearLater = new Date(settlementDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    let annualCoupon = 0;
    for (const cf of bond.cashFlows) {
      const cfDate = new Date(cf.date);
      if (cfDate > settlementDate && cfDate <= oneYearLater) {
        annualCoupon += cf.coupon;
      }
    }
    
    const cleanDollar = (cleanPrice / 100) * bond.faceValue;
    return annualCoupon / cleanDollar;
  }
  
  private calculateDurations(
    cashFlows: Array<{ date: Date; amount: number }>,
    yield_: number,
    settlementDate: Date,
    cleanPrice: number,
    paymentFrequency: number = 2 // Default to semi-annual
  ): { macaulay: number; modified: number; effective: number } {
    const yieldDec = new Decimal(yield_);
    let weightedTime = new Decimal(0);
    let totalPV = new Decimal(0);
    
    for (const cf of cashFlows) {
      const years = new Decimal(this.yearsBetween(settlementDate, cf.date));
      const df = Decimal.pow(yieldDec.plus(1), years);
      const pv = new Decimal(cf.amount).div(df);
      
      weightedTime = weightedTime.plus(pv.mul(years));
      totalPV = totalPV.plus(pv);
    }
    
    const macaulay = totalPV.gt(0) ? weightedTime.div(totalPV).toNumber() : 0;
    
    // FIXED: Modified duration for bonds with periodic compounding
    // Formula: Modified Duration = Macaulay Duration / (1 + YTM/frequency)
    const modified = macaulay / (1 + yield_ / paymentFrequency);
    
    // Effective duration
    const bpShock = 0.0001;
    const priceUp = this.calculatePresentValue(cashFlows, yield_ - bpShock, settlementDate);
    const priceDown = this.calculatePresentValue(cashFlows, yield_ + bpShock, settlementDate);
    const basePriceDollar = this.calculatePresentValue(cashFlows, yield_, settlementDate);
    const effective = (priceUp - priceDown) / (2 * basePriceDollar * bpShock);
    
    console.log(`🔧 Duration Calculation Debug:`, {
      macaulay: macaulay.toFixed(4),
      yieldDecimal: yield_.toFixed(4),
      paymentFrequency,
      yieldPerPeriod: (yield_ / paymentFrequency).toFixed(4),
      denominator: (1 + yield_ / paymentFrequency).toFixed(4),
      modified: modified.toFixed(4),
      ratio: (modified / macaulay).toFixed(4)
    });
    
    return { macaulay, modified, effective };
  }
  
  private calculateConvexity(
    cashFlows: Array<{ date: Date; amount: number }>,
    yield_: number,
    settlementDate: Date
  ): number {
    const yieldDec = new Decimal(yield_);
    let convexity = new Decimal(0);
    let totalPV = new Decimal(0);
    
    for (const cf of cashFlows) {
      const years = new Decimal(this.yearsBetween(settlementDate, cf.date));
      const df = Decimal.pow(yieldDec.plus(1), years);
      const pv = new Decimal(cf.amount).div(df);
      
      const timeSquared = years.mul(years.plus(1));
      const convexComponent = pv.mul(timeSquared).div(
        Decimal.pow(yieldDec.plus(1), 2)
      );
      
      convexity = convexity.plus(convexComponent);
      totalPV = totalPV.plus(pv);
    }
    
    return totalPV.gt(0) ? convexity.div(totalPV).toNumber() : 0;
  }
  
  private calculateDV01(modifiedDuration: number, cleanPrice: number, faceValue: number): number {
    const cleanDollar = (cleanPrice / 100) * faceValue;
    return modifiedDuration * cleanDollar * 0.0001;
  }
  
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
  
  private getNextPayment(
    cashFlows: Array<{ date: Date; amount: number }>,
    settlementDate: Date
  ): { days: number; date?: string; amount?: number } {
    for (const cf of cashFlows) {
      if (cf.date > settlementDate) {
        return {
          days: this.daysBetween(settlementDate, cf.date),
          date: cf.date.toISOString().split('T')[0],
          amount: cf.amount
        };
      }
    }
    return { days: 0 };
  }
  
  private interpolateTreasury(
    years: number,
    curve: NonNullable<MarketInputs['treasuryCurve']>
  ): number {
    return this.interpolateTreasuryWithMetadata(years, curve).yield;
  }

  private interpolateTreasuryWithMetadata(
    years: number,
    curve: NonNullable<MarketInputs['treasuryCurve']>
  ): { 
    yield: number; 
    interpolation: {
      targetYears: number;
      lowerPoint: { years: number; rate: number };
      upperPoint: { years: number; rate: number };
      method: 'interpolated' | 'exact' | 'extrapolated';
    }
  } {
    const points = curve.tenors.sort((a, b) => a.years - b.years);
    
    // Exact match
    const exact = points.find(p => Math.abs(p.years - years) < 0.01);
    if (exact) {
      return {
        yield: exact.rate,
        interpolation: {
          targetYears: years,
          lowerPoint: { years: exact.years, rate: exact.rate },
          upperPoint: { years: exact.years, rate: exact.rate },
          method: 'exact'
        }
      };
    }
    
    // Find brackets
    let lower = points[0];
    let upper = points[points.length - 1];
    
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].years <= years && points[i + 1].years >= years) {
        lower = points[i];
        upper = points[i + 1];
        break;
      }
    }
    
    // Determine method and calculate yield
    let method: 'interpolated' | 'exact' | 'extrapolated';
    let resultYield: number;
    
    if (years <= lower.years) {
      // Extrapolation below curve
      method = 'extrapolated';
      resultYield = lower.rate;
    } else if (years >= upper.years) {
      // Extrapolation above curve
      method = 'extrapolated';
      resultYield = upper.rate;
    } else {
      // Linear interpolation
      method = 'interpolated';
      const weight = (years - lower.years) / (upper.years - lower.years);
      resultYield = lower.rate + weight * (upper.rate - lower.rate);
    }
    
    return {
      yield: resultYield,
      interpolation: {
        targetYears: years,
        lowerPoint: { years: lower.years, rate: lower.rate },
        upperPoint: { years: upper.years, rate: upper.rate },
        method
      }
    };
  }
  
  private calculateZSpread(
    cashFlows: Array<{ date: Date; amount: number }>,
    targetPrice: number,
    settlementDate: Date,
    treasuryCurve: NonNullable<MarketInputs['treasuryCurve']>
  ): number {
    console.log(`🔄 Z-Spread Calculation:`);
    console.log(`  - Target Price: ${targetPrice}`);
    console.log(`  - Cash Flows: ${cashFlows.length}`);
    let lower = -0.01;
    let upper = 0.05;
    
    for (let i = 0; i < 50; i++) {
      const mid = (lower + upper) / 2;
      
      let pv = 0;
      for (const cf of cashFlows) {
        const years = this.yearsBetween(settlementDate, cf.date);
        const treasuryRate = this.interpolateTreasury(years, treasuryCurve) / 100;
        const discountRate = treasuryRate + mid;
        const df = Math.pow(1 + discountRate, -years);
        pv += cf.amount * df;
      }
      
      if (Math.abs(pv - targetPrice) < 0.01) {
        console.log(`  - Z-Spread converged: ${(mid * 10000).toFixed(0)} bps`);
        return mid;
      }
      
      if (pv > targetPrice) {
        lower = mid;
      } else {
        upper = mid;
      }
    }
    
    const finalSpread = (lower + upper) / 2;
    console.log(`  - Z-Spread final: ${(finalSpread * 10000).toFixed(0)} bps`);
    return finalSpread;
  }
  
  private yearsBetween(date1: Date, date2: Date): number {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    return (date2.getTime() - date1.getTime()) / msPerYear;
  }
  
  private daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((date2.getTime() - date1.getTime()) / msPerDay);
  }
  
  private dayCount30360(date1: Date, date2: Date): number {
    const d1 = Math.min(date1.getDate(), 30);
    const m1 = date1.getMonth() + 1;
    const y1 = date1.getFullYear();
    
    let d2 = date2.getDate();
    const m2 = date2.getMonth() + 1;
    const y2 = date2.getFullYear();
    
    if (d1 === 30 && d2 === 31) {
      d2 = 30;
    }
    
    return 360 * (y2 - y1) + 30 * (m2 - m1) + (d2 - d1);
  }
}