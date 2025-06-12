import { BondCalculatorIntegration } from './bond-calculator-integration';
import { CleanBondDefinition } from './bond-definition';

// Simple 5% bond for debugging
const debugBond: CleanBondDefinition = {
  metadata: {
    id: "debug_bond",
    name: "Debug Bond 5% 2030",
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    version: "1.0",
    source: "USER_CREATED"
  },
  bondInfo: {
    issuer: "DEBUG CORP",
    faceValue: 1000,
    couponRate: 5.0,
    issueDate: "2025-01-01",
    maturityDate: "2030-01-01",
    firstCouponDate: "2025-07-01",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    settlementDays: 2
  },
  features: {
    isAmortizing: false,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: false,
    isInflationLinked: false
  },
  cashFlowSchedule: [
    { date: "2025-07-01", couponPayment: 25, principalPayment: 0, totalPayment: 25, remainingNotional: 1000, paymentType: "COUPON" },
    { date: "2026-01-01", couponPayment: 25, principalPayment: 0, totalPayment: 25, remainingNotional: 1000, paymentType: "COUPON" },
    { date: "2026-07-01", couponPayment: 25, principalPayment: 0, totalPayment: 25, remainingNotional: 1000, paymentType: "COUPON" },
    { date: "2027-01-01", couponPayment: 25, principalPayment: 0, totalPayment: 25, remainingNotional: 1000, paymentType: "COUPON" },
    { date: "2027-07-01", couponPayment: 25, principalPayment: 0, totalPayment: 25, remainingNotional: 1000, paymentType: "COUPON" },
    { date: "2028-01-01", couponPayment: 25, principalPayment: 0, totalPayment: 25, remainingNotional: 1000, paymentType: "COUPON" },
    { date: "2028-07-01", couponPayment: 25, principalPayment: 0, totalPayment: 25, remainingNotional: 1000, paymentType: "COUPON" },
    { date: "2029-01-01", couponPayment: 25, principalPayment: 0, totalPayment: 25, remainingNotional: 1000, paymentType: "COUPON" },
    { date: "2029-07-01", couponPayment: 25, principalPayment: 0, totalPayment: 25, remainingNotional: 1000, paymentType: "COUPON" },
    { date: "2030-01-01", couponPayment: 25, principalPayment: 1000, totalPayment: 1025, remainingNotional: 0, paymentType: "MATURITY" }
  ]
};

async function debugParBondCalculation() {
  console.log('🔍 Debugging Par Bond Calculation\n');
  
  const calculator = new BondCalculatorIntegration();
  
  // Test at different settlement dates
  const testDates = [
    new Date('2025-01-01'), // Issue date (should be exactly 5%)
    new Date('2025-06-09'), // Mid-period 
    new Date('2025-07-01'), // First coupon date
  ];
  
  for (const settlementDate of testDates) {
    console.log(`Settlement Date: ${settlementDate.toISOString().split('T')[0]}`);
    
    const result = await calculator.calculateFromCleanBond(debugBond, 1000, settlementDate);
    
    if (result.success && result.data) {
      console.log(`  YTM: ${result.data.yieldToMaturity.toFixed(6)}%`);
      console.log(`  Clean Price: ${result.data.cleanPrice.toFixed(4)}`);
      console.log(`  Dirty Price: ${result.data.dirtyPrice.toFixed(4)}`);
      console.log(`  Accrued Interest: ${result.data.accruedInterest.toFixed(4)}`);
      console.log(`  Days to Next Coupon: ${result.data.daysToNextCoupon}`);
      console.log('');
    } else {
      console.log(`  ❌ Calculation failed: ${result.errors}`);
      console.log('');
    }
  }
  
  // Test the Argentina bond convergence issue
  console.log('🔍 Debugging Argentina Bond at Par (convergence issue)\n');
  
  const argentinaBondVanilla: CleanBondDefinition = {
    metadata: {
      id: "argentina_vanilla",
      name: "Argentina Vanilla Test",
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: "1.0",
      source: "USER_CREATED"
    },
    bondInfo: {
      issuer: "REPUBLIC OF ARGENTINA",
      faceValue: 1000,
      couponRate: 0.125, // Very low coupon
      issueDate: "2020-09-04",
      maturityDate: "2030-07-09",
      firstCouponDate: "2021-07-09",
      paymentFrequency: 2,
      dayCountConvention: "30/360",
      currency: "USD",
      settlementDays: 2
    },
    features: {
      isAmortizing: false,
      isCallable: false,
      isPuttable: false,
      isVariableCoupon: false,
      isInflationLinked: false
    },
    cashFlowSchedule: [
      // Using simplified vanilla cash flows (fixed coupon)
      { date: "2025-07-09", couponPayment: 0.625, principalPayment: 0, totalPayment: 0.625, remainingNotional: 1000, paymentType: "COUPON" },
      { date: "2026-01-09", couponPayment: 0.625, principalPayment: 0, totalPayment: 0.625, remainingNotional: 1000, paymentType: "COUPON" },
      { date: "2026-07-09", couponPayment: 0.625, principalPayment: 0, totalPayment: 0.625, remainingNotional: 1000, paymentType: "COUPON" },
      { date: "2027-01-09", couponPayment: 0.625, principalPayment: 0, totalPayment: 0.625, remainingNotional: 1000, paymentType: "COUPON" },
      { date: "2027-07-09", couponPayment: 0.625, principalPayment: 0, totalPayment: 0.625, remainingNotional: 1000, paymentType: "COUPON" },
      { date: "2028-01-09", couponPayment: 0.625, principalPayment: 0, totalPayment: 0.625, remainingNotional: 1000, paymentType: "COUPON" },
      { date: "2028-07-09", couponPayment: 0.625, principalPayment: 0, totalPayment: 0.625, remainingNotional: 1000, paymentType: "COUPON" },
      { date: "2029-01-09", couponPayment: 0.625, principalPayment: 0, totalPayment: 0.625, remainingNotional: 1000, paymentType: "COUPON" },
      { date: "2029-07-09", couponPayment: 0.625, principalPayment: 0, totalPayment: 0.625, remainingNotional: 1000, paymentType: "COUPON" },
      { date: "2030-07-09", couponPayment: 0.625, principalPayment: 1000, totalPayment: 1000.625, remainingNotional: 0, paymentType: "MATURITY" }
    ]
  };
  
  const argResult = await calculator.calculateFromCleanBond(argentinaBondVanilla, 1000, new Date('2025-06-09'));
  
  if (argResult.success && argResult.data) {
    console.log('✅ Argentina vanilla bond at par:');
    console.log(`  YTM: ${argResult.data.yieldToMaturity.toFixed(6)}% (should be ~0.125%)`);
    console.log(`  Duration: ${argResult.data.duration.toFixed(4)}`);
  } else {
    console.log(`❌ Argentina bond failed: ${argResult.errors}`);
  }
  
  // Test edge case: very low price
  console.log('\n🔍 Testing Edge Cases\n');
  
  const lowPriceResult = await calculator.calculateFromCleanBond(argentinaBondVanilla, 100, new Date('2025-06-09'));
  if (lowPriceResult.success && lowPriceResult.data) {
    console.log(`Argentina bond at 100 (10% of face): YTM = ${lowPriceResult.data.yieldToMaturity.toFixed(3)}%`);
  } else {
    console.log(`Low price test failed: ${lowPriceResult.errors}`);
  }
  
  const highPriceResult = await calculator.calculateFromCleanBond(debugBond, 1200, new Date('2025-06-09'));
  if (highPriceResult.success && highPriceResult.data) {
    console.log(`5% bond at 1200 (premium): YTM = ${highPriceResult.data.yieldToMaturity.toFixed(3)}%`);
  } else {
    console.log(`High price test failed: ${highPriceResult.errors}`);
  }
}

debugParBondCalculation()
  .then(() => console.log('\n✅ Debug analysis complete!'))
  .catch(error => console.error('❌ Debug failed:', error)); 