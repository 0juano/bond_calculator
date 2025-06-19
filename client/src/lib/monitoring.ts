import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry error tracking for frontend monitoring
 */
export function initMonitoring() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN, // Set in environment variables
    environment: import.meta.env.MODE, // 'development' or 'production'
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // BondTerminal specific configuration
    beforeSend(event) {
      // Filter out non-critical errors in development
      if (import.meta.env.MODE === 'development') {
        if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
          return null; // Ignore chunk load errors in dev
        }
      }
      
      return event;
    },
    
    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration(),
    ],
  });
}

/**
 * Capture bond calculation errors with context
 */
export function captureCalculationError(
  error: Error, 
  bondContext: {
    bondId?: string | number;
    calculationType?: 'YTM' | 'PRICE' | 'SPREAD' | 'BOND_LOADING' | 'VALIDATION';
    inputValues?: Record<string, unknown>;
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'calculation');
    scope.setTag('calculation_type', bondContext.calculationType);
    scope.setContext('bond', bondContext);
    
    Sentry.captureException(error);
  });
}

/**
 * Track calculation performance metrics
 */
export function trackCalculationPerformance(
  bondId: string | number,
  calculationType: string,
  duration: number,
  isSlowCalculation = false
) {
  if (isSlowCalculation || duration > 200) {
    Sentry.addBreadcrumb({
      message: 'Slow calculation detected',
      category: 'performance',
      level: 'warning',
      data: {
        bondId,
        calculationType,
        duration,
      },
    });
  }
} 