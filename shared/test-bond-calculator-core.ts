import { BondCalculator, BondDefinition, MarketData, TreasuryCurve } from './bond-calculator-core';
import { CleanBondDefinition } from './bond-definition';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Argentina 2038 bond
const argentina2038Path = path.join(__dirname, '../saved_bonds/user_created/REPUBLIC_OF_ARGENTINA_0_125pct_20380109_2025-06-09.json');
const argentina2038Clean: CleanBondDefinition = JSON.parse(fs.readFileSync(argentina2038Path, 'utf-8'));

// Convert to new format
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

async function testBondCalculator() {
  console.log('🚀 Testing New Bond Calculator Core');
  console.log('===================================\n');
  
  const calculator = new BondCalculator();
  const bond = convertToBondDefinition(argentina2038Clean);
  
  // Market benchmark
  console.log('📊 Market Benchmark (Argentina 0.125% 2038):');
  console.log('  Price: 72.25% ($722.50)');
  console.log('  YTM: 10.88%');
  console.log('  Spread: 660 bps');
  console.log('  Modified Duration: 5.01\n');
  
  // Treasury curve matching the benchmark
  const treasuryCurve: TreasuryCurve = {
    date: '2025-06-09',
    points: [
      { tenor: 0.083, yield: 4.50 },  // 1M
      { tenor: 0.25, yield: 4.55 },   // 3M
      { tenor: 0.5, yield: 4.60 },    // 6M
      { tenor: 1, yield: 4.50 },      // 1Y
      { tenor: 2, yield: 4.40 },      // 2Y
      { tenor: 3, yield: 4.30 },      // 3Y
      { tenor: 5, yield: 4.20 },      // 5Y
      { tenor: 7, yield: 4.10 },      // 7Y
      { tenor: 10, yield: 4.28 },     // 10Y (adjusted for 660bp spread)
      { tenor: 20, yield: 4.20 },     // 20Y
      { tenor: 30, yield: 4.30 }      // 30Y
    ]
  };
  
  const marketData: MarketData = {
    settlementDate: new Date('2025-06-09'),
    dirtyPrice: 722.50, // 72.25% of $1000 face value
    treasuryCurve
  };
  
  console.log('📈 Calculation Results:');
  try {
    const analytics = calculator.calculateFromPrice(bond, marketData);
    
    console.log('\nYield Metrics:');
    console.log(`  YTM: ${analytics.yieldToMaturity.toFixed(2)}% (Target: 10.88%, Diff: ${(analytics.yieldToMaturity - 10.88).toFixed(2)}%)`);
    console.log(`  Current Yield: ${analytics.currentYield.toFixed(2)}%`);
    
    console.log('\nRisk Metrics:');
    console.log(`  Modified Duration: ${analytics.modifiedDuration.toFixed(2)} (Target: 5.01, Diff: ${(analytics.modifiedDuration - 5.01).toFixed(2)})`);
    console.log(`  Macaulay Duration: ${analytics.macaulayDuration.toFixed(2)}`);
    console.log(`  Effective Duration: ${analytics.effectiveDuration.toFixed(2)}`);
    console.log(`  Convexity: ${analytics.convexity.toFixed(2)}`);
    console.log(`  Dollar Duration: $${analytics.dollarDuration.toFixed(4)}`);
    
    console.log('\nSpread Metrics:');
    console.log(`  Spread: ${analytics.spread?.toFixed(0)} bps (Target: 660 bps, Diff: ${((analytics.spread || 0) - 660).toFixed(0)} bps)`);
    console.log(`  Z-Spread: ${analytics.zSpread?.toFixed(0)} bps`);
    
    console.log('\nPrice Metrics:');
    console.log(`  Clean Price: $${analytics.cleanPrice.toFixed(2)}`);
    console.log(`  Dirty Price: $${analytics.dirtyPrice.toFixed(2)}`);
    console.log(`  Accrued Interest: $${analytics.accruedInterest.toFixed(2)}`);
    
    console.log('\nOther Metrics:');
    console.log(`  Average Life: ${analytics.averageLife.toFixed(2)} years`);
    console.log(`  Total Cash Flows: $${analytics.totalCashFlows.toFixed(2)}`);
    console.log(`  Days to Next Coupon: ${analytics.daysToNextCoupon}`);
    
    console.log('\nConvergence Info:');
    console.log(`  Algorithm: ${analytics.convergenceInfo.algorithm}`);
    console.log(`  Iterations: ${analytics.convergenceInfo.iterations}`);
    console.log(`  Precision: ${analytics.convergenceInfo.precision.toExponential(2)}`);
    
  } catch (error) {
    console.error('❌ Calculation failed:', error);
  }
  
  // Test multiple prices
  console.log('\n📊 Testing Multiple Prices:');
  console.log('Price   | YTM     | Spread  | Mod Dur | Algorithm');
  console.log('--------|---------|---------|---------|------------');
  
  const testPrices = [500, 600, 722.5, 850, 1000, 1150];
  
  for (const price of testPrices) {
    try {
      const data = { ...marketData, dirtyPrice: price };
      const result = calculator.calculateFromPrice(bond, data);
      
      console.log(
        `${price.toFixed(1).padStart(7)} | ` +
        `${result.yieldToMaturity.toFixed(2).padStart(6)}% | ` +
        `${(result.spread || 0).toFixed(0).padStart(6)} | ` +
        `${result.modifiedDuration.toFixed(2).padStart(7)} | ` +
        `${result.convergenceInfo.algorithm}`
      );
    } catch (error) {
      console.log(`${price.toFixed(1).padStart(7)} | ERROR`);
    }
  }
  
  // Test yield to price
  console.log('\n📊 Testing Yield to Price:');
  const testYield = 0.1088; // 10.88%
  const priceResult = calculator.calculateFromYield(bond, testYield, marketData.settlementDate);
  console.log(`  Yield: ${(testYield * 100).toFixed(2)}%`);
  console.log(`  Clean Price: $${priceResult.cleanPrice.toFixed(2)}`);
  console.log(`  Dirty Price: $${priceResult.dirtyPrice.toFixed(2)}`);
  console.log(`  Accrued Interest: $${priceResult.accruedInterest.toFixed(2)}`);
}

// Run test
testBondCalculator()
  .then(() => console.log('\n✅ Test completed!'))
  .catch(error => console.error('\n❌ Test failed:', error));