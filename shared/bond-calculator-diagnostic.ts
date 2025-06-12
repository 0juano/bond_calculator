import { BondCalculator, BondDefinition, MarketData } from './bond-calculator-core';
import { CleanBondDefinition } from './bond-definition';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Argentina 2038 bond
const argentina2038Path = path.join(__dirname, '../saved_bonds/user_created/REPUBLIC_OF_ARGENTINA_0_125pct_20380109_2025-06-09.json');
const argentina2038Clean: CleanBondDefinition = JSON.parse(fs.readFileSync(argentina2038Path, 'utf-8'));

function convertToBondDefinition(clean: CleanBondDefinition): BondDefinition {
  return {
    bondInfo: {
      faceValue: clean.bondInfo.faceValue,
      issueDate: clean.bondInfo.issueDate,
      maturityDate: clean.bondInfo.maturityDate,
      settlementDays: clean.bondInfo.settlementDays,
      dayCountConvention: clean.bondInfo.dayCountConvention
    },
    cashFlows: clean.cashFlowSchedule.map(cf => ({
      date: cf.date,
      couponPayment: cf.couponPayment,
      principalPayment: cf.principalPayment,
      totalPayment: cf.totalPayment,
      remainingNotional: cf.remainingNotional
    }))
  };
}

async function diagnose() {
  console.log('🔍 Bond Calculator Diagnostic Tool');
  console.log('==================================\n');
  
  const calculator = new BondCalculator();
  const bond = convertToBondDefinition(argentina2038Clean);
  const settlementDate = new Date('2025-06-09');
  
  console.log('📊 Bond Information:');
  console.log(`  Face Value: $${bond.bondInfo.faceValue}`);
  console.log(`  Issue Date: ${bond.bondInfo.issueDate}`);
  console.log(`  Maturity Date: ${bond.bondInfo.maturityDate}`);
  console.log(`  Day Count: ${bond.bondInfo.dayCountConvention}`);
  console.log(`  Total Cash Flows: ${bond.cashFlows.length}\n`);
  
  // Analyze future cash flows
  const futureCFs = bond.cashFlows.filter(cf => new Date(cf.date) > settlementDate);
  console.log('💰 Future Cash Flows Analysis:');
  console.log(`  Count: ${futureCFs.length}`);
  console.log(`  Total Coupons: $${futureCFs.reduce((sum, cf) => sum + cf.couponPayment, 0).toFixed(2)}`);
  console.log(`  Total Principal: $${futureCFs.reduce((sum, cf) => sum + cf.principalPayment, 0).toFixed(2)}`);
  console.log(`  Total Payments: $${futureCFs.reduce((sum, cf) => sum + cf.totalPayment, 0).toFixed(2)}\n`);
  
  // Show first few and last few cash flows
  console.log('📅 Sample Future Cash Flows:');
  console.log('Date       | Coupon | Principal | Total  | Remaining');
  console.log('-----------|--------|-----------|--------|----------');
  
  const samplesToShow = [...futureCFs.slice(0, 3), '...', ...futureCFs.slice(-3)];
  for (const cf of samplesToShow) {
    if (cf === '...') {
      console.log('...        |  ...   |    ...    |  ...   |   ...');
    } else {
      const c = cf as any;
      console.log(
        `${c.date} | ${c.couponPayment.toFixed(2).padStart(6)} | ${c.principalPayment.toFixed(2).padStart(9)} | ${c.totalPayment.toFixed(2).padStart(6)} | ${c.remainingNotional.toFixed(2).padStart(9)}`
      );
    }
  }
  
  // Test present value calculation at different yields
  console.log('\n📈 Present Value at Different Yields:');
  console.log('Yield  | PV      | Price % | Diff from 72.25%');
  console.log('-------|---------|---------|------------------');
  
  const testYields = [0.09, 0.10, 0.1088, 0.11, 0.1177, 0.12, 0.13];
  const targetPrice = 722.50;
  
  for (const yieldRate of testYields) {
    const result = calculator.calculateFromYield(bond, yieldRate, settlementDate);
    const pricePercent = (result.dirtyPrice / bond.bondInfo.faceValue) * 100;
    const diff = pricePercent - 72.25;
    
    console.log(
      `${(yieldRate * 100).toFixed(2)}% | ` +
      `$${result.dirtyPrice.toFixed(2).padStart(6)} | ` +
      `${pricePercent.toFixed(2)}% | ` +
      `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`
    );
  }
  
  // Show accrued interest calculation
  console.log('\n💵 Accrued Interest Calculation:');
  const accruedResult = calculator.calculateFromYield(bond, 0.1088, settlementDate);
  console.log(`  Accrued Interest: $${accruedResult.accruedInterest.toFixed(2)}`);
  
  // Find surrounding coupon dates
  let lastCouponDate: Date | null = null;
  let nextCouponDate: Date | null = null;
  let nextCouponAmount = 0;
  
  for (const cf of bond.cashFlows) {
    const cfDate = new Date(cf.date);
    if (cfDate <= settlementDate && cf.couponPayment > 0) {
      lastCouponDate = cfDate;
    }
    if (cfDate > settlementDate && cf.couponPayment > 0 && !nextCouponDate) {
      nextCouponDate = cfDate;
      nextCouponAmount = cf.couponPayment;
    }
  }
  
  if (lastCouponDate && nextCouponDate) {
    console.log(`  Last Coupon: ${lastCouponDate.toISOString().split('T')[0]}`);
    console.log(`  Next Coupon: ${nextCouponDate.toISOString().split('T')[0]} ($${nextCouponAmount})`);
    
    const daysSinceLast = Math.floor((settlementDate.getTime() - lastCouponDate.getTime()) / (24 * 60 * 60 * 1000));
    const daysInPeriod = Math.floor((nextCouponDate.getTime() - lastCouponDate.getTime()) / (24 * 60 * 60 * 1000));
    console.log(`  Days Since Last: ${daysSinceLast}`);
    console.log(`  Days in Period: ${daysInPeriod}`);
    console.log(`  Accrual Fraction: ${(daysSinceLast / daysInPeriod).toFixed(4)}`);
  }
  
  // Manual YTM calculation check
  console.log('\n🔧 Manual YTM Check:');
  const marketYield = 0.1088;
  let manualPV = 0;
  
  for (const cf of futureCFs) {
    const years = (new Date(cf.date).getTime() - settlementDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const df = Math.pow(1 + marketYield, -years);
    const pv = cf.totalPayment * df;
    manualPV += pv;
  }
  
  console.log(`  Market Yield: ${(marketYield * 100).toFixed(2)}%`);
  console.log(`  Manual PV: $${manualPV.toFixed(2)}`);
  console.log(`  Expected Dirty Price: $${targetPrice.toFixed(2)}`);
  console.log(`  Difference: $${(manualPV - targetPrice).toFixed(2)}`);
  
  // Test with exact market data
  console.log('\n🎯 Testing with Market Price:');
  const marketData: MarketData = {
    settlementDate,
    dirtyPrice: targetPrice
  };
  
  try {
    const result = calculator.calculateFromPrice(bond, marketData);
    console.log(`  Calculated YTM: ${result.yieldToMaturity.toFixed(2)}%`);
    console.log(`  Market YTM: 10.88%`);
    console.log(`  Difference: ${(result.yieldToMaturity - 10.88).toFixed(2)}%`);
  } catch (error) {
    console.error('  Error:', error);
  }
}

diagnose()
  .then(() => console.log('\n✅ Diagnostic completed!'))
  .catch(error => console.error('\n❌ Diagnostic failed:', error));