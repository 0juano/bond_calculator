/**
 * Bond ticker mapping service
 * Maps between internal bond identifiers and external data sources
 */

// Map internal bond tickers/names to data912.com symbols
const INTERNAL_TO_DATA912: Record<string, string> = {
  // Argentina ARGENT series bonds
  'ARGENT 1 29': 'GD29D',    // Argentina 1% 2029
  'ARGENT 0125 30': 'GD30D', // Argentina 0.125% 2030  
  'ARGENT 4125 35': 'GD35D', // Argentina 4.125% 2035
  'ARGENT 5 38': 'GD38D',    // Argentina 5% 2038
  'ARGENT 0125 41': 'GD41D', // Argentina 0.125% 2041
  'ARGENT 0125 46': 'GD46D', // Argentina 0.125% 2046
};

// Reverse mapping for data912 symbols to internal tickers
const DATA912_TO_INTERNAL: Record<string, string> = Object.fromEntries(
  Object.entries(INTERNAL_TO_DATA912).map(([internal, data912]) => [data912, internal])
);

// Map by ISIN codes (more reliable for identification)
const ISIN_TO_DATA912: Record<string, string> = {
  'US040114HU71': 'GD38D', // Argentina 5% 2038
  'US040114HX11': 'GD29D', // Argentina 1% 2029
  'US040114HS26': 'GD30D', // Argentina 0.125% 2030
  'US040114HT09': 'GD35D', // Argentina 4.125% 2035
  'US040114HV64': 'GD41D', // Argentina 0.125% 2041
  'US040114HW47': 'GD46D', // Argentina 0.125% 2046
};

// Reverse ISIN mapping
const DATA912_TO_ISIN: Record<string, string> = Object.fromEntries(
  Object.entries(ISIN_TO_DATA912).map(([isin, data912]) => [data912, isin])
);

// Bloomberg reference prices (fallback when live data unavailable)
// Updated to current market levels based on data912.com live prices (June 2025)
const BLOOMBERG_REFERENCE_PRICES: Record<string, number> = {
  'GD29D': 74.93,  // Argentina 2029 (updated from data912)
  'GD30D': 69.40,  // Argentina 2030 (updated from data912)
  'GD35D': 68.40,  // Argentina 2035 (updated from data912)
  'GD38D': 73.10,  // Argentina 2038 (updated from data912)
  'GD41D': 63.40,  // Argentina 2041 (updated from data912)
  'GD46D': 65.78,  // Argentina 2046 (updated from data912)
};

/**
 * Get data912 symbol from internal bond identifier
 */
export function getData912Symbol(
  internalTicker?: string, 
  isin?: string,
  issuer?: string
): string | null {
  // Try ISIN first (most reliable)
  if (isin && ISIN_TO_DATA912[isin]) {
    return ISIN_TO_DATA912[isin];
  }

  // Try internal ticker
  if (internalTicker && INTERNAL_TO_DATA912[internalTicker]) {
    return INTERNAL_TO_DATA912[internalTicker];
  }

  // For Argentina bonds, try to parse from name patterns
  if (issuer?.includes('ARGENTINA') && internalTicker) {
    // Handle various Argentina bond naming patterns
    const tickerUpper = internalTicker.toUpperCase();
    
    // Direct GD pattern
    if (tickerUpper.match(/GD\d{2}/)) {
      const match = tickerUpper.match(/GD(\d{2})/);
      if (match) {
        const symbol = `GD${match[1]}D`;
        return DATA912_TO_INTERNAL[symbol] ? symbol : null;
      }
    }
    
    // ARGENT pattern
    if (tickerUpper.includes('ARGENT')) {
      return INTERNAL_TO_DATA912[internalTicker] || null;
    }
  }

  return null;
}

/**
 * Get internal ticker from data912 symbol
 */
export function getInternalTicker(data912Symbol: string): string | null {
  return DATA912_TO_INTERNAL[data912Symbol] || null;
}

/**
 * Get ISIN from data912 symbol
 */
export function getISINFromData912(data912Symbol: string): string | null {
  return DATA912_TO_ISIN[data912Symbol] || null;
}

/**
 * Check if a bond is supported by data912
 */
export function isData912Supported(
  internalTicker?: string,
  isin?: string, 
  issuer?: string
): boolean {
  return getData912Symbol(internalTicker, isin, issuer) !== null;
}

/**
 * Get Bloomberg reference price for a data912 symbol
 */
export function getBloombergReferencePrice(data912Symbol: string): number | null {
  return BLOOMBERG_REFERENCE_PRICES[data912Symbol] || null;
}

/**
 * Get all supported data912 symbols
 */
export function getSupportedData912Symbols(): string[] {
  return Object.keys(DATA912_TO_INTERNAL);
}

/**
 * Get bond display info from data912 symbol
 */  
export function getBondDisplayInfo(data912Symbol: string): {
  ticker: string;
  name: string;
  maturityYear: string;
} | null {
  const internalTicker = getInternalTicker(data912Symbol);
  if (!internalTicker) return null;

  // Parse maturity year from symbol
  const yearMatch = data912Symbol.match(/GD(\d{2})/);
  const maturityYear = yearMatch ? `20${yearMatch[1]}` : 'Unknown';

  return {
    ticker: data912Symbol,
    name: `Argentina ${maturityYear}`,
    maturityYear
  };
}

/**
 * Debug function to list all mappings
 */
export function debugMappings(): void {
  console.log('🔍 Bond Ticker Mappings:');
  console.log('Internal -> Data912:', INTERNAL_TO_DATA912);
  console.log('ISIN -> Data912:', ISIN_TO_DATA912);
  console.log('Bloomberg Prices:', BLOOMBERG_REFERENCE_PRICES);
}