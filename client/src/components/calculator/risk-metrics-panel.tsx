import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Shield, Clock } from "lucide-react";
import { BondAnalytics } from "@shared/schema";
import { formatNumber, formatPercent, formatCurrency } from "@/lib/bond-utils";
import { InfoTooltip } from "@/components/ui/info-tooltip";

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
  
  // Helper function to safely format values with fallback
  const safeFormat = (value: number | undefined, formatter: (value: number, decimals?: number) => string, decimals?: number) => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return formatter(value, decimals);
  };

  // Helper function to format treasury interpolation description
  const formatTreasuryDescription = (interpolation?: BondAnalytics['treasuryInterpolation']) => {
    if (!interpolation) return 'Reference rate for spread';
    
    const { targetYears, lowerPoint, upperPoint, method } = interpolation;
    
    if (method === 'exact') {
      return `${formatNumber(targetYears, 1)}yrs exact match with ${lowerPoint.years}yr curve`;
    } else if (method === 'extrapolated') {
      return `${formatNumber(targetYears, 1)}yrs extrapolated from ${lowerPoint.years}yr and ${upperPoint.years}yr curves`;
    } else {
      // interpolated
      return `${formatNumber(targetYears, 1)}yrs interpolated yld using ${lowerPoint.years}yr and ${upperPoint.years}yr curves`;
    }
  };

  return (
    <Card className={`bg-gray-900 border-green-600 ${className}`}>
      <CardHeader>
        <CardTitle className="text-green-400 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Key Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-8">
        {isCalculating ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-green-400 border-t-transparent rounded-full mr-2"></div>
            <span className="text-gray-400">Calculating metrics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-400" />
                <p className="text-xs text-gray-400">Modified Duration</p>
                <InfoTooltip text="Price sensitivity to yield changes: ∂Price/∂Yield × 100" />
              </div>
              <p className="text-lg font-mono text-green-400">
                {safeFormat(analytics?.duration, formatNumber, 2)}
              </p>
              <p className="text-xs text-gray-500">Price sensitivity</p>
            </div>

            {/* Convexity */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-purple-400" />
                <p className="text-xs text-gray-400">Convexity</p>
                <InfoTooltip text="Second-order price sensitivity: measures how duration changes as yields change" />
              </div>
              <p className="text-lg font-mono text-green-400">
                {safeFormat(analytics?.convexity, formatNumber, 2)}
              </p>
              <p className="text-xs text-gray-500">Second-order risk</p>
            </div>

            {/* Current Yield */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-400">Current Yield</p>
                <InfoTooltip text="Annual coupon income as percentage of current market price" />
              </div>
              <p className="text-lg font-mono text-green-400">
                {safeFormat(analytics?.currentYield, formatPercent)}
              </p>
              <p className="text-xs text-gray-500">Coupon / Price</p>
            </div>

            {/* Accrued Interest */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-400">Accrued Interest</p>
                <InfoTooltip text="Interest earned since last coupon payment date" />
              </div>
              <p className="text-lg font-mono text-green-400">
                {safeFormat(analytics?.accruedInterest, formatNumber, 2)}
              </p>
              <p className="text-xs text-gray-500">Since last payment</p>
            </div>

            {/* Clean Price */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-400">Clean Price</p>
                <InfoTooltip text="Bond price excluding accrued interest" />
              </div>
              <p className="text-lg font-mono text-green-400">
                {safeFormat(analytics?.cleanPrice, formatNumber, 2)}
              </p>
              <p className="text-xs text-gray-500">Without accrued</p>
            </div>

            {/* Macaulay Duration (if available) */}
            {analytics?.macaulayDuration && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-400">Macaulay Duration</p>
                  <InfoTooltip text="Weighted average time to receive all cash flows" />
                </div>
                <p className="text-lg font-mono text-green-400">
                  {safeFormat(analytics.macaulayDuration, formatNumber, 2)}
                </p>
                <p className="text-xs text-gray-500">Weighted avg time</p>
              </div>
            )}

            {/* Average Life (if available) */}
            {analytics?.averageLife && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-400">Average Life</p>
                  <InfoTooltip text="Weighted average time until principal payments" />
                </div>
                <p className="text-lg font-mono text-green-400">
                  {safeFormat(analytics.averageLife, formatNumber, 2)}
                </p>
                <p className="text-xs text-gray-500">Weighted avg maturity</p>
              </div>
            )}

            {/* DV01 (if available) */}
            {analytics?.dollarDuration && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-400">DV01</p>
                  <InfoTooltip text="Dollar value change for 1 basis point yield move" />
                </div>
                <p className="text-lg font-mono text-green-400">
                  {safeFormat(analytics.dollarDuration, formatNumber, 2)}
                </p>
                <p className="text-xs text-gray-500">Dollar duration</p>
              </div>
            )}

            {/* Days to Next Coupon */}
            {analytics?.daysToNextCoupon !== undefined && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400">Days to Next Coupon</p>
                <p className="text-lg font-mono text-green-400">
                  {safeFormat(analytics.daysToNextCoupon, formatNumber, 0)}
                </p>
                <p className="text-xs text-gray-500">Until next payment</p>
              </div>
            )}

            {/* Technical Value */}
            {analytics && typeof analytics.technicalValue === 'number' && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400">Technical Value</p>
                <p className="text-lg font-mono text-green-400">
                  {safeFormat(analytics.technicalValue, formatPercent)}
                </p>
                <p className="text-xs text-gray-500">Principal + accrued interest</p>
              </div>
            )}

            {/* Treasury Yield (Reference Rate) */}
            {analytics?.treasuryYield !== undefined && analytics?.treasuryYield !== null && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400">Reference Tr Yld</p>
                <p className="text-lg font-mono text-green-400">
                  {safeFormat(analytics.treasuryYield, formatPercent)}
                </p>
                <p className="text-xs text-gray-500">{formatTreasuryDescription(analytics.treasuryInterpolation)}</p>
              </div>
            )}

            {/* Parity */}
            {analytics && typeof analytics.parity === 'number' && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400">Parity</p>
                <p className="text-lg font-mono text-green-400">
                  {safeFormat(analytics.parity, formatPercent)}
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