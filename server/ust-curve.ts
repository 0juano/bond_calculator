/**
 * US Treasury Yield Curve Fetcher
 * 
 * Fetches the latest daily Treasury par-yield curve from FRED (Federal Reserve Economic Data)
 * and provides utilities for interpolation and spread calculations.
 */

export interface USTCurveData {
  recordDate: string; // Date when Treasury rates were recorded (market date)
  tenors: Record<string, number>; // tenor -> yield %
  marketTime?: string; // When the Treasury actually published this data
}

export interface USTCurvePoint {
  tenor: string;
  maturityYears: number;
  yieldPercent: number;
}

// FRED API configuration
const FRED_API_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_API_KEY = process.env.FRED_API_KEY; // Get free key from fred.stlouisfed.org

// Mock data removed - real FRED API key required

// FRED series IDs for Treasury Constant Maturity rates
const FRED_SERIES_MAP: Record<string, { name: string; years: number }> = {
  'DGS1MO': { name: '1 Month', years: 1/12 },
  'DGS3MO': { name: '3 Month', years: 3/12 },
  'DGS6MO': { name: '6 Month', years: 0.5 },
  'DGS1': { name: '1 Year', years: 1 },
  'DGS2': { name: '2 Year', years: 2 },
  'DGS3': { name: '3 Year', years: 3 },
  'DGS5': { name: '5 Year', years: 5 },
  'DGS7': { name: '7 Year', years: 7 },
  'DGS10': { name: '10 Year', years: 10 },
  'DGS20': { name: '20 Year', years: 20 },
  'DGS30': { name: '30 Year', years: 30 },
};

/**
 * Fetch a single rate from FRED API
 */
async function fetchFREDRate(seriesId: string, controller: AbortController): Promise<{ value: number; date: string; lastUpdated?: string } | null> {
  try {
    // First get the series metadata to get the actual publication time
    const seriesUrl = `https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json`;
    const seriesResponse = await fetch(seriesUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BondCalculator/1.0',
      },
    });

    let lastUpdated: string | undefined;
    if (seriesResponse.ok) {
      const seriesData = await seriesResponse.json();
      if (seriesData.seriess && seriesData.seriess[0]?.last_updated) {
        lastUpdated = seriesData.seriess[0].last_updated;
      }
    }

    // Then get the actual data
    const url = `${FRED_API_BASE}?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BondCalculator/1.0',
      },
    });

    if (!response.ok) {
      console.warn(`FRED API error for ${seriesId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.observations || data.observations.length === 0) {
      console.warn(`No data for FRED series ${seriesId}`);
      return null;
    }

    const latest = data.observations[0];
    const value = parseFloat(latest.value);
    
    // FRED uses '.' for missing values
    if (isNaN(value) || latest.value === '.') {
      console.warn(`Invalid/missing value for ${seriesId}: ${latest.value}`);
      return null;
    }

    return {
      value,
      date: latest.date,
      lastUpdated
    };

  } catch (error) {
    console.warn(`Error fetching FRED series ${seriesId}:`, error);
    return null;
  }
}

/**
 * Fetches the latest US Treasury yield curve from FRED API
 * @returns Promise<USTCurveData> - The curve data with record date and tenor yields
 * @throws Error if API call fails, data is invalid, or no API key configured
 */
export async function fetchUSTCurve(): Promise<USTCurveData> {
  // Check if FRED API key is available
  if (!FRED_API_KEY || FRED_API_KEY.length !== 32) {
    const keyLength = FRED_API_KEY ? FRED_API_KEY.length : 0;
    throw new Error(
      `FRED API key required but not configured (found ${keyLength} chars, need 32). ` +
      `Get a free API key at: https://fredaccount.stlouisfed.org/apikey ` +
      `Then set: export FRED_API_KEY=your_32_character_key`
    );
  }

  try {
    console.log('Fetching UST yield curve from FRED API...');
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for multiple requests

    // Fetch all rates in parallel
    const ratePromises = Object.entries(FRED_SERIES_MAP).map(async ([seriesId, mapping]) => {
      const result = await fetchFREDRate(seriesId, controller);
      return { seriesId, mapping, result };
    });

    const results = await Promise.all(ratePromises);
    clearTimeout(timeoutId);

    // Process results
    const tenors: Record<string, number> = {};
    let latestDate = '';
    let latestPublicationTime = '';
    let validTenorCount = 0;

    for (const { mapping, result } of results) {
      if (result) {
        tenors[mapping.name] = result.value;
        validTenorCount++;
        
        // Track the latest date across all series
        if (!latestDate || result.date > latestDate) {
          latestDate = result.date;
        }

        // Track the latest publication time (when Treasury actually published the data)
        if (result.lastUpdated && (!latestPublicationTime || result.lastUpdated > latestPublicationTime)) {
          latestPublicationTime = result.lastUpdated;
        }
      }
    }

    // Sanity checks
    if (validTenorCount < 8) {
      throw new Error(`Insufficient tenor data: only ${validTenorCount} valid tenors found (need at least 8)`);
    }

    const oneMonth = tenors['1 Month'];
    const thirtyYear = tenors['30 Year'];

    if (oneMonth && oneMonth < 0) {
      throw new Error(`Invalid 1-month yield: ${oneMonth}% (negative rates unexpected)`);
    }

    if (thirtyYear && thirtyYear > 20) {
      throw new Error(`Invalid 30-year yield: ${thirtyYear}% (exceeds 20% threshold)`);
    }

    console.log(`✓ UST curve fetched from FRED: ${latestDate} (${validTenorCount} tenors)`);

    // Format the actual Treasury publication time
    let marketTime = `${latestDate}`;
    if (latestPublicationTime) {
      // Parse FRED timestamp format: "2025-06-06 15:16:47-05"
      try {
        const pubDate = new Date(latestPublicationTime.replace(/(-\d{2})$/, ':00$1:00'));
        const easternTime = pubDate.toLocaleString('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const buenosAiresTime = pubDate.toLocaleString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        marketTime = `${latestDate} published ${easternTime} ET (${buenosAiresTime} Buenos Aires)`;
      } catch (error) {
        marketTime = `${latestDate} (Published: ${latestPublicationTime})`;
      }
    }

    return {
      recordDate: latestDate,
      tenors,
      marketTime,
    };

  } catch (error) {
    console.error('Failed to fetch UST curve from FRED:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`UST curve unavailable: ${errorMessage}`);
  }
}

/**
 * Converts curve data to sorted array format for easier interpolation
 */
export function curveToPoints(curve: USTCurveData): USTCurvePoint[] {
  const seriesMapping = Object.fromEntries(
    Object.entries(FRED_SERIES_MAP).map(([_, mapping]) => [mapping.name, mapping])
  );

  return Object.entries(curve.tenors)
    .map(([tenor, yieldPercent]) => ({
      tenor,
      maturityYears: seriesMapping[tenor].years,
      yieldPercent,
    }))
    .sort((a, b) => a.maturityYears - b.maturityYears);
}

/**
 * Linear interpolation of Treasury yield for a given maturity
 * @param curve - The UST curve data
 * @param maturityYears - Target maturity in years
 * @returns Interpolated yield percentage
 */
export function interpolateUSTYield(curve: USTCurveData, maturityYears: number): number {
  const points = curveToPoints(curve);
  
  // Handle edge cases
  if (maturityYears <= points[0].maturityYears) {
    return points[0].yieldPercent;
  }
  
  if (maturityYears >= points[points.length - 1].maturityYears) {
    return points[points.length - 1].yieldPercent;
  }

  // Find bounding points for interpolation
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    
    if (maturityYears >= p1.maturityYears && maturityYears <= p2.maturityYears) {
      // Linear interpolation
      const weight = (maturityYears - p1.maturityYears) / (p2.maturityYears - p1.maturityYears);
      return p1.yieldPercent + weight * (p2.yieldPercent - p1.yieldPercent);
    }
  }

  throw new Error(`Unable to interpolate yield for maturity ${maturityYears} years`);
}

/**
 * Calculate spread to Treasury for a given bond yield and maturity
 * @param bondYieldPercent - Bond yield in percentage (e.g., 5.25 for 5.25%)
 * @param maturityYears - Bond maturity in years
 * @param curve - UST curve data
 * @returns Spread in basis points
 */
export function calculateSpreadToTreasury(
  bondYieldPercent: number, 
  maturityYears: number, 
  curve: USTCurveData
): number {
  const treasuryYield = interpolateUSTYield(curve, maturityYears);
  const spreadPercent = bondYieldPercent - treasuryYield;
  return spreadPercent * 100; // Convert to basis points
}

/**
 * Format curve data for display
 */
export function formatCurveForDisplay(curve: USTCurveData): string {
  const points = curveToPoints(curve);
  let output = `\nUS Treasury Par-Yield Curve (${curve.recordDate}):\n`;
  
  for (const point of points) {
    output += `${point.tenor.padEnd(10)} ${point.yieldPercent.toFixed(3)}%\n`;
  }
  
  return output;
} 