// Test the EXACT scenario from the user's screenshot
// Argentina 2030, Price 80.0000, Settlement 14/06/2025
import fetch from 'node-fetch';

async function testExactUIScenario() {
  console.log('🔍 Testing EXACT scenario from user screenshot');
  console.log('📱 Bond: REPUBLIC OF ARGENTINA 0.125% 2030 (US040114HS26)');
  console.log('💰 Price: 80.0000');
  console.log('📅 Settlement: 14/06/2025');
  console.log('🎯 Expected: YTM ~10.45%, Duration ~2.19 (from Bloomberg)');
  console.log('❌ Actual in UI: All zeros (YTM: 0.000, Duration: 0.000, etc.)\n');
  
  try {
    // Load the Argentina 2030 bond
    const response = await fetch('http://localhost:3000/api/bonds/saved');
    const savedBonds = await response.json();
    
    const bondRecord = savedBonds.bonds.find(b => 
      b.bondInfo.isin === 'US040114HS26' || 
      b.filename === 'GD30_ARGENTINA_075pct_20300709.json'
    );
    
    if (!bondRecord) {
      console.log('❌ Argentina 2030 bond not found');
      return;
    }
    
    console.log('✅ Bond loaded:', bondRecord.bondInfo.issuer);
    console.log('📋 ISIN:', bondRecord.bondInfo.isin);
    console.log('📋 Maturity:', bondRecord.bondInfo.maturityDate);
    
    // Convert to calculation format - EXACTLY as UI would
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
      predefinedCashFlows: bondRecord.cashFlowSchedule
    };
    
    // Test 1: Use the exact settlement date format from screenshot
    console.log('\n🧪 TEST 1: Exact screenshot parameters');
    const exactRequest = {
      ...bondData,
      settlementDate: "2025-06-14", // Convert 14/06/2025 to ISO format
      marketPrice: 80.0000  // Exact price from screenshot
    };
    
    console.log('📤 Sending request with:');
    console.log('   Price:', exactRequest.marketPrice);
    console.log('   Settlement:', exactRequest.settlementDate);
    console.log('   Bond:', exactRequest.issuer);
    
    const calcResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exactRequest),
    });
    
    console.log('📥 Response status:', calcResponse.status);
    
    if (!calcResponse.ok) {
      const errorText = await calcResponse.text();
      console.log('❌ API Error:', errorText);
      return;
    }
    
    const result = await calcResponse.json();
    console.log('📊 API Response status:', result.status);
    
    if (result.status !== 'success' && result.status !== 'SUCCESS') {
      console.log('❌ Calculation failed with status:', result.status);
      console.log('📋 Full result:', JSON.stringify(result, null, 2));
      return;
    }
    
    console.log('\n📊 RESULTS FROM API:');
    console.log('   YTM:', result.analytics?.yieldToMaturity || 'undefined');
    console.log('   Duration:', result.analytics?.duration || 'undefined');
    console.log('   Current Yield:', result.analytics?.currentYield || 'undefined');
    console.log('   Clean Price:', result.analytics?.cleanPrice || 'undefined');
    console.log('   Spread:', result.analytics?.spread || 'undefined');
    console.log('   Accrued Interest:', result.analytics?.accruedInterest || 'undefined');
    
    // Check if we're getting the same zeros as the UI
    const ytm = result.analytics?.yieldToMaturity;
    const duration = result.analytics?.duration;
    const cleanPrice = result.analytics?.cleanPrice;
    
    if (ytm === 0 && duration === 0 && cleanPrice === 0) {
      console.log('\n🚨 CONFIRMED: API is returning zeros just like the UI!');
      console.log('🔍 This proves the issue is in the backend calculation, not UI');
    } else if (ytm && ytm > 0) {
      console.log('\n🤔 DISCREPANCY: API returns valid results but UI shows zeros');
      console.log('🔍 This suggests a frontend/backend communication issue');
    } else {
      console.log('\n❓ UNEXPECTED: API returns undefined/null values');
    }
    
    // Test 2: Try with different settlement date format
    console.log('\n🧪 TEST 2: Try alternative settlement date format');
    const altRequest = {
      ...bondData,
      settlementDate: "2025-06-13", // Different date 
      marketPrice: 80.0000
    };
    
    const altResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(altRequest),
    });
    
    if (altResponse.ok) {
      const altResult = await altResponse.json();
      console.log('📊 Alternative date results:');
      console.log('   YTM:', altResult.analytics?.yieldToMaturity || 'undefined');
      console.log('   Duration:', altResult.analytics?.duration || 'undefined');
    }
    
    // Test 3: Try without predefined cash flows
    console.log('\n🧪 TEST 3: Try without predefined cash flows (force regeneration)');
    const regenRequest = {
      ...bondData,
      settlementDate: "2025-06-14",
      marketPrice: 80.0000
    };
    delete regenRequest.predefinedCashFlows; // Force cash flow regeneration
    
    const regenResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regenRequest),
    });
    
    if (regenResponse.ok) {
      const regenResult = await regenResponse.json();
      console.log('📊 Regenerated cash flows results:');
      console.log('   YTM:', regenResult.analytics?.yieldToMaturity || 'undefined');
      console.log('   Duration:', regenResult.analytics?.duration || 'undefined');
    }
    
  } catch (error) {
    console.error('💥 Test crashed:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

testExactUIScenario();