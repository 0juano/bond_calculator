/**
 * Dual YTM Solver - Runs both current and XIRR solvers for comparison
 * Automatically falls back from current solver to XIRR if needed
 */

import Decimal from 'decimal.js';
import { YTMSolver, CashFlowData, YTMResult } from './ytm-interface';
import { CurrentYTMSolver } from './current-solver';
import { FormulaXIRRSolver } from './formula-xirr';

export interface DualYTMResult {
  primary: YTMResult;
  secondary: YTMResult;
  discrepancy: Decimal; // Absolute difference in bp
  recommendation: 'USE_PRIMARY' | 'USE_SECONDARY' | 'INVESTIGATE';
}

export class DualYTMSolver {
  private currentSolver = new CurrentYTMSolver();
  private xirrSolver = new FormulaXIRRSolver();

  /**
   * Run both solvers and compare results
   */
  async solveBoth(cashFlows: CashFlowData[]): Promise<DualYTMResult> {
    const primaryResult = this.currentSolver.solve(cashFlows);
    const secondaryResult = this.xirrSolver.solve(cashFlows);
    
    const discrepancy = this.calculateDiscrepancy(primaryResult.ytm, secondaryResult.ytm);
    const recommendation = this.getRecommendation(primaryResult, secondaryResult, discrepancy);
    
    // Log comparison for analysis
    this.logComparison(primaryResult, secondaryResult, discrepancy);
    
    return {
      primary: primaryResult,
      secondary: secondaryResult,
      discrepancy,
      recommendation
    };
  }

  /**
   * Get best YTM with automatic fallback
   */
  async solveWithFallback(cashFlows: CashFlowData[]): Promise<YTMResult> {
    try {
      const primaryResult = this.currentSolver.solve(cashFlows);
      if (primaryResult.success && this.isReasonableYTM(primaryResult.ytm)) {
        return primaryResult;
      }
    } catch (error) {
      console.warn('Primary solver failed, falling back to XIRR');
    }
    
    // Fallback to XIRR
    return this.xirrSolver.solve(cashFlows);
  }

  private calculateDiscrepancy(ytm1: Decimal, ytm2: Decimal): Decimal {
    return ytm1.minus(ytm2).abs().times(100); // Convert to basis points
  }

  private getRecommendation(
    primary: YTMResult, 
    secondary: YTMResult, 
    discrepancy: Decimal
  ): 'USE_PRIMARY' | 'USE_SECONDARY' | 'INVESTIGATE' {
    // If discrepancy > 500bp, investigate
    if (discrepancy.gt(500)) return 'INVESTIGATE';
    
    // If primary failed, use secondary
    if (!primary.success && secondary.success) return 'USE_SECONDARY';
    
    // If both succeeded and close, use primary
    if (primary.success && secondary.success && discrepancy.lt(50)) return 'USE_PRIMARY';
    
    return 'INVESTIGATE';
  }

  private isReasonableYTM(ytm: Decimal): boolean {
    // Flag unrealistic YTMs (outside -10% to 200% range)
    return ytm.gte(-10) && ytm.lte(200);
  }

  private logComparison(primary: YTMResult, secondary: YTMResult, discrepancy: Decimal): void {
    if (discrepancy.gt(5)) { // Log if discrepancy > 5bp
      console.log('🔍 YTM Solver Comparison:', {
        primary: `${primary.ytm.toFixed(3)}% (${primary.algorithmUsed})`,
        secondary: `${secondary.ytm.toFixed(3)}% (${secondary.algorithmUsed})`,
        discrepancy: `${discrepancy.toFixed(1)}bp`,
        primarySuccess: primary.success,
        secondarySuccess: secondary.success
      });
    }
  }
}