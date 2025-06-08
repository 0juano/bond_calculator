export interface LogContext {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  category: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Structured logger for bond calculator
 */
export class CalculatorLogger {
  private static instance: CalculatorLogger;
  
  public static getInstance(): CalculatorLogger {
    if (!CalculatorLogger.instance) {
      CalculatorLogger.instance = new CalculatorLogger();
    }
    return CalculatorLogger.instance;
  }

  /**
   * Log calculation performance metrics
   */
  logCalculationPerformance(
    bondId: string | number,
    calculationType: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>
  ) {
    const level = duration > 200 ? 'warn' : 'info';
    
    this.log({
      level,
      message: `Bond calculation ${success ? 'completed' : 'failed'}`,
      category: 'calculation_performance',
      metadata: {
        bondId,
        calculationType,
        duration: Math.round(duration),
        success,
        isSlowCalculation: duration > 200,
        ...metadata,
      },
    });
  }

  /**
   * Log API request details
   */
  logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userAgent?: string
  ) {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
    
    this.log({
      level,
      message: `API request ${method} ${path}`,
      category: 'api_request',
      metadata: {
        method,
        path,
        statusCode,
        duration: Math.round(duration),
        userAgent,
        isSlowRequest: duration > 1000,
      },
    });
  }

  /**
   * Log calculation input validation
   */
  logValidationError(
    field: string,
    value: unknown,
    error: string,
    bondId?: string | number
  ) {
    this.log({
      level: 'warn',
      message: `Validation error for field ${field}`,
      category: 'validation',
      metadata: {
        field,
        value,
        error,
        bondId,
      },
    });
  }

  /**
   * Log memory and performance metrics
   */
  logSystemMetrics() {
    const memUsage = process.memoryUsage();
    
    this.log({
      level: 'info',
      message: 'System performance metrics',
      category: 'system_metrics',
      metadata: {
        memoryUsage: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024), // MB
        },
        uptime: Math.round(process.uptime()),
      },
    });
  }

  /**
   * Core logging method
   */
  private log(context: LogContext) {
    const logEntry = {
      timestamp: context.timestamp || new Date().toISOString(),
      level: context.level,
      message: context.message,
      category: context.category,
      ...context.metadata,
    };

    // In development, use pretty console logs
    if (process.env.NODE_ENV === 'development') {
      const color = this.getColorForLevel(context.level);
      console.log(
        `${color}[${context.level.toUpperCase()}]${'\x1b[0m'} ${context.message}`,
        context.metadata ? JSON.stringify(context.metadata, null, 2) : ''
      );
    } else {
      // In production, use structured JSON logs
      console.log(JSON.stringify(logEntry));
    }
  }

  private getColorForLevel(level: string): string {
    switch (level) {
      case 'error': return '\x1b[31m'; // Red
      case 'warn': return '\x1b[33m';  // Yellow
      case 'info': return '\x1b[36m';  // Cyan
      case 'debug': return '\x1b[90m'; // Gray
      default: return '\x1b[0m';       // Reset
    }
  }
}

// Export singleton instance
export const logger = CalculatorLogger.getInstance(); 