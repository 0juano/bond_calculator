import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 28,        // High precision for financial calculations
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -15,       // Use exponential notation for very small numbers
  toExpPos: 20,        // Use exponential notation for very large numbers
  maxE: 9e15,          // Maximum exponent
  minE: -9e15,         // Minimum exponent
  modulo: Decimal.ROUND_DOWN,
});

/**
 * Precision-safe financial arithmetic utilities
 */
export class DecimalMath {
  /**
   * Convert number or string to Decimal with validation
   */
  static toDecimal(value: number | string | Decimal): Decimal {
    if (value instanceof Decimal) return value;
    
    if (typeof value === 'string') {
      if (value.trim() === '' || isNaN(Number(value))) {
        throw new Error(`Invalid decimal value: "${value}"`);
      }
    }
    
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        throw new Error(`Invalid decimal value: ${value}`);
      }
    }
    
    return new Decimal(value);
  }

  /**
   * Safe addition with precision
   */
  static add(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.toDecimal(a).plus(this.toDecimal(b));
  }

  /**
   * Safe subtraction with precision
   */
  static subtract(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.toDecimal(a).minus(this.toDecimal(b));
  }

  /**
   * Safe multiplication with precision
   */
  static multiply(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    return this.toDecimal(a).times(this.toDecimal(b));
  }

  /**
   * Safe division with precision and zero check
   */
  static divide(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    const divisor = this.toDecimal(b);
    if (divisor.isZero()) {
      throw new Error('Division by zero');
    }
    return this.toDecimal(a).div(divisor);
  }

  /**
   * Safe power operation
   */
  static power(base: number | string | Decimal, exponent: number | string | Decimal): Decimal {
    return this.toDecimal(base).pow(this.toDecimal(exponent));
  }

  /**
   * Safe square root
   */
  static sqrt(value: number | string | Decimal): Decimal {
    const decimal = this.toDecimal(value);
    if (decimal.isNegative()) {
      throw new Error('Cannot take square root of negative number');
    }
    return decimal.sqrt();
  }

  /**
   * Safe natural logarithm
   */
  static ln(value: number | string | Decimal): Decimal {
    const decimal = this.toDecimal(value);
    if (decimal.lte(0)) {
      throw new Error('Cannot take logarithm of non-positive number');
    }
    return decimal.ln();
  }

  /**
   * Safe exponential function
   */
  static exp(value: number | string | Decimal): Decimal {
    return this.toDecimal(value).exp();
  }

  /**
   * Absolute value
   */
  static abs(value: number | string | Decimal): Decimal {
    return this.toDecimal(value).abs();
  }

  /**
   * Maximum of two values
   */
  static max(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    const decimalA = this.toDecimal(a);
    const decimalB = this.toDecimal(b);
    return decimalA.gte(decimalB) ? decimalA : decimalB;
  }

  /**
   * Minimum of two values
   */
  static min(a: number | string | Decimal, b: number | string | Decimal): Decimal {
    const decimalA = this.toDecimal(a);
    const decimalB = this.toDecimal(b);
    return decimalA.lte(decimalB) ? decimalA : decimalB;
  }

  /**
   * Check if two values are equal within tolerance
   */
  static isEqual(
    a: number | string | Decimal, 
    b: number | string | Decimal, 
    tolerance: number | string | Decimal = 1e-10
  ): boolean {
    const diff = this.abs(this.subtract(a, b));
    return diff.lte(this.toDecimal(tolerance));
  }

  /**
   * Round to specified decimal places
   */
  static round(value: number | string | Decimal, decimalPlaces: number): Decimal {
    return this.toDecimal(value).toDecimalPlaces(decimalPlaces);
  }

  /**
   * Convert to number (use with caution for display only)
   */
  static toNumber(value: Decimal): number {
    return value.toNumber();
  }

  /**
   * Format for display with specified precision
   */
  static toFixed(value: number | string | Decimal, decimalPlaces: number): string {
    return this.toDecimal(value).toFixed(decimalPlaces);
  }

  /**
   * Format as percentage
   */
  static toPercent(value: number | string | Decimal, decimalPlaces: number = 3): string {
    return this.multiply(value, 100).toFixed(decimalPlaces) + '%';
  }

  /**
   * Format in basis points
   */
  static toBasisPoints(value: number | string | Decimal, decimalPlaces: number = 0): string {
    return this.multiply(value, 10000).toFixed(decimalPlaces) + 'bp';
  }
}

/**
 * Financial calculation utilities using Decimal arithmetic
 */
export class FinancialMath {
  /**
   * Present value calculation with Decimal precision
   */
  static presentValue(
    futureValue: number | string | Decimal,
    rate: number | string | Decimal,
    periods: number | string | Decimal
  ): Decimal {
    const fv = DecimalMath.toDecimal(futureValue);
    const r = DecimalMath.toDecimal(rate);
    const n = DecimalMath.toDecimal(periods);
    
    // PV = FV / (1 + r)^n
    const onePlusRate = DecimalMath.add(1, r);
    const discountFactor = DecimalMath.power(onePlusRate, n);
    return DecimalMath.divide(fv, discountFactor);
  }

  /**
   * Future value calculation with Decimal precision
   */
  static futureValue(
    presentValue: number | string | Decimal,
    rate: number | string | Decimal,
    periods: number | string | Decimal
  ): Decimal {
    const pv = DecimalMath.toDecimal(presentValue);
    const r = DecimalMath.toDecimal(rate);
    const n = DecimalMath.toDecimal(periods);
    
    // FV = PV * (1 + r)^n
    const onePlusRate = DecimalMath.add(1, r);
    const growthFactor = DecimalMath.power(onePlusRate, n);
    return DecimalMath.multiply(pv, growthFactor);
  }

  /**
   * Newton-Raphson solver with Decimal precision and tolerance
   */
  static newtonRaphson(
    func: (x: Decimal) => Decimal,
    derivative: (x: Decimal) => Decimal,
    initialGuess: number | string | Decimal,
    tolerance: number | string | Decimal = 1e-10,
    maxIterations: number = 100
  ): Decimal {
    let x = DecimalMath.toDecimal(initialGuess);
    const tol = DecimalMath.toDecimal(tolerance);
    
    for (let i = 0; i < maxIterations; i++) {
      const fx = func(x);
      const fpx = derivative(x);
      
      if (fpx.isZero()) {
        throw new Error('Newton-Raphson: derivative is zero');
      }
      
      const newX = DecimalMath.subtract(x, DecimalMath.divide(fx, fpx));
      
      if (DecimalMath.abs(DecimalMath.subtract(newX, x)).lte(tol)) {
        return newX;
      }
      
      x = newX;
    }
    
    throw new Error(`Newton-Raphson: failed to converge after ${maxIterations} iterations`);
  }

  /**
   * Compound interest calculation
   */
  static compoundInterest(
    principal: number | string | Decimal,
    rate: number | string | Decimal,
    compoundingFrequency: number | string | Decimal,
    time: number | string | Decimal
  ): Decimal {
    const p = DecimalMath.toDecimal(principal);
    const r = DecimalMath.toDecimal(rate);
    const n = DecimalMath.toDecimal(compoundingFrequency);
    const t = DecimalMath.toDecimal(time);
    
    // A = P(1 + r/n)^(nt)
    const ratePerPeriod = DecimalMath.divide(r, n);
    const onePlusRatePerPeriod = DecimalMath.add(1, ratePerPeriod);
    const exponent = DecimalMath.multiply(n, t);
    const compoundFactor = DecimalMath.power(onePlusRatePerPeriod, exponent);
    
    return DecimalMath.multiply(p, compoundFactor);
  }

  /**
   * Annuity present value
   */
  static annuityPresentValue(
    payment: number | string | Decimal,
    rate: number | string | Decimal,
    periods: number | string | Decimal
  ): Decimal {
    const pmt = DecimalMath.toDecimal(payment);
    const r = DecimalMath.toDecimal(rate);
    const n = DecimalMath.toDecimal(periods);
    
    if (r.isZero()) {
      return DecimalMath.multiply(pmt, n);
    }
    
    // PV = PMT * [1 - (1 + r)^(-n)] / r
    const onePlusRate = DecimalMath.add(1, r);
    const discountFactor = DecimalMath.power(onePlusRate, DecimalMath.multiply(n, -1));
    const numerator = DecimalMath.subtract(1, discountFactor);
    const annuityFactor = DecimalMath.divide(numerator, r);
    
    return DecimalMath.multiply(pmt, annuityFactor);
  }
}

// Export commonly used constants
export const DECIMAL_ZERO = new Decimal(0);
export const DECIMAL_ONE = new Decimal(1);
export const DECIMAL_HUNDRED = new Decimal(100);
export const DECIMAL_BASIS_POINT = new Decimal(0.0001); // 1 basis point = 0.01% 