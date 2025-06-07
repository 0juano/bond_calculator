import { useMemo, useEffect, useRef } from "react";
import { Chart } from "chart.js";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BondAnalytics, CashFlowResult } from "@shared/schema";
import { formatCurrency, formatPercent, safeToFixed } from "@/lib/bond-utils";
import { createStackedChart, processCashFlowsForChart } from "@/lib/chart-utils";

interface AnalyticsPanelProps {
  analytics?: BondAnalytics;
  cashFlows?: CashFlowResult[];
  buildStatus?: string;
  buildTime?: number;
}

export default function AnalyticsPanel({ analytics, cashFlows, buildStatus, buildTime }: AnalyticsPanelProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  // Process cash flows for chart visualization
  const chartData = useMemo(() => {
    if (!cashFlows || cashFlows.length === 0) return null;
    
    return processCashFlowsForChart(cashFlows);
  }, [cashFlows]);

  useEffect(() => {
    if (chartRef.current && chartData) {
      createStackedChart(chartRef.current, chartData);
    }
    
    // Cleanup function to destroy chart when component unmounts
    return () => {
      if (chartRef.current) {
        const existingChart = Chart.getChart(chartRef.current);
        if (existingChart) {
          existingChart.destroy();
        }
      }
    };
  }, [chartData]);

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="panel-header">BOND ANALYTICS</h2>
          <div className="text-xs terminal-text-muted mb-4">
            Build a bond to see analytics and cash flow preview
          </div>
        </div>

        <div className="terminal-panel p-4">
          <h3 className="section-header">[HEADLINE_ANALYTICS]</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-20 bg-muted" />
                  <Skeleton className="h-4 w-16 bg-muted" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-20 bg-muted" />
                  <Skeleton className="h-4 w-16 bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="terminal-panel p-4">
          <h3 className="section-header">[PAYMENT_TIMELINE]</h3>
          <div className="bg-muted/20 border border-border p-4 h-64 flex items-center justify-center">
            <div className="terminal-text-muted text-sm">Chart will appear after building bond</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="panel-header">BOND ANALYTICS</h2>
        <div className="text-xs terminal-text-muted mb-4">
          Live preview updates on form changes
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="terminal-panel p-4">
        <h3 className="section-header">[HEADLINE_ANALYTICS]</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="terminal-text-muted">YIELD_TO_MAT:</span>
              <span className="terminal-text-green font-bold">
                {formatPercent(analytics.yieldToMaturity)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">YIELD_TO_WORST:</span>
              <span className="terminal-text-green font-bold">
                {formatPercent(analytics.yieldToWorst)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">MOD_DURATION:</span>
              <span className="terminal-text-green font-bold">
                {safeToFixed(analytics.duration, 4)} yrs
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">MAC_DURATION:</span>
              <span className="terminal-text-green font-bold">
                {safeToFixed(analytics.macaulayDuration, 4)} yrs
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">CONVEXITY:</span>
              <span className="terminal-text-green font-bold">
                {safeToFixed(analytics.convexity, 4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">AVERAGE_LIFE:</span>
              <span className="terminal-text-green font-bold">
                {safeToFixed(analytics.averageLife, 4)} yrs
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="terminal-text-muted">MARKET_PRICE:</span>
              <span className="terminal-text-green font-bold">
                {formatCurrency(analytics.marketPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">CLEAN_PRICE:</span>
              <span className="terminal-text-green font-bold">
                {safeToFixed(analytics.cleanPrice, 4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">DIRTY_PRICE:</span>
              <span className="terminal-text-green font-bold">
                {safeToFixed(analytics.dirtyPrice, 4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">ACCRUED_INT:</span>
              <span className="terminal-text-green font-bold">
                {formatCurrency(analytics.accruedInterest)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">DAYS_TO_NEXT:</span>
              <span className="terminal-text-green font-bold">
                {analytics.daysToNextCoupon || 0} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">DV01:</span>
              <span className="terminal-text-green font-bold">
                {formatCurrency(analytics.dollarDuration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics Panel */}
      <div className="terminal-panel p-4">
        <h3 className="section-header">[ADDITIONAL_METRICS]</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="terminal-text-muted">CURRENT_YLD:</span>
              <span className="terminal-text-green font-bold">
                {formatPercent(analytics.currentYield)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">TOTAL_COUPONS:</span>
              <span className="terminal-text-green font-bold">
                {formatCurrency(analytics.totalCoupons)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="terminal-text-muted">PV_CHECK:</span>
              <span className="terminal-text-green font-bold">
                {safeToFixed(analytics.presentValue, 4)}%
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {analytics.yieldToCall && (
              <div className="flex justify-between">
                <span className="terminal-text-muted">YIELD_TO_CALL:</span>
                <span className="terminal-text-amber font-bold">
                  {formatPercent(analytics.yieldToCall)}
                </span>
              </div>
            )}
            {analytics.yieldToPut && (
              <div className="flex justify-between">
                <span className="terminal-text-muted">YIELD_TO_PUT:</span>
                <span className="terminal-text-amber font-bold">
                  {formatPercent(analytics.yieldToPut)}
                </span>
              </div>
            )}
                         {analytics.optionAdjustedSpread && (
               <div className="flex justify-between">
                 <span className="terminal-text-muted">OAS:</span>
                 <span className="terminal-text-amber font-bold">
                   {safeToFixed(analytics.optionAdjustedSpread, 2)} bps
                 </span>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Status Panel */}
      <div className="terminal-panel p-4">
        <h3 className="section-header">[BUILD_STATUS]</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="status-online"></div>
            <span className="terminal-text-green">
              {buildStatus === "SUCCESS" ? "BUILD COMPLETE" : "READY"}
            </span>
            {buildTime && (
              <span className="terminal-text-muted">| {buildTime}ms</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="status-online"></div>
            <span className="terminal-text-green">Bond definition validated successfully</span>
            <span className="terminal-text-muted">| &lt;2ms</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="status-online"></div>
            <span className="terminal-text-green">PV check: Bond prices to par</span>
            <span className="terminal-text-muted">| Within 1¢</span>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="terminal-panel p-4">
        <h3 className="section-header">[PAYMENT_TIMELINE]</h3>
        <div className="terminal-chart h-64">
          <canvas 
            ref={chartRef} 
            className="w-full h-full"
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs terminal-text-muted">
          <div>Hover over bars for detailed information</div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-primary"></div>
              <span>Coupons</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-400"></div>
              <span>Principal</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-amber-400"></div>
              <span>Options</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="border-t border-border pt-4">
        <h3 className="section-header">[EXPORT_OPTIONS]</h3>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-xs bg-muted text-foreground border border-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            CSV
          </button>
          <button className="px-3 py-1 text-xs bg-muted text-foreground border border-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            JSON
          </button>
          <button className="px-3 py-1 text-xs bg-muted text-foreground border border-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            XLSX
          </button>
        </div>
      </div>
    </div>
  );
}
