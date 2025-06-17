/**
 * Cash Flow Converter - Convert bond data to YTM solver format
 */

import Decimal from 'decimal.js';
import { CashFlowData } from '../ytm-solvers/ytm-interface';

export interface BondCashFlow {
  date: string;
  totalPayment: number;
}

/**
 * Convert bond cash flows + market price to solver format
 * First entry is negative dirty price, followed by positive cash flows
 */
export function convertToSolverFormat(
  cashFlows: BondCashFlow[],
  marketPrice: number,
  settlementDate: Date
): CashFlowData[] {
  const result: CashFlowData[] = [];
  
  // First entry: negative dirty price on settlement date
  result.push({
    date: settlementDate,
    amount: new Decimal(marketPrice).negated()
  });
  
  // Add all future cash flows as positive amounts
  cashFlows.forEach(cf => {
    const cashFlowDate = new Date(cf.date);
    if (cashFlowDate > settlementDate) {
      result.push({
        date: cashFlowDate,
        amount: new Decimal(cf.totalPayment)
      });
    }
  });
  
  return result;
}

/**
 * Calculate dirty price from clean price and accrued interest
 * For now, simplified - assume clean price = dirty price
 * TODO: Add proper accrued interest calculation
 */
export function calculateDirtyPrice(cleanPrice: number, accruedInterest: number = 0): number {
  return cleanPrice + accruedInterest;
}