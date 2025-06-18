import { motion } from "framer-motion";
import { BondDefinition, BondResult } from "@shared/schema";
import { PricingPanel } from "@/components/calculator/pricing-panel";
import { RiskMetricsPanel } from "@/components/calculator/risk-metrics-panel";
import { PriceSensitivityPanel } from "@/components/calculator/price-sensitivity-panel";
import { CashFlowSchedulePanel } from "@/components/calculator/cash-flow-schedule-panel";
import { TrendingUp, CalendarDays } from "lucide-react";

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
  if (!show || !bond) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="grid gap-4 md:grid-cols-2 md:auto-rows-min"
    >
      {/* Row 1: Bond Pricing Calculator */}
      <PricingPanel 
        calculatorState={calculatorState} 
        bond={bond} 
        className="flex flex-col md:h-full"
      />
      
      {/* Row 1: Key Metrics */}
      <RiskMetricsPanel 
        analytics={calculatorState.analytics} 
        isCalculating={calculatorState.isCalculating} 
        className="flex flex-col md:h-full"
      />
      
      {/* Row 2: Price Sensitivity */}
      {calculatorState.input.price ? (
        <PriceSensitivityPanel 
          bond={bond}
          currentPrice={calculatorState.input.price}
          settlementDate={calculatorState.input.settlementDate}
          predefinedCashFlows={predefinedCashFlows}
        />
      ) : (
        <div className="bg-gray-900 border border-green-600 rounded-lg p-6 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">Enter a price to see sensitivity analysis</p>
          </div>
        </div>
      )}
      
      {/* Row 2: Cash Flow Schedule */}
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
        />
      ) : (
        <div className="bg-gray-900 border border-green-600 rounded-lg p-6 flex items-center justify-center">
          <div className="text-center">
            <CalendarDays className="h-8 w-8 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">Cash flow schedule will appear here</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}