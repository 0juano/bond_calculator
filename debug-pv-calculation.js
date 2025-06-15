// Debug present value calculation for Argentina 2030
import fetch from 'node-fetch';

function yearsBetween(date1, date2) {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return (date2.getTime() - date1.getTime()) / msPerYear;
}

function calculatePV(cashFlows, yieldRate, settlementDate) {
  let pv = 0;
  console.log(`\nCalculating PV with yield: ${(yieldRate * 100).toFixed(3)}%`);
  console.log('Date       | Amount | Years | PV Factor | Present Value');
  console.log('-----------|--------|-------|-----------|-------------');
  
  for (const cf of cashFlows) {
    const years = yearsBetween(settlementDate, new Date(cf.date));
    const pvFactor = Math.pow(1 + yieldRate, -years);
    const cfPV = cf.amount * pvFactor;
    pv += cfPV;
    
    console.log(`${cf.date} | $${cf.amount.toFixed(2).padStart(5)} | ${years.toFixed(3)} | ${pvFactor.toFixed(6)} | $${cfPV.toFixed(2).padStart(8)}`);
  }
  
  console.log('-----------|--------|-------|-----------|-------------');
  console.log(`Total PV: $${pv.toFixed(2)}`);
  return pv;
}

async function debugPVCalculation() {
  try {
    console.log('🔍 Debugging Present Value Calculation for Argentina 2030');
    console.log('🎯 Target: Price 80% = $800, Expected YTM ~10.45%');
    console.log('');

    // Load Argentina 2030 bond
    const response = await fetch('http://localhost:3000/api/bonds/saved');
    const savedBonds = await response.json();
    const bond = savedBonds.bonds.find(b => b.bondInfo.isin === 'US040114HS26');
    
    const settlementDate = new Date('2025-06-14');
    
    // Filter future cash flows
    const futureCFs = bond.cashFlowSchedule
      .filter(cf => new Date(cf.date) > settlementDate)
      .map(cf => ({ date: cf.date, amount: cf.totalPayment }));
    
    console.log(`📊 Future Cash Flows: ${futureCFs.length} payments`);
    console.log(`📅 Settlement Date: ${settlementDate.toISOString().split('T')[0]}`);
    console.log('');
    
    // Test different yield rates
    const testYields = [0.0535, 0.10, 0.1045, 0.11, 0.12];
    const targetPrice = 800;
    
    console.log('📈 Yield Sensitivity Analysis:');
    console.log('Yield  | Present Value | Diff from Target | Notes');
    console.log('-------|---------------|------------------|--------');
    
    for (const testYield of testYields) {
      const pv = calculatePV(futureCFs, testYield, settlementDate);
      const diff = pv - targetPrice;
      const notes = testYield === 0.0535 ? 'Current calc' : 
                   testYield === 0.1045 ? 'Bloomberg target' : '';
      
      console.log(`${(testYield * 100).toFixed(2)}% | $${pv.toFixed(2).padStart(11)} | $${diff.toFixed(2).padStart(14)} | ${notes}`);
    }
    
    console.log('');
    console.log('🔍 Manual YTM Check:');
    console.log('If PV($911 over 2.5 years) = $800, what yield?');
    
    // Manual approximation
    const totalCF = futureCFs.reduce((sum, cf) => sum + cf.amount, 0);
    const avgTime = futureCFs.reduce((sum, cf, i) => {
      const years = yearsBetween(settlementDate, new Date(cf.date));
      return sum + (cf.amount * years);
    }, 0) / totalCF;
    
    const simpleReturn = totalCF / targetPrice;
    const approximateYield = Math.pow(simpleReturn, 1 / avgTime) - 1;
    
    console.log(`   Total CF: $${totalCF.toFixed(2)}`);
    console.log(`   Average Time: ${avgTime.toFixed(2)} years`);
    console.log(`   Simple Return: ${simpleReturn.toFixed(4)} (${((simpleReturn - 1) * 100).toFixed(2)}%)`);
    console.log(`   Approximate YTM: ${(approximateYield * 100).toFixed(2)}%`);
    
    console.log('');
    console.log('🚨 CONCLUSION:');
    if (approximateYield > 0.09) {
      console.log('   Manual calculation confirms YTM should be ~10%+');
      console.log('   Issue is likely in the YTM solver algorithm or iteration bounds');
    } else {
      console.log('   Manual calculation suggests lower yield might be correct');
      console.log('   Need to verify Bloomberg pricing methodology');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPVCalculation();