// Test Argentina 2038 with ONLY amortization (no step-up coupons) to isolate the issue
import fetch from 'node-fetch';

async function testArgentinaAmortOnly() {
  console.log('🔍 Testing Argentina 2038 with ONLY amortization (no step-up coupons)');
  console.log('🎯 Isolating amortization logic');

  const calculationRequest = {
    issuer: "REPUBLIC OF ARGENTINA",
    cusip: "040114HU7", 
    isin: "US040114HU71",
    faceValue: 1000,
    couponRate: 5.00,  // Fixed 5% coupon (final step-up rate)
    issueDate: "2020-09-04",
    maturityDate: "2038-01-09",
    firstCouponDate: "2021-01-09",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    settlementDays: 2,
    isAmortizing: true,  // ← ONLY amortization
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: false,  // ← NO step-ups
    // Semi-annual amortization from 2027-2037 (22 payments of 4.545% each)
    amortizationSchedule: [
      { date: "2027-01-09", principalPercent: 4.545 },
      { date: "2027-07-09", principalPercent: 4.545 },
      { date: "2028-01-09", principalPercent: 4.545 },
      { date: "2028-07-09", principalPercent: 4.545 },
      { date: "2029-01-09", principalPercent: 4.545 },
      { date: "2029-07-09", principalPercent: 4.545 },
      { date: "2030-01-09", principalPercent: 4.545 },
      { date: "2030-07-09", principalPercent: 4.545 },
      { date: "2031-01-09", principalPercent: 4.545 },
      { date: "2031-07-09", principalPercent: 4.545 },
      { date: "2032-01-09", principalPercent: 4.545 },
      { date: "2032-07-09", principalPercent: 4.545 },
      { date: "2033-01-09", principalPercent: 4.545 },
      { date: "2033-07-09", principalPercent: 4.545 },
      { date: "2034-01-09", principalPercent: 4.545 },
      { date: "2034-07-09", principalPercent: 4.545 },
      { date: "2035-01-09", principalPercent: 4.545 },
      { date: "2035-07-09", principalPercent: 4.545 },
      { date: "2036-01-09", principalPercent: 4.545 },
      { date: "2036-07-09", principalPercent: 4.545 },
      { date: "2037-01-09", principalPercent: 4.545 },
      { date: "2037-07-09", principalPercent: 4.545 }
    ],
    callSchedule: [],
    putSchedule: [],
    couponRateChanges: [],  // ← EMPTY
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
    console.log('🔍 AMORTIZATION ONLY RESULT:', {
      status: result.status,
      ytm: result.analytics?.yieldToMaturity,
      duration: result.analytics?.duration,
      totalCashFlows: result.analytics?.totalCoupons,
      cleanPrice: result.analytics?.cleanPrice
    });

    const ytm = result.analytics?.yieldToMaturity;
    if (ytm && ytm > 0 && ytm < 20) {
      console.log('✅ YTM is realistic for amortizing bond');
    } else {
      console.log('❌ YTM is unrealistic:', ytm);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testArgentinaAmortOnly();