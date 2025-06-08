import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { Request, Response, NextFunction } from "express";

/**
 * Initialize Sentry monitoring for backend
 */
export function initBackendMonitoring() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling for performance analysis
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    integrations: [
      nodeProfilingIntegration(),
    ],
  });
}

/**
 * Express middleware for request monitoring
 */
export function requestMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = performance.now();
  
  // Set user context if available (for future auth)
  Sentry.setUser({
    ip_address: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  // Add request context
  Sentry.setTag('route', req.path);
  Sentry.setTag('method', req.method);
  
  // Monitor response completion
  res.on('finish', () => {
    const duration = performance.now() - startTime;
    
    // Log slow requests
    if (duration > 1000) {
      Sentry.addBreadcrumb({
        message: 'Slow request detected',
        category: 'performance',
        level: 'warning',
        data: {
          route: req.path,
          method: req.method,
          duration: Math.round(duration),
          statusCode: res.statusCode,
        },
      });
    }
    
    // Set response context
    Sentry.setTag('status_code', res.statusCode.toString());
  });
  
  next();
}

/**
 * Monitor bond calculation performance
 */
export function monitorCalculation<T>(
  calculationType: string,
  bondId: string | number,
  calculationFn: () => T
): T {
  const startTime = performance.now();
  
  return Sentry.startSpan(
    {
      name: `bond_calculation_${calculationType}`,
      op: 'calculation',
      attributes: {
        'bond.id': bondId.toString(),
        'calculation.type': calculationType,
      },
    },
    () => {
      try {
        const result = calculationFn();
        const duration = performance.now() - startTime;
        
        // Track slow calculations
        if (duration > 200) {
          Sentry.addBreadcrumb({
            message: 'Slow calculation completed',
            category: 'performance',
            level: 'warning',
            data: {
              bondId,
              calculationType,
              duration: Math.round(duration),
            },
          });
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        // Capture calculation errors with context
        Sentry.withScope((scope) => {
          scope.setTag('error_type', 'calculation_failure');
          scope.setTag('calculation_type', calculationType);
          scope.setContext('calculation', {
            bondId,
            calculationType,
            duration: Math.round(duration),
          });
          
          Sentry.captureException(error);
        });
        
        throw error;
      }
    }
  );
}

/**
 * Error handler middleware with Sentry integration
 */
export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Capture the error in Sentry
  Sentry.captureException(error);
  
  // Log error details
  console.error('Request error:', {
    error: error.message,
    stack: error.stack,
    route: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    timestamp: new Date().toISOString(),
  });
  
  // Send error response
  if (res.headersSent) {
    return next(error);
  }
  
  const statusCode = error.name === 'ValidationError' ? 400 : 500;
  
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
} 