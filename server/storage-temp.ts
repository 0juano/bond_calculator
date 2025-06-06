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
  getBond(id: number): Promise<any>;
  createBond(bond: InsertBond): Promise<any>;
  buildBond(bond: InsertBond): Promise<BondResult>;
  validateBond(bond: InsertBond): Promise<ValidationResult>;
  getGoldenBond(id: string): Promise<any>;
  listGoldenBonds(): Promise<Record<string, any>>;
}

export class MemStorage implements IStorage {
  private bonds: Map<number, any>;
  private cashFlows: Map<number, any[]>;
  private currentId: number;

  constructor() {
    this.bonds = new Map();
    this.cashFlows = new Map();
    this.currentId = 1;
  }

  async getBond(id: number): Promise<any> {
    return this.bonds.get(id);
  }

  async createBond(insertBond: InsertBond): Promise<any> {
    const id = this.currentId++;
    const bond = {
      ...insertBond,
      id,
      createdAt: new Date(),
    };
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
        if (amortDate <= issueDate || amortDate >= maturityDate) {
          errors.amortizationSchedule = "Amortization dates must be between issue and maturity dates";
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

    // Handle amortization schedule
    const amortizationMap = new Map<string, number>();
    if (bond.amortizationSchedule) {
      for (const amort of bond.amortizationSchedule) {
        amortizationMap.set(amort.date, amort.principalPercent);
      }
    }

    // Handle coupon rate changes
    const couponRateMap = new Map<string, number>();
    if (bond.couponRateChanges) {
      for (const change of bond.couponRateChanges) {
        couponRateMap.set(change.effectiveDate, change.newCouponRate);
      }
    }

    // Track current coupon rate
    let currentCouponRate = bond.couponRate;

    // Generate payments until maturity
    while (currentDate <= maturityDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const isMaturity = currentDate.getTime() === maturityDate.getTime();
      
      // Check for coupon rate change on this date
      if (couponRateMap.has(dateStr)) {
        currentCouponRate = couponRateMap.get(dateStr)!;
      }

      // Check for amortization on this date
      const amortPercent = amortizationMap.get(dateStr) || 0;
      const amortAmount = (bond.faceValue * amortPercent) / 100;
      
      // Calculate coupon based on current remaining notional and current coupon rate
      const currentCouponPayment = (remainingNotional * currentCouponRate / 100) / bond.paymentFrequency;
      
      // Determine payment type and amounts
      let couponPayment = 0;
      let principalPayment = 0;
      let paymentType = "COUPON";

      if (isMaturity) {
        // Final payment: coupon on remaining notional + all remaining principal
        couponPayment = currentCouponPayment;
        principalPayment = remainingNotional;
        paymentType = "MATURITY";
      } else if (amortAmount > 0) {
        // Amortization payment: coupon on current notional + scheduled amortization
        couponPayment = currentCouponPayment;
        principalPayment = amortAmount;
        paymentType = "AMORTIZATION";
      } else {
        // Regular coupon payment: coupon on current remaining notional
        couponPayment = currentCouponPayment;
        principalPayment = 0;
        paymentType = "COUPON";
      }

      const totalPayment = couponPayment + principalPayment;
      
      flows.push({
        date: dateStr,
        couponPayment,
        principalPayment,
        totalPayment,
        remainingNotional: Math.max(0, remainingNotional),
        paymentType,
      });

      // Update remaining notional after recording the payment
      remainingNotional -= principalPayment;

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
    const issueDate = new Date(bond.issueDate);
    const totalCoupons = cashFlows.reduce((sum, flow) => sum + flow.couponPayment, 0);
    const compoundingFreq = bond.paymentFrequency;
    
    // Use face value as market price for now
    const marketPrice = bond.faceValue;
    
    console.log(`Analytics calculation - Cash flows count: ${cashFlows.length}`);
    console.log(`Market price: ${marketPrice}, Compounding freq: ${compoundingFreq}`);
    
    // Calculate YTM using iterative method (Newton-Raphson approximation)
    const ytm = this.calculateYTM(cashFlows, marketPrice, issueDate, compoundingFreq);
    console.log(`Calculated YTM: ${ytm}`);
    
    // Calculate Macaulay Duration
    const macaulayDuration = this.calculateMacaulayDuration(cashFlows, ytm, issueDate, compoundingFreq);
    console.log(`Macaulay Duration: ${macaulayDuration}`);
    
    // Calculate Modified Duration
    const modifiedDuration = macaulayDuration / (1 + ytm / compoundingFreq);
    console.log(`Modified Duration: ${modifiedDuration}`);
    
    // Calculate Average Life (weighted average time to principal repayment)
    const averageLife = this.calculateAverageLife(cashFlows, issueDate);
    console.log(`Average Life: ${averageLife}`);
    
    // Calculate Present Value at YTM
    const presentValue = this.calculatePresentValue(cashFlows, ytm, issueDate, compoundingFreq);
    
    // YTW calculation (simplified - for callable/puttable bonds would need call/put schedules)
    const yieldToWorst = ytm;
    
    // Convexity approximation
    const convexity = macaulayDuration * macaulayDuration / (1 + ytm);

    const result = {
      yieldToWorst: Number((yieldToWorst * 100).toFixed(2)),
      duration: Number(modifiedDuration.toFixed(2)),
      averageLife: Number(averageLife.toFixed(2)),
      convexity: Number(convexity.toFixed(2)),
      totalCoupons: Number(totalCoupons.toFixed(2)),
      presentValue: Number(((presentValue / bond.faceValue) * 100).toFixed(2)),
    };
    
    console.log('Final analytics result:', result);
    return result;
  }

  private calculateYTM(cashFlows: CashFlowResult[], marketPrice: number, issueDate: Date, compoundingFreq: number): number {
    // Newton-Raphson method to solve for YTM
    let ytm = 0.05; // Initial guess of 5%
    const tolerance = 1e-8;
    const maxIterations = 100;
    
    for (let i = 0; i < maxIterations; i++) {
      const pv = this.calculatePresentValue(cashFlows, ytm, issueDate, compoundingFreq);
      const pvDerivative = this.calculatePVDerivative(cashFlows, ytm, issueDate, compoundingFreq);
      
      const f = pv - marketPrice;
      if (Math.abs(f) < tolerance) break;
      
      if (Math.abs(pvDerivative) < tolerance) break; // Avoid division by zero
      
      ytm = ytm - f / pvDerivative;
      
      // Keep YTM in reasonable bounds
      ytm = Math.max(-0.5, Math.min(2.0, ytm));
    }
    
    return ytm;
  }

  private calculatePresentValue(cashFlows: CashFlowResult[], yieldRate: number, issueDate: Date, compoundingFreq: number): number {
    let totalPV = 0;
    
    for (const flow of cashFlows) {
      const flowDate = new Date(flow.date);
      const timeYears = (flowDate.getTime() - issueDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const totalCashFlow = flow.couponPayment + flow.principalPayment;
      
      // PV = CF / (1 + Y/n)^(n*t)
      const discountFactor = Math.pow(1 + yieldRate / compoundingFreq, compoundingFreq * timeYears);
      totalPV += totalCashFlow / discountFactor;
    }
    
    return totalPV;
  }

  private calculatePVDerivative(cashFlows: CashFlowResult[], yieldRate: number, issueDate: Date, compoundingFreq: number): number {
    let derivative = 0;
    
    for (const flow of cashFlows) {
      const flowDate = new Date(flow.date);
      const timeYears = (flowDate.getTime() - issueDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const totalCashFlow = flow.couponPayment + flow.principalPayment;
      
      // d/dy [CF / (1 + y/n)^(n*t)] = -CF * (n*t) / (n * (1 + y/n)^(n*t + 1))
      const periods = compoundingFreq * timeYears;
      const discountFactor = Math.pow(1 + yieldRate / compoundingFreq, periods + 1);
      derivative -= (totalCashFlow * periods) / (compoundingFreq * discountFactor);
    }
    
    return derivative;
  }

  private calculateMacaulayDuration(cashFlows: CashFlowResult[], yieldRate: number, issueDate: Date, compoundingFreq: number): number {
    let weightedTimeSum = 0;
    let totalPV = 0;
    
    for (const flow of cashFlows) {
      const flowDate = new Date(flow.date);
      const timeYears = (flowDate.getTime() - issueDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const totalCashFlow = flow.couponPayment + flow.principalPayment;
      
      const discountFactor = Math.pow(1 + yieldRate / compoundingFreq, compoundingFreq * timeYears);
      const pvOfFlow = totalCashFlow / discountFactor;
      
      weightedTimeSum += timeYears * pvOfFlow;
      totalPV += pvOfFlow;
    }
    
    return totalPV > 0 ? weightedTimeSum / totalPV : 0;
  }

  private calculateAverageLife(cashFlows: CashFlowResult[], issueDate: Date): number {
    let principalWeightedTime = 0;
    let totalPrincipal = 0;
    
    for (const flow of cashFlows) {
      if (flow.principalPayment > 0) {
        const flowDate = new Date(flow.date);
        const timeYears = (flowDate.getTime() - issueDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        
        principalWeightedTime += flow.principalPayment * timeYears;
        totalPrincipal += flow.principalPayment;
      }
    }
    
    return totalPrincipal > 0 ? principalWeightedTime / totalPrincipal : 0;
  }

  private calculateYearsToMaturity(issueDate: string, maturityDate: string): number {
    const issue = new Date(issueDate);
    const maturity = new Date(maturityDate);
    return (maturity.getTime() - issue.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  async getGoldenBond(id: string): Promise<any> {
    const goldenBond = GOLDEN_BONDS[id as keyof typeof GOLDEN_BONDS];
    if (!goldenBond) return undefined;
    
    return { ...goldenBond };
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
    };
    return names[key] || key;
  }
}

export const storage = new MemStorage();