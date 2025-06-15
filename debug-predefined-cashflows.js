// Debug the predefined cash flows issue for Argentina 2030
import fetch from 'node-fetch';

async function debugPredefinedCashFlows() {
  console.log('🔍 Debugging predefined cash flows for Argentina 2030');
  console.log('🎯 Goal: Understand why predefined cash flows return undefined but regenerated ones work\n');
  
  try {
    // Load Argentina 2030 bond
    const response = await fetch('http://localhost:3000/api/bonds/saved');
    const savedBonds = await response.json();
    
    const bondRecord = savedBonds.bonds.find(b => b.bondInfo.isin === 'US040114HS26');
    if (!bondRecord) {
      console.log('❌ Bond not found');
      return;
    }
    
    console.log('📋 Bond Info:');
    console.log('   Issuer:', bondRecord.bondInfo.issuer);
    console.log('   ISIN:', bondRecord.bondInfo.isin);
    console.log('   Maturity:', bondRecord.bondInfo.maturityDate);
    console.log('   Features: Amortizing=' + bondRecord.features.isAmortizing + ', Variable=' + bondRecord.features.isVariableCoupon);
    
    // Examine predefined cash flows
    const cashFlows = bondRecord.cashFlowSchedule;
    console.log(`\n📊 Predefined Cash Flows: ${cashFlows.length} flows`);
    
    const settlementDate = new Date('2025-06-14');
    console.log('📅 Settlement Date:', settlementDate.toISOString().split('T')[0]);
    
    // Filter cash flows after settlement date
    const futureCashFlows = cashFlows.filter(cf => {
      const cfDate = new Date(cf.date);
      return cfDate > settlementDate;
    });
    
    console.log(`💰 Future Cash Flows: ${futureCashFlows.length} flows after settlement`);
    
    if (futureCashFlows.length === 0) {
      console.log('🚨 PROBLEM FOUND: No future cash flows after settlement date!');
      console.log('📋 All cash flows:');
      cashFlows.forEach((cf, i) => {
        const cfDate = new Date(cf.date);
        const isAfterSettlement = cfDate > settlementDate;
        console.log(`   ${i+1}. ${cf.date} | $${cf.totalPayment} | ${isAfterSettlement ? 'FUTURE' : 'PAST'}`);
      });
    } else {
      console.log('✅ Future cash flows exist. First few:');
      futureCashFlows.slice(0, 5).forEach((cf, i) => {
        console.log(`   ${i+1}. ${cf.date} | Coupon: $${cf.couponPayment} | Principal: $${cf.principalPayment} | Total: $${cf.totalPayment}`);
      });
    }
    
    // Check the latest cash flow date
    const latestCashFlow = cashFlows[cashFlows.length - 1];
    const latestDate = new Date(latestCashFlow.date);
    console.log(`\n📅 Latest cash flow: ${latestCashFlow.date} (${latestDate > settlementDate ? 'FUTURE' : 'PAST'})`);
    console.log(`💰 Final payment: $${latestCashFlow.totalPayment} (Principal: $${latestCashFlow.principalPayment})`);
    
    // Test calculation with explicit debugging
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
    
    console.log('\n🧮 Testing calculation with predefined cash flows...');
    const calcRequest = {
      ...bondData,
      settlementDate: "2025-06-14",
      marketPrice: 80.0000
    };
    
    const calcResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calcRequest),
    });
    
    const result = await calcResponse.json();
    console.log('📊 Calculation result status:', result.status);
    console.log('📊 Analytics object:', result.analytics ? Object.keys(result.analytics) : 'undefined');
    
    if (result.analytics) {
      console.log('📊 Analytics values:');
      Object.entries(result.analytics).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
    
    // Check if there's an error message
    if (result.error) {
      console.log('❌ Error in result:', result.error);
    }
    
    // Test with a different settlement date that's definitely in the past
    console.log('\n🧪 Testing with past settlement date (2025-01-01)...');
    const pastRequest = {
      ...bondData,
      settlementDate: "2025-01-01",
      marketPrice: 80.0000
    };
    
    const pastResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pastRequest),
    });
    
    if (pastResponse.ok) {
      const pastResult = await pastResponse.json();
      console.log('📊 Past settlement results:');
      console.log('   YTM:', pastResult.analytics?.yieldToMaturity);
      console.log('   Duration:', pastResult.analytics?.duration);
    }
    
  } catch (error) {
    console.error('💥 Debug crashed:', error.message);
  }
}

debugPredefinedCashFlows();