#!/usr/bin/env tsx

/**
 * Terminal command to fetch live Argentina bond prices from data912.com
 * Usage: npm run prices
 */

import { getLatestPrice, getAllPrices, getCacheStatus } from '../server/data912-service';
import { getBondDisplayInfo } from '../shared/bond-ticker-mapping';

const TARGET_BONDS = ['GD29D', 'GD30D', 'GD35D', 'GD38D', 'GD41D', 'GD46D'];

async function fetchAndDisplayPrices() {
  console.log('🌐 Fetching live Argentina bond prices from data912.com...\n');
  
  try {
    // Get all prices at once
    const allPrices = await getAllPrices();
    const cacheStatus = getCacheStatus();
    
    console.log('📊 ARGENTINA SOVEREIGN BOND PRICES');
    console.log('='.repeat(50));
    
    // Display each bond with price
    for (const symbol of TARGET_BONDS) {
      const price = allPrices.get(symbol);
      const bondInfo = getBondDisplayInfo(symbol);
      
      if (price) {
        console.log(`${symbol.padEnd(6)} │ ${price.toFixed(2).padStart(6)}% │ ${bondInfo?.name || 'Argentina'}`);
      } else {
        console.log(`${symbol.padEnd(6)} │ ${'N/A'.padStart(6)}   │ ${bondInfo?.name || 'Argentina'} (no data)`);
      }
    }
    
    console.log('='.repeat(50));
    console.log(`📈 Live prices: ${allPrices.size}/${TARGET_BONDS.length}`);
    console.log(`⏱️  Cache age: ${cacheStatus.cacheAge}s`);
    console.log(`🚦 Rate limit: ${cacheStatus.callsThisMinute}/20 calls this minute`);
    console.log(`🕒 Timestamp: ${new Date().toLocaleString()}\n`);
    
    // Show individual price details if verbose
    if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
      console.log('📋 DETAILED PRICE DATA:');
      for (const [symbol, price] of allPrices.entries()) {
        console.log(`  ${symbol}: ${price} (${typeof price})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error fetching prices:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔧 Argentina Bond Price Fetcher

Usage:
  npm run prices              # Fetch and display live prices
  npm run prices -- --verbose # Show detailed price data
  npm run prices -- --help    # Show this help

Supported bonds:
  GD29D - Argentina 2029    GD38D - Argentina 2038
  GD30D - Argentina 2030    GD41D - Argentina 2041  
  GD35D - Argentina 2035    GD46D - Argentina 2046

Data source: data912.com
Rate limit: 20 calls per minute, minimum 20s between refreshes
`);
  process.exit(0);
}

// Run the price fetcher
fetchAndDisplayPrices();