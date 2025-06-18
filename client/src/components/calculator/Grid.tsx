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
  predefinedCashFlows 
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
  
  if (!show || !bond) {
    return null;
  }

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
        bond={bond} 
        className={cn(
          "p-4 lg:p-5 border border-terminal-line rounded-md",
          shouldPulse && "animate-pulse"
        )}
      />
      
      {/* Panel 2: Key Metrics */}
      <RiskMetricsPanel 
        analytics={calculatorState.analytics} 
        isCalculating={calculatorState.isCalculating} 
        className={cn(
          "p-4 lg:p-5 border border-terminal-line rounded-md",
          shouldPulse && "animate-pulse"
        )}
      />
      
      {/* Panel 3: Price Sensitivity */}
      {calculatorState.input.price ? (
        <PriceSensitivityPanel 
          bond={bond}
          currentPrice={calculatorState.input.price}
          settlementDate={calculatorState.input.settlementDate}
          predefinedCashFlows={predefinedCashFlows}
          className="p-4 lg:p-5 border border-terminal-line rounded-md"
        />
      ) : (
        <div className="p-4 lg:p-5 border border-terminal-line rounded-md bg-terminal-panel flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <TrendingUp className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-terminal-txt/40 mb-3 lg:mb-4" />
            <p className="text-sm lg:text-base text-terminal-txt/60">Enter a price to see sensitivity analysis</p>
          </div>
        </div>
      )}
      
      {/* Panel 4: Cash Flow Schedule */}
      {bondResult?.cashFlows ? (
        <CashFlowSchedulePanel 
          cashFlows={bondResult.cashFlows}
          isLoading={calculatorState.isCalculating}
          settlementDate={calculatorState.input.settlementDate}
          bond={{
            faceValue: bond.faceValue,
            paymentFrequency: bond.paymentFrequency,
            couponRate: bond.couponRate,
            couponRateChanges: bond.couponRateChanges || []
          }}
          className="p-4 lg:p-5 border border-terminal-line rounded-md"
        />
      ) : (
        <div className="p-4 lg:p-5 border border-terminal-line rounded-md bg-terminal-panel flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <CalendarDays className="h-6 w-6 lg:h-8 lg:w-8 mx-auto text-terminal-txt/40 mb-3 lg:mb-4" />
            <p className="text-sm lg:text-base text-terminal-txt/60">Cash flow schedule will appear here</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}