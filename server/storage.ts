import { 
  BondDefinition, 
  InsertBond, 
  CashFlow, 
  InsertCashFlow, 
  BondResult, 
  CashFlowResult, 
  BondAnalytics, 
  ValidationResult,
  GOLDEN_BONDS 
} from "@shared/schema";

export interface IStorage {
  getBond(id: number): Promise<BondDefinition | undefined>;
  createBond(bond: InsertBond): Promise<BondDefinition>;
  buildBond(bond: InsertBond): Promise<BondResult>;
  validateBond(bond: InsertBond): Promise<ValidationResult>;
  getGoldenBond(id: string): Promise<InsertBond | undefined>;
  listGoldenBonds(): Promise<Record<string, any>>;
}

export class MemStorage implements IStorage {
  private bonds: Map<number, BondDefinition>;
  private cashFlows: Map<number, CashFlow[]>;
  private currentId: number;

  constructor() {
    this.bonds = new Map();
    this.cashFlows = new Map();
    this.currentId = 1;
  }

  async getBond(id: number): Promise<BondDefinition | undefined> {
    return this.bonds.get(id);
  }

  async createBond(insertBond: InsertBond): Promise<BondDefinition> {
    const id = this.currentId++;
    const bond = {
      ...insertBond,
      id,
      cusip: insertBond.cusip || null,
      firstCouponDate: insertBond.firstCouponDate || null,
      faceValue: insertBond.faceValue.toString(),
      couponRate: insertBond.couponRate.toString(),
      dayCountConvention: insertBond.dayCountConvention || "30/360",
      currency: insertBond.currency || "USD",
      isAmortizing: insertBond.isAmortizing || null,
      isCallable: insertBond.isCallable || null,
      isPuttable: insertBond.isPuttable || null,
      isVariableCoupon: insertBond.isVariableCoupon || null,
      amortizationSchedule: insertBond.amortizationSchedule || null,
      callSchedule: insertBond.callSchedule || null,
      putSchedule: insertBond.putSchedule || null,
      createdAt: new Date(),
    } as BondDefinition;
    this.bonds.set(id, bond);
    return bond;
  }

  async validateBond(bond: InsertBond): Promise<ValidationResult> {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Date validations
    const issueDate = new Date(bond.issueDate);
    const maturityDate = new Date(bond.maturityDate);
    const firstCouponDate = bond.firstCouponDate ? new Date(bond.firstCouponDate) : null;

    if (maturityDate <= issueDate) {
      errors.maturityDate = "Maturity date must be after issue date";
    }

    if (firstCouponDate && firstCouponDate <= issueDate) {
      errors.firstCouponDate = "First coupon date must be after issue date";
    }

    // Face value validation
    if (bond.faceValue <= 0) {
      errors.faceValue = "Face value must be positive";
    }

    // Coupon rate validation
    if (bond.couponRate < 0 || bond.couponRate > 50) {
      errors.couponRate = "Coupon rate must be between 0% and 50%";
    }

    // Amortization schedule validation
    if (bond.amortizationSchedule && bond.amortizationSchedule.length > 0) {
      let totalAmortization = 0;
      for (const amort of bond.amortizationSchedule) {
        const amortDate = new Date(amort.date);
        if (amortDate <= issueDate || amortDate > maturityDate) {
          errors.amortizationSchedule = "Amortization dates must be between issue and maturity dates";
          break;
        }
        totalAmortization += amort.principalPercent;
      }
      
      if (totalAmortization > 100) {
        errors.amortizationSchedule = "Total amortization cannot exceed 100%";
      }

      if (totalAmortization > 90) {
        warnings.amortizationSchedule = "High amortization percentage may leave small final payment";
      }
    }

    // Call schedule validation
    if (bond.callSchedule && bond.callSchedule.length > 0) {
      for (const call of bond.callSchedule) {
        const firstCallDate = new Date(call.firstCallDate);
        const lastCallDate = new Date(call.lastCallDate);
        
        if (firstCallDate <= issueDate) {
          errors.callSchedule = "Call dates must be after issue date";
        }
        
        if (lastCallDate > maturityDate) {
          errors.callSchedule = "Call dates must be before maturity date";
        }
        
        if (firstCallDate >= lastCallDate) {
          errors.callSchedule = "First call date must be before last call date";
        }
      }
    }

    // Put schedule validation
    if (bond.putSchedule && bond.putSchedule.length > 0) {
      for (const put of bond.putSchedule) {
        const firstPutDate = new Date(put.firstPutDate);
        const lastPutDate = new Date(put.lastPutDate);
        
        if (firstPutDate <= issueDate) {
          errors.putSchedule = "Put dates must be after issue date";
        }
        
        if (lastPutDate > maturityDate) {
          errors.putSchedule = "Put dates must be before maturity date";
        }
        
        if (firstPutDate >= lastPutDate) {
          errors.putSchedule = "First put date must be before last put date";
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  }

  async buildBond(bond: InsertBond): Promise<BondResult> {
    const startTime = Date.now();

    // First validate the bond
    const validation = await this.validateBond(bond);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
    }

    // Generate cash flows
    const cashFlows = this.generateCashFlows(bond);
    
    // Calculate analytics
    const analytics = this.calculateAnalytics(bond, cashFlows);
    
    const buildTime = Date.now() - startTime;

    return {
      bond: bond as any,
      cashFlows,
      analytics,
      buildTime,
      status: "SUCCESS",
    };
  }

  private generateCashFlows(bond: InsertBond): CashFlowResult[] {
    const flows: CashFlowResult[] = [];
    const issueDate = new Date(bond.issueDate);
    const maturityDate = new Date(bond.maturityDate);
    
    // Determine first coupon date
    const firstCouponDate = bond.firstCouponDate 
      ? new Date(bond.firstCouponDate)
      : this.calculateNextCouponDate(issueDate, bond.paymentFrequency);

    // Generate regular coupon payments
    let currentDate = new Date(firstCouponDate);
    let remainingNotional = bond.faceValue;
    const couponAmount = (bond.faceValue * bond.couponRate / 100) / bond.paymentFrequency;

    // Handle amortization schedule
    const amortizationMap = new Map<string, number>();
    if (bond.amortizationSchedule) {
      for (const amort of bond.amortizationSchedule) {
        amortizationMap.set(amort.date, amort.principalPercent);
      }
    }

    // Generate payments until maturity
    while (currentDate <= maturityDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const isMaturity = currentDate.getTime() === maturityDate.getTime();
      
      // Check for amortization on this date
      const amortPercent = amortizationMap.get(dateStr) || 0;
      const amortAmount = (bond.faceValue * amortPercent) / 100;
      
      // Determine payment type and amounts
      let couponPayment = 0;
      let principalPayment = 0;
      let paymentType = "COUPON";

      if (isMaturity) {
        // Final payment includes remaining principal
        couponPayment = couponAmount;
        principalPayment = remainingNotional;
        paymentType = "MATURITY";
      } else if (amortAmount > 0) {
        // Amortization payment
        couponPayment = (remainingNotional * bond.couponRate / 100) / bond.paymentFrequency;
        principalPayment = amortAmount;
        paymentType = "AMORTIZATION";
      } else {
        // Regular coupon payment
        couponPayment = (remainingNotional * bond.couponRate / 100) / bond.paymentFrequency;
        principalPayment = 0;
        paymentType = "COUPON";
      }

      const totalPayment = couponPayment + principalPayment;
      remainingNotional -= principalPayment;

      flows.push({
        date: dateStr,
        couponPayment,
        principalPayment,
        totalPayment,
        remainingNotional: Math.max(0, remainingNotional),
        paymentType,
      });

      if (isMaturity) break;

      // Calculate next payment date
      currentDate = this.calculateNextCouponDate(currentDate, bond.paymentFrequency);
    }

    return flows;
  }

  private calculateNextCouponDate(currentDate: Date, frequency: number): Date {
    const nextDate = new Date(currentDate);
    const monthsToAdd = 12 / frequency;
    nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
    return nextDate;
  }

  private calculateAnalytics(bond: InsertBond, cashFlows: CashFlowResult[]): BondAnalytics {
    // Simple analytics calculations - in production would use more sophisticated methods
    const totalCoupons = cashFlows.reduce((sum, flow) => sum + flow.couponPayment, 0);
    const presentValue = bond.faceValue; // Simplified - would use discounting in production
    
    // Calculate duration (simplified Macaulay duration approximation)
    const maturityYears = this.calculateYearsToMaturity(bond.issueDate, bond.maturityDate);
    const yieldToMaturity = bond.couponRate; // Simplified - would calculate YTM properly
    const yieldToWorst = bond.couponRate; // Simplified - would calculate YTW properly
    const macaulayDuration = maturityYears * 0.95; // Simplified approximation
    const duration = maturityYears * 0.9; // Simplified approximation
    
    // Calculate average life
    let weightedSum = 0;
    let totalPayments = 0;
    const issueDate = new Date(bond.issueDate);
    
    for (const flow of cashFlows) {
      const flowDate = new Date(flow.date);
      const yearsFromIssue = (flowDate.getTime() - issueDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      weightedSum += flow.principalPayment * yearsFromIssue;
      totalPayments += flow.principalPayment;
    }
    
    const averageLife = totalPayments > 0 ? weightedSum / totalPayments : maturityYears;
    
    // Calculate convexity (simplified)
    const convexity = duration * duration * 0.1;

    // Market price and accrual calculations (simplified)
    const marketPrice = bond.faceValue;
    const cleanPrice = marketPrice;
    const accruedInterest = 0; // Simplified - would calculate based on settlement date
    const dirtyPrice = cleanPrice + accruedInterest;
    const daysToNextCoupon = 90; // Simplified - would calculate based on payment frequency
    const dollarDuration = (duration * marketPrice) / 10000;
    const currentYield = (bond.faceValue * bond.couponRate / 100) / marketPrice;

    return {
      // Core metrics
      yieldToMaturity,
      yieldToWorst,
      duration,
      macaulayDuration,
      averageLife,
      convexity,
      totalCoupons,
      presentValue,
      
      // Price and accrual metrics
      marketPrice,
      cleanPrice,
      dirtyPrice,
      accruedInterest,
      daysToNextCoupon,
      dollarDuration,
      currentYield,
    };
  }

  private calculateYearsToMaturity(issueDate: string, maturityDate: string): number {
    const issue = new Date(issueDate);
    const maturity = new Date(maturityDate);
    return (maturity.getTime() - issue.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  async getGoldenBond(id: string): Promise<InsertBond | undefined> {
    const goldenBond = GOLDEN_BONDS[id as keyof typeof GOLDEN_BONDS];
    if (!goldenBond) return undefined;
    
    return { ...goldenBond } as any;
  }

  async listGoldenBonds(): Promise<Record<string, any>> {
    return Object.keys(GOLDEN_BONDS).reduce((acc, key) => {
      const bond = GOLDEN_BONDS[key as keyof typeof GOLDEN_BONDS];
      acc[key] = {
        name: this.getGoldenBondDisplayName(key),
        description: `${bond.couponRate}% ${bond.issuer}`,
        maturity: bond.maturityDate,
      };
      return acc;
    }, {} as Record<string, any>);
  }

  private getGoldenBondDisplayName(key: string): string {
    const names: Record<string, string> = {
      "vanilla-5y": "5Y 5.00% Vanilla Bond",
      "amortizing-10y": "10Y 4.50% Amortizing",
      "callable-7y": "7Y 5.25% Callable",
      "puttable-3y": "3Y 3.75% Puttable",
      "variable-step-up": "5Y Variable Step-Up",
      "complex-combo": "Complex Callable/Puttable",
      "al30d-argentina": "AL30D Argentina 2030 Step-Up",
    };
    return names[key] || key;
  }
}

export const storage = new MemStorage();
