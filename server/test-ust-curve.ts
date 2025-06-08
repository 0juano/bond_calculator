/**
 * Test script for UST curve fetcher
 * Run with: npm run tsx server/test-ust-curve.ts
 */

import { 
  fetchUSTCurve, 
  formatCurveForDisplay, 
  interpolateUSTYield,
  calculateSpreadToTreasury,
  type USTCurveData 
} from './ust-curve';

async function testUSTCurve() {
  console.log('🧪 Testing UST Curve Fetcher...\n');

  try {
    // Test 1: Basic fetch
    console.log('Test 1: Fetching UST curve data...');
    const curve = await fetchUSTCurve();
    console.log('✅ Fetch successful');
    
    // Test 2: Display formatting
    console.log('\nTest 2: Formatted curve display...');
    console.log(formatCurveForDisplay(curve));
    
    // Test 3: Interpolation tests
    console.log('\nTest 3: Yield interpolation tests...');
    
    const testMaturities = [0.5, 1.5, 4.0, 8.5, 15.0];
    
    for (const maturity of testMaturities) {
      try {
        const interpolatedYield = interpolateUSTYield(curve, maturity);
        console.log(`  ${maturity}Y: ${interpolatedYield.toFixed(3)}%`);
      } catch (error) {
        console.log(`  ${maturity}Y: Error - ${error instanceof Error ? error.message : error}`);
      }
    }
    
    // Test 4: Spread calculations
    console.log('\nTest 4: Spread calculations...');
    
    const bondScenarios = [
      { yieldPercent: 5.50, maturityYears: 2, description: '2Y Corporate at 5.50%' },
      { yieldPercent: 6.25, maturityYears: 10, description: '10Y Corporate at 6.25%' },
      { yieldPercent: 7.00, maturityYears: 30, description: '30Y Corporate at 7.00%' },
    ];
    
    for (const scenario of bondScenarios) {
      try {
        const spread = calculateSpreadToTreasury(
          scenario.yieldPercent, 
          scenario.maturityYears, 
          curve
        );
        console.log(`  ${scenario.description}: +${spread.toFixed(0)}bp`);
      } catch (error) {
        console.log(`  ${scenario.description}: Error - ${error instanceof Error ? error.message : error}`);
      }
    }
    
    // Test 5: Data validation
    console.log('\nTest 5: Data validation...');
    const tenorCount = Object.keys(curve.tenors).length;
    console.log(`  Tenor count: ${tenorCount} (expected ≥8)`);
    
    const oneMonth = curve.tenors['1 Month'];
    const thirtyYear = curve.tenors['30 Year'];
    console.log(`  1M yield: ${oneMonth}% (should be ≥0)`);
    console.log(`  30Y yield: ${thirtyYear}% (should be ≤20%)`);
    
    if (tenorCount >= 8) console.log('  ✅ Tenor count OK');
    else console.log('  ❌ Insufficient tenors');
    
    if (oneMonth >= 0) console.log('  ✅ 1M yield OK');
    else console.log('  ❌ 1M yield invalid');
    
    if (thirtyYear <= 20) console.log('  ✅ 30Y yield OK');
    else console.log('  ❌ 30Y yield invalid');
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the test
testUSTCurve(); 