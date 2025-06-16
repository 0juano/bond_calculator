#!/usr/bin/env tsx

/**
 * Unit test for GD30D bond calculation
 * Expected: Price 69.4% should give YTM around 12%
 */

import { BondCalculatorPro } from './shared/bond-calculator-production';

// GD30D Bond data (Argentina 0.125% 2030) - Real data from saved bonds
const gd30dBond = {
  faceValue: 1000,
  currency: 'USD',
  dayCountConvention: '30/360' as const,
  paymentFrequency: 2,
  cashFlows: [
    { date: '2025-01-09', coupon: 3.600, principal: 80.000, total: 83.600, outstandingNotional: 880.000 },
    { date: '2025-07-09', coupon: 3.300, principal: 80.000, total: 83.300, outstandingNotional: 800.000 },
    { date: '2026-01-09', coupon: 3.000, principal: 80.000, total: 83.000, outstandingNotional: 720.000 },
    { date: '2026-07-09', coupon: 2.700, principal: 80.000, total: 82.700, outstandingNotional: 640.000 },
    { date: '2027-01-09', coupon: 2.400, principal: 80.000, total: 82.400, outstandingNotional: 560.000 },
    { date: '2027-07-09', coupon: 4.900, principal: 80.000, total: 84.900, outstandingNotional: 480.000 },
    { date: '2028-01-09', coupon: 4.200, principal: 80.000, total: 84.200, outstandingNotional: 400.000 },
    { date: '2028-07-09', coupon: 3.500, principal: 80.000, total: 83.500, outstandingNotional: 320.000 },
    { date: '2029-01-09', coupon: 2.800, principal: 80.000, total: 82.800, outstandingNotional: 240.000 },
    { date: '2029-07-09', coupon: 2.100, principal: 80.000, total: 82.100, outstandingNotional: 160.000 },
    { date: '2030-01-09', coupon: 1.400, principal: 80.000, total: 81.400, outstandingNotional: 80.000 },
    { date: '2030-07-09', coupon: 0.700, principal: 80.000, total: 80.700, outstandingNotional: 0.000 }
  ]
};

async function testGD30D() {
  console.log('🧪 Testing GD30D Bond Calculator');
  console.log('================================');
  
  const calculator = new BondCalculatorPro();
  const settlementDate = new Date('2025-06-16');
  const testPrice = 69.4; // 69.4%
  
  console.log(`📊 Test Parameters:`);
  console.log(`   Bond: Argentina 0.125% 2030 (GD30D)`);
  console.log(`   Settlement Date: ${settlementDate.toISOString().split('T')[0]}`);
  console.log(`   Test Price: ${testPrice}%`);
  console.log(`   Expected YTM: ~12%`);
  console.log('');
  
  try {
    // Test the calculation
    const result = calculator.analyze({
      bond: gd30dBond,
      settlementDate: settlementDate,
      price: testPrice
    });
    
    console.log('📈 RESULTS:');
    console.log(`   YTM: ${(result.yields.ytm * 100).toFixed(2)}%`);
    console.log(`   Clean Price: ${result.price.clean.toFixed(2)}%`);
    console.log(`   Dirty Price: ${result.price.dirty.toFixed(2)}%`);
    console.log(`   Duration: ${result.risk.modifiedDuration.toFixed(2)}`);
    console.log('');
    
    // Check if YTM is reasonable (between 0.10 and 0.15 as decimal)
    const ytmPercent = result.yields.ytm * 100;
    const isReasonable = result.yields.ytm >= 0.10 && result.yields.ytm <= 0.15;
    
    console.log('✅ VALIDATION:');
    console.log(`   YTM in expected range (10-15%): ${isReasonable ? 'PASS' : 'FAIL'}`);
    
    if (!isReasonable) {
      console.log(`   ❌ PROBLEM: YTM ${ytmPercent.toFixed(2)}% is outside expected range`);
      
      // Debug information
      console.log('');
      console.log('🔍 DEBUG INFO:');
      console.log(`   Total Cash Flows: ${result.analytics.totalCashFlows}`);
      console.log(`   Average Life: ${result.analytics.averageLife.toFixed(2)} years`);
      
      // Calculate simple approximate yield
      const totalCF = result.analytics.totalCashFlows;
      const currentPrice = (testPrice / 100) * 880; // Assuming 880 outstanding
      const simpleYield = ((totalCF - currentPrice) / currentPrice) / result.analytics.averageLife * 100;
      console.log(`   Simple Approx Yield: ${simpleYield.toFixed(2)}%`);
    }
    
    process.exit(isReasonable ? 0 : 1);
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

testGD30D();