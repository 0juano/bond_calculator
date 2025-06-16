#!/usr/bin/env tsx

/**
 * Detailed terminal command to fetch live Argentina bond prices from data912.com
 * Shows bid, ask, last, and which price we're using
 * Usage: npm run prices:detail
 */

import fetch from 'node-fetch';
import { getCacheStatus } from '../server/data912-service';
import { getBondDisplayInfo } from '../shared/bond-ticker-mapping';

const DATA912_URL = "https://data912.com/live/arg_bonds";
const TARGET_BONDS = ['GD29D', 'GD30D', 'GD35D', 'GD38D', 'GD41D', 'GD46D'];

interface BondData {
  symbol: string;
  c?: number;        // clean last price
  px_bid?: number;   // bid price
  px_ask?: number;   // ask price
  [key: string]: any;
}

async function fetchDetailedPrices() {
  console.log('🌐 Fetching detailed Argentina bond prices from data912.com...\n');
  
  try {
    // Fetch directly to get all price details
    const response = await fetch(DATA912_URL, {
      headers: { 'User-Agent': 'BondCalculator/1.0' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseData = await response.json() as any;
    const bondData: BondData[] = Array.isArray(responseData) ? responseData : responseData.data || [];
    
    console.log('📊 ARGENTINA SOVEREIGN BOND PRICES - DETAILED VIEW');
    console.log('='.repeat(80));
    console.log('Symbol │   Bid   │   Ask   │  Last   │ Mid(B/A) │  USED   │ Type   │ Spread');
    console.log('─'.repeat(80));
    
    for (const symbol of TARGET_BONDS) {
      const bond = bondData.find(b => b.symbol === symbol);
      
      if (bond) {
        const bid = bond.px_bid || 0;
        const ask = bond.px_ask || 0;
        const last = bond.c || 0;
        const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : 0;
        const spread = bid > 0 && ask > 0 ? (ask - bid) : 0;
        
        // Determine which price we use (following service logic)
        let usedPrice = 0;
        let priceType = 'N/A';
        
        if (last > 0) {
          usedPrice = last;
          priceType = 'LAST';
        } else if (mid > 0) {
          usedPrice = mid;
          priceType = 'MID';
        }
        
        console.log(
          `${symbol.padEnd(6)} │` +
          `${bid > 0 ? bid.toFixed(2).padStart(7) : '    N/A'}% │` +
          `${ask > 0 ? ask.toFixed(2).padStart(7) : '    N/A'}% │` +
          `${last > 0 ? last.toFixed(2).padStart(7) : '    N/A'}% │` +
          `${mid > 0 ? mid.toFixed(2).padStart(8) : '     N/A'}% │` +
          `${usedPrice > 0 ? usedPrice.toFixed(2).padStart(7) : '    N/A'}% │` +
          `${priceType.padEnd(6)} │` +
          `${spread > 0 ? spread.toFixed(2) : 'N/A'}`
        );
      } else {
        console.log(`${symbol.padEnd(6)} │ No data available`);
      }
    }
    
    console.log('='.repeat(80));
    
    // Summary statistics
    const validBonds = bondData.filter(b => 
      TARGET_BONDS.includes(b.symbol) && (b.c > 0 || (b.px_bid > 0 && b.px_ask > 0))
    );
    
    const lastPrices = validBonds.filter(b => b.c > 0).length;
    const bidAskPairs = validBonds.filter(b => b.px_bid > 0 && b.px_ask > 0).length;
    
    console.log(`\n📈 Summary:`);
    console.log(`   • Bonds with last price: ${lastPrices}/${TARGET_BONDS.length}`);
    console.log(`   • Bonds with bid/ask: ${bidAskPairs}/${TARGET_BONDS.length}`);
    console.log(`   • Total with pricing: ${validBonds.length}/${TARGET_BONDS.length}`);
    console.log(`   • Timestamp: ${new Date().toLocaleString()}`);
    
    console.log(`\n💡 Price Selection Logic:`);
    console.log(`   1. LAST - Use clean last traded price (preferred)`);
    console.log(`   2. MID  - Use (bid + ask) / 2 if no last price`);
    console.log(`   3. N/A  - No valid price available\n`);
    
  } catch (error) {
    console.error('❌ Error fetching prices:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the detailed price fetcher
fetchDetailedPrices();