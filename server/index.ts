import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { 
  initBackendMonitoring, 
  requestMonitoringMiddleware,
  errorHandlerMiddleware 
} from "./middleware/monitoring";
import { logger } from "./middleware/logging";

// Initialize monitoring before anything else
initBackendMonitoring();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add monitoring middleware
app.use(requestMonitoringMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Use enhanced error handler with monitoring
  app.use(errorHandlerMiddleware);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on configurable port (default 3000)
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    log(`serving on port ${port}`);
    logger.logSystemMetrics(); // Log initial system metrics
    
    // Set up periodic system metrics logging
    setInterval(() => {
      logger.logSystemMetrics();
    }, 60000); // Every minute
  });
})();
