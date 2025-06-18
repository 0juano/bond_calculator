#!/usr/bin/env tsx
/**
 * Manual Treasury Rate Update Script
 * 
 * Updates Treasury cache by calling FRED API directly.
 * Useful for development, testing, and manual refreshes.
 * 
 * Usage:
 *   npm run update-treasury
 *   npx tsx scripts/update-treasury.ts
 */

import { TreasuryCache } from '../server/services/TreasuryCache';
import { config } from 'dotenv';

// Load environment variables
config();

async function updateTreasuryRates(): Promise<void> {
  console.log('🚀 Manual Treasury Rate Update Starting...\n');

  try {
    const cache = new TreasuryCache();
    
    // Show current state
    console.log('📊 Current Cache Status:');
    const beforeRates = await cache.getRates();
    const beforeAge = cache.getCacheAgeHours();
    const isStale = cache.isStale();
    
    console.log(`   Last Updated: ${beforeRates.lastUpdated}`);
    console.log(`   Source: ${beforeRates.source}`);
    console.log(`   Age: ${Math.round(beforeAge * 100) / 100} hours`);
    console.log(`   Stale: ${isStale}`);
    console.log(`   Sample Rates: 1M=${(beforeRates.rates as any)['1M']}%, 10Y=${(beforeRates.rates as any)['10Y']}%, 30Y=${(beforeRates.rates as any)['30Y']}%`);
    
    console.log('\n🔄 Fetching fresh rates from FRED...');
    
    // Perform update
    const startTime = Date.now();
    await cache.updateRates();
    const updateDuration = Date.now() - startTime;
    
    // Show updated state
    console.log('\n✅ Update Complete!');
    const afterRates = await cache.getRates();
    const afterAge = cache.getCacheAgeHours();
    
    console.log(`   Duration: ${updateDuration}ms`);
    console.log(`   New Last Updated: ${afterRates.lastUpdated}`);
    console.log(`   New Source: ${afterRates.source}`);
    console.log(`   New Age: ${Math.round(afterAge * 100) / 100} hours`);
    console.log(`   New Sample Rates: 1M=${(afterRates.rates as any)['1M']}%, 10Y=${(afterRates.rates as any)['10Y']}%, 30Y=${(afterRates.rates as any)['30Y']}%`);
    
    // Show changes
    console.log('\n📈 Rate Changes:');
    const tenors: Array<keyof typeof beforeRates.rates> = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
    
    for (const tenor of tenors) {
      const before = (beforeRates.rates as any)[tenor];
      const after = (afterRates.rates as any)[tenor];
      const change = after - before;
      const changeStr = change > 0 ? `+${change.toFixed(3)}` : change.toFixed(3);
      const changeIcon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
      
      console.log(`   ${tenor}: ${before.toFixed(3)}% → ${after.toFixed(3)}% (${changeStr}bp) ${changeIcon}`);
    }
    
    console.log('\n🎯 Treasury cache updated successfully!');

  } catch (error) {
    console.error('\n❌ Treasury update failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('FRED_API_KEY')) {
        console.error('\n💡 Solution: Set your FRED API key:');
        console.error('   1. Get a free key at: https://fredaccount.stlouisfed.org/apikey');
        console.error('   2. Set environment variable: export FRED_API_KEY=your_32_character_key');
        console.error('   3. Or add to .env file: FRED_API_KEY=your_32_character_key');
      } else if (error.message.includes('fetch')) {
        console.error('\n💡 Possible causes:');
        console.error('   - Network connectivity issues');
        console.error('   - FRED API is down');
        console.error('   - Rate limiting from FRED');
      }
    }
    
    process.exit(1);
  }
}

// Run the update
updateTreasuryRates().catch(console.error);