// Test price interpretation fix - Argentina 2030
import fetch from 'node-fetch';

async function validatePriceFix() {
  console.log('🎯 Testing Price Interpretation Fix for Argentina 2030');
  console.log('📊 Expected: 80% price → ~11% YTM (user Excel calculation)');
  console.log('');

  const bondData = {
    issuer: "REPUBLIC OF ARGENTINA",
    cusip: "040114HS2",
    isin: "US040114HS26",
    faceValue: 1000,
    couponRate: 0.75,
    issueDate: "2020-07-09",
    maturityDate: "2030-07-09",
    firstCouponDate: "2021-01-09",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: true,
    settlementDays: 3,
    settlementDate: '2025-06-14',
    marketPrice: 80,
    amortizationSchedule: [
      { date: "2025-01-09", principalPercent: 4 },
      { date: "2025-07-09", principalPercent: 8 },
      { date: "2026-01-09", principalPercent: 8 },
      { date: "2026-07-09", principalPercent: 8 },
      { date: "2027-01-09", principalPercent: 8 },
      { date: "2027-07-09", principalPercent: 8 },
      { date: "2028-01-09", principalPercent: 8 },
      { date: "2028-07-09", principalPercent: 8 },
      { date: "2029-01-09", principalPercent: 8 },
      { date: "2029-07-09", principalPercent: 8 },
      { date: "2030-01-09", principalPercent: 8 },
      { date: "2030-07-09", principalPercent: 8 },
      { date: "2030-07-09", principalPercent: 8 }
    ],
    couponRateChanges: [
      { effectiveDate: "2025-01-09", newCouponRate: 6.3 }
    ]
  };

  try {
    const response = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bondData),
    });

    const result = await response.json();
    
    console.log('✅ Calculator Results:');
    console.log(`   YTM: ${result.analytics?.yieldToMaturity?.toFixed(2)}%`);
    console.log(`   Duration: ${result.analytics?.duration?.toFixed(2)}`);
    console.log(`   Spread: ${result.analytics?.spread?.toFixed(0)}bp`);
    console.log(`   Clean Price: ${result.analytics?.cleanPrice?.toFixed(2)}%`);
    
    const ytm = result.analytics?.yieldToMaturity || 0;
    
    console.log('');
    console.log('🎯 Validation:');
    
    if (ytm >= 10.5 && ytm <= 12.0) {
      console.log(`✅ SUCCESS: YTM ${ytm.toFixed(2)}% is in expected range (10.5-12%)!`);
      console.log('✅ Price interpretation fix is working correctly!');
    } else {
      console.log(`❌ ISSUE: YTM ${ytm.toFixed(2)}% is outside expected range (10.5-12%)`);
      if (ytm < 6) {
        console.log('❌ Still calculating based on face value instead of outstanding principal');
      }
    }

    console.log('');
    console.log('🔍 Key insight: For amortizing bonds at settlement date:');
    console.log('   - Outstanding principal: $880 (after 12% amortization)');
    console.log('   - 80% × $880 = $704 (actual dollar price)');
    console.log('   - This yields ~11% as user calculated in Excel');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

validatePriceFix();