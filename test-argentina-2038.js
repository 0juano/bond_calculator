// Test script specifically for Argentina 2038 bond with correct amortization schedule
import fetch from 'node-fetch';

async function testArgentina2038() {
  // CORRECT Argentina 2038 (GD38) definition based on saved bond JSON
  const calculationRequest = {
    issuer: "REPUBLIC OF ARGENTINA",
    cusip: "040114HU7",
    isin: "US040114HU71",
    faceValue: 1000,
    couponRate: 0.125,  // CORRECT: Initial coupon 0.125%
    issueDate: "2020-09-04",  // CORRECT: Real issue date
    maturityDate: "2038-01-09",
    firstCouponDate: "2021-01-09",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    settlementDays: 2,
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: true,  // CORRECT: Has step-up coupons
    // CORRECT: Semi-annual amortization from 2027-2037 (22 payments of 4.545% each)
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
    // CORRECT: Step-up coupon schedule
    couponRateChanges: [
      { effectiveDate: "2021-07-09", newCouponRate: 2.00 },
      { effectiveDate: "2022-07-09", newCouponRate: 3.875 },
      { effectiveDate: "2023-07-09", newCouponRate: 4.25 },
      { effectiveDate: "2024-07-09", newCouponRate: 5.00 }
    ],
    settlementDate: "2025-06-13",
    // Test Bloomberg reference values
    marketPrice: 72.25  // Should give YTM ~10.88%
  };

  console.log('🔍 Testing Argentina 2038 with Bloomberg reference price 72.25');
  console.log('🎯 Expected: YTM ~10.88%, Duration ~5.01, Spread ~660bp');

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
    console.log('🔍 BLOOMBERG VALIDATION RESULT:', {
      status: result.status,
      ytm: result.analytics?.yieldToMaturity,
      expectedYtm: 10.88,
      duration: result.analytics?.duration,
      expectedDuration: 5.01,
      spread: result.analytics?.spread,
      expectedSpread: 660,
      cleanPrice: result.analytics?.cleanPrice,
      expectedPrice: 72.25
    });

    // Validate against Bloomberg targets
    const ytm = result.analytics?.yieldToMaturity;
    const duration = result.analytics?.duration;
    const spread = result.analytics?.spread;

    if (ytm) {
      const ytmDiff = Math.abs(ytm - 10.88);
      console.log(`📊 YTM Validation: ${ytm.toFixed(2)}% vs 10.88% (diff: ${ytmDiff.toFixed(2)}%)`);
      if (ytmDiff < 1.0) {
        console.log('✅ YTM is within 1% of Bloomberg target');
      } else {
        console.log('❌ YTM deviates significantly from Bloomberg target');
      }
    }

    if (duration) {
      const durationDiff = Math.abs(duration - 5.01);
      console.log(`📊 Duration Validation: ${duration.toFixed(2)} vs 5.01 (diff: ${durationDiff.toFixed(2)})`);
      if (durationDiff < 1.0) {
        console.log('✅ Duration is within 1 year of Bloomberg target');
      } else {
        console.log('❌ Duration deviates significantly from Bloomberg target');
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Test with 80% price as well
async function testArgentina2038_80() {
  console.log('\n🔍 Testing Argentina 2038 with price 80.00');
  console.log('🎯 Expected: YTM ~10.4%');

  const calculationRequest = {
    issuer: "REPUBLIC OF ARGENTINA",
    cusip: "040114HU7",
    isin: "US040114HU71",
    faceValue: 1000,
    couponRate: 0.125,  // CORRECT: Initial coupon 0.125%
    issueDate: "2020-09-04",  // CORRECT: Real issue date
    maturityDate: "2038-01-09",
    firstCouponDate: "2021-01-09",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    settlementDays: 2,
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: true,  // CORRECT: Has step-up coupons
    // CORRECT: Semi-annual amortization from 2027-2037 (22 payments of 4.545% each)
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
    // CORRECT: Step-up coupon schedule
    couponRateChanges: [
      { effectiveDate: "2021-07-09", newCouponRate: 2.00 },
      { effectiveDate: "2022-07-09", newCouponRate: 3.875 },
      { effectiveDate: "2023-07-09", newCouponRate: 4.25 },
      { effectiveDate: "2024-07-09", newCouponRate: 5.00 }
    ],
    settlementDate: "2025-06-13",
    marketPrice: 80.00
  };

  try {
    const response = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calculationRequest),
    });

    const result = await response.json();
    const ytm = result.analytics?.yieldToMaturity;
    
    console.log(`📊 Price 80.00 Result: YTM ${ytm?.toFixed(2)}% (expected ~10.4%)`);
    
    if (ytm && ytm > 0 && ytm < 20) {
      console.log('✅ YTM is positive and realistic');
    } else {
      console.log('❌ YTM is unrealistic (negative or too high)');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testArgentina2038().then(() => testArgentina2038_80());