import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-temp";
import { insertBondSchema } from "@shared/schema";
import { z } from "zod";
import { fetchUSTCurve, type USTCurveData } from "./ust-curve";

// In-memory cache for UST curve data
let ustCurveCache: { data: USTCurveData; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function registerRoutes(app: Express): Promise<Server> {
  // Bond building endpoint
  app.post("/api/bonds/build", async (req, res) => {
    try {
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
      const { id } = req.params;
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
