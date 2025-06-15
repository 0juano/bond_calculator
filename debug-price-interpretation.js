// Debug price interpretation - percentage of face vs percentage of outstanding
import fetch from 'node-fetch';

async function debugPriceInterpretation() {
  console.log('🔍 Debugging Price Interpretation for Argentina 2030');
  console.log('🎯 Is 80% based on face value or outstanding principal?');
  console.log('');

  // Load Argentina 2030 bond
  const response = await fetch('http://localhost:3000/api/bonds/saved');
  const savedBonds = await response.json();
  const bond = savedBonds.bonds.find(b => b.bondInfo.isin === 'US040114HS26');
  
  const settlementDate = new Date('2025-06-14');
  
  // Find outstanding principal at settlement
  let outstandingPrincipal = bond.bondInfo.faceValue;
  
  console.log('📊 Cash Flow Analysis:');
  console.log('Date       | Coupon | Principal | Outstanding | Type');
  console.log('-----------|--------|-----------|-------------|------------');
  
  bond.cashFlowSchedule.forEach((cf, i) => {
    const cfDate = new Date(cf.date);
    const isBeforeSettlement = cfDate <= settlementDate;
    
    console.log(`${cf.date} | $${cf.couponPayment.toFixed(2).padStart(5)} | $${cf.principalPayment.toFixed(2).padStart(8)} | $${cf.remainingNotional.toFixed(2).padStart(10)} | ${isBeforeSettlement ? 'PAST' : 'FUTURE'}`);
    
    if (isBeforeSettlement) {
      outstandingPrincipal = cf.remainingNotional;
    }
  });
  
  console.log('');
  console.log(`📈 Key Values:`);
  console.log(`   Original Face Value: $${bond.bondInfo.faceValue}`);
  console.log(`   Outstanding at Settlement: $${outstandingPrincipal}`);
  console.log(`   Settlement Date: ${settlementDate.toISOString().split('T')[0]}`);
  
  // Test different price interpretations
  const scenarios = [
    {
      name: 'Face Value Basis (Current)',
      description: '80% of $1000 face value',
      price: bond.bondInfo.faceValue * 0.80,
      basis: bond.bondInfo.faceValue
    },
    {
      name: 'Outstanding Principal Basis',
      description: `80% of $${outstandingPrincipal} outstanding`,
      price: outstandingPrincipal * 0.80,
      basis: outstandingPrincipal
    }
  ];
  
  console.log('');
  console.log('🧮 Price Interpretation Scenarios:');
  
  for (const scenario of scenarios) {
    console.log(`\\n📊 ${scenario.name}:`);
    console.log(`   Description: ${scenario.description}`);
    console.log(`   Price: $${scenario.price.toFixed(2)}`);
    
    // Get future cash flows
    const futureCFs = bond.cashFlowSchedule
      .filter(cf => new Date(cf.date) > settlementDate)
      .map(cf => ({
        date: cf.date,
        amount: cf.totalPayment,
        years: (new Date(cf.date) - settlementDate) / (365.25 * 24 * 60 * 60 * 1000)
      }));
    
    const totalCF = futureCFs.reduce((sum, cf) => sum + cf.amount, 0);
    const avgLife = futureCFs.reduce((sum, cf) => sum + (cf.amount * cf.years), 0) / totalCF;
    const simpleYield = Math.pow(totalCF / scenario.price, 1 / avgLife) - 1;
    
    console.log(`   Total Future CF: $${totalCF.toFixed(2)}`);
    console.log(`   Return: ${((totalCF / scenario.price - 1) * 100).toFixed(2)}%`);
    console.log(`   Approximate YTM: ${(simpleYield * 100).toFixed(2)}%`);
    
    if (simpleYield * 100 > 9 && simpleYield * 100 < 12) {
      console.log(`   🎯 This matches Bloomberg expectation (~10.45%)!`);
    }
  }
  
  console.log('');
  console.log('🔍 Analysis:');
  console.log('   If Bloomberg quotes prices as % of outstanding principal,');
  console.log('   then 80% would mean a different dollar amount than 80% of face value.');
  console.log('');
  console.log('🚨 Key Question:');
  console.log('   What does "80%" mean in bond market quotes?');
  console.log('   - 80% of original face value ($1000)?');
  console.log('   - 80% of current outstanding principal?');
  console.log('   - Something else?');
}

debugPriceInterpretation();