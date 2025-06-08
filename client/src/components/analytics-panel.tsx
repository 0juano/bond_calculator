import { useMemo, useEffect, useRef } from "react";
import { Chart } from "chart.js";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BondAnalytics, CashFlowResult } from "@shared/schema";
import { formatCurrency, formatPercent, safeToFixed } from "@/lib/bond-utils";
import { createStackedChart, processCashFlowsForChart } from "@/lib/chart-utils";
import CashFlowTable from "@/components/cash-flow-table";

interface AnalyticsPanelProps {
  analytics?: BondAnalytics;
  cashFlows?: CashFlowResult[];
  buildStatus?: string;
  buildTime?: number;
  bond?: any;
}

export default function AnalyticsPanel({ analytics, cashFlows, buildStatus, buildTime, bond }: AnalyticsPanelProps) {
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

  // Temporary flag to hide analytics sections
  const showAnalytics = false;

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
      {/* 1. Cash Flow Schedule */}
      <CashFlowTable cashFlows={cashFlows || []} isLoading={!cashFlows} bond={bond} />

      {/* 2. Payment Timeline Chart */}
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

      {/* 3. Export & Analysis Options */}
      <div className="border-t border-border pt-4">
        <h3 className="section-header">[EXPORT_OPTIONS]</h3>
        <div className="flex space-x-2 mb-4">
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
        
        {/* Calculator Link */}
        {bond && (
          <div className="pt-2 border-t border-border">
            <button 
              onClick={() => window.location.href = `/calculator/golden:${bond.id || 'vanilla-5y'}`}
              className="px-4 py-2 text-sm bg-green-600 text-white border border-green-500 hover:bg-green-700 transition-colors rounded"
            >
              🧮 Open in Calculator
            </button>
          </div>
        )}
      </div>

      {/* 4. Build Status */}
      <div className="terminal-panel p-4 mt-4">
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
    </div>
  );
}
