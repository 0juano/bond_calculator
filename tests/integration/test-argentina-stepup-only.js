// Test Argentina 2038 with ONLY step-up coupons (no amortization) to isolate the issue
import fetch from 'node-fetch';

async function testArgentinaStepUpOnly() {
  console.log('🔍 Testing Argentina 2038 with ONLY step-up coupons (no amortization)');
  console.log('🎯 Isolating step-up coupon logic');

  const calculationRequest = {
    issuer: "REPUBLIC OF ARGENTINA",
    cusip: "040114HU7",
    isin: "US040114HU71",
    faceValue: 1000,
    couponRate: 0.125,  // Initial coupon 0.125%
    issueDate: "2020-09-04",
    maturityDate: "2038-01-09",
    firstCouponDate: "2021-01-09",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    settlementDays: 2,
    isAmortizing: false,  // ← NO AMORTIZATION
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: true,  // ← ONLY step-up coupons
    amortizationSchedule: [],  // ← EMPTY
    callSchedule: [],
    putSchedule: [],
    // Step-up coupon schedule only
    couponRateChanges: [
      { effectiveDate: "2021-07-09", newCouponRate: 2.00 },
      { effectiveDate: "2022-07-09", newCouponRate: 3.875 },
      { effectiveDate: "2023-07-09", newCouponRate: 4.25 },
      { effectiveDate: "2024-07-09", newCouponRate: 5.00 }
    ],
    settlementDate: "2025-06-13",
    marketPrice: 72.25
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
    console.log('🔍 STEP-UP ONLY RESULT:', {
      status: result.status,
      ytm: result.analytics?.yieldToMaturity,
      duration: result.analytics?.duration,
      totalCashFlows: result.analytics?.totalCoupons,
      cleanPrice: result.analytics?.cleanPrice
    });

    const ytm = result.analytics?.yieldToMaturity;
    if (ytm && ytm > 0 && ytm < 20) {
      console.log('✅ YTM is realistic for step-up coupon bond');
    } else {
      console.log('❌ YTM is unrealistic:', ytm);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testArgentinaStepUpOnly();