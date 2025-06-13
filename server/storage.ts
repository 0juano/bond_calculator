import { 
  BondDefinition, 
  InsertBond, 
  CashFlow, 
  InsertCashFlow, 
  BondResult, 
  CashFlowResult, 
  BondAnalytics, 
  ValidationResult,
  GOLDEN_BONDS,
  USTCurveData
} from "@shared/schema";
import { interpolateUSTYield, calculateSpreadToTreasury } from "./ust-curve";
import { BondCalculatorPro, Bond as CalcBond, MarketInputs } from "../shared/bond-calculator-production";

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
  private ustCurveCache: { data: USTCurveData; timestamp: number } | null = null;

  constructor() {
    this.bonds = new Map();
    this.cashFlows = new Map();
    this.currentId = 1;
  }

  // Method to set UST curve cache (to be called from routes)
  setUSTCurveCache(cache: { data: USTCurveData; timestamp: number } | null) {
    this.ustCurveCache = cache;
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
    
    try {
      // Enhanced validation
      const validation = await this.validateBond(bond);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }
      
      // Use predefined cash flows if available, otherwise generate them
      let cashFlows: CashFlowResult[];
      try {
        if (bond.predefinedCashFlows && bond.predefinedCashFlows.length > 0) {
          console.log(`🔄 Using predefined cash flows from JSON bond definition: ${bond.predefinedCashFlows.length} flows`);
          
          // Validate predefined cash flows
          const totalPrincipal = bond.predefinedCashFlows.reduce((sum, cf) => sum + cf.principalPayment, 0);
          console.log(`🔄 Total principal in cash flows: ${totalPrincipal}`);
          console.log(`🔄 Expected face value: ${bond.faceValue}`);
          
          if (Math.abs(totalPrincipal - bond.faceValue) > 0.01) {
            console.warn(`⚠️ WARNING: Total principal (${totalPrincipal}) doesn't match face value (${bond.faceValue})`);
          }
          
          cashFlows = bond.predefinedCashFlows.map(cf => ({
            date: cf.date,
            couponPayment: cf.couponPayment,
            principalPayment: cf.principalPayment,
            totalPayment: cf.totalPayment,
            remainingNotional: cf.remainingNotional,
            paymentType: cf.paymentType,
          }));
        } else {
          console.log('🔄 Generating cash flows from bond parameters');
          cashFlows = this.generateCashFlows(bond);
        }
        
        if (cashFlows.length === 0) {
          throw new Error('No cash flows available - check bond parameters or predefined cash flows');
        }
      } catch (error) {
        throw new Error(`Cash flow processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Calculate analytics using the robust calculator
      const analytics = await this.calculateBondAnalytics(bond, cashFlows);
      
      const buildTime = Date.now() - startTime;
      
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
      
      // For calculation errors, still throw to prevent showing incorrect data
      // The frontend will handle the error appropriately
      if (error instanceof Error && error.message.includes('calculation failed')) {
        throw error;
      }
      
      // For other errors (like validation), return error status
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
    let paymentCount = 0;
    while (currentDate <= maturityDate && paymentCount < 50) { // Safety limit
      const dateStr = currentDate.toISOString().split('T')[0];
      const isMaturity = currentDate.getTime() === maturityDate.getTime();
      
      // Check for coupon rate change on this date
      if (couponRateMap.has(dateStr)) {
        currentCouponRate = couponRateMap.get(dateStr)!;
      }
      
      // Check for amortization on this date
      const amortPercent = amortizationMap.get(dateStr) || 0;
      const amortAmount = (bond.faceValue * amortPercent) / 100;
      
      // Determine payment type and amounts
      let couponPayment = 0;
      let principalPayment = 0;
      let paymentType = "COUPON";

      if (isMaturity) {
        // Final payment includes remaining principal
        couponPayment = (remainingNotional * currentCouponRate / 100) / bond.paymentFrequency;
        principalPayment = remainingNotional;
        paymentType = "MATURITY";
      } else if (amortAmount > 0) {
        // Amortization payment: coupon on CURRENT remaining notional + scheduled amortization
        couponPayment = (remainingNotional * currentCouponRate / 100) / bond.paymentFrequency;
        principalPayment = amortAmount;
        paymentType = "AMORTIZATION";
      } else {
        // Regular coupon payment: coupon on CURRENT remaining notional
        couponPayment = (remainingNotional * currentCouponRate / 100) / bond.paymentFrequency;
        principalPayment = 0;
        paymentType = "COUPON";
      }

      const totalPayment = couponPayment + principalPayment;
      
      // Update remaining notional AFTER calculating payment but BEFORE recording the flow
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
      paymentCount++;
    }

    return flows;
  }

  private calculateNextCouponDate(currentDate: Date, frequency: number): Date {
    const nextDate = new Date(currentDate);
    const monthsToAdd = 12 / frequency;
    nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
    return nextDate;
  }

  // Simplified method using BondCalculatorPro directly
  private async calculateBondAnalytics(bond: InsertBond, cashFlows: CashFlowResult[]): Promise<BondAnalytics> {
    return this.calculateWithProductionEngine(bond, cashFlows);
  }

  // Method using the robust production bond calculator
  private async calculateWithProductionEngine(bond: InsertBond, cashFlows: CashFlowResult[]): Promise<BondAnalytics> {
    console.log('🚀 Using production bond calculator engine');
    
    const calculator = new BondCalculatorPro();
    
    // Convert to calculator format
    const calcBond: CalcBond = {
      faceValue: bond.faceValue,
      currency: bond.currency || 'USD',
      dayCountConvention: bond.dayCountConvention as any || '30/360',
      cashFlows: cashFlows.map(cf => ({
        date: cf.date,
        coupon: cf.couponPayment,
        principal: cf.principalPayment,
        total: cf.totalPayment,
        outstandingNotional: cf.remainingNotional
      })),
      metadata: {
        issuer: bond.issuer,
        isin: bond.isin || undefined,
        cusip: bond.cusip || undefined,
        name: `${bond.issuer} ${bond.couponRate}% ${bond.maturityDate}`
      }
    };
    
    // Get calculation inputs
    const marketPrice = (bond as any).marketPrice;
    const targetYield = (bond as any).targetYield;
    const targetSpread = (bond as any).targetSpread;
    const settlementDate = new Date((bond as any).settlementDate || new Date());
    
    console.log('📥 Backend received:', {
      marketPrice,
      targetYield,
      targetSpread,
      issuer: bond.issuer,
      maturityDate: bond.maturityDate
    });
    
    // Debug logging
    console.log(`🔍 Calculation inputs - Price: ${marketPrice}, Yield: ${targetYield}, Spread: ${targetSpread}`);
    
    
    // Prepare treasury curve if available
    let treasuryCurve;
    if (this.ustCurveCache && this.ustCurveCache.data) {
      treasuryCurve = {
        date: this.ustCurveCache.data.recordDate,
        tenors: Object.entries(this.ustCurveCache.data.tenors).map(([tenor, rate]) => {
          // Convert tenor string to years
          let years: number;
          if (tenor.endsWith('M')) {
            years = parseInt(tenor) / 12;
          } else if (tenor.endsWith('Y')) {
            years = parseInt(tenor);
          } else {
            years = 1; // Default
          }
          return { years, rate };
        })
      };
    }
    
    try {
      let result;
      
      // Determine calculation mode and call appropriate method
      if (targetYield !== undefined && targetYield !== null) {
        // YTM → Price mode
        console.log('🎯 YTM → Price mode. Target YTM:', targetYield);
        
        // Validate yield input
        if (isNaN(targetYield) || targetYield < -10 || targetYield > 50) {
          console.error(`❌ Invalid yield input: ${targetYield}%`);
          throw new Error(`Invalid yield: ${targetYield}%. Yield must be between -10% and 50%`);
        }
        
        result = calculator.analyze({
          bond: calcBond,
          settlementDate,
          yield: targetYield / 100, // Convert percentage to decimal
          treasuryCurve
        });
      } else if (targetSpread !== undefined && targetSpread !== null) {
        // Spread → Price mode (requires Treasury curve)
        console.log(`📊 Calculating price from spread: ${targetSpread} bps`);
        
        if (!treasuryCurve) {
          console.error('❌ Treasury curve data not available for spread calculation');
          throw new Error('Treasury curve data required for spread-based calculations. Please wait for curve data to load.');
        }
        
        try {
          // First, estimate average life to get the right treasury tenor
          // Use a reasonable initial guess for YTM based on current market conditions
          const initialYtm = 0.05 + (targetSpread / 10000);
          console.log(`📊 Initial YTM guess: ${(initialYtm * 100).toFixed(3)}%`);
          
          const tempResult = calculator.analyze({
            bond: calcBond,
            settlementDate,
            yield: initialYtm,
            treasuryCurve
          });
          
          const avgLife = tempResult.analytics.averageLife;
          console.log(`📊 Calculated average life: ${avgLife.toFixed(2)} years`);
          
          const treasuryYield = this.interpolateTreasuryYield(avgLife, treasuryCurve);
          console.log(`📊 Interpolated Treasury yield: ${treasuryYield.toFixed(3)}%`);
          
          const targetYieldFromSpread = treasuryYield + (targetSpread / 100);
          console.log(`📊 Target yield (Treasury + Spread): ${targetYieldFromSpread.toFixed(3)}%`);
          
          // Validate the target yield is reasonable
          if (targetYieldFromSpread < 0) {
            console.error(`❌ Negative yield calculated: ${targetYieldFromSpread}%`);
            throw new Error(`Invalid spread: results in negative yield (${targetYieldFromSpread.toFixed(2)}%)`);
          }
          
          if (targetYieldFromSpread > 50) {
            console.error(`❌ Extremely high yield calculated: ${targetYieldFromSpread}%`);
            throw new Error(`Invalid spread: results in unrealistic yield (${targetYieldFromSpread.toFixed(2)}%)`);
          }
          
          result = calculator.analyze({
            bond: calcBond,
            settlementDate,
            yield: targetYieldFromSpread / 100, // Convert to decimal
            treasuryCurve
          });
          
          console.log(`✅ Spread calculation successful - Price: ${result.price.clean.toFixed(4)}`);
          
        } catch (spreadError) {
          console.error('❌ Spread calculation failed:', spreadError);
          throw new Error(`Spread calculation failed: ${spreadError instanceof Error ? spreadError.message : 'Unknown error'}`);
        }
      } else {
        // Price → YTM mode (default)
        console.log('🎯 Price → YTM mode. Market Price:', marketPrice);
        // IMPORTANT: Don't default to 100 if no price is provided - this breaks the calculator
        if (!marketPrice && !targetYield && !targetSpread) {
          console.error('❌ No valid input provided!');
          throw new Error('At least one of price, yield, or spread must be provided');
        }
        
        // Validate price input
        if (marketPrice !== undefined && marketPrice !== null) {
          if (isNaN(marketPrice) || marketPrice <= 0 || marketPrice > 1000) {
            console.error(`❌ Invalid price input: ${marketPrice}`);
            throw new Error(`Invalid price: ${marketPrice}. Price must be between 0 and 1000 (as percentage of face value)`);
          }
        }
        
        // User enters price as percentage of face value (e.g., 80 = 80% of par)
        // Calculator expects this same percentage format
        const priceAsPercentage = marketPrice;
        
        console.log(`🔍 Price input: ${marketPrice} (${priceAsPercentage.toFixed(2)}% of face value)`);
        
        result = calculator.analyze({
          bond: calcBond,
          settlementDate,
          price: priceAsPercentage,
          treasuryCurve
        });
      }
      
      
      // Validate calculation results to catch unrealistic values
      if (result.yields.ytm > 50) {
        console.error(`❌ Unrealistic YTM calculated: ${result.yields.ytm.toFixed(2)}%`);
        console.error(`❌ This suggests a price conversion error. Bond: ${bond.issuer}, Price: ${marketPrice}`);
        throw new Error(`Calculation error: YTM of ${result.yields.ytm.toFixed(2)}% is unrealistic. Check price input format.`);
      }
      
      if (result.yields.ytm < -10) {
        console.error(`❌ Negative YTM calculated: ${result.yields.ytm.toFixed(2)}%`);
        throw new Error(`Calculation error: Negative YTM of ${result.yields.ytm.toFixed(2)}% suggests invalid inputs.`);
      }
      
      // Convert back to legacy format
      const totalCoupons = cashFlows
        .filter(cf => new Date(cf.date) > settlementDate)
        .reduce((sum, cf) => sum + cf.couponPayment, 0);
      
      const analytics = {
        yieldToMaturity: result.yields.ytm,
        yieldToWorst: result.yields.ytw,
        duration: result.risk.modifiedDuration,
        macaulayDuration: result.risk.macaulayDuration,
        averageLife: result.analytics.averageLife,
        convexity: result.risk.convexity,
        totalCoupons,
        presentValue: result.price.clean,
        marketPrice: result.price.dirtyDollar,
        cleanPrice: result.price.cleanDollar,
        dirtyPrice: result.price.dirtyDollar,
        accruedInterest: result.price.accruedInterest,
        daysToNextCoupon: result.analytics.daysToNextPayment,
        dollarDuration: result.risk.dv01,
        currentYield: result.yields.current,
        spread: result.spreads ? result.spreads.treasury : undefined // Keep in bps
      };
      
      console.log(`✅ Calculation successful - YTM: ${analytics.yieldToMaturity.toFixed(3)}%, Duration: ${analytics.duration.toFixed(2)}, Spread: ${analytics.spread?.toFixed(0) || 'N/A'} bp`);
      
      return analytics;
      
    } catch (error) {
      console.error('❌ Calculator failed:', error);
      console.error('❌ Bond that failed:', bond.issuer, bond.couponRate, bond.maturityDate);
      console.error('❌ Inputs were - Price:', marketPrice, 'Yield:', targetYield, 'Spread:', targetSpread);
      
      // Don't return default analytics for calculation errors - propagate the error
      // This prevents the UI from showing incorrect par value (1000) when calculations fail
      throw error;
    }
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

  // All coupon rates and couponRateChanges are in percentage format (e.g., 5.0 for 5%)
  private getGoldenBondDisplayName(key: string): string {
    const names: Record<string, string> = {
      "vanilla-5y": "5Y 5.00% Vanilla Bond",
      "amortizing-10y": "10Y 4.50% Amortizing",
      "callable-7y": "7Y 5.25% Callable",
      "puttable-3y": "3Y 3.75% Puttable",
      "variable-step-up": "5Y Variable Step-Up",
      "complex-combo": "Complex Callable/Puttable",
      "al30d-argentina": "AL30D Argentina 2030 Step-Up",
      "ae38d-argentina": "AE38D Argentina Sovereign (2038)"
    };
    return names[key] || key;
  }

  private interpolateTreasuryYield(years: number, treasuryCurve: any): number {
    const tenors = treasuryCurve.tenors.sort((a: any, b: any) => a.years - b.years);
    
    // Find bracketing points
    let lower = tenors[0];
    let upper = tenors[tenors.length - 1];
    
    for (let i = 0; i < tenors.length - 1; i++) {
      if (tenors[i].years <= years && tenors[i + 1].years >= years) {
        lower = tenors[i];
        upper = tenors[i + 1];
        break;
      }
    }
    
    // Handle edge cases
    if (years <= lower.years) return lower.rate;
    if (years >= upper.years) return upper.rate;
    
    // Linear interpolation
    const weight = (years - lower.years) / (upper.years - lower.years);
    return lower.rate + weight * (upper.rate - lower.rate);
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
      spread: undefined
    };
  }
}

export const storage = new MemStorage();
