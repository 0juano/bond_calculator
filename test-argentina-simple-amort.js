// Test Argentina 2038 with step-up coupons but SIMPLIFIED amortization schedule
import fetch from 'node-fetch';

async function testArgentinaSimpleAmort() {
  console.log('🔍 Testing Argentina 2038 with step-up coupons + SIMPLE amortization');
  console.log('🎯 Using the working 5-payment amortization schedule instead of 22-payment');

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
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: true,
    // SIMPLIFIED amortization: 20% annually from 2032-2036 (this was working)
    amortizationSchedule: [
      { date: "2032-07-09", principalPercent: 20 },
      { date: "2033-07-09", principalPercent: 20 },
      { date: "2034-07-09", principalPercent: 20 },
      { date: "2035-07-09", principalPercent: 20 },
      { date: "2036-07-09", principalPercent: 20 }
    ],
    callSchedule: [],
    putSchedule: [],
    // Step-up coupon schedule
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
    console.log('🔍 ARGENTINA SIMPLE AMORT RESULT:', {
      status: result.status,
      ytm: result.analytics?.yieldToMaturity,
      expectedYtm: 10.88,
      duration: result.analytics?.duration,
      expectedDuration: 5.01,
      totalCashFlows: result.analytics?.totalCoupons,
      cleanPrice: result.analytics?.cleanPrice
    });

    const ytm = result.analytics?.yieldToMaturity;
    if (ytm && ytm > 0 && ytm < 20) {
      console.log('✅ YTM is realistic');
      const ytmDiff = Math.abs(ytm - 10.88);
      console.log(`📊 YTM vs Bloomberg: ${ytm.toFixed(2)}% vs 10.88% (diff: ${ytmDiff.toFixed(2)}%)`);
      
      if (ytmDiff < 2.0) {
        console.log('✅ YTM is close to Bloomberg target');
      } else {
        console.log('❌ YTM still deviates from Bloomberg, but at least it works');
      }
    } else {
      console.log('❌ YTM is unrealistic:', ytm);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testArgentinaSimpleAmort();