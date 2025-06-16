import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Clock } from "lucide-react";
import { BondAnalytics } from "@shared/schema";

interface RiskMetricsPanelProps {
  analytics?: BondAnalytics;
  isCalculating?: boolean;
  className?: string;
}

/**
 * Simple risk metrics panel displaying key bond analytics
 * Shows duration, convexity, and other risk measures in a clean grid
 */
export function RiskMetricsPanel({ analytics, isCalculating, className }: RiskMetricsPanelProps) {
  // Debug: Log analytics to console
  console.log('🔍 RiskMetricsPanel analytics:', analytics);
  
  // Helper function to format percentage values
  const formatPercent = (value?: number, decimals = 3) => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(decimals)}%`;
  };

  // Helper function to format numeric values
  const formatNumber = (value?: number, decimals = 3) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(decimals);
  };

  // Helper function to format currency values
  const formatPrice = (value?: number, decimals = 4) => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(decimals);
  };

  return (
    <Card className={`bg-gray-900 border-green-600 ${className}`}>
      <CardHeader>
        <CardTitle className="text-green-400 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isCalculating ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-green-400 border-t-transparent rounded-full mr-2"></div>
            <span className="text-gray-400">Calculating metrics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-400" />
                <p className="text-xs text-gray-400">Modified Duration</p>
              </div>
              <p className="text-lg font-mono text-green-400">
                {formatNumber(analytics?.duration)}
              </p>
              <p className="text-xs text-gray-500">Price sensitivity</p>
            </div>

            {/* Convexity */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-purple-400" />
                <p className="text-xs text-gray-400">Convexity</p>
              </div>
              <p className="text-lg font-mono text-green-400">
                {formatNumber(analytics?.convexity, 2)}
              </p>
              <p className="text-xs text-gray-500">Second-order risk</p>
            </div>

            {/* Current Yield */}
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Current Yield</p>
              <p className="text-lg font-mono text-green-400">
                {analytics?.currentYield !== undefined && analytics?.currentYield !== null 
                  ? `${analytics.currentYield.toFixed(3)}%` 
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Coupon / Price</p>
            </div>

            {/* Accrued Interest */}
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Accrued Interest</p>
              <p className="text-lg font-mono text-green-400">
                {formatPrice(analytics?.accruedInterest)}
              </p>
              <p className="text-xs text-gray-500">Since last payment</p>
            </div>

            {/* Clean Price */}
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Clean Price</p>
              <p className="text-lg font-mono text-green-400">
                {formatPrice(analytics?.cleanPrice)}
              </p>
              <p className="text-xs text-gray-500">Without accrued</p>
            </div>

            {/* Macaulay Duration (if available) */}
            {analytics?.macaulayDuration && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Macaulay Duration</p>
                <p className="text-lg font-mono text-green-400">
                  {formatNumber(analytics.macaulayDuration)}
                </p>
                <p className="text-xs text-gray-500">Weighted avg time</p>
              </div>
            )}

            {/* Average Life (if available) */}
            {analytics?.averageLife && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Average Life</p>
                <p className="text-lg font-mono text-green-400">
                  {formatNumber(analytics.averageLife)}
                </p>
                <p className="text-xs text-gray-500">Weighted avg maturity</p>
              </div>
            )}

            {/* DV01 (if available) */}
            {analytics?.dollarDuration && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">DV01</p>
                <p className="text-lg font-mono text-green-400">
                  {formatPrice(analytics.dollarDuration, 2)}
                </p>
                <p className="text-xs text-gray-500">Dollar duration</p>
              </div>
            )}

            {/* Days to Next Coupon */}
            {analytics?.daysToNextCoupon !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Days to Next Coupon</p>
                <p className="text-lg font-mono text-green-400">
                  {analytics.daysToNextCoupon}
                </p>
                <p className="text-xs text-gray-500">Until next payment</p>
              </div>
            )}

            {/* Technical Value */}
            {analytics && typeof analytics.technicalValue === 'number' && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Technical Value</p>
                <p className="text-lg font-mono text-green-400">
                  {formatNumber(analytics.technicalValue, 2)}%
                </p>
                <p className="text-xs text-gray-500">Principal + accrued interest</p>
              </div>
            )}

            {/* Parity */}
            {analytics && typeof analytics.parity === 'number' && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Parity</p>
                <p className="text-lg font-mono text-green-400">
                  {formatNumber(analytics.parity, 4)}%
                </p>
                <p className="text-xs text-gray-500">Clean price % of technical value</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no analytics */}
        {!isCalculating && !analytics && (
          <div className="text-center py-8">
            <Shield className="h-8 w-8 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No analytics available</p>
            <p className="text-sm text-gray-500">Enter pricing data to calculate metrics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 