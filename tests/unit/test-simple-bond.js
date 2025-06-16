// Test simple non-amortizing bond to validate basic YTM calculation
import fetch from 'node-fetch';

async function testSimpleBond() {
  console.log('🔍 Testing simple 1% bullet bond, 2038 maturity');
  console.log('🎯 At 80% price, should yield much higher than 1%');
  
  const calculationRequest = {
    issuer: "SIMPLE TEST BOND",
    faceValue: 1000,
    couponRate: 1.0,
    issueDate: "2020-01-01",
    maturityDate: "2038-01-01",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: false,    // ← BULLET BOND (no amortization)
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: false,
    amortizationSchedule: [],
    callSchedule: [],
    putSchedule: [],
    couponRateChanges: [],
    settlementDate: "2025-06-13",
    marketPrice: 80.00  // 80% of face value
  };

  try {
    const response = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calculationRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔍 ERROR:', errorText);
      return;
    }

    const result = await response.json();
    const ytm = result.analytics?.yieldToMaturity;
    const duration = result.analytics?.duration;
    const totalCoupons = result.analytics?.totalCoupons;
    
    console.log('🔍 SIMPLE BOND RESULT:', {
      status: result.status,
      ytm: ytm,
      duration: duration,
      totalCoupons: totalCoupons,
      cleanPrice: result.analytics?.cleanPrice,
      marketPrice: result.analytics?.marketPrice
    });

    // For a 1% coupon bond trading at 80% and maturing in ~13 years,
    // the YTM should be much higher than the coupon rate
    if (ytm && ytm > 2 && ytm < 15) {
      console.log('✅ YTM is realistic for a discounted bond');
    } else {
      console.log('❌ YTM is unrealistic:', ytm);
    }

    if (totalCoupons && totalCoupons > 100) {
      console.log('✅ Total coupons includes principal repayment at maturity');
    } else {
      console.log('❌ Total coupons is too low:', totalCoupons);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testSimpleBond();