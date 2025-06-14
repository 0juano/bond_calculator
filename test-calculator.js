// Test script to debug calculator behavior
import fetch from 'node-fetch';

async function testCalculator() {
  const calculationRequest = {
    issuer: "REPUBLIC OF ARGENTINA",
    cusip: "040114GU0",
    isin: "US040114GU04",
    faceValue: 1000,
    couponRate: 1.0,
    issueDate: "2020-09-01",
    maturityDate: "2038-01-09",
    firstCouponDate: "2021-01-09",
    paymentFrequency: 2,
    dayCountConvention: "30/360", 
    currency: "USD",
    settlementDays: 2,
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: false,
    amortizationSchedule: [
      { date: "2032-07-09", principalPercent: 20 },
      { date: "2033-07-09", principalPercent: 20 },
      { date: "2034-07-09", principalPercent: 20 },
      { date: "2035-07-09", principalPercent: 20 },
      { date: "2036-07-09", principalPercent: 20 }
    ],
    callSchedule: [],
    putSchedule: [],
    couponRateChanges: [],
    settlementDate: "2025-06-13",
    marketPrice: 80.0000
  };

  console.log('🔍 CALLING CALCULATOR ANALYZE with:', {
    bondIssuer: calculationRequest.issuer,
    marketPrice: calculationRequest.marketPrice,
    settlementDate: calculationRequest.settlementDate,
    hasAmortization: calculationRequest.amortizationSchedule.length > 0
  });

  try {
    const response = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calculationRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔍 RAW CALCULATOR ERROR:', errorText);
      return;
    }

    const result = await response.json();
    console.log('🔍 RAW CALCULATOR RESULT:', {
      status: result.status,
      hasAnalytics: !!result.analytics,
      ytm: result.analytics?.yieldToMaturity,
      cleanPrice: result.analytics?.cleanPrice,
      spread: result.analytics?.spread,
      duration: result.analytics?.duration,
      accrued: result.analytics?.accruedInterest
    });

    // Log the full result for debugging
    console.log('💰 Full result:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Calculator test error:', error.message);
  }
}

testCalculator();