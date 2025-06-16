import fetch from 'node-fetch';

// Configuration constants
const DATA912_URL = "https://data912.com/live/arg_bonds";
const TARGET_BONDS = new Set(["GD29D", "GD30D", "GD35D", "GD38D", "GD41D", "GD46D"]);
const MIN_REFRESH = 20 * 1000; // 20 seconds in milliseconds
const MAX_CALLS_PER_MIN = 20;

// TypeScript interfaces for API response
interface Data912BondData {
  symbol: string;
  c?: number;        // clean last price
  px_bid?: number;   // bid price
  px_ask?: number;   // ask price
  [key: string]: any; // allow other properties
}

interface Data912Response {
  data?: Data912BondData[];
  [key: string]: any;
}

interface CacheEntry {
  data: Data912BondData[];
  timestamp: number;
}

// Global cache and rate limiting state
let lastSnapshotTs: number = 0;
let snapshotCache: Data912BondData[] | null = null;

// Simple deque implementation for call tracking
class CallWindow {
  private calls: number[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  add(timestamp: number): void {
    this.calls.push(timestamp);
    if (this.calls.length > this.maxSize) {
      this.calls.shift();
    }
  }

  count(): number {
    const now = Date.now();
    // Remove calls older than 1 minute
    while (this.calls.length > 0 && now - this.calls[0] > 60000) {
      this.calls.shift();
    }
    return this.calls.length;
  }
}

const callWindow = new CallWindow(MAX_CALLS_PER_MIN);

/**
 * Check if we're under the rate limit
 */
function isUnderRateLimit(): boolean {
  return callWindow.count() < MAX_CALLS_PER_MIN;
}

/**
 * Fetch fresh data from data912.com API
 * Returns cached data if fresh enough or if rate limited
 */
async function getSnapshot(): Promise<Data912BondData[]> {
  const now = Date.now();

  // Use cached data if it's still fresh
  if (snapshotCache !== null && now - lastSnapshotTs < MIN_REFRESH) {
    console.log('🔄 Data912: Using cached data (fresh)');
    return snapshotCache;
  }

  // If over the rate limit, return stale data instead of erroring
  if (!isUnderRateLimit()) {
    console.warn('⚠️  Data912: Rate limit reached, returning stale data');
    return snapshotCache || [];
  }

  try {
    console.log('🌐 Data912: Fetching fresh data from API');
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(DATA912_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BondCalculator/1.0'
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json() as Data912Response;
    
    // Handle different response formats
    let bondData: Data912BondData[];
    if (Array.isArray(responseData)) {
      bondData = responseData;
    } else if (responseData.data && Array.isArray(responseData.data)) {
      bondData = responseData.data;
    } else {
      throw new Error('Unexpected API response format');
    }

    // Filter for our target bonds only
    const filteredData = bondData.filter(bond => 
      bond.symbol && TARGET_BONDS.has(bond.symbol)
    );

    // Update cache and tracking
    snapshotCache = filteredData;
    lastSnapshotTs = now;
    callWindow.add(now);

    console.log(`✅ Data912: Fetched ${filteredData.length} target bonds`);
    return filteredData;

  } catch (error) {
    console.error('❌ Data912: API fetch failed:', error instanceof Error ? error.message : error);
    
    // Return stale data if available, otherwise empty array
    if (snapshotCache) {
      const staleAge = Math.round((now - lastSnapshotTs) / 1000);
      console.warn(`⚠️  Data912: Using stale data (${staleAge}s old)`);
    }
    
    return snapshotCache || [];
  }
}

/**
 * Get the latest price for a specific bond symbol
 * Returns null if price is unavailable
 */
export async function getLatestPrice(symbol: string): Promise<number | null> {
  if (!TARGET_BONDS.has(symbol)) {
    throw new Error(`Unsupported bond symbol: ${symbol}`);
  }

  const bondData = await getSnapshot();
  const bond = bondData.find(b => b.symbol === symbol);
  
  if (!bond) {
    console.log(`📊 Data912: No data found for ${symbol}`);
    return null;
  }

  // Prioritize clean last price, then mid-price from bid/ask
  if (bond.c && bond.c > 0) {
    console.log(`📊 Data912: ${symbol} price: ${bond.c} (last)`);
    return bond.c;
  }
  
  if (bond.px_bid && bond.px_ask && bond.px_bid > 0 && bond.px_ask > 0) {
    const midPrice = (bond.px_bid + bond.px_ask) / 2;
    console.log(`📊 Data912: ${symbol} price: ${midPrice} (mid)`);
    return midPrice;
  }

  console.log(`📊 Data912: No valid price available for ${symbol}`);
  return null;
}

/**
 * Get prices for all target bonds
 * Returns a map of symbol -> price
 */
export async function getAllPrices(): Promise<Map<string, number>> {
  const bondData = await getSnapshot();
  const priceMap = new Map<string, number>();

  for (const bond of bondData) {
    if (!bond.symbol || !TARGET_BONDS.has(bond.symbol)) continue;

    let price: number | null = null;
    
    if (bond.c && bond.c > 0) {
      price = bond.c;
    } else if (bond.px_bid && bond.px_ask && bond.px_bid > 0 && bond.px_ask > 0) {
      price = (bond.px_bid + bond.px_ask) / 2;
    }

    if (price !== null) {
      priceMap.set(bond.symbol, price);
    }
  }

  console.log(`📊 Data912: Retrieved ${priceMap.size} bond prices`);
  return priceMap;
}

/**
 * Get cache status for monitoring/debugging
 */
export function getCacheStatus(): {
  hasCachedData: boolean;
  cacheAge: number;
  callsThisMinute: number;
  rateLimitOk: boolean;
} {
  const now = Date.now();
  return {
    hasCachedData: snapshotCache !== null,
    cacheAge: snapshotCache ? Math.round((now - lastSnapshotTs) / 1000) : -1,
    callsThisMinute: callWindow.count(),
    rateLimitOk: isUnderRateLimit()
  };
}