/**
 * Treasury Rate Caching Service
 * 
 * Provides server-side caching of US Treasury yield curve data with:
 * - Complete 11-tenor curve support for cubic-spline interpolation
 * - Type safety with strict Tenor union types
 * - Zod schema validation to prevent cache corruption
 * - Atomic writes to prevent race conditions
 * - Graceful fallbacks and sanity validation
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';

// Complete 11-tenor curve required for cubic-spline interpolation
export type Tenor = '1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | '7Y' | '10Y' | '20Y' | '30Y';

export type TreasuryRates = {
  [K in Tenor]: number;
};

export interface TreasuryCacheData {
  rates: TreasuryRates;
  lastUpdated: string;
  source: string;
  cacheVersion: string;
}

// Zod schema for Treasury cache validation
const TreasuryRatesSchema = z.object({
  rates: z.record(z.number().min(0.1).max(20)).refine(
    (rates) => {
      // Ensure all required tenors are present
      const requiredTenors: Tenor[] = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
      return requiredTenors.every(tenor => tenor in rates);
    },
    { message: "Missing required tenor(s) in Treasury rates" }
  ),
  lastUpdated: z.string(),
  source: z.string(),
  cacheVersion: z.string()
});

// FRED series mapping for all 11 tenors
const FRED_SERIES_MAP: Record<string, { name: Tenor; years: number }> = {
  'DGS1MO': { name: '1M', years: 1/12 },
  'DGS3MO': { name: '3M', years: 3/12 },
  'DGS6MO': { name: '6M', years: 0.5 },
  'DGS1': { name: '1Y', years: 1 },
  'DGS2': { name: '2Y', years: 2 },
  'DGS3': { name: '3Y', years: 3 },
  'DGS5': { name: '5Y', years: 5 },
  'DGS7': { name: '7Y', years: 7 },
  'DGS10': { name: '10Y', years: 10 },
  'DGS20': { name: '20Y', years: 20 },
  'DGS30': { name: '30Y', years: 30 },
};

export class TreasuryCache {
  private cachePath: string;
  private defaultPath: string;
  private tempDir: string;

  constructor() {
    // Handle both development and production environments
    let dataDir: string;
    
    if (process.env.NODE_ENV === 'production') {
      // In production, create data directory in writable location
      dataDir = path.join('/tmp', 'treasury-data');
    } else {
      // In development, use current working directory
      dataDir = path.join(process.cwd() || '.', 'server', 'data');
    }
    
    this.cachePath = path.join(dataDir, 'treasury-rates.json');
    this.defaultPath = path.join(dataDir, 'default-treasury-rates.json');
    this.tempDir = path.join(dataDir, 'temp');
    
    // Ensure data directory exists in production
    if (process.env.NODE_ENV === 'production') {
      this.ensureDataDirectoryExists();
    }
  }

  /**
   * Get Treasury rates from cache with fallback to defaults
   */
  async getRates(): Promise<TreasuryCacheData> {
    try {
      // Try to read from cache first
      const cacheData = await this.readCacheFile(this.cachePath);
      if (cacheData) {
        return cacheData;
      }

      console.warn('Treasury cache file not found, falling back to defaults');
      
      // Fallback to default rates
      const defaultData = await this.readCacheFile(this.defaultPath);
      if (defaultData) {
        return defaultData;
      }

      // Last resort: hardcoded fallback rates
      console.warn('Default Treasury rates file not found, using hardcoded fallbacks');
      return this.getHardcodedFallback();

    } catch (error) {
      console.error('Error reading Treasury cache:', error);
      return this.getHardcodedFallback();
    }
  }

  /**
   * Update Treasury rates by fetching from FRED API
   */
  async updateRates(): Promise<void> {
    const fredApiKey = process.env.FRED_API_KEY;
    
    if (!fredApiKey || fredApiKey.length !== 32) {
      throw new Error('FRED_API_KEY required for Treasury rate updates');
    }

    try {
      console.log('Fetching Treasury rates from FRED API...');
      
      // Fetch all rates in parallel
      const ratePromises = Object.entries(FRED_SERIES_MAP).map(async ([seriesId, mapping]) => {
        const result = await this.fetchFREDRate(seriesId, fredApiKey);
        return { tenor: mapping.name, result };
      });

      const results = await Promise.all(ratePromises);

      // Build rates object
      const rates = {} as TreasuryRates;
      let validTenorCount = 0;

      for (const { tenor, result } of results) {
        if (result !== null) {
          (rates as any)[tenor] = result;
          validTenorCount++;
        }
      }

      // Validate we have sufficient data
      if (validTenorCount < 8) {
        throw new Error(`Insufficient tenor data: only ${validTenorCount} valid tenors (need at least 8)`);
      }

      // Sanity validation
      this.validateRates(rates);

      // Prepare cache data
      const cacheData: TreasuryCacheData = {
        rates: rates,
        lastUpdated: new Date().toISOString(),
        source: 'FRED',
        cacheVersion: '1.0'
      };

      // Atomic write to cache
      await this.atomicWrite(cacheData);
      
      console.log(`✓ Treasury rates updated successfully (${validTenorCount} tenors)`);

    } catch (error) {
      console.error('Failed to update Treasury rates:', error);
      throw error;
    }
  }

  /**
   * Check if cache is stale based on environment configuration
   */
  isStale(): boolean {
    try {
      const cacheHours = parseInt(process.env.TREASURY_CACHE_HOURS || '24');
      const staleThresholdMs = cacheHours * 60 * 60 * 1000;
      
      // Check if cache file exists and get its age
      const stats = require('fs').statSync(this.cachePath);
      const ageMs = Date.now() - stats.mtime.getTime();
      
      return ageMs > staleThresholdMs;
    } catch (error) {
      // If can't check file, consider it stale
      return true;
    }
  }

  /**
   * Get cache age in hours
   */
  getCacheAgeHours(): number {
    try {
      const stats = require('fs').statSync(this.cachePath);
      const ageMs = Date.now() - stats.mtime.getTime();
      return ageMs / (1000 * 60 * 60);
    } catch (error) {
      return Infinity;
    }
  }

  /**
   * Private: Read and validate cache file
   */
  private async readCacheFile(filePath: string): Promise<TreasuryCacheData | null> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsedData = JSON.parse(fileContent);
      
      // Validate with Zod schema
      const validatedData = TreasuryRatesSchema.parse(parsedData);
      
      // Additional sanity validation
      this.validateRates(validatedData.rates as TreasuryRates);
      
      return validatedData as TreasuryCacheData;
    } catch (error) {
      console.warn(`Failed to read cache file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Private: Atomic write using temp file + rename
   */
  private async atomicWrite(data: TreasuryCacheData): Promise<void> {
    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });
    
    // Write to temporary file first
    const tempFile = path.join(this.tempDir, `treasury-rates-${Date.now()}.json`);
    
    try {
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      
      // Atomic rename to final location
      await fs.rename(tempFile, this.cachePath);
      
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempFile);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Private: Fetch single rate from FRED API
   */
  private async fetchFREDRate(seriesId: string, apiKey: string): Promise<number | null> {
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'BondCalculator/1.0' },
        signal: AbortSignal.timeout(10000) // 10s timeout per request
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

      return value;

    } catch (error) {
      console.warn(`Error fetching FRED series ${seriesId}:`, error);
      return null;
    }
  }

  /**
   * Private: Validate rates are within reasonable bounds
   */
  private validateRates(rates: TreasuryRates): void {
    const allTenors: Tenor[] = ['1M', '3M', '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y', '20Y', '30Y'];
    
    for (const tenor of allTenors) {
      const rate = (rates as any)[tenor];
      
      if (typeof rate !== 'number' || isNaN(rate)) {
        throw new Error(`Invalid rate for ${tenor}: ${rate}`);
      }
      
      if (rate < 0.1 || rate > 20) {
        throw new Error(`Rate for ${tenor} outside valid range (0.1-20%): ${rate}%`);
      }
    }

    // Additional curve sanity checks
    if ((rates as any)['1M'] > (rates as any)['30Y'] + 5) {
      throw new Error('Inverted yield curve beyond reasonable bounds');
    }
  }

  /**
   * Private: Hardcoded fallback rates (extremely conservative)
   */
  private getHardcodedFallback(): TreasuryCacheData {
    return {
      rates: {
        '1M': 4.50,
        '3M': 4.60,
        '6M': 4.70,
        '1Y': 4.20,
        '2Y': 4.10,
        '3Y': 4.05,
        '5Y': 4.00,
        '7Y': 4.15,
        '10Y': 4.20,
        '20Y': 4.35,
        '30Y': 4.40
      },
      lastUpdated: '2025-01-01T00:00:00.000Z',
      source: 'HARDCODED_FALLBACK',
      cacheVersion: '1.0'
    };
  }

  /**
   * Private: Ensure data directory exists and initialize with default data
   */
  private ensureDataDirectoryExists(): void {
    try {
      const fs = require('fs');
      
      // Create data directory structure
      const dataDir = path.dirname(this.cachePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Create temp directory
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
      }
      
      // Initialize with default data if cache doesn't exist
      if (!fs.existsSync(this.cachePath)) {
        const defaultData = this.getHardcodedFallback();
        fs.writeFileSync(this.cachePath, JSON.stringify(defaultData, null, 2));
        console.log('✓ Initialized Treasury cache with default data');
      }
      
    } catch (error) {
      console.warn('Warning: Could not initialize data directory:', error);
    }
  }
}