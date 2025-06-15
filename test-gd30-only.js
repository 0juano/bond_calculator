// Quick test of JUST Argentina 2030 (GD30) bond to check specific issues
import fetch from 'node-fetch';

async function testGD30() {
  console.log('🔍 Testing Argentina 2030 (GD30) - The bond user said gives "silly results"');
  console.log('🎯 Bloomberg target: Price 80.19 → YTM 10.45%, Duration 2.19, Spread 646bp');
  
  try {
    // Load the saved bond definition
    const response = await fetch('http://localhost:3000/api/bonds/saved');
    const savedBonds = await response.json();
    
    const bondRecord = savedBonds.bonds.find(b => b.filename === 'GD30_ARGENTINA_075pct_20300709.json');
    if (!bondRecord) {
      console.log('❌ Bond not found');
      return;
    }
    
    console.log('📄 Bond loaded successfully');
    console.log(`📊 Issuer: ${bondRecord.bondInfo.issuer}`);
    console.log(`📊 Maturity: ${bondRecord.bondInfo.maturityDate}`);
    console.log(`📊 Features: Amortizing=${bondRecord.features.isAmortizing}, StepUp=${bondRecord.features.hasStepUpCoupon}`);
    
    // Convert to calculation format
    const bondData = {
      ...bondRecord.bondInfo,
      isAmortizing: bondRecord.features.isAmortizing,
      isCallable: bondRecord.features.isCallable,
      isPuttable: bondRecord.features.isPuttable,
      isVariableCoupon: bondRecord.features.isVariableCoupon,
      amortizationSchedule: bondRecord.schedules.amortizationSchedule || [],
      callSchedule: bondRecord.schedules.callSchedule || [],
      putSchedule: bondRecord.schedules.putSchedule || [],
      couponRateChanges: bondRecord.schedules.couponRateChanges || [],
      predefinedCashFlows: bondRecord.cashFlowSchedule // Use pre-calculated cash flows
    };
    
    // Test with Bloomberg price
    const calculationRequest = {
      ...bondData,
      settlementDate: "2025-06-13",
      marketPrice: 80.19
    };
    
    console.log('🧮 Calculating with Bloomberg price 80.19%...');
    
    const calcResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calculationRequest),
    });
    
    if (!calcResponse.ok) {
      const errorText = await calcResponse.text();
      console.log('❌ Calculation failed:', errorText);
      return;
    }
    
    const result = await calcResponse.json();
    
    console.log('📊 RESULTS:');
    console.log(`   YTM: ${result.analytics?.yieldToMaturity?.toFixed(2)}% (Bloomberg: 10.45%)`);
    console.log(`   Duration: ${result.analytics?.duration?.toFixed(2)} (Bloomberg: 2.19)`);
    console.log(`   Spread: ${result.analytics?.spread?.toFixed(0)}bp (Bloomberg: 646bp)`);
    console.log(`   Clean Price: ${result.analytics?.cleanPrice?.toFixed(2)}%`);
    console.log(`   Accrued: ${result.analytics?.accruedInterest?.toFixed(2)}`);
    
    // Check for silly results
    const ytm = result.analytics?.yieldToMaturity;
    const duration = result.analytics?.duration;
    const spread = result.analytics?.spread;
    
    let sillyResults = [];
    if (ytm !== undefined && (ytm < 0 || ytm > 50)) sillyResults.push(`YTM: ${ytm.toFixed(2)}%`);
    if (duration !== undefined && (duration < 0 || duration > 30)) sillyResults.push(`Duration: ${duration.toFixed(2)}`);
    if (spread !== undefined && (spread < -2000 || spread > 5000)) sillyResults.push(`Spread: ${spread.toFixed(0)}bp`);
    
    if (sillyResults.length > 0) {
      console.log('🚨 SILLY RESULTS DETECTED:');
      sillyResults.forEach(issue => console.log(`   ❌ ${issue}`));
    } else {
      console.log('✅ No silly results detected');
      
      // Check accuracy vs Bloomberg
      const ytmDiff = Math.abs(ytm - 10.45);
      const durationDiff = Math.abs(duration - 2.19);
      const spreadDiff = Math.abs(spread - 646);
      
      console.log('📈 ACCURACY CHECK:');
      console.log(`   YTM difference: ${ytmDiff.toFixed(2)}% (tolerance: ±1%)`);
      console.log(`   Duration difference: ${durationDiff.toFixed(2)} (tolerance: ±0.5)`);
      console.log(`   Spread difference: ${spreadDiff.toFixed(0)}bp (tolerance: ±100bp)`);
      
      const ytmPass = ytmDiff <= 1.0;
      const durationPass = durationDiff <= 0.5;
      const spreadPass = spreadDiff <= 100;
      
      console.log(`   ${ytmPass ? '✅' : '❌'} YTM within tolerance`);
      console.log(`   ${durationPass ? '✅' : '❌'} Duration within tolerance`);
      console.log(`   ${spreadPass ? '✅' : '❌'} Spread within tolerance`);
      
      if (ytmPass && durationPass && spreadPass) {
        console.log('🎉 GD30 PASSES Bloomberg validation!');
      } else {
        console.log('❌ GD30 FAILS Bloomberg validation');
      }
    }
    
  } catch (error) {
    console.error('💥 Test crashed:', error.message);
  }
}

testGD30();