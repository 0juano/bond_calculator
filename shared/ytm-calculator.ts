/**
 * YTM Calculator Service - Uses XIRR as primary solver
 * Replaces the unstable current solver with reliable XIRR algorithm
 */

import Decimal from 'decimal.js';
import { FormulaXIRRSolver } from './ytm-solvers/formula-xirr';
import { convertToSolverFormat } from './utils/cash-flow-converter';

// Configure Decimal.js for high precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface YTMCalculatorResult {
  ytm: number;                // YTM as percentage (e.g., 10.5 for 10.5%)
  success: boolean;
  error?: string;
  algorithmUsed: string;
}

export class YTMCalculator {
  private xirrSolver = new FormulaXIRRSolver();

  /**
   * Calculate YTM using XIRR algorithm
   * @param cashFlows Bond cash flow schedule
   * @param marketPrice Price as percentage of face value (e.g., 80 for 80%)
   * @param settlementDate Settlement date for the calculation
   * @param faceValue Face value of the bond (default 1000)
   */
  calculateYTM(
    cashFlows: Array<{ date: string; totalPayment: number }>,
    marketPrice: number,
    settlementDate: Date,
    faceValue: number = 1000
  ): YTMCalculatorResult {
    try {
      // Convert price percentage to dollar amount
      const dollarPrice = (marketPrice / 100) * faceValue;
      
      // Convert to solver format
      const solverCashFlows = convertToSolverFormat(
        cashFlows,
        dollarPrice,
        settlementDate
      );
      
      // Calculate YTM using XIRR
      const result = this.xirrSolver.solve(solverCashFlows);
      
      if (!result.success) {
        return {
          ytm: 0,
          success: false,
          error: 'XIRR calculation failed to converge',
          algorithmUsed: result.algorithmUsed
        };
      }
      
      // Return YTM as percentage
      return {
        ytm: result.ytm.toNumber(),
        success: true,
        algorithmUsed: result.algorithmUsed
      };
      
    } catch (error) {
      return {
        ytm: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in YTM calculation',
        algorithmUsed: 'XIRR'
      };
    }
  }
  
  /**
   * Validate YTM result for reasonableness
   * @param ytm YTM as percentage
   * @param price Price as percentage of face value
   */
  isReasonableYTM(ytm: number, price: number): boolean {
    // Basic sanity checks
    if (ytm < -10 || ytm > 1000) return false;
    
    // Deep discount bonds (price < 50) can have high yields
    if (price < 50 && ytm > 100) {
      // Allow up to 500% for very deep discounts
      return ytm < 500;
    }
    
    // Normal range bonds should have reasonable yields
    if (price >= 50 && ytm > 50) {
      return false;
    }
    
    return true;
  }
}

// Singleton instance
export const ytmCalculator = new YTMCalculator();