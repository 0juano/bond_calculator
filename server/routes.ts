import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBondSchema } from "@shared/schema";
import { z } from "zod";
import { fetchUSTCurve, type USTCurveData } from "./ust-curve";
import { BondStorageService } from "./bond-storage";
import { BondJsonUtils } from "../shared/bond-definition";
import { getLatestPrice, getAllPrices, getCacheStatus } from "./data912-service";
import { getData912Symbol, getBloombergReferencePrice, isData912Supported } from "../shared/bond-ticker-mapping";
import rateLimit from "express-rate-limit";
import { TreasuryCache } from "./services/TreasuryCache";

// In-memory cache for UST curve data
let ustCurveCache: { data: USTCurveData; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function registerRoutes(app: Express): Promise<Server> {
  // DEBUG: Test duplicate checking endpoint
  app.post("/api/bonds/test-duplicate", async (req, res) => {
    try {
      // Test with a known duplicate ISIN
      const testBond = {
        metadata: {
          id: "test_123",
          name: "Test Bond",
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          version: "1.0" as const,
          source: "USER_CREATED" as const
        },
        bondInfo: {
          issuer: "TEST ISSUER",
          faceValue: 1000,
          couponRate: 5,
          issueDate: "2024-01-15",
          maturityDate: "2029-01-15",
          paymentFrequency: 2,
          dayCountConvention: "30/360",
          currency: "USD",
          settlementDays: 3,
          isin: "ARARGE3209S6" // Known duplicate ISIN
        },
        features: {
          isAmortizing: false,
          isCallable: false,
          isPuttable: false,
          isVariableCoupon: false,
          isInflationLinked: false
        },
        cashFlowSchedule: []
      };
      
      console.log('🧪 Testing duplicate check with known ISIN:', testBond.bondInfo.isin);
      
      // Get all bonds to see what we're comparing against
      const allBonds = await BondStorageService.getAllBondsWithMetadata();
      console.log('📋 Found bonds for comparison:', allBonds.map(b => ({issuer: b.bondInfo.issuer, isin: b.bondInfo.isin})));
      
      const duplicateCheck = await BondStorageService.checkForDuplicates(testBond);
      
      res.json({
        testBondISIN: testBond.bondInfo.isin,
        existingBonds: allBonds.map(b => ({issuer: b.bondInfo.issuer, isin: b.bondInfo.isin})),
        duplicateCheck: {
          isDuplicate: duplicateCheck.isDuplicate,
          duplicateType: duplicateCheck.duplicateType,
          message: duplicateCheck.message,
          existingBond: duplicateCheck.existingBond
        }
      });
    } catch (error) {
      console.error("Duplicate test error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Test failed" });
    }
  });

  // Get live bond price from data912.com
  app.get("/api/bonds/live-price/:symbol", async (req, res) => {
    console.log(`🔍 DEBUG: Live price endpoint hit for symbol: ${req.params.symbol}`);
    try {
      const { symbol } = req.params;
      
      console.log(`📊 Live price request for: ${symbol}`);
      
      // Get live price from data912
      const livePrice = await getLatestPrice(symbol);
      const cacheStatus = getCacheStatus();
      
      // Fallback to Bloomberg reference price if live price unavailable
      const fallbackPrice = getBloombergReferencePrice(symbol);
      
      const response = {
        symbol,
        livePrice,
        fallbackPrice,
        priceSource: livePrice ? 'live' : (fallbackPrice ? 'reference' : 'unavailable'),
        price: livePrice || fallbackPrice,
        cacheStatus,
        timestamp: new Date().toISOString()
      };
      
      if (!response.price) {
        return res.status(404).json({
          error: `No price available for ${symbol}`,
          ...response
        });
      }
      
      res.json(response);
      
    } catch (error) {
      console.error("Live price fetch error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch live price" 
      });
    }
  });

  // Get live prices for all supported bonds
  app.get("/api/bonds/live-prices", async (req, res) => {
    try {
      console.log('📊 Bulk live prices request');
      
      const allPrices = await getAllPrices();
      const cacheStatus = getCacheStatus();
      
      // Include fallback prices for bonds without live data
      const pricesWithFallback = new Map(allPrices);
      
      // Add Bloomberg reference prices for any missing bonds
      const supportedSymbols = ['GD29D', 'GD30D', 'GD35D', 'GD38D', 'GD41D', 'GD46D'];
      for (const symbol of supportedSymbols) {
        if (!pricesWithFallback.has(symbol)) {
          const fallbackPrice = getBloombergReferencePrice(symbol);
          if (fallbackPrice) {
            pricesWithFallback.set(symbol, fallbackPrice);
          }
        }
      }
      
      const response = {
        prices: Object.fromEntries(pricesWithFallback),
        liveCount: allPrices.size,
        totalCount: pricesWithFallback.size,
        cacheStatus,
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
      
    } catch (error) {
      console.error("Bulk live prices fetch error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch live prices" 
      });
    }
  });

  // Check if bond supports live pricing
  app.post("/api/bonds/check-live-support", async (req, res) => {
    try {
      const { ticker, isin, issuer } = req.body;
      
      const data912Symbol = getData912Symbol(ticker, isin, issuer);
      const isSupported = isData912Supported(ticker, isin, issuer);
      const fallbackPrice = data912Symbol ? getBloombergReferencePrice(data912Symbol) : null;
      
      res.json({
        isSupported,
        data912Symbol,
        fallbackPrice,
        canUseLivePrice: isSupported
      });
      
    } catch (error) {
      console.error("Live support check error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to check live price support" 
      });
    }
  });

  // Save bond to repository (different from export - this stores in repo for later use)
  app.post("/api/bonds/save", async (req, res) => {
    try {
      const { bondData, cashFlows, category = 'user_created', allowDuplicates = false } = req.body;
      console.log(`🔧 Save request - allowDuplicates: ${allowDuplicates}, issuer: ${bondData?.issuer}, isin: ${bondData?.isin}`);
      
      // Create clean bond definition
      const cleanBond = BondJsonUtils.fromLegacyBond(bondData, cashFlows);
      console.log(`🔧 Clean bond created - issuer: ${cleanBond.bondInfo.issuer}, isin: ${cleanBond.bondInfo.isin}`);
      
      // Save to repository file system with duplicate checking
      const result = await BondStorageService.saveBond(cleanBond, category, allowDuplicates);
      console.log(`🔧 Save result - success: ${result.success}, isDuplicate: ${result.duplicateCheck?.isDuplicate}`);
      
      if (result.success) {
        res.json({
          success: true,
          message: "Bond saved to repository",
          filename: result.filename,
          bondId: cleanBond.metadata.id,
          path: result.path
        });
      } else if (result.duplicateCheck?.isDuplicate) {
        // Return specific duplicate error with 409 Conflict status
        res.status(409).json({
          success: false,
          error: result.error,
          duplicateType: result.duplicateCheck.duplicateType,
          existingBond: result.duplicateCheck.existingBond,
          isDuplicate: true
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || "Failed to save bond to repository"
        });
      }
    } catch (error) {
      console.error("Bond save error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to save bond" 
      });
    }
  });

  // Load saved bond from repository
  app.get("/api/bonds/saved/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const { category = 'user_created' } = req.query;
      
      const bond = await BondStorageService.loadBond(filename, category as string);
      
      if (!bond) {
        return res.status(404).json({ error: "Saved bond not found" });
      }
      
      res.json(bond);
    } catch (error) {
      console.error("Saved bond load error:", error);
      res.status(500).json({ error: "Failed to load saved bond" });
    }
  });

  // List all saved bonds
  app.get("/api/bonds/saved", async (req, res) => {
    try {
      const bonds = await BondStorageService.getAllBondsWithMetadata();
      res.json({
        bonds,
        count: bonds.length,
        categories: {
          user_created: bonds.filter(b => b.category === 'user_created').length,
          golden_bonds: bonds.filter(b => b.category === 'golden_bonds').length,
          imported: bonds.filter(b => b.category === 'imported').length,
        }
      });
    } catch (error) {
      console.error("Saved bonds list error:", error);
      res.status(500).json({ error: "Failed to list saved bonds" });
    }
  });

  // Delete saved bond
  app.delete("/api/bonds/saved/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const { category = 'user_created' } = req.query;
      
      const success = await BondStorageService.deleteBond(filename, category as string);
      
      if (success) {
        res.json({ success: true, message: "Bond deleted successfully" });
      } else {
        res.status(500).json({ success: false, error: "Failed to delete bond" });
      }
    } catch (error) {
      console.error("Bond delete error:", error);
      res.status(500).json({ error: "Failed to delete bond" });
    }
  });

  // Bond building endpoint
  app.post("/api/bonds/build", async (req, res) => {
    try {
      // Ensure storage has latest UST curve cache
      storage.setUSTCurveCache(ustCurveCache);
      
      const bondData = insertBondSchema.parse(req.body);
      const result = await storage.buildBond(bondData);
      res.json(result);
    } catch (error) {
      console.error("Bond build error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Invalid bond data" 
      });
    }
  });

  // Bond calculation endpoint (for real-time price/yield calculations)
  app.post("/api/bonds/calculate", async (req, res) => {
    try {
      // Ensure storage has latest UST curve cache
      storage.setUSTCurveCache(ustCurveCache);
      
      console.log('📊 Calculate request received with predefinedCashFlows?', !!(req.body.predefinedCashFlows && req.body.predefinedCashFlows.length > 0));
      console.log('📊 Number of predefined cash flows:', (req.body.predefinedCashFlows || []).length);
      
      const bondData = insertBondSchema.parse(req.body);
      console.log('📊 Parsed bond data has predefinedCashFlows?', !!(bondData.predefinedCashFlows && bondData.predefinedCashFlows.length > 0));
      
      const result = await storage.buildBond(bondData);
      
      // Return just the analytics for faster calculations
      res.json({
        analytics: result.analytics,
        calculationTime: result.buildTime,
        status: 'success'
      });
    } catch (error) {
      console.error("Bond calculation error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Calculation failed" 
      });
    }
  });

  // Bond validation endpoint
  app.post("/api/bonds/validate", async (req, res) => {
    try {
      const bondData = insertBondSchema.parse(req.body);
      const result = await storage.validateBond(bondData);
      res.json(result);
    } catch (error) {
      console.error("Bond validation error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Invalid bond data" 
      });
    }
  });

  // Get golden bond by ID
  app.get("/api/bonds/golden/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const goldenBond = await storage.getGoldenBond(id);
      
      if (!goldenBond) {
        return res.status(404).json({ error: "Golden bond not found" });
      }
      
      res.json(goldenBond);
    } catch (error) {
      console.error("Golden bond fetch error:", error);
      res.status(500).json({ error: "Failed to fetch golden bond" });
    }
  });

  // Build golden bond by ID
  app.post("/api/bonds/golden/:id/build", async (req, res) => {
    try {
      // Ensure storage has latest UST curve cache
      storage.setUSTCurveCache(ustCurveCache);
      
      const { id } = req.params;
      console.log(`🎲 Building golden bond: ${id}`);
      const goldenBond = await storage.getGoldenBond(id);
      
      if (!goldenBond) {
        return res.status(404).json({ error: "Golden bond not found" });
      }
      
      const result = await storage.buildBond(goldenBond);
      res.json(result);
    } catch (error) {
      console.error("Golden bond build error:", error);
      res.status(500).json({ error: "Failed to build golden bond" });
    }
  });

  // List all golden bonds
  app.get("/api/bonds/golden", async (req, res) => {
    try {
      const goldenBonds = await storage.listGoldenBonds();
      res.json(goldenBonds);
    } catch (error) {
      console.error("Golden bonds list error:", error);
      res.status(500).json({ error: "Failed to fetch golden bonds" });
    }
  });

  // Get US Treasury yield curve - Updated to use TreasuryCache
  app.get("/api/ust-curve", async (req, res) => {
    try {
      console.log('📊 Serving UST curve from Treasury cache...');
      
      const cache = new TreasuryCache();
      const treasuryData = await cache.getRates();
      const ageHours = cache.getCacheAgeHours();
      const isStale = cache.isStale();
      
      // Convert TreasuryCache format to UST curve format for backward compatibility
      const recordDate = new Date(treasuryData.lastUpdated).toISOString().split('T')[0];
      const convertedData: USTCurveData = {
        recordDate: recordDate,
        tenors: {
          '1 Month': (treasuryData.rates as any)['1M'],
          '3 Month': (treasuryData.rates as any)['3M'],
          '6 Month': (treasuryData.rates as any)['6M'],
          '1 Year': (treasuryData.rates as any)['1Y'],
          '2 Year': (treasuryData.rates as any)['2Y'],
          '3 Year': (treasuryData.rates as any)['3Y'],
          '5 Year': (treasuryData.rates as any)['5Y'],
          '7 Year': (treasuryData.rates as any)['7Y'],
          '10 Year': (treasuryData.rates as any)['10Y'],
          '20 Year': (treasuryData.rates as any)['20Y'],
          '30 Year': (treasuryData.rates as any)['30Y']
        },
        marketTime: `${recordDate} (cached from ${treasuryData.source})`
      };

      // Prepare response with cache metadata
      const response = {
        ...convertedData,
        cached: true,
        cacheAge: Math.round(ageHours * 60), // Convert to minutes for backward compatibility
        stale: isStale,
        source: treasuryData.source,
        cacheVersion: treasuryData.cacheVersion,
        ...(isStale && {
          warning: `Treasury data is ${Math.round(ageHours)} hours old - consider updating`,
          staleDays: Math.round(ageHours / 24 * 10) / 10
        })
      };

      console.log(`✓ Served UST curve from cache (${treasuryData.source}, ${Math.round(ageHours * 100) / 100}h old)`);
      res.json(response);
      
    } catch (error) {
      console.error("Treasury cache read error:", error);
      
      // Fallback to original FRED API if cache completely fails
      try {
        console.log('⚠️ Cache failed, falling back to direct FRED API...');
        
        const curveData = await fetchUSTCurve();
        
        res.json({
          ...curveData,
          cached: false,
          fallback: true,
          warning: "Using direct FRED API due to cache failure"
        });
        
      } catch (fredError) {
        console.error("Both cache and FRED API failed:", fredError);
        
        res.status(503).json({ 
          error: "Treasury curve service unavailable",
          details: error instanceof Error ? error.message : "Cache read failed",
          suggestion: "Treasury curve data is temporarily unavailable. Bond spread calculations may be limited.",
          fallbackFailed: fredError instanceof Error ? fredError.message : "FRED API also failed"
        });
      }
    }
  });

  // Get Treasury rates in modern format (for future frontend use)
  app.get("/api/treasury-rates", async (req, res) => {
    try {
      console.log('📊 Serving Treasury rates from cache...');
      
      const cache = new TreasuryCache();
      const treasuryData = await cache.getRates();
      const ageHours = cache.getCacheAgeHours();
      const isStale = cache.isStale();
      
      // Return Treasury data in modern format
      const response = {
        rates: treasuryData.rates,
        metadata: {
          lastUpdated: treasuryData.lastUpdated,
          source: treasuryData.source,
          cacheVersion: treasuryData.cacheVersion,
          ageHours: Math.round(ageHours * 100) / 100,
          stale: isStale,
          cached: true
        },
        ...(isStale && {
          warning: `Treasury data is ${Math.round(ageHours)} hours old`,
          staleDays: Math.round(ageHours / 24 * 10) / 10
        })
      };

      console.log(`✓ Served Treasury rates from cache (${treasuryData.source}, ${Math.round(ageHours * 100) / 100}h old)`);
      res.json(response);
      
    } catch (error) {
      console.error("Treasury rates fetch error:", error);
      res.status(503).json({ 
        error: "Treasury rates service unavailable",
        details: error instanceof Error ? error.message : "Cache read failed"
      });
    }
  });

  // Create a new bond (save to storage)
  app.post("/api/bonds", async (req, res) => {
    try {
      const bondData = insertBondSchema.parse(req.body);
      const bond = await storage.createBond(bondData);
      res.json(bond);
    } catch (error) {
      console.error("Bond creation error:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Invalid bond data" 
      });
    }
  });

  // Get bond by ID
  app.get("/api/bonds/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid bond ID" });
      }
      
      const bond = await storage.getBond(id);
      if (!bond) {
        return res.status(404).json({ error: "Bond not found" });
      }
      
      res.json(bond);
    } catch (error) {
      console.error("Bond fetch error:", error);
      res.status(500).json({ error: "Failed to fetch bond" });
    }
  });

  // ============================
  // ADMIN ENDPOINTS - Treasury Cache Management
  // ============================

  // Rate limiter for admin endpoints (1 request per 15 minutes)
  const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1, // Limit each IP to 1 request per 15 minutes
    message: {
      error: "Treasury update rate limited",
      retryAfter: "15 minutes",
      details: "Treasury rates don't change frequently - please wait before updating again"
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Admin authentication middleware
  const requireAdminKey = (req: any, res: any, next: any) => {
    const adminKey = process.env.TREASURY_ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'] || req.query.adminKey;

    if (!adminKey) {
      return res.status(500).json({ 
        error: "Admin functionality not configured",
        details: "TREASURY_ADMIN_KEY environment variable not set"
      });
    }

    if (!providedKey || providedKey !== adminKey) {
      return res.status(401).json({ 
        error: "Unauthorized",
        details: "Valid admin key required in X-Admin-Key header or adminKey query parameter"
      });
    }

    next();
  };

  // Treasury Cache Status Endpoint
  app.get("/api/admin/treasury-cache-status", adminRateLimit, requireAdminKey, async (req, res) => {
    try {
      const cache = new TreasuryCache();
      const rates = await cache.getRates();
      const ageHours = cache.getCacheAgeHours();
      const isStale = cache.isStale();
      
      // Calculate next update time based on cache hours
      const cacheHours = parseInt(process.env.TREASURY_CACHE_HOURS || '24');
      const nextUpdateMs = Date.now() + (cacheHours * 60 * 60 * 1000) - (ageHours * 60 * 60 * 1000);
      const nextUpdate = new Date(nextUpdateMs).toISOString();

      res.json({
        status: "ok",
        cache: {
          lastUpdated: rates.lastUpdated,
          source: rates.source,
          version: rates.cacheVersion,
          ageHours: Math.round(ageHours * 100) / 100,
          stale: isStale,
          nextUpdate: nextUpdate,
          tenorCount: Object.keys(rates.rates).length
        },
        config: {
          cacheHours: cacheHours,
          staleDays: parseInt(process.env.TREASURY_STALE_DAYS || '3')
        },
        sampleRates: {
          '1M': (rates.rates as any)['1M'],
          '10Y': (rates.rates as any)['10Y'],
          '30Y': (rates.rates as any)['30Y']
        }
      });

    } catch (error) {
      console.error("Treasury cache status error:", error);
      res.status(500).json({ 
        error: "Failed to get cache status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Treasury Cache Update Endpoint
  app.post("/api/admin/update-treasury-rates", adminRateLimit, requireAdminKey, async (req, res) => {
    try {
      console.log("🔧 Admin-triggered Treasury rate update starting...");
      
      const cache = new TreasuryCache();
      
      // Get current state
      const beforeRates = await cache.getRates();
      const beforeAge = cache.getCacheAgeHours();
      
      // Perform update
      await cache.updateRates();
      
      // Get updated state
      const afterRates = await cache.getRates();
      const afterAge = cache.getCacheAgeHours();
      
      console.log("✅ Admin-triggered Treasury rate update completed");
      
      res.json({
        status: "success",
        message: "Treasury rates updated successfully",
        before: {
          lastUpdated: beforeRates.lastUpdated,
          source: beforeRates.source,
          ageHours: Math.round(beforeAge * 100) / 100
        },
        after: {
          lastUpdated: afterRates.lastUpdated,
          source: afterRates.source,
          ageHours: Math.round(afterAge * 100) / 100
        },
        sampleRates: {
          '1M': (afterRates.rates as any)['1M'],
          '10Y': (afterRates.rates as any)['10Y'],
          '30Y': (afterRates.rates as any)['30Y']
        },
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error("Treasury rate update error:", error);
      res.status(500).json({ 
        error: "Failed to update Treasury rates",
        details: error instanceof Error ? error.message : "Unknown error",
        suggestion: "Check FRED_API_KEY environment variable and network connectivity"
      });
    }
  });

  const httpServer = createServer(app);
  
  // Pre-load UST curve data on startup
  loadUSTCurveOnStartup();
  
  return httpServer;
}

/**
 * Pre-loads UST curve data on server startup
 * Non-blocking - server will start even if curve fetch fails
 */
async function loadUSTCurveOnStartup(): Promise<void> {
  try {
    console.log('🚀 Pre-loading UST curve data on startup...');
    const curveData = await fetchUSTCurve();
    
    ustCurveCache = {
      data: curveData,
      timestamp: Date.now(),
    };
    
    // Update storage with UST curve cache
    storage.setUSTCurveCache(ustCurveCache);
    
    console.log('✅ UST curve data pre-loaded successfully');
    
    // Log curve summary for verification
    const tenorCount = Object.keys(curveData.tenors).length;
    const oneMth = curveData.tenors['1 Month']?.toFixed(3);
    const tenYr = curveData.tenors['10 Year']?.toFixed(3);
    const thirtyYr = curveData.tenors['30 Year']?.toFixed(3);
    
    console.log(`   Date: ${curveData.recordDate}`);
    console.log(`   Tenors: ${tenorCount} points`);
    console.log(`   1M: ${oneMth}% | 10Y: ${tenYr}% | 30Y: ${thirtyYr}%`);
    
  } catch (error) {
    console.warn('⚠️  Failed to pre-load UST curve data:', error instanceof Error ? error.message : error);
    console.warn('   Server will start without curve data - it will be fetched on first API call');
  }
}
