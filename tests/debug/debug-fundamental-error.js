// Find the fundamental error in YTM calculation
import fetch from 'node-fetch';

async function testExternalYTMCalculation() {
  console.log('🔍 Testing External YTM Calculation vs Our Calculator');
  console.log('🎯 Using simple external formula to verify expected YTM');
  console.log('');

  // Load Argentina 2030 bond
  const response = await fetch('http://localhost:3000/api/bonds/saved');
  const savedBonds = await response.json();
  const bond = savedBonds.bonds.find(b => b.bondInfo.isin === 'US040114HS26');
  
  const settlementDate = new Date('2025-06-14');
  
  // Get future cash flows
  const futureCFs = bond.cashFlowSchedule
    .filter(cf => new Date(cf.date) > settlementDate)
    .map(cf => ({
      date: cf.date,
      amount: cf.totalPayment,
      years: (new Date(cf.date) - settlementDate) / (365.25 * 24 * 60 * 60 * 1000)
    }));

  console.log('📊 Future Cash Flows:');
  console.log('Date       | Amount | Years');
  console.log('-----------|--------|-------');
  futureCFs.forEach(cf => {
    console.log(`${cf.date} | $${cf.amount.toFixed(2).padStart(6)} | ${cf.years.toFixed(3)}`);
  });
  
  const totalCF = futureCFs.reduce((sum, cf) => sum + cf.amount, 0);
  const price = 800; // 80% of $1000
  
  console.log('');
  console.log(`📈 Basic Analysis:`);
  console.log(`   Price: $${price}`);
  console.log(`   Total Cash Flows: $${totalCF.toFixed(2)}`);
  console.log(`   Profit: $${(totalCF - price).toFixed(2)}`);
  console.log(`   Total Return: ${((totalCF / price) * 100).toFixed(2)}%`);
  
  // Calculate weighted average life
  const weightedTime = futureCFs.reduce((sum, cf) => sum + (cf.amount * cf.years), 0);
  const avgLife = weightedTime / totalCF;
  console.log(`   Average Life: ${avgLife.toFixed(2)} years`);
  
  // Simple approximation
  const simpleYield = Math.pow(totalCF / price, 1 / avgLife) - 1;
  console.log(`   Simple Approximation: ${(simpleYield * 100).toFixed(2)}%`);
  
  // Newton-Raphson method manually
  console.log('');
  console.log('🧮 Manual Newton-Raphson YTM Calculation:');
  
  function calculatePV(yield_) {
    return futureCFs.reduce((pv, cf) => {
      return pv + cf.amount / Math.pow(1 + yield_, cf.years);
    }, 0);
  }
  
  function calculateDuration(yield_) {
    let duration = 0;
    let pv = 0;
    for (const cf of futureCFs) {
      const cfPV = cf.amount / Math.pow(1 + yield_, cf.years);
      duration += cfPV * cf.years;
      pv += cfPV;
    }
    return duration / pv;
  }
  
  // Manual iteration
  let yield_ = 0.10; // Start with 10%
  const targetPV = price;
  
  console.log('Iter | Yield  | PV     | Error  | Duration');
  console.log('-----|--------|--------|--------|----------');
  
  for (let i = 0; i < 10; i++) {
    const pv = calculatePV(yield_);
    const error = pv - targetPV;
    const duration = calculateDuration(yield_);
    
    console.log(`${i.toString().padStart(4)} | ${(yield_ * 100).toFixed(2)}% | $${pv.toFixed(2).padStart(6)} | $${error.toFixed(2).padStart(6)} | ${duration.toFixed(3)}`);
    
    if (Math.abs(error) < 0.01) {
      console.log(`✅ Converged at ${(yield_ * 100).toFixed(3)}%`);
      break;
    }
    
    // Newton-Raphson step
    const derivative = -duration * pv;
    yield_ = yield_ - error / derivative;
    
    // Bounds check
    yield_ = Math.max(-0.5, Math.min(2.0, yield_));
  }
  
  console.log('');
  console.log('🎯 Expected Result: ~10.45% (Bloomberg)');
  console.log(`📊 Manual Calculation: ${(yield_ * 100).toFixed(2)}%`);
  
  // Test our calculator
  console.log('');
  console.log('🔧 Testing Our Calculator:');
  
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
    marketPrice: 80
  };

  const calcResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bondData),
  });

  const result = await calcResponse.json();
  const ourYTM = result.analytics?.yieldToMaturity || 0;
  
  console.log(`📊 Our Calculator: ${ourYTM.toFixed(2)}%`);
  console.log(`📊 Manual Calc: ${(yield_ * 100).toFixed(2)}%`);
  console.log(`📊 Difference: ${Math.abs(ourYTM - yield_ * 100).toFixed(2)}%`);
  
  if (Math.abs(ourYTM - yield_ * 100) > 0.1) {
    console.log('🚨 SIGNIFICANT DIFFERENCE - Calculator has a bug!');
  } else {
    console.log('✅ Calculator matches manual calculation');
  }
}

testExternalYTMCalculation();