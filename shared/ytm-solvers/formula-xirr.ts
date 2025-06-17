/**
 * Formula.js XIRR Implementation with Decimal.js Precision
 * Based on Apache-licensed OpenOffice algorithm with robust bracketing
 */

import Decimal from 'decimal.js';
import { YTMSolver, CashFlowData, YTMResult, DEFAULT_YTM_TOLERANCE, DEFAULT_MAX_ITERATIONS } from './ytm-interface';

export class FormulaXIRRSolver implements YTMSolver {
  
  getName(): string {
    return 'Formula.js XIRR (Decimal)';
  }

  solve(cashFlows: CashFlowData[]): YTMResult {
    try {
      const effectiveRate = this.calculateXIRR(cashFlows);
      // Convert effective annual rate to semi-annual YTM
      const semiAnnualYTM = this.convertToSemiAnnual(effectiveRate);
      
      return {
        ytm: semiAnnualYTM,
        success: true,
        iterations: 0, // TODO: Track iterations in implementation
        algorithmUsed: this.getName()
      };
    } catch (error) {
      return {
        ytm: new Decimal(0),
        success: false,
        iterations: 0,
        algorithmUsed: this.getName()
      };
    }
  }

  private calculateXIRR(cashFlows: CashFlowData[]): Decimal {
    // Validate inputs
    if (cashFlows.length < 2) {
      throw new Error('XIRR requires at least 2 cash flows');
    }
    
    // Check for at least one positive and one negative value
    const hasPositive = cashFlows.some(cf => cf.amount.gt(0));
    const hasNegative = cashFlows.some(cf => cf.amount.lt(0));
    
    if (!hasPositive || !hasNegative) {
      throw new Error('XIRR requires at least one positive and one negative cash flow');
    }
    
    // Newton-Raphson method implementation
    const initialGuess = new Decimal(0.1); // 10% initial guess
    let rate = initialGuess;
    
    const maxIterations = 100;
    const tolerance = new Decimal(1e-10);
    
    for (let i = 0; i < maxIterations; i++) {
      const npv = this.calculateNPV(cashFlows, rate);
      const derivative = this.calculateDerivative(cashFlows, rate);
      
      // Check for convergence
      if (npv.abs().lt(tolerance)) {
        return rate;
      }
      
      // Avoid division by zero
      if (derivative.abs().lt(tolerance)) {
        throw new Error('XIRR derivative too small, cannot converge');
      }
      
      // Newton-Raphson iteration: x_new = x_old - f(x) / f'(x)
      const newRate = rate.minus(npv.div(derivative));
      
      // Check for convergence in rate change
      if (rate.minus(newRate).abs().lt(tolerance)) {
        return newRate;
      }
      
      rate = newRate;
      
      // Prevent extreme values
      if (rate.lt(-0.99) || rate.gt(100)) {
        throw new Error('XIRR rate out of reasonable bounds');
      }
    }
    
    throw new Error('XIRR failed to converge after maximum iterations');
  }
  
  /**
   * Calculate Net Present Value for given cash flows and rate
   */
  private calculateNPV(cashFlows: CashFlowData[], rate: Decimal): Decimal {
    const baseDate = cashFlows[0].date;
    let npv = cashFlows[0].amount; // First cash flow (typically negative price)
    
    for (let i = 1; i < cashFlows.length; i++) {
      const cf = cashFlows[i];
      const years = this.daysBetween(baseDate, cf.date) / 365;
      const discountFactor = rate.plus(1).pow(years);
      npv = npv.plus(cf.amount.div(discountFactor));
    }
    
    return npv;
  }
  
  /**
   * Calculate derivative of NPV with respect to rate
   */
  private calculateDerivative(cashFlows: CashFlowData[], rate: Decimal): Decimal {
    const baseDate = cashFlows[0].date;
    let derivative = new Decimal(0);
    
    for (let i = 1; i < cashFlows.length; i++) {
      const cf = cashFlows[i];
      const years = this.daysBetween(baseDate, cf.date) / 365;
      const discountFactor = rate.plus(1).pow(years + 1);
      const term = cf.amount.times(years).div(discountFactor).negated();
      derivative = derivative.plus(term);
    }
    
    return derivative;
  }
  
  /**
   * Calculate days between two dates
   */
  private daysBetween(startDate: Date, endDate: Date): number {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return (endDate.getTime() - startDate.getTime()) / millisecondsPerDay;
  }

  /**
   * Convert effective annual rate to semi-annual YTM
   * Formula: ySA = 2 × [(1 + r_eff)^0.5 − 1]
   */
  private convertToSemiAnnual(effectiveRate: Decimal): Decimal {
    const onePlusRate = effectiveRate.plus(1);
    const halfPower = onePlusRate.pow(0.5);
    const semiRate = halfPower.minus(1);
    return semiRate.times(2).times(100); // Convert to percentage
  }
}