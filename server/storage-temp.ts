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
    
    try {
      // Enhanced validation
      const validation = await this.validateBond(bond);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }
      
      // Generate cash flows with error handling
      let cashFlows: CashFlowResult[];
      try {
        cashFlows = this.generateCashFlows(bond);
        if (cashFlows.length === 0) {
          throw new Error('No cash flows generated - check bond parameters');
        }
      } catch (error) {
        throw new Error(`Cash flow generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Calculate analytics with error handling
      let analytics: BondAnalytics;
      try {
        analytics = this.calculateAnalytics(bond, cashFlows);
      } catch (error) {
        console.error('Analytics calculation error:', error);
        throw new Error(`Analytics calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      const buildTime = Date.now() - startTime;
      
      // Validate results
      this.validateAnalyticsResults(analytics);
      
      return {
        bond: bond as any,
        cashFlows,
        analytics,
        buildTime,
        status: "SUCCESS"
      };
      
    } catch (error) {
      const buildTime = Date.now() - startTime;
      console.error('Bond build error:', error);
      
      return {
        bond: bond as any,
        cashFlows: [],
        analytics: this.getDefaultAnalytics(),
        buildTime,
        status: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
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
    while (currentDate < maturityDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
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

      if (amortAmount > 0) {
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

      // Calculate next payment date
      currentDate = this.calculateNextCouponDate(currentDate, bond.paymentFrequency);
    }

    // Always add the maturity payment
    const maturityDateStr = maturityDate.toISOString().split('T')[0];
    
    // Check for final coupon rate change on maturity date
    if (couponRateMap.has(maturityDateStr)) {
      currentCouponRate = couponRateMap.get(maturityDateStr)!;
    }
    
    // Final coupon payment on remaining notional
    const finalCouponPayment = (remainingNotional * currentCouponRate / 100) / bond.paymentFrequency;
    
    flows.push({
      date: maturityDateStr,
      couponPayment: finalCouponPayment,
      principalPayment: remainingNotional,
      totalPayment: finalCouponPayment + remainingNotional,
      remainingNotional: 0,
      paymentType: "MATURITY",
    });

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
    const settlementDate = bond.settlementDate ? new Date(bond.settlementDate) : new Date();
    const totalCoupons = cashFlows.reduce((sum, flow) => sum + flow.couponPayment, 0);
    const compoundingFreq = bond.paymentFrequency;
    
    // Use face value as market price for now (can be overridden in future)
    const marketPrice = bond.faceValue;
    
    console.log(`Enhanced analytics calculation - Settlement: ${settlementDate.toISOString()}`);
    console.log(`Market price: ${marketPrice}, Compounding freq: ${compoundingFreq}`);
    
    // Core calculations
    const ytm = this.calculateYTM(cashFlows, marketPrice, settlementDate, compoundingFreq);
    console.log(`Calculated YTM: ${ytm}`);
    
    const macaulayDuration = this.calculateMacaulayDuration(cashFlows, ytm, settlementDate, compoundingFreq);
    console.log(`Macaulay Duration: ${macaulayDuration}`);
    
    const modifiedDuration = macaulayDuration / (1 + ytm / compoundingFreq);
    console.log(`Modified Duration: ${modifiedDuration}`);
    
    const averageLife = this.calculateAverageLife(cashFlows, settlementDate);
    console.log(`Average Life: ${averageLife}`);
    
    const presentValue = this.calculatePresentValue(cashFlows, ytm, settlementDate, compoundingFreq);
    
    // New calculations
    const accruedInterest = this.calculateAccruedInterest(bond, settlementDate);
    const daysToNextCoupon = this.calculateDaysToNextCoupon(bond, settlementDate);
    const dollarDuration = this.calculateDollarDuration(modifiedDuration, marketPrice);
    const currentYield = this.calculateCurrentYield(bond, marketPrice);
    
    // Price calculations
    const cleanPrice = marketPrice;
    const dirtyPrice = cleanPrice + accruedInterest;
    
    // Enhanced YTW calculation for callable/puttable bonds
    const { yieldToWorst, yieldToCall, yieldToPut } = this.calculateAdvancedYields(
      bond, cashFlows, marketPrice, settlementDate, compoundingFreq
    );
    
    // Enhanced convexity calculation
    const convexity = this.calculateConvexity(cashFlows, ytm, settlementDate, compoundingFreq);

    const result: BondAnalytics = {
      // Core metrics
      yieldToMaturity: Number((ytm * 100).toFixed(3)),
      yieldToWorst: Number((yieldToWorst * 100).toFixed(3)),
      duration: Number(modifiedDuration.toFixed(4)),
      macaulayDuration: Number(macaulayDuration.toFixed(4)),
      averageLife: Number(averageLife.toFixed(4)),
      convexity: Number(convexity.toFixed(4)),
      totalCoupons: Number(totalCoupons.toFixed(2)),
      presentValue: Number(((presentValue / bond.faceValue) * 100).toFixed(4)),
      
      // Price and accrual metrics
      marketPrice: Number(marketPrice.toFixed(2)),
      cleanPrice: Number(cleanPrice.toFixed(4)),
      dirtyPrice: Number(dirtyPrice.toFixed(4)),
      accruedInterest: Number(accruedInterest.toFixed(4)),
      daysToNextCoupon,
      dollarDuration: Number(dollarDuration.toFixed(6)),
      currentYield: Number((currentYield * 100).toFixed(3)),
      
      // Optional metrics for bonds with options
      ...(yieldToCall !== null && { yieldToCall: Number((yieldToCall * 100).toFixed(3)) }),
      ...(yieldToPut !== null && { yieldToPut: Number((yieldToPut * 100).toFixed(3)) }),
    };
    
    console.log('Enhanced analytics result:', result);
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

  private calculateAverageLife(cashFlows: CashFlowResult[], settlementDate: Date): number {
    let principalWeightedTime = 0;
    let totalPrincipal = 0;
    
    for (const flow of cashFlows) {
      if (flow.principalPayment > 0) {
        const flowDate = new Date(flow.date);
        const timeYears = (flowDate.getTime() - settlementDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        
        principalWeightedTime += flow.principalPayment * timeYears;
        totalPrincipal += flow.principalPayment;
      }
    }
    
    return totalPrincipal > 0 ? principalWeightedTime / totalPrincipal : 0;
  }

  // New calculation methods

  private calculateAccruedInterest(bond: InsertBond, settlementDate: Date): number {
    try {
      const { lastCouponDate, nextCouponDate } = this.getCouponDates(bond, settlementDate);
      
      if (!lastCouponDate || !nextCouponDate) return 0;
      
      const daysSinceLastCoupon = this.calculateDaysBetween(lastCouponDate, settlementDate);
      const daysInPeriod = this.calculateDaysBetween(lastCouponDate, nextCouponDate);
      
      if (daysInPeriod <= 0) return 0;
      
      const periodicCouponRate = bond.couponRate / 100 / bond.paymentFrequency;
      const couponAmount = bond.faceValue * periodicCouponRate;
      
      // Apply day count convention
      const accrualFraction = this.applyDayCountConvention(
        daysSinceLastCoupon, 
        daysInPeriod, 
        bond.dayCountConvention || "30/360"
      );
      
      return couponAmount * accrualFraction;
    } catch (error) {
      console.error('Error calculating accrued interest:', error);
      return 0;
    }
  }

  private calculateDaysToNextCoupon(bond: InsertBond, settlementDate: Date): number {
    try {
      const { nextCouponDate } = this.getCouponDates(bond, settlementDate);
      
      if (!nextCouponDate) return 0;
      
      const diffTime = nextCouponDate.getTime() - settlementDate.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch (error) {
      console.error('Error calculating days to next coupon:', error);
      return 0;
    }
  }

  private calculateDollarDuration(modifiedDuration: number, marketPrice: number): number {
    // DV01 = Modified Duration * Market Price / 10000
    return (modifiedDuration * marketPrice) / 10000;
  }

  private calculateCurrentYield(bond: InsertBond, marketPrice: number): number {
    if (marketPrice <= 0) return 0;
    const annualCoupon = (bond.faceValue * bond.couponRate / 100);
    return annualCoupon / marketPrice;
  }

  private calculateAdvancedYields(
    bond: InsertBond, 
    cashFlows: CashFlowResult[], 
    marketPrice: number, 
    settlementDate: Date, 
    compoundingFreq: number
  ): { yieldToWorst: number; yieldToCall: number | null; yieldToPut: number | null } {
    
    const ytm = this.calculateYTM(cashFlows, marketPrice, settlementDate, compoundingFreq);
    let yieldToWorst = ytm;
    let yieldToCall: number | null = null;
    let yieldToPut: number | null = null;
    
    // Calculate YTC for callable bonds
    if (bond.isCallable && bond.callSchedule && bond.callSchedule.length > 0) {
      const ytcValues: number[] = [];
      
      for (const callOption of bond.callSchedule) {
        try {
          const callCashFlows = this.generateCallCashFlows(bond, callOption, settlementDate);
          const ytc = this.calculateYTM(callCashFlows, marketPrice, settlementDate, compoundingFreq);
          ytcValues.push(ytc);
        } catch (error) {
          console.error('Error calculating YTC for call option:', callOption, error);
        }
      }
      
      if (ytcValues.length > 0) {
        yieldToCall = Math.min(...ytcValues);
        yieldToWorst = Math.min(yieldToWorst, yieldToCall);
      }
    }
    
    // Calculate YTP for puttable bonds
    if (bond.isPuttable && bond.putSchedule && bond.putSchedule.length > 0) {
      const ytpValues: number[] = [];
      
      for (const putOption of bond.putSchedule) {
        try {
          const putCashFlows = this.generatePutCashFlows(bond, putOption, settlementDate);
          const ytp = this.calculateYTM(putCashFlows, marketPrice, settlementDate, compoundingFreq);
          ytpValues.push(ytp);
        } catch (error) {
          console.error('Error calculating YTP for put option:', putOption, error);
        }
      }
      
      if (ytpValues.length > 0) {
        yieldToPut = Math.min(...ytpValues);
        yieldToWorst = Math.min(yieldToWorst, yieldToPut);
      }
    }
    
    return { yieldToWorst, yieldToCall, yieldToPut };
  }

  private calculateConvexity(
    cashFlows: CashFlowResult[], 
    yieldRate: number, 
    settlementDate: Date, 
    compoundingFreq: number
  ): number {
    let convexitySum = 0;
    let totalPV = 0;
    
    for (const flow of cashFlows) {
      const flowDate = new Date(flow.date);
      const timeYears = (flowDate.getTime() - settlementDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const totalCashFlow = flow.couponPayment + flow.principalPayment;
      
      const discountFactor = Math.pow(1 + yieldRate / compoundingFreq, compoundingFreq * timeYears);
      const pvOfFlow = totalCashFlow / discountFactor;
      
      // Convexity formula: sum of [t(t+1) * PV(CF)] / [(1+y)^2 * P]
      const periods = compoundingFreq * timeYears;
      convexitySum += periods * (periods + 1) * pvOfFlow;
      totalPV += pvOfFlow;
    }
    
    if (totalPV <= 0) return 0;
    
    const discountFactorSquared = Math.pow(1 + yieldRate / compoundingFreq, 2);
    return convexitySum / (discountFactorSquared * totalPV * compoundingFreq * compoundingFreq);
  }

  // Utility methods for date and day count calculations

  private getCouponDates(bond: InsertBond, settlementDate: Date): { 
    lastCouponDate: Date | null; 
    nextCouponDate: Date | null 
  } {
    const issueDate = new Date(bond.issueDate);
    const maturityDate = new Date(bond.maturityDate);
    const firstCouponDate = bond.firstCouponDate ? new Date(bond.firstCouponDate) : null;
    
    // Start from first coupon date or calculate from issue date
    let currentCouponDate = firstCouponDate || this.calculateNextCouponDate(issueDate, bond.paymentFrequency);
    
    let lastCouponDate: Date | null = null;
    let nextCouponDate: Date | null = null;
    
    // Find the coupon dates around settlement date
    while (currentCouponDate <= maturityDate) {
      if (currentCouponDate <= settlementDate) {
        lastCouponDate = new Date(currentCouponDate);
      } else {
        nextCouponDate = new Date(currentCouponDate);
        break;
      }
      currentCouponDate = this.calculateNextCouponDate(currentCouponDate, bond.paymentFrequency);
    }
    
    // If no previous coupon found, use issue date
    if (!lastCouponDate) {
      lastCouponDate = new Date(issueDate);
    }
    
    // If no next coupon found, use maturity
    if (!nextCouponDate) {
      nextCouponDate = new Date(maturityDate);
    }
    
    return { lastCouponDate, nextCouponDate };
  }

  private applyDayCountConvention(
    daysSinceLastCoupon: number, 
    daysInPeriod: number, 
    convention: string
  ): number {
    switch (convention) {
      case "30/360":
        // Simplified 30/360 - assume 30 days per month, 360 days per year
        return daysSinceLastCoupon / daysInPeriod;
        
      case "ACT/360":
        return daysSinceLastCoupon / 360 * (365.25 / daysInPeriod);
        
      case "ACT/365":
        return daysSinceLastCoupon / 365 * (365.25 / daysInPeriod);
        
      case "ACT/ACT":
      default:
        return daysSinceLastCoupon / daysInPeriod;
    }
  }

  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private generateCallCashFlows(
    bond: InsertBond, 
    callOption: any, 
    settlementDate: Date
  ): CashFlowResult[] {
    const callDate = new Date(callOption.firstCallDate);
    const callPrice = callOption.callPrice;
    
    // Generate regular cash flows up to call date
    const regularFlows = this.generateCashFlows(bond).filter(
      flow => new Date(flow.date) <= callDate
    );
    
    // Modify the final cash flow to reflect call
    if (regularFlows.length > 0) {
      const finalFlow = regularFlows[regularFlows.length - 1];
      finalFlow.principalPayment = callPrice;
      finalFlow.totalPayment = finalFlow.couponPayment + callPrice;
      finalFlow.paymentType = "CALL";
      finalFlow.remainingNotional = 0;
    }
    
    return regularFlows;
  }

  private generatePutCashFlows(
    bond: InsertBond, 
    putOption: any, 
    settlementDate: Date
  ): CashFlowResult[] {
    const putDate = new Date(putOption.firstPutDate);
    const putPrice = putOption.putPrice;
    
    // Generate regular cash flows up to put date
    const regularFlows = this.generateCashFlows(bond).filter(
      flow => new Date(flow.date) <= putDate
    );
    
    // Modify the final cash flow to reflect put
    if (regularFlows.length > 0) {
      const finalFlow = regularFlows[regularFlows.length - 1];
      finalFlow.principalPayment = putPrice;
      finalFlow.totalPayment = finalFlow.couponPayment + putPrice;
      finalFlow.paymentType = "PUT";
      finalFlow.remainingNotional = 0;
    }
    
    return regularFlows;
  }

  private calculateYearsToMaturity(issueDate: string, maturityDate: string): number {
    const issue = new Date(issueDate);
    const maturity = new Date(maturityDate);
    return (maturity.getTime() - issue.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }

  private validateAnalyticsResults(analytics: BondAnalytics): void {
    const validations = [
      { condition: isNaN(analytics.yieldToMaturity), message: 'Invalid YTM calculation' },
      { condition: analytics.duration < 0, message: 'Duration cannot be negative' },
      { condition: analytics.averageLife < 0, message: 'Average life cannot be negative' },
      { condition: analytics.accruedInterest < 0, message: 'Accrued interest cannot be negative' },
      { condition: analytics.daysToNextCoupon < 0, message: 'Days to next coupon cannot be negative' },
    ];
    
    for (const validation of validations) {
      if (validation.condition) {
        throw new Error(`Analytics validation failed: ${validation.message}`);
      }
    }
  }

  private getDefaultAnalytics(): BondAnalytics {
    return {
      yieldToMaturity: 0,
      yieldToWorst: 0,
      duration: 0,
      macaulayDuration: 0,
      averageLife: 0,
      convexity: 0,
      totalCoupons: 0,
      presentValue: 0,
      marketPrice: 0,
      cleanPrice: 0,
      dirtyPrice: 0,
      accruedInterest: 0,
      daysToNextCoupon: 0,
      dollarDuration: 0,
      currentYield: 0,
    };
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