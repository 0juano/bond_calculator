// Debug YTM calculation differences between working and broken bonds
import fetch from 'node-fetch';

async function debugYTMComparison() {
  try {
    console.log('🔍 Debugging YTM Calculation Differences');
    console.log('🎯 Comparing Argentina 2030 (broken) vs Argentina 2038 (working)');
    console.log('');

    // Load bonds
    const response = await fetch('http://localhost:3000/api/bonds/saved');
    const savedBonds = await response.json();
    
    const gd30 = savedBonds.bonds.find(b => b.bondInfo.isin === 'US040114HS26'); // 2030
    const gd38 = savedBonds.bonds.find(b => b.bondInfo.isin === 'US040114HU71'); // 2038
    
    console.log('📋 Bond Comparison:');
    console.log('GD30 (2030):', {
      maturity: gd30.bondInfo.maturityDate,
      couponRate: gd30.bondInfo.couponRate,
      cashFlows: gd30.cashFlowSchedule.length,
      amortizing: gd30.features.isAmortizing,
      variableCoupon: gd30.features.isVariableCoupon
    });
    console.log('GD38 (2038):', {
      maturity: gd38.bondInfo.maturityDate,
      couponRate: gd38.bondInfo.couponRate,
      cashFlows: gd38.cashFlowSchedule.length,
      amortizing: gd38.features.isAmortizing,
      variableCoupon: gd38.features.isVariableCoupon
    });
    console.log('');

    // Test both bonds at similar distressed prices
    const testCases = [
      { bond: gd30, name: 'GD30 (2030)', price: 80, expectedYTM: 10.45 },
      { bond: gd38, name: 'GD38 (2038)', price: 72.25, expectedYTM: 10.88 }
    ];

    console.log('📊 YTM Calculation Comparison:');
    console.log('Bond        | Price% | Actual YTM | Expected YTM | Diff  | Status');
    console.log('------------|--------|------------|--------------|-------|--------');

    for (const testCase of testCases) {
      const bondData = {
        ...testCase.bond.bondInfo,
        isAmortizing: testCase.bond.features.isAmortizing,
        isCallable: testCase.bond.features.isCallable,
        isPuttable: testCase.bond.features.isPuttable,
        isVariableCoupon: testCase.bond.features.isVariableCoupon,
        amortizationSchedule: testCase.bond.schedules.amortizationSchedule || [],
        callSchedule: testCase.bond.schedules.callSchedule || [],
        putSchedule: testCase.bond.schedules.putSchedule || [],
        couponRateChanges: testCase.bond.schedules.couponRateChanges || [],
        predefinedCashFlows: testCase.bond.cashFlowSchedule,
        settlementDate: '2025-06-14',
        marketPrice: testCase.price
      };

      const calcResponse = await fetch('http://localhost:3000/api/bonds/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bondData),
      });

      const result = await calcResponse.json();
      const actualYTM = result.analytics?.yieldToMaturity || 0;
      const diff = Math.abs(actualYTM - testCase.expectedYTM);
      const status = diff < 1 ? '✅ OK' : '❌ BROKEN';

      console.log(`${testCase.name.padEnd(11)} | ${testCase.price.toString().padStart(5)}% | ${actualYTM.toFixed(2).padStart(9)}% | ${testCase.expectedYTM.toFixed(2).padStart(11)}% | ${diff.toFixed(2).padStart(4)} | ${status}`);
    }

    console.log('');
    
    // Deep dive into GD30 cash flow analysis
    console.log('🔍 GD30 (2030) Deep Analysis:');
    
    const settlementDate = new Date('2025-06-14');
    let futureCFs = 0;
    let totalPrincipal = 0;
    let totalCoupons = 0;
    
    console.log('Future Cash Flows after settlement 2025-06-14:');
    gd30.cashFlowSchedule.forEach((cf, i) => {
      const cfDate = new Date(cf.date);
      if (cfDate > settlementDate) {
        futureCFs += cf.totalPayment;
        totalPrincipal += cf.principalPayment;
        totalCoupons += cf.couponPayment;
        
        const years = (cfDate - settlementDate) / (365.25 * 24 * 60 * 60 * 1000);
        console.log(`   ${cf.date} | $${cf.totalPayment.toFixed(2)} | Years: ${years.toFixed(2)}`);
      }
    });
    
    console.log('');
    console.log('📈 GD30 Summary:');
    console.log(`   Future Cash Flows: $${futureCFs.toFixed(2)}`);
    console.log(`   Future Principal: $${totalPrincipal.toFixed(2)}`);
    console.log(`   Future Coupons: $${totalCoupons.toFixed(2)}`);
    console.log(`   Price (80%): $${800}`);
    console.log(`   Total Return: ${(futureCFs / 800).toFixed(4)} (${((futureCFs / 800 - 1) * 100).toFixed(2)}%)`);
    console.log(`   Average Life: ~${(gd30.cashFlowSchedule.length / 2).toFixed(1)} years`);
    
    console.log('');
    console.log('🚨 ANALYSIS:');
    console.log('   The issue is likely in the present value calculation or cash flow timing.');
    console.log('   A bond paying $911 over ~2.5 years for an $800 investment should yield ~11%, not 5%.');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugYTMComparison();