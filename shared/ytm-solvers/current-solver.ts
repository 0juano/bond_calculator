/**
 * Current YTM Solver Wrapper - Wraps existing Newton-Raphson system
 */

import Decimal from 'decimal.js';
import { YTMSolver, CashFlowData, YTMResult } from './ytm-interface';
import { BondCalculatorPro } from '../bond-calculator-production';

export class CurrentYTMSolver implements YTMSolver {
  
  getName(): string {
    return 'Current (Newton-Raphson + Fallbacks)';
  }

  solve(cashFlows: CashFlowData[]): YTMResult {
    try {
      // Convert cash flows to format expected by current calculator
      const bond = this.convertCashFlowsToBond(cashFlows);
      const marketPrice = cashFlows[0].amount.abs(); // First cash flow is negative price
      
      const calculator = new BondCalculatorPro();
      const result = calculator.analyze({
        bond,
        settlementDate: new Date(),
        price: marketPrice.toNumber()
      });
      
      return {
        ytm: new Decimal(result.yields?.ytm || 0),
        success: true,
        iterations: 0, // Current system doesn't expose iteration count
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

  private convertCashFlowsToBond(cashFlows: CashFlowData[]): any {
    // Bridge to convert from CashFlowData format to bond format
    // For now, return a minimal bond structure
    // The current solver will be deprecated in favor of XIRR
    return {
      bondInfo: {
        faceValue: 1000,
        maturityDate: cashFlows[cashFlows.length - 1].date.toISOString().split('T')[0]
      },
      cashFlows: cashFlows.slice(1).map(cf => ({
        date: cf.date.toISOString().split('T')[0],
        totalPayment: cf.amount.toNumber()
      }))
    };
  }
}