/**
 * Test script for bond calculator state management fixes
 * 
 * This script tests the calculator with Argentina 2038 bond
 * to verify the fixes prevent infinite loops and calculation errors
 */

async function testCalculator() {
  const BASE_URL = 'http://localhost:3000';
  
  console.log('🧪 Testing Bond Calculator State Management\n');
  
  // Test bond data - Argentina 2038 (GD38)
  const testBond = {
    issuer: "REPUBLIC OF ARGENTINA",
    cusip: "040114HW37",
    isin: "US040114HW37",
    faceValue: 1000,
    couponRate: 3.625,
    issueDate: "2023-01-09",
    maturityDate: "2038-01-09",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    settlementDays: 3,
    isAmortizing: false,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: false,
    settlementDate: new Date().toISOString().split('T')[0]
  };
  
  // Test cases based on Bloomberg reference data
  const testCases = [
    {
      name: "Price → YTM (Bloomberg reference)",
      input: { marketPrice: 72.25 },
      expected: { ytm: 10.88, spread: 660, duration: 5.01 }
    },
    {
      name: "Price → YTM (Higher price)",  
      input: { marketPrice: 80.00 },
      expected: { ytm: 10.4, spread: 620, duration: 4.8 }
    },
    {
      name: "YTM → Price",
      input: { targetYield: 10.88 },
      expected: { price: 72.25 }
    },
    {
      name: "Spread → Price",
      input: { targetSpread: 660 },
      expected: { price: 72.25 }
    },
    {
      name: "Edge case - Low price",
      input: { marketPrice: 50 },
      expected: { ytm: '>15%' }
    },
    {
      name: "Edge case - High price", 
      input: { marketPrice: 120 },
      expected: { ytm: '<5%' }
    }
  ];
  
  // Run tests
  for (const test of testCases) {
    console.log(`\n📊 Test: ${test.name}`);
    console.log(`   Input: ${JSON.stringify(test.input)}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/bonds/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...testBond, ...test.input })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.log(`   ❌ Error: ${error}`);
        continue;
      }
      
      const result = await response.json();
      const analytics = result.analytics;
      
      console.log(`   ✅ Results:`);
      console.log(`      YTM: ${analytics.yieldToMaturity?.toFixed(2)}%`);
      console.log(`      Price: ${analytics.cleanPrice?.toFixed(2)}`);
      console.log(`      Spread: ${analytics.spread?.toFixed(0)}bp`);
      console.log(`      Duration: ${analytics.duration?.toFixed(2)}`);
      
      // Check against expected values
      if (test.expected.ytm && typeof test.expected.ytm === 'number') {
        const ytmDiff = Math.abs(analytics.yieldToMaturity - test.expected.ytm);
        console.log(`      YTM difference: ${ytmDiff.toFixed(2)}% ${ytmDiff < 0.5 ? '✅' : '⚠️'}`);
      }
      
      if (test.expected.price) {
        const priceDiff = Math.abs(analytics.cleanPrice - test.expected.price);
        console.log(`      Price difference: ${priceDiff.toFixed(2)} ${priceDiff < 1 ? '✅' : '⚠️'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
    }
  }
  
  console.log('\n\n🏁 Test completed');
}

// Check if server is running
fetch('http://localhost:3000/api/health')
  .then(() => {
    console.log('✅ Server is running, starting tests...');
    return testCalculator();
  })
  .catch(() => {
    console.log('❌ Server is not running. Please start the server with: npm run dev');
  });