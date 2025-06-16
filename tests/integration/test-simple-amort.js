// Test simple amortizing bond with immediate amortization to isolate the YTM issue
import fetch from 'node-fetch';

async function testSimpleAmortization() {
  console.log('🔍 Testing simple amortizing bond with immediate amortization');
  console.log('🎯 5% coupon, 50% amortization in 2026, 50% at maturity in 2030');

  const calculationRequest = {
    issuer: "SIMPLE AMORTIZING BOND",
    faceValue: 1000,
    couponRate: 5.0,  // Simple 5% coupon
    issueDate: "2020-01-01",
    maturityDate: "2030-01-01",
    firstCouponDate: "2020-07-01",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    settlementDays: 2,
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: false,
    // Simple amortization: 50% in 2026, 50% at maturity
    amortizationSchedule: [
      { date: "2026-01-01", principalPercent: 50.0 }
    ],
    callSchedule: [],
    putSchedule: [],
    couponRateChanges: [],
    settlementDate: "2025-06-13",
    marketPrice: 95.0  // 95% of face value
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
    console.log('🔍 SIMPLE AMORTIZATION RESULT:', {
      status: result.status,
      ytm: result.analytics?.yieldToMaturity,
      duration: result.analytics?.duration,
      totalCashFlows: result.analytics?.totalCoupons,
      cleanPrice: result.analytics?.cleanPrice
    });

    const ytm = result.analytics?.yieldToMaturity;
    if (ytm && ytm > 0 && ytm < 20) {
      console.log('✅ YTM is realistic for simple amortizing bond');
      console.log(`📊 Expected range: 4-8% for this bond at 95% price`);
    } else {
      console.log('❌ YTM is unrealistic:', ytm);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testSimpleAmortization();