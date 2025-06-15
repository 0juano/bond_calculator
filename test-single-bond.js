// Test single bond with optimized algorithms
import fetch from 'node-fetch';

async function testSingleBond() {
  try {
    console.log('🔍 Testing Argentina 2038 with optimized algorithms...');
    
    // Load Argentina 2038 bond
    const response = await fetch('http://localhost:3000/api/bonds/saved');
    const savedBonds = await response.json();
    const bond = savedBonds.bonds.find(b => b.bondInfo.isin === 'US040114HU71');
    
    if (!bond) {
      console.log('❌ Bond not found');
      return;
    }
    
    console.log('📋 Found bond:', bond.bondInfo.issuer, bond.bondInfo.maturityDate);
    
    // Test calculation
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
      marketPrice: 72.25
    };
    
    console.log('🧮 Testing with price 72.25% (Bloomberg expects YTM 10.88%)...');
    
    const calcResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bondData),
    });
    
    const result = await calcResponse.json();
    console.log('📊 Argentina 2038 results:');
    console.log('   YTM:', result.analytics?.yieldToMaturity || 'undefined');
    console.log('   Duration:', result.analytics?.duration || 'undefined');
    console.log('   Status:', result.status || 'unknown');
    
    if (result.analytics?.yieldToMaturity) {
      const ytm = result.analytics.yieldToMaturity;
      const bloomberg = 10.88;
      const diff = Math.abs(ytm - bloomberg);
      console.log(`   Bloomberg YTM: ${bloomberg}%`);
      console.log(`   Difference: ${diff.toFixed(2)}% (${diff < 1 ? '✅ PASS' : '❌ FAIL'})`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSingleBond();