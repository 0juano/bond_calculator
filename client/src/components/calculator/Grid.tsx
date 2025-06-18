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
 * Animated 2x2 grid containing all calculator panels
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
      className="grid grid-cols-12 gap-6"
    >
      {/* Top Row: Bond Pricing Calculator */}
      <PricingPanel 
        calculatorState={calculatorState} 
        bond={bond} 
        className={cn(
          "col-span-6 p-5 border border-terminal-line rounded-md",
          shouldPulse && "animate-pulse"
        )}
      />
      
      {/* Top Row: Key Metrics */}
      <RiskMetricsPanel 
        analytics={calculatorState.analytics} 
        isCalculating={calculatorState.isCalculating} 
        className={cn(
          "col-span-6 p-5 border border-terminal-line rounded-md",
          shouldPulse && "animate-pulse"
        )}
      />
      
      {/* Bottom Row: Price Sensitivity */}
      {calculatorState.input.price ? (
        <PriceSensitivityPanel 
          bond={bond}
          currentPrice={calculatorState.input.price}
          settlementDate={calculatorState.input.settlementDate}
          predefinedCashFlows={predefinedCashFlows}
          className="col-span-6 p-5 border border-terminal-line rounded-md"
        />
      ) : (
        <div className="col-span-6 p-5 border border-terminal-line rounded-md bg-terminal-panel flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-terminal-txt/40 mb-4" />
            <p className="text-terminal-txt/60">Enter a price to see sensitivity analysis</p>
          </div>
        </div>
      )}
      
      {/* Bottom Row: Cash Flow Schedule */}
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
          className="col-span-6 p-5 border border-terminal-line rounded-md"
        />
      ) : (
        <div className="col-span-6 p-5 border border-terminal-line rounded-md bg-terminal-panel flex items-center justify-center">
          <div className="text-center">
            <CalendarDays className="h-8 w-8 mx-auto text-terminal-txt/40 mb-4" />
            <p className="text-terminal-txt/60">Cash flow schedule will appear here</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}