import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBondSchema } from "@shared/schema";
import { z } from "zod";

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
  return httpServer;
}
