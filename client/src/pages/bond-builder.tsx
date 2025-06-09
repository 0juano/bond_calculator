import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import BondForm from "@/components/bond-form";
import CashFlowTable from "@/components/cash-flow-table";
import AnalyticsPanel from "@/components/analytics-panel";
import GoldenBonds from "@/components/golden-bonds";
import { BondResult, InsertBond, ValidationResult } from "@shared/schema";
import { BondJsonUtils } from "@shared/bond-definition";
import { useToast } from "@/hooks/use-toast";

export default function BondBuilder() {
  const [bondData, setBondData] = useState<Partial<InsertBond>>({
    issuer: "",
    cusip: "",
    isin: "",
    faceValue: 1000,
    couponRate: 5.0,
    issueDate: "2024-01-15",
    maturityDate: "2029-01-15",
    firstCouponDate: "2024-07-15",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: false,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: false,
    settlementDays: 3,
    amortizationSchedule: [],
    callSchedule: [],
    putSchedule: [],
  });

  const [buildResult, setBuildResult] = useState<BondResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load bond from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("bond_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBondData(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error("Failed to load saved bond data:", error);
      }
    }
  }, []);

  // Save to localStorage when bond data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("bond_draft", JSON.stringify(bondData));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [bondData]);

  // Build bond mutation
  const buildMutation = useMutation({
    mutationFn: async (bond: InsertBond) => {
      const response = await apiRequest("POST", "/api/bonds/build", bond);
      return await response.json() as BondResult;
    },
    onSuccess: (result) => {
      setBuildResult(result);
      setValidationErrors({});
      toast({
        title: "Bond Built Successfully",
        description: `Generated ${result.cashFlows.length} cash flows in ${result.buildTime}ms`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Build Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validation mutation (debounced)
  const validateMutation = useMutation({
    mutationFn: async (bond: InsertBond) => {
      const response = await apiRequest("POST", "/api/bonds/validate", bond);
      return await response.json() as ValidationResult;
    },
    onSuccess: (result) => {
      setValidationErrors(result.errors);
    },
    onError: (error: Error) => {
      console.error("Validation error:", error);
    },
  });

  // Debounced validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (bondData.issuer && bondData.faceValue && bondData.couponRate) {
        validateMutation.mutate(bondData as InsertBond);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [bondData]);

  const handleBuildBond = () => {
    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Validation Errors",
        description: "Please fix validation errors before building",
        variant: "destructive",
      });
      return;
    }
    buildMutation.mutate(bondData as InsertBond);
  };

  const handleBondDataChange = (updates: Partial<InsertBond>) => {
    setBondData(prev => ({ ...prev, ...updates }));
  };

  const handleLoadGoldenBond = async (bondId: string) => {
    try {
      const response = await apiRequest("GET", `/api/bonds/golden/${bondId}`);
      const goldenBond = await response.json() as InsertBond;
      setBondData(goldenBond);
      toast({
        title: "Golden Bond Loaded",
        description: `Loaded ${bondId} configuration`,
      });
    } catch (error) {
      toast({
        title: "Failed to Load Golden Bond",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setBondData({
      issuer: "",
      cusip: "",
      isin: "",
      faceValue: 1000,
      couponRate: 5.0,
      issueDate: "2024-01-15",
      maturityDate: "2029-01-15",
      firstCouponDate: "2024-07-15",
      paymentFrequency: 2,
      dayCountConvention: "30/360",
      currency: "USD",
      isAmortizing: false,
      isCallable: false,
      isPuttable: false,
      isVariableCoupon: false,
      settlementDays: 3,
      amortizationSchedule: [],
      callSchedule: [],
      putSchedule: [],
    });
    setBuildResult(null);
    setValidationErrors({});
    localStorage.removeItem("bond_draft");
    toast({
      title: "Form Reset",
      description: "All fields cleared and localStorage reset",
    });
  };

  const handleSave = async () => {
    // Save draft to localStorage for quick recovery
    localStorage.setItem("bond_draft", JSON.stringify(bondData));
    
    // If we have a completed bond result, save to repository
    if (buildResult && buildResult.cashFlows) {
      try {
        const response = await apiRequest("POST", "/api/bonds/save", {
          bondData,
          cashFlows: buildResult.cashFlows,
          category: 'user_created'
        });
        
        const result = await response.json();
        
        if (result.success) {
          toast({
            title: "Bond Saved to Repository",
            description: `Saved as: ${result.filename}`,
          });
        } else {
          throw new Error(result.error || "Failed to save bond");
        }
      } catch (error) {
        toast({
          title: "Save Error",
          description: error instanceof Error ? error.message : "Failed to save bond to repository",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Draft Saved",
        description: "Bond configuration saved to localStorage (build bond first for repository save)",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="panel-header mb-0">YAS BOND BUILDER v1.0</h1>
            <div className="flex items-center space-x-2 text-xs">
              <span className="terminal-text-muted">SESSION:</span>
              <span className="terminal-text-green">JX001_2024</span>
              <span className="terminal-text-muted">|</span>
              <span className="terminal-text-muted">USER:</span>
              <span className="terminal-text-green">JUAN_TRADER</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSave}
                className="form-button-secondary text-xs"
              >
                SAVE
              </button>
              <button
                onClick={handleReset}
                className="form-button-secondary text-xs terminal-text-amber"
              >
                RESET
              </button>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="status-online"></div>
                <span>API ONLINE</span>
              </div>
              <div className="terminal-text-muted">
                {currentTime.toLocaleTimeString()} EST
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-80 bg-card border-r border-border p-4 overflow-y-auto terminal-scrollbar">
          <GoldenBonds onLoadBond={handleLoadGoldenBond} />
          
          {/* System Status */}
          <div className="mt-6">
            <h2 className="section-header">SYSTEM STATUS</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="terminal-text-muted">API_RESPONSE:</span>
                <span className="terminal-text-green">
                  {buildResult ? `${buildResult.buildTime}ms` : "< 50ms"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="terminal-text-muted">VALIDATION:</span>
                <span className="terminal-text-green">&lt; 2ms</span>
              </div>
              <div className="flex justify-between">
                <span className="terminal-text-muted">MEMORY_USAGE:</span>
                <span className="terminal-text-green">12.4MB</span>
              </div>
              <div className="flex justify-between">
                <span className="terminal-text-muted">CACHE_HIT:</span>
                <span className="terminal-text-green">94.2%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6">
            <h2 className="section-header">QUICK ACTIONS</h2>
            <div className="space-y-2">
              <button
                onClick={handleReset}
                className="w-full text-left p-2 text-xs bg-muted hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary transition-colors"
              >
                [CTRL+R] RESET_FORM
              </button>
              <button
                onClick={() => {
                  if (buildResult?.cashFlows) {
                    const headers = ['Date', 'Coupon_Payment', 'Principal_Payment', 'Total_Payment', 'Remaining_Notional', 'Payment_Type'];
                    const csvData = buildResult.cashFlows.map(flow => [
                      flow.date,
                      flow.couponPayment.toFixed(2),
                      flow.principalPayment.toFixed(2),
                      flow.totalPayment.toFixed(2),
                      flow.remainingNotional.toFixed(2),
                      flow.paymentType
                    ]);
                    
                    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
                    const issuer = bondData.issuer?.replace(/[^a-zA-Z0-9]/g, '_') || 'Bond';
                    const timestamp = new Date().toISOString().split('T')[0];
                    const filename = `${issuer}_CashFlows_${timestamp}.csv`;
                    
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                disabled={!buildResult?.cashFlows}
                className="w-full text-left p-2 text-xs bg-muted hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                [CTRL+E] EXPORT_CSV
              </button>
              <button
                onClick={handleSave}
                className="w-full text-left p-2 text-xs bg-muted hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary transition-colors"
title={buildResult ? "Save bond to repository for later use in calculator" : "Save draft to localStorage"}
              >
[CTRL+S] {buildResult ? 'SAVE_BOND' : 'SAVE_DRAFT'}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 flex">
            {/* Bond Form */}
            <div className="w-1/2 p-6 border-r border-border overflow-y-auto terminal-scrollbar max-h-[calc(100vh-120px)]">
              <BondForm
                bondData={bondData}
                validationErrors={validationErrors}
                onDataChange={handleBondDataChange}
                onBuild={handleBuildBond}
                isBuilding={buildMutation.isPending}
              />
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 p-6 overflow-y-auto terminal-scrollbar max-h-[calc(100vh-120px)]">
              <AnalyticsPanel 
                analytics={buildResult?.analytics} 
                cashFlows={buildResult?.cashFlows}
                buildStatus={buildResult?.status}
                buildTime={buildResult?.buildTime}
                bond={buildResult?.bond}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-card border-t border-border px-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          <span className="terminal-text-muted">STATUS:</span>
          <span className="terminal-text-green">
            {buildMutation.isPending ? "BUILDING..." : "READY"}
          </span>
          <span className="terminal-text-muted">|</span>
          <span className="terminal-text-muted">LAST_BUILD:</span>
          <span className="terminal-text-green">
            {buildResult ? new Date().toLocaleTimeString() : "--:--:--"}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="terminal-text-muted">API_CALLS:</span>
          <span className="terminal-text-green">
            {(buildMutation.data ? 1 : 0) + (validateMutation.data ? 1 : 0)}
          </span>
          <span className="terminal-text-muted">|</span>
          <span className="terminal-text-muted">CACHE_SIZE:</span>
          <span className="terminal-text-green">1.2MB</span>
        </div>
      </div>
    </div>
  );
}
