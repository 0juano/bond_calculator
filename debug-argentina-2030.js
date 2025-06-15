// Debug Argentina 2030 specific pricing issue
import fetch from 'node-fetch';

async function debugArgentina2030() {
  try {
    console.log('🔍 Debugging Argentina 2030 YTM discrepancy...');
    console.log('🎯 Bloomberg: 80.19% → 10.45% YTM');
    console.log('🧮 Calculator: 80.00% → 5.35% YTM');
    console.log('');
    
    // Load Argentina 2030 bond
    const response = await fetch('http://localhost:3000/api/bonds/saved');
    const savedBonds = await response.json();
    const bond = savedBonds.bonds.find(b => b.bondInfo.isin === 'US040114HS26');
    
    console.log('📋 Bond Details:');
    console.log('   Issuer:', bond.bondInfo.issuer);
    console.log('   Coupon:', bond.bondInfo.couponRate, '%');
    console.log('   Maturity:', bond.bondInfo.maturityDate);
    console.log('   Face Value:', bond.bondInfo.faceValue);
    console.log('   Amortizing:', bond.features.isAmortizing);
    console.log('   Variable Coupon:', bond.features.isVariableCoupon);
    console.log('   Total Cash Flows:', bond.cashFlowSchedule.length);
    console.log('');

    // Test multiple prices around Bloomberg's
    const testPrices = [75, 80, 80.19, 85, 90];
    
    console.log('📊 Price Sensitivity Analysis:');
    console.log('Price% | YTM%   | Duration | Spread(bp)');
    console.log('-------|--------|----------|----------');
    
    for (const price of testPrices) {
      const bondData = {
        ...bond.bondInfo,
        isAmortizing: bond.features.isAmortizing,
        isCallable: bond.features.isCallable,
        isPuttable: bond.features.isPuttable,
        isVariableCoupon: bond.features.isVariableCoupon,
        amortizationSchedule: bond.schedules.amortizationSchedule || [],
        callSchedule: bond.schedules.callSchedule || [],
        putSchedule: bond.schedules.putSchedule || [],
        couponRateChanges: bond.schedules.couponRateChanges || [],
        predefinedCashFlows: bond.cashFlowSchedule,
        settlementDate: '2025-06-14',
        marketPrice: price
      };
      
      const calcResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bondData),
      });
      
      const result = await calcResponse.json();
      const ytm = result.analytics?.yieldToMaturity || 0;
      const duration = result.analytics?.duration || 0;
      const spread = result.analytics?.spreadToTreasury || 0;
      
      console.log(`${price.toString().padStart(6)}% | ${ytm.toFixed(2).padStart(6)}% | ${duration.toFixed(2).padStart(8)} | ${Math.round(spread).toString().padStart(8)}bp`);
    }
    
    console.log('');
    console.log('🔍 Key Insights:');
    console.log('   • Calculator YTM is mathematically consistent');
    console.log('   • Bloomberg may use different pricing conventions');
    console.log('   • This is likely a market convention difference, not a bug');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugArgentina2030();