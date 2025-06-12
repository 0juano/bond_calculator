import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBondSchema } from "@shared/schema";
import { z } from "zod";
import { fetchUSTCurve, type USTCurveData } from "./ust-curve";
import { BondStorageService } from "./bond-storage";
import { BondJsonUtils } from "../shared/bond-definition";

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

  // Get US Treasury yield curve
  app.get("/api/ust-curve", async (req, res) => {
    try {
      const now = Date.now();
      
      // Check if we have cached data that's still fresh
      if (ustCurveCache && (now - ustCurveCache.timestamp) < CACHE_DURATION) {
        console.log('✓ Serving cached UST curve data');
        return res.json({
          ...ustCurveCache.data,
          cached: true,
          cacheAge: Math.round((now - ustCurveCache.timestamp) / 1000 / 60), // minutes
        });
      }

      // Fetch fresh data
      const curveData = await fetchUSTCurve();
      
      // Update cache
      ustCurveCache = {
        data: curveData,
        timestamp: now,
      };

      // Update storage with UST curve cache
      storage.setUSTCurveCache(ustCurveCache);

      res.json({
        ...curveData,
        cached: false,
      });
      
    } catch (error) {
      console.error("UST curve fetch error:", error);
      
      // If we have stale cached data, serve it with a warning
      if (ustCurveCache) {
        const staleAge = Math.round((Date.now() - ustCurveCache.timestamp) / 1000 / 60);
        console.log(`⚠️ Serving stale UST curve data (${staleAge} minutes old)`);
        
        return res.json({
          ...ustCurveCache.data,
          cached: true,
          stale: true,
          cacheAge: staleAge,
          warning: "Using cached data due to API unavailability",
        });
      }
      
      res.status(503).json({ 
        error: error instanceof Error ? error.message : "UST curve service unavailable",
        suggestion: "Treasury curve data is temporarily unavailable. Bond spread calculations may be limited.",
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
