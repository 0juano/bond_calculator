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
      console.log(`🔍 Validating amortization schedule with ${bond.amortizationSchedule.length} entries`);
      for (const amort of bond.amortizationSchedule) {
        const amortDate = new Date(amort.date);
        if (amortDate <= issueDate || amortDate > maturityDate) {
          errors.amortizationSchedule = "Amortization dates must be between issue and maturity dates";
          break;
        }
        totalAmortization += amort.principalPercent;
        console.log(`🔍 Adding ${amort.principalPercent}%, running total: ${totalAmortization}%`);
      }
      
      console.log(`🔍 Final amortization total: ${totalAmortization}% (${totalAmortization > 100.01 ? 'INVALID' : 'VALID'})`);
      if (totalAmortization > 100.01) {
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
      console.log(`🔍 buildBond received bond with predefinedCashFlows:`, (bond as any).predefinedCashFlows?.length || 'NONE');
      console.log(`🔍 Bond issuer: ${bond.issuer}, features:`, {
        isAmortizing: bond.isAmortizing,
        isVariableCoupon: bond.isVariableCoupon
      });
      
      // Enhanced validation
      const validation = await this.validateBond(bond);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${Object.values(validation.errors).join(', ')}`);
      }
      
      // Use predefined cash flows if available, otherwise generate them
      let cashFlows: CashFlowResult[];
      try {
        if (bond.predefinedCashFlows && bond.predefinedCashFlows.length > 0) {
          console.log(`🔄 Using predefined cash flows: ${bond.predefinedCashFlows.length} flows`);
          
          // Validate predefined cash flows
          const totalPrincipal = bond.predefinedCashFlows.reduce((sum, cf) => sum + cf.principalPayment, 0);
          
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
          console.log(`🔄 Cash flow generation result: ${cashFlows.length} flows`);
        }
        
        if (cashFlows.length === 0) {
          throw new Error('No cash flows available - check bond parameters or predefined cash flows');
        }
      } catch (error) {
        throw new Error(`Cash flow processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Calculate analytics only if market inputs are provided
      let analytics: BondAnalytics;
      const hasMarketInputs = (bond as any).marketPrice || (bond as any).targetYield || (bond as any).targetSpread;
      
      if (hasMarketInputs) {
        console.log('🔢 Market inputs provided, calculating full analytics');
        analytics = await this.calculateBondAnalytics(bond, cashFlows);
      } else {
        console.log('📋 No market inputs provided, returning default analytics');
        analytics = this.getDefaultAnalytics();
      }
      
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
    console.log(`🔧 generateCashFlows starting for ${bond.issuer}`);
    
    // Check if bond has predefined cash flows (from saved bond JSON)
    if ((bond as any).predefinedCashFlows && (bond as any).predefinedCashFlows.length > 0) {
      console.log(`✅ Using predefined cash flows: ${(bond as any).predefinedCashFlows.length} flows`);
      return (bond as any).predefinedCashFlows.map((cf: any) => ({
        date: cf.date,
        couponPayment: cf.couponPayment,
        principalPayment: cf.principalPayment,
        totalPayment: cf.totalPayment,
        remainingNotional: cf.remainingNotional,
        paymentType: cf.paymentType,
      }));
    }
    
    const flows: CashFlowResult[] = [];
    const issueDate = new Date(bond.issueDate);
    const maturityDate = new Date(bond.maturityDate);
    const periodsPerYear = bond.paymentFrequency;
    const monthsBetweenPayments = 12 / periodsPerYear;
    
    console.log(`📊 Bond: ${bond.issuer} | Issue: ${bond.issueDate} | Maturity: ${bond.maturityDate}`);
    console.log(`📊 Coupon: ${bond.couponRate}% | Frequency: ${periodsPerYear}x/year | Face: $${bond.faceValue}`);
    console.log(`📊 Features: Amortizing=${bond.isAmortizing}, Variable=${bond.isVariableCoupon}`);
    
    // Handle amortization schedule
    const amortizationMap = new Map<string, number>();
    if (bond.isAmortizing && bond.amortizationSchedule) {
      for (const amort of bond.amortizationSchedule) {
        amortizationMap.set(amort.date, amort.principalPercent);
      }
      console.log(`📊 Amortization schedule has ${bond.amortizationSchedule.length} entries`);
    }

    // Handle coupon rate changes
    const couponRateMap = new Map<string, number>();
    if (bond.isVariableCoupon && bond.couponRateChanges) {
      for (const change of bond.couponRateChanges) {
        couponRateMap.set(change.effectiveDate, change.newCouponRate);
      }
      console.log(`📊 Coupon rate changes: ${bond.couponRateChanges.length} entries`);
    }

    // Generate payment schedule
    let paymentDate: Date;
    if (bond.firstCouponDate) {
      paymentDate = new Date(bond.firstCouponDate);
      console.log(`📅 Using provided firstCouponDate: ${bond.firstCouponDate}`);
    } else {
      paymentDate = new Date(issueDate);
      paymentDate.setMonth(paymentDate.getMonth() + monthsBetweenPayments);
      console.log(`📅 Calculated first coupon date from issue date: ${paymentDate.toISOString().split('T')[0]}`);
    }
    
    let paymentNumber = 0;
    let remainingNotional = bond.faceValue;
    let currentCouponRate = bond.couponRate;
    const maxPayments = 100;
    
    while (paymentDate <= maturityDate && paymentNumber < maxPayments) {
      paymentNumber++;
      
      const daysDifference = Math.abs((maturityDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // More generous final payment detection: if this is the last payment we'll generate
      // (either within 200 days of maturity OR next payment would exceed maturity)
      const nextPaymentDate = new Date(paymentDate);
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + monthsBetweenPayments);
      const isLastPaymentBySchedule = nextPaymentDate > maturityDate;
      const isLastPaymentByProximity = daysDifference <= 200;
      const isLastPayment = isLastPaymentBySchedule || isLastPaymentByProximity;
      
      console.log(`🔍 Payment ${paymentNumber}: ${paymentDate.toISOString().split('T')[0]} | Days to maturity: ${daysDifference.toFixed(0)} | BySchedule: ${isLastPaymentBySchedule} | ByProximity: ${isLastPaymentByProximity} | Is last: ${isLastPayment} | Remaining: $${remainingNotional.toFixed(2)}`);
      
      const finalDate = isLastPayment ? maturityDate : paymentDate;
      const dateStr = finalDate.toISOString().split('T')[0];
      
      // Check for coupon rate change
      if (couponRateMap.has(dateStr)) {
        currentCouponRate = couponRateMap.get(dateStr)!;
        console.log(`📊 Coupon rate changed to ${currentCouponRate}% on ${dateStr}`);
      }
      
      // Check for amortization - handle date mismatches by finding nearest amortization date
      let amortPercent = amortizationMap.get(dateStr) || 0;
      
      // Flexible amortization date matching - find nearest payment date to amortization schedule
      if (amortPercent === 0 && bond.isAmortizing && bond.amortizationSchedule) {
        const paymentDateObj = new Date(finalDate);
        const paymentYear = paymentDateObj.getFullYear();
        
        console.log(`🔍 Checking amortization for payment ${dateStr} (year: ${paymentYear})`);
        console.log(`🔍 Amortization schedule: ${JSON.stringify(bond.amortizationSchedule.map(a => ({date: a.date, percent: a.principalPercent})))}`);
        
        // Look for amortization in the same year
        for (const amort of bond.amortizationSchedule) {
          const amortDateObj = new Date(amort.date);
          const amortYear = amortDateObj.getFullYear();
          
          console.log(`🔍 Comparing payment year ${paymentYear} with amort year ${amortYear} (${amort.date})`);
          
          // If same year, apply amortization to the later payment in that year
          if (amortYear === paymentYear) {
            // Calculate days difference 
            const daysDiff = Math.abs(paymentDateObj.getTime() - amortDateObj.getTime()) / (1000 * 60 * 60 * 24);
            
            console.log(`✅ YEAR MATCH! Found amort in same year: ${amort.date} | Days diff: ${daysDiff.toFixed(0)} | Percent: ${amort.principalPercent}%`);
            
            // Apply if within 6 months (180 days) 
            if (daysDiff <= 180) {
              amortPercent = amort.principalPercent;
              console.log(`📊 APPLYING amortization ${amortPercent}% on ${dateStr} (${daysDiff.toFixed(0)} days from ${amort.date})`);
              break;
            } else {
              console.log(`❌ Days diff ${daysDiff.toFixed(0)} > 180, not applying`);
            }
          }
        }
      }
      
      const amortAmount = (bond.faceValue * amortPercent) / 100;
      
      // Calculate payments
      const couponPayment = (remainingNotional * currentCouponRate / 100) / periodsPerYear;
      let principalPayment = 0;
      let paymentType = "COUPON";
      
      if (isLastPayment) {
        principalPayment = remainingNotional;
        paymentType = "MATURITY";
        console.log(`🎯 FINAL PAYMENT: Adding principal payment of $${principalPayment.toFixed(2)} at maturity`);
      } else if (amortAmount > 0) {
        principalPayment = amortAmount;
        paymentType = "AMORTIZATION";
        console.log(`💰 AMORTIZATION: Adding principal payment of $${principalPayment.toFixed(2)}`);
      }
      
      const totalPayment = couponPayment + principalPayment;
      remainingNotional -= principalPayment;
      
      flows.push({
        date: dateStr,
        couponPayment: Number(couponPayment.toFixed(3)),
        principalPayment: Number(principalPayment.toFixed(3)),
        totalPayment: Number(totalPayment.toFixed(3)),
        remainingNotional: Math.max(0, Number(remainingNotional.toFixed(3))),
        paymentType,
      });
      
      console.log(`💰 Payment ${paymentNumber}: ${dateStr} | Coupon: $${couponPayment.toFixed(2)} | Principal: $${principalPayment.toFixed(2)} | Total: $${totalPayment.toFixed(2)} | ${paymentType}`);
      
      if (isLastPayment) {
        console.log(`🏁 Loop terminating: isLastPayment = true`);
        break;
      }
      
      paymentDate.setMonth(paymentDate.getMonth() + monthsBetweenPayments);
    }
    
    console.log(`🏁 Cash flow generation completed. Total payments: ${paymentNumber}, Remaining principal: $${remainingNotional.toFixed(2)}`);
    
    // CRITICAL FIX: If any principal remains, add a final payment at maturity
    if (Math.abs(remainingNotional) > 0.01) {
      console.log(`🔧 FIXING: Adding final payment at maturity for remaining principal $${remainingNotional.toFixed(2)}`);
      
      const finalCouponPayment = (remainingNotional * bond.couponRate / 100) / periodsPerYear;
      const finalPrincipalPayment = remainingNotional;
      const finalTotalPayment = finalCouponPayment + finalPrincipalPayment;
      
      flows.push({
        date: maturityDate.toISOString().split('T')[0],
        couponPayment: Number(finalCouponPayment.toFixed(3)),
        principalPayment: Number(finalPrincipalPayment.toFixed(3)),
        totalPayment: Number(finalTotalPayment.toFixed(3)),
        remainingNotional: 0,
        paymentType: "MATURITY",
      });
      
      console.log(`🎯 FINAL PAYMENT ADDED: ${maturityDate.toISOString().split('T')[0]} | Coupon: $${finalCouponPayment.toFixed(2)} | Principal: $${finalPrincipalPayment.toFixed(2)} | Total: $${finalTotalPayment.toFixed(2)} | MATURITY`);
      remainingNotional = 0;
    }
    
    console.log(`✅ Generated ${flows.length} cash flows for ${bond.issuer}`);
    return flows;
  }

  // Legacy functions kept for compatibility
  private calculateFirstCouponDate(issueDate: Date, frequency: number): Date {
    const firstDate = new Date(issueDate);
    const monthsToAdd = 12 / frequency;
    firstDate.setMonth(firstDate.getMonth() + monthsToAdd);
    return firstDate;
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
    const settlementDate = new Date((bond as any).settlementDate || new Date());
    
    // CRITICAL FIX: Calculate actual outstanding principal at settlement date
    // For amortizing bonds, the outstanding principal matters for price interpretation
    let currentOutstanding = bond.faceValue;
    
    // Find the outstanding principal at settlement date by looking at cash flow history
    for (const cf of cashFlows) {
      const cfDate = new Date(cf.date);
      if (cfDate <= settlementDate) {
        // This payment occurred before or on settlement date
        currentOutstanding = cf.remainingNotional;
      } else {
        // Future payment - stop here
        break;
      }
    }
    
    console.log(`🔍 OUTSTANDING PRINCIPAL CALCULATION:`, {
      originalFaceValue: bond.faceValue,
      currentOutstanding: currentOutstanding,
      settlementDate: settlementDate.toISOString().split('T')[0],
      outstandingRatio: currentOutstanding / bond.faceValue,
      note: currentOutstanding < bond.faceValue ? 
        `Using actual outstanding principal after amortization` : 
        `No amortization yet - using full face value`
    });
    
    // Filter cash flows to only include future payments from settlement date
    // This is essential for bonds with historical cash flows (like Argentina bonds from 2020)
    const futureCashFlows = cashFlows.filter(cf => {
      const cfDate = new Date(cf.date);
      return cfDate > settlementDate;
    });
    
    console.log(`💰 Cash flow filtering: Total ${cashFlows.length} → Future ${futureCashFlows.length} (settlement: ${settlementDate.toISOString().split('T')[0]})`);
    
    if (futureCashFlows.length === 0) {
      console.error(`❌ No future cash flows available. Settlement: ${settlementDate.toISOString().split('T')[0]}, Latest cash flow: ${cashFlows[cashFlows.length - 1]?.date || 'none'}`);
      throw new Error(`No future cash flows available after settlement date ${settlementDate.toISOString().split('T')[0]}. Bond may have matured or settlement date needs adjustment.`);
    }
    
    // Convert to calculator format with corrected outstanding notional
    const calcBond: CalcBond = {
      faceValue: currentOutstanding, // Use current outstanding instead of original face value
      currency: bond.currency || 'USD',
      dayCountConvention: bond.dayCountConvention as any || '30/360',
      paymentFrequency: bond.paymentFrequency || 2, // Pass payment frequency for correct duration calculation
      cashFlows: futureCashFlows.map(cf => ({
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
          if (isNaN(marketPrice) || marketPrice < 5 || marketPrice > 200) {
            console.error(`❌ Invalid price input: ${marketPrice}`);
            throw new Error(`Invalid price: ${marketPrice}. Price must be between 5 and 200 (as percentage of face value)`);
          }
        }
        
        // CRITICAL: For amortizing bonds, interpret price as percentage of outstanding principal
        const effectivePrice = (marketPrice / 100) * currentOutstanding;
        
        console.log(`🔍 Price input: ${marketPrice} (${marketPrice.toFixed(2)}% of ${currentOutstanding < bond.faceValue ? 'outstanding principal' : 'face value'})`);
        console.log(`🔍 Effective dollar price: $${effectivePrice} (${marketPrice}% of $${currentOutstanding})`);
        
        const analyzeInputs = {
          bond: calcBond,
          settlementDate,
          price: marketPrice,
          treasuryCurve
        };
        
        console.log('🔍 CALLING CALCULATOR ANALYZE with:', {
          bondCashFlowCount: calcBond.cashFlows.length,
          price: analyzeInputs.price,
          settlementDate: analyzeInputs.settlementDate.toISOString().split('T')[0],
          hasTreasuryCurve: !!analyzeInputs.treasuryCurve
        });
        
        result = calculator.analyze(analyzeInputs);
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
      
      // DEBUG: Log calculator result before conversion
      console.log('🔍 RAW CALCULATOR RESULT:', {
        yields: result.yields,
        risk: result.risk,
        price: result.price,
        analytics: result.analytics,
        spreads: result.spreads
      });
      
      // DEBUG: Check price field structure
      console.log('🔍 PRICE FIELD DETAILED:', {
        clean: result.price?.clean,
        dirty: result.price?.dirty, 
        cleanDollar: result.price?.cleanDollar,
        dirtyDollar: result.price?.dirtyDollar,
        accruedInterest: result.price?.accruedInterest
      });
      
      
      // Convert back to legacy format
      const totalCoupons = futureCashFlows
        .reduce((sum, cf) => sum + cf.couponPayment, 0);
      
      const analytics = {
        yieldToMaturity: result.yields?.ytm || 0,
        yieldToWorst: result.yields?.ytw || 0,
        duration: result.risk?.modifiedDuration || 0,
        macaulayDuration: result.risk?.macaulayDuration || 0,
        averageLife: result.analytics?.averageLife || 0,
        convexity: result.risk?.convexity || 0,
        totalCoupons,
        presentValue: result.price?.clean || 0, // This is already a percentage
        // CRITICAL FIX: Convert dollar amounts back to percentages for frontend
        marketPrice: result.price?.dirty || 0, // Use dirty percentage, not dirtyDollar
        cleanPrice: result.price?.clean || 0,  // Use clean percentage, not cleanDollar
        dirtyPrice: result.price?.dirty || 0,  // Use dirty percentage, not dirtyDollar
        accruedInterest: result.price?.accruedInterest || 0,
        daysToNextCoupon: result.analytics?.daysToNextPayment || 0,
        dollarDuration: result.risk?.dv01 || 0,
        currentYield: result.yields?.current || 0,
        spread: result.spreads ? result.spreads.treasury : undefined // Keep in bps
      };
      
      console.log(`✅ FINAL ANALYTICS:`, {
        ytm: analytics.yieldToMaturity,
        duration: analytics.duration,
        cleanPrice: analytics.cleanPrice,
        spread: analytics.spread
      });
      
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
      "vanilla-5y": "GD30 Argentina 2030 (Default)",
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
