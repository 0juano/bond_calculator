/**
 * YTM Solver Interface - Clean abstraction for different YTM algorithms
 */

import Decimal from 'decimal.js';

export interface CashFlowData {
  date: Date;
  amount: Decimal; // Negative for payments (price), positive for receipts
}

export interface YTMResult {
  ytm: Decimal;           // Semi-annual YTM (bond market standard)
  success: boolean;
  iterations: number;
  algorithmUsed: string;
}

export interface YTMSolver {
  solve(cashFlows: CashFlowData[]): YTMResult;
  getName(): string;
}

export const DEFAULT_YTM_TOLERANCE = new Decimal(1e-10);
export const DEFAULT_MAX_ITERATIONS = 1000;