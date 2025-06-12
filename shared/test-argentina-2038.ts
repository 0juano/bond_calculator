import { BondAnalyticsEngine, PredefinedCashFlowCalculator } from './bond-analytics-engine';
import { TreasuryYieldCurve } from './yield-curve';
import { CleanBondDefinition } from './bond-definition';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the actual Argentina 2038 bond data
const argentina2038Path = path.join(__dirname, '../saved_bonds/user_created/REPUBLIC_OF_ARGENTINA_0_125pct_20380109_2025-06-09.json');
const argentina2038Data: CleanBondDefinition = JSON.parse(fs.readFileSync(argentina2038Path, 'utf-8'));

// Sample UST curve data
const sampleUSTCurveData = {
  recordDate: "2025-06-09",
  tenors: {
    "1M": 5.25,
    "3M": 5.30,
    "6M": 5.35,
    "1Y": 5.20,
    "2Y": 4.90,
    "3Y": 4.70,
    "5Y": 4.50,
    "7Y": 4.40,
    "10Y": 4.35,
    "20Y": 4.50,
    "30Y": 4.55
  }
};

async function testArgentina2038() {
  console.log('🇦🇷 Testing Argentina 0.125% 2038 Bond Calculator');
  console.log('================================================\n');
  
  // Display bond info
  console.log('Bond Information:');
  console.log(`  Issuer: ${argentina2038Data.bondInfo.issuer}`);
  console.log(`  ISIN: ${argentina2038Data.bondInfo.isin}`);
  console.log(`  Face Value: $${argentina2038Data.bondInfo.faceValue}`);
  console.log(`  Initial Coupon: ${argentina2038Data.bondInfo.couponRate}%`);
  console.log(`  Issue Date: ${argentina2038Data.bondInfo.issueDate}`);
  console.log(`  Maturity: ${argentina2038Data.bondInfo.maturityDate}`);
  console.log(`  Features: Amortizing=${argentina2038Data.features.isAmortizing}, Variable Coupon=${argentina2038Data.features.isVariableCoupon}`);
  console.log(`  Cash Flows: ${argentina2038Data.cashFlowSchedule.length} payments\n`);
  
  // Create analytics engine
  const engine = new BondAnalyticsEngine();
  const yieldCurve = new TreasuryYieldCurve(sampleUSTCurveData);
  
  // Test at different prices
  const testCases = [
    { price: 500, description: "Deep Discount (50% of face)" },
    { price: 700, description: "Discount (70% of face)" },
    { price: 850, description: "Slight Discount (85% of face)" },
    { price: 1000, description: "Par (100% of face)" },
    { price: 1150, description: "Premium (115% of face)" }
  ];
  
  const settlementDate = new Date('2025-06-09');
  
  console.log('📊 Calculation Results:\n');
  console.log('Price   | YTM (%)  | Mod Dur | Mac Dur | Convex  | Spread  | Avg Life');
  console.log('--------|----------|---------|---------|---------|---------|----------');
  
  for (const testCase of testCases) {
    const result = engine.calculate(
      argentina2038Data,
      testCase.price,
      settlementDate,
      yieldCurve
    );
    
    if (result.success && result.data) {
      const analytics = result.data;
      console.log(
        `${testCase.price.toString().padStart(7)} | ` +
        `${analytics.yieldToMaturity.toFixed(3).padStart(8)} | ` +
        `${analytics.duration.toFixed(4).padStart(7)} | ` +
        `${analytics.macaulayDuration.toFixed(4).padStart(7)} | ` +
        `${analytics.convexity.toFixed(3).padStart(7)} | ` +
        `${(analytics.spread ? analytics.spread * 10000 : 0).toFixed(0).padStart(7)} | ` +
        `${analytics.averageLife.toFixed(3).padStart(8)}`
      );
    } else {
      console.log(`${testCase.price.toString().padStart(7)} | ERROR: ${result.errors?.join(', ')}`);
    }
  }
  
  // Detailed analysis at one price point
  console.log('\n📋 Detailed Analysis at $700 (70% of face):\n');
  
  const detailedResult = engine.calculate(argentina2038Data, 700, settlementDate, yieldCurve);
  
  if (detailedResult.success && detailedResult.data) {
    const analytics = detailedResult.data;
    
    console.log('Yield Metrics:');
    console.log(`  YTM: ${analytics.yieldToMaturity.toFixed(4)}%`);
    console.log(`  YTW: ${analytics.yieldToWorst.toFixed(4)}%`);
    console.log(`  Current Yield: ${analytics.currentYield.toFixed(4)}%`);
    
    console.log('\nDuration Metrics:');
    console.log(`  Modified Duration: ${analytics.duration.toFixed(4)}`);
    console.log(`  Macaulay Duration: ${analytics.macaulayDuration.toFixed(4)}`);
    console.log(`  Dollar Duration (DV01): $${analytics.dollarDuration.toFixed(4)}`);
    console.log(`  Convexity: ${analytics.convexity.toFixed(4)}`);
    
    console.log('\nPrice Metrics:');
    console.log(`  Market Price: $${analytics.marketPrice.toFixed(2)}`);
    console.log(`  Clean Price: $${analytics.cleanPrice.toFixed(2)}`);
    console.log(`  Dirty Price: $${analytics.dirtyPrice.toFixed(2)}`);
    console.log(`  Accrued Interest: $${analytics.accruedInterest.toFixed(4)}`);
    
    console.log('\nOther Metrics:');
    console.log(`  Average Life: ${analytics.averageLife.toFixed(3)} years`);
    console.log(`  Total Remaining Coupons: $${analytics.totalCoupons.toFixed(2)}`);
    console.log(`  Days to Next Coupon: ${analytics.daysToNextCoupon}`);
    console.log(`  Spread vs UST: ${analytics.spread ? (analytics.spread * 10000).toFixed(0) : 'N/A'} bps`);
  }
  
  // Test the calculator directly
  console.log('\n🔧 Testing PredefinedCashFlowCalculator directly:\n');
  
  const calculator = new PredefinedCashFlowCalculator();
  
  // Validate bond
  const validation = calculator.validateBond(argentina2038Data);
  console.log(`Validation: ${validation.success ? '✅ PASS' : '❌ FAIL'}`);
  if (!validation.success) {
    console.log(`Errors: ${validation.errors?.join(', ')}`);
  }
  
  // Calculate YTM at different prices
  const ytmTest = calculator.calculateYTM(argentina2038Data, 700, settlementDate);
  if (ytmTest.success && ytmTest.data) {
    console.log(`YTM at $700: ${(ytmTest.data * 100).toFixed(4)}%`);
    
    // Calculate duration using this YTM
    const durTest = calculator.calculateDuration(argentina2038Data, ytmTest.data, settlementDate);
    if (durTest.success && durTest.data) {
      console.log(`Duration at $700: Modified=${durTest.data.modified.toFixed(4)}, Macaulay=${durTest.data.macaulay.toFixed(4)}`);
    }
  }
  
  // Analyze cash flow structure
  console.log('\n💰 Cash Flow Analysis:\n');
  
  const futureFlows = argentina2038Data.cashFlowSchedule.filter(cf => new Date(cf.date) > settlementDate);
  const totalCoupons = futureFlows.reduce((sum, cf) => sum + cf.couponPayment, 0);
  const totalPrincipal = futureFlows.reduce((sum, cf) => sum + cf.principalPayment, 0);
  const totalPayments = futureFlows.reduce((sum, cf) => sum + cf.totalPayment, 0);
  
  console.log(`Future Cash Flows: ${futureFlows.length} payments`);
  console.log(`Total Coupons: $${totalCoupons.toFixed(2)}`);
  console.log(`Total Principal: $${totalPrincipal.toFixed(2)}`);
  console.log(`Total Payments: $${totalPayments.toFixed(2)}`);
  
  // Show coupon rate changes
  console.log('\nCoupon Rate Schedule:');
  let currentRate = argentina2038Data.bondInfo.couponRate;
  let lastDate = argentina2038Data.bondInfo.issueDate;
  
  for (const cf of argentina2038Data.cashFlowSchedule) {
    const expectedCoupon = (currentRate / 100) * cf.remainingNotional / argentina2038Data.bondInfo.paymentFrequency;
    if (Math.abs(cf.couponPayment - expectedCoupon) > 0.01 && cf.remainingNotional > 0) {
      // Rate changed
      const impliedRate = (cf.couponPayment * argentina2038Data.bondInfo.paymentFrequency / cf.remainingNotional) * 100;
      console.log(`  ${lastDate} to ${cf.date}: ${currentRate.toFixed(3)}% → ${impliedRate.toFixed(3)}%`);
      currentRate = impliedRate;
      lastDate = cf.date;
    }
  }
}

// Run the test
testArgentina2038()
  .then(() => console.log('\n✅ Test completed successfully!'))
  .catch(error => console.error('\n❌ Test failed:', error));