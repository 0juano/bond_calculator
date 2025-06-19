import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BondDefinition, BondResult } from "@shared/schema";
import { PricingPanel } from "@/components/calculator/pricing-panel";
import { RiskMetricsPanel } from "@/components/calculator/risk-metrics-panel";
import { PriceSensitivityPanel } from "@/components/calculator/price-sensitivity-panel";
import { CashFlowSchedulePanel } from "@/components/calculator/cash-flow-schedule-panel";
import { TrendingUp, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface GridProps {
  show: boolean;
  bond: BondDefinition | null;
  bondResult: BondResult | null;
  calculatorState: any; // Type from useCalculatorState
  predefinedCashFlows?: any[];
  onBondSelect?: (bondId: string) => void;
  recentBonds?: Array<{
    id: string;
    name: string;
    coupon: string;
    maturity: string;
    lastViewed: Date | string;
  }>;
}

/**
 * Analytics Grid Component
 * Responsive layout: single column on mobile, 2x2 grid on desktop
 * Entrance animation with Framer Motion when bond is selected
 */
export function Grid({ 
  show, 
  bond, 
  bondResult, 
  calculatorState, 
  predefinedCashFlows,
  onBondSelect,
  recentBonds
}: GridProps) {
  const [shouldPulse, setShouldPulse] = useState(false);
  
  // Apply pulse animation when calculation completes
  useEffect(() => {
    if (calculatorState.analytics && !calculatorState.isCalculating) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [calculatorState.analytics, calculatorState.isCalculating]);
  
  if (!show) {
    return null;
  }

  // Always show the grid, even when no bond is selected

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
    >
      {/* Panel 1: Bond Pricing Calculator */}
      <PricingPanel 
        calculatorState={calculatorState} 
        bond={bond || undefined} 
        className={cn(
          "p-4 lg:p-5 border border-terminal-line rounded-md",
          shouldPulse && "animate-pulse",
          !bond && "opacity-50"
        )}
      />
      
      {/* Panel 2: Key Metrics */}
      <RiskMetricsPanel 
        analytics={calculatorState.analytics} 
        isCalculating={calculatorState.isCalculating} 
        className={cn(
          "p-4 lg:p-5 border border-terminal-line rounded-md",
          shouldPulse && "animate-pulse",
          !bond && "opacity-50"
        )}
      />
      
      {/* Panel 3: Price Sensitivity */}
      <PriceSensitivityPanel 
        bond={bond}
        currentPrice={calculatorState.input.price || 100}
        settlementDate={calculatorState.input.settlementDate}
        predefinedCashFlows={predefinedCashFlows}
        className={cn(
          "p-4 lg:p-5 border border-terminal-line rounded-md",
          !bond && "opacity-50"
        )}
      />
      
      {/* Panel 4: Cash Flow Schedule */}
      <CashFlowSchedulePanel 
        cashFlows={bondResult?.cashFlows || []}
        isLoading={calculatorState.isCalculating}
        settlementDate={calculatorState.input.settlementDate}
        bond={bond ? {
          faceValue: bond.faceValue,
          paymentFrequency: bond.paymentFrequency,
          couponRate: bond.couponRate,
          couponRateChanges: bond.couponRateChanges || []
        } : undefined}
        className={cn(
          "p-4 lg:p-5 border border-terminal-line rounded-md",
          !bond && "opacity-50"
        )}
      />
    </motion.div>
  );
}