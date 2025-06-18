import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useHotkeys } from "react-hotkeys-hook";
import { apiRequest } from "@/lib/queryClient";
import BondForm from "@/components/bond-form";
import CashFlowTable from "@/components/cash-flow-table";
import AnalyticsPanel from "@/components/analytics-panel";
import SavedBonds from "@/components/golden-bonds";
import { BondResult, InsertBond, ValidationResult } from "@shared/schema";
import { BondJsonUtils } from "@shared/bond-definition";
import { useToast } from "@/hooks/use-toast";
import { getDefaultSettlementDate } from "@shared/day-count";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileGuard } from "@/components/MobileGuard";

export default function BondBuilder() {
  const [, setLocation] = useLocation();
  
  // Mobile guard - block Builder on screens <768px
  const isMobile = useIsMobile(767);
  if (isMobile) return <MobileGuard />;
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bondData, setBondData] = useState<Partial<InsertBond>>({
    issuer: "REPUBLIC OF ARGENTINA",
    cusip: "040114HS2",
    isin: "US040114HS26",
    faceValue: 1000,
    couponRate: 0.125,
    issueDate: "2020-09-04",
    maturityDate: "2030-07-09",
    firstCouponDate: "2021-07-09",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: true,
    settlementDays: 2,
    amortizationSchedule: [
      { date: "2024-07-09", principalPercent: 4 },
      { date: "2025-01-09", principalPercent: 8 },
      { date: "2025-07-09", principalPercent: 8 },
      { date: "2026-01-09", principalPercent: 8 },
      { date: "2026-07-09", principalPercent: 8 },
      { date: "2027-01-09", principalPercent: 8 },
      { date: "2027-07-09", principalPercent: 8 },
      { date: "2028-01-09", principalPercent: 8 },
      { date: "2028-07-09", principalPercent: 8 },
      { date: "2029-01-09", principalPercent: 8 },
      { date: "2029-07-09", principalPercent: 8 },
      { date: "2030-01-09", principalPercent: 8 },
      { date: "2030-07-09", principalPercent: 8 }
    ],
    callSchedule: [],
    putSchedule: [],
    couponRateChanges: [
      { effectiveDate: "2021-07-09", newCouponRate: 0.5 },
      { effectiveDate: "2023-07-09", newCouponRate: 0.75 },
      { effectiveDate: "2027-07-09", newCouponRate: 1.75 }
    ],
  });

  const [buildResult, setBuildResult] = useState<BondResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sidebar toggle hotkey
  useHotkeys('meta+b', (e) => {
    e.preventDefault();
    setSidebarOpen(prev => !prev);
  }, { enableOnContentEditable: true, enableOnFormTags: true });

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
      const result = await response.json() as BondResult;
      return result;
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
    
    // Provide default market price of 100 (par value) for bond building
    // This allows the calculator to generate meaningful analytics and cash flows
    const bondWithMarketData = {
      ...bondData,
      marketPrice: 100, // Default to par value for building
      settlementDate: getDefaultSettlementDate() // Use T+1 business day as settlement date
    };
    
    buildMutation.mutate(bondWithMarketData as InsertBond);
  };

  const handleBondDataChange = (updates: Partial<InsertBond>) => {
    setBondData(prev => ({ ...prev, ...updates }));
  };

  const handleLoadSavedBond = async (bondId: string) => {
    try {
      // First get the list of saved bonds to find the filename
      const listResponse = await apiRequest("GET", "/api/bonds/saved");
      const savedBondsData = await listResponse.json();
      
      const bond = savedBondsData.bonds.find((b: any) => b.metadata.id === bondId);
      
      if (!bond) {
        throw new Error("Bond not found");
      }
      
      // Convert bond format to legacy format for the form
      const legacyBond = {
        issuer: bond.bondInfo.issuer,
        cusip: bond.bondInfo.cusip || "",
        isin: bond.bondInfo.isin || "",
        faceValue: bond.bondInfo.faceValue,
        couponRate: bond.bondInfo.couponRate,
        issueDate: bond.bondInfo.issueDate,
        maturityDate: bond.bondInfo.maturityDate,
        firstCouponDate: bond.bondInfo.firstCouponDate || "",
        paymentFrequency: bond.bondInfo.paymentFrequency,
        dayCountConvention: bond.bondInfo.dayCountConvention,
        currency: bond.bondInfo.currency,
        isAmortizing: bond.features?.isAmortizing || false,
        isCallable: bond.features?.isCallable || false,
        isPuttable: bond.features?.isPuttable || false,
        isVariableCoupon: bond.features?.isVariableCoupon || false,
        settlementDays: bond.bondInfo.settlementDays || 2,
        amortizationSchedule: bond.schedules?.amortizationSchedule || [],
        callSchedule: bond.schedules?.callSchedule || [],
        putSchedule: bond.schedules?.putSchedule || [],
        couponRateChanges: bond.schedules?.couponRateChanges || [],
        predefinedCashFlows: bond.cashFlowSchedule || [],
      };
      
      setBondData(legacyBond);
      
      toast({
        title: "Saved Bond Loaded",
        description: `Loaded ${bond.metadata.name}`,
      });
    } catch (error) {
      toast({
        title: "Failed to Load Saved Bond",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setBondData({
      issuer: "REPUBLIC OF ARGENTINA",
      cusip: "040114HS2",
      isin: "US040114HS26",
      faceValue: 1000,
      couponRate: 0.125,
      issueDate: "2020-09-04",
      maturityDate: "2030-07-09",
      firstCouponDate: "2021-07-09",
      paymentFrequency: 2,
      dayCountConvention: "30/360",
      currency: "USD",
      isAmortizing: true,
      isCallable: false,
      isPuttable: false,
      isVariableCoupon: true,
      settlementDays: 2,
      amortizationSchedule: [
        { date: "2024-07-09", principalPercent: 4 },
        { date: "2025-01-09", principalPercent: 8 },
        { date: "2025-07-09", principalPercent: 8 },
        { date: "2026-01-09", principalPercent: 8 },
        { date: "2026-07-09", principalPercent: 8 },
        { date: "2027-01-09", principalPercent: 8 },
        { date: "2027-07-09", principalPercent: 8 },
        { date: "2028-01-09", principalPercent: 8 },
        { date: "2028-07-09", principalPercent: 8 },
        { date: "2029-01-09", principalPercent: 8 },
        { date: "2029-07-09", principalPercent: 8 },
        { date: "2030-01-09", principalPercent: 8 },
        { date: "2030-07-09", principalPercent: 8 }
      ],
      callSchedule: [],
      putSchedule: [],
      couponRateChanges: [
        { effectiveDate: "2021-07-09", newCouponRate: 0.5 },
        { effectiveDate: "2023-07-09", newCouponRate: 0.75 },
        { effectiveDate: "2027-07-09", newCouponRate: 1.75 }
      ],
    });
    setBuildResult(null);
    setValidationErrors({});
    localStorage.removeItem("bond_draft");
    toast({
      title: "Form Reset",
      description: "Reset to GD30 Argentina default template",
    });
  };

  const handleSave = async (allowDuplicates: boolean = false) => {
    // Save draft to localStorage for quick recovery
    localStorage.setItem("bond_draft", JSON.stringify(bondData));
    
    // If we have a completed bond result, save to repository
    if (buildResult && buildResult.cashFlows) {
      try {
        // Client-side duplicate check first (if not overriding)
        if (!allowDuplicates) {
          try {
            const savedBondsResponse = await apiRequest("GET", "/api/bonds/saved");
            const savedBondsData = await savedBondsResponse.json();
            
            // Check for ISIN duplicates
            if (bondData.isin) {
              const duplicateISIN = savedBondsData.bonds.find((bond: any) => 
                bond.bondInfo.isin === bondData.isin
              );
              if (duplicateISIN) {
                toast({
                  title: "Duplicate ISIN Detected",
                  description: `Bond with ISIN ${bondData.isin} already exists: ${duplicateISIN.bondInfo.issuer} ${duplicateISIN.bondInfo.couponRate}% ${duplicateISIN.bondInfo.maturityDate}`,
                  variant: "destructive",
                  action: (
                    <button
                      onClick={() => handleSave(true)}
                      className="text-xs bg-destructive-foreground text-destructive px-2 py-1 rounded hover:bg-muted"
                    >
                      Save Anyway
                    </button>
                  ),
                });
                return;
              }
            }
            
            // Check for CUSIP duplicates
            if (bondData.cusip) {
              const duplicateCUSIP = savedBondsData.bonds.find((bond: any) => 
                bond.bondInfo.cusip === bondData.cusip
              );
              if (duplicateCUSIP) {
                toast({
                  title: "Duplicate CUSIP Detected", 
                  description: `Bond with CUSIP ${bondData.cusip} already exists: ${duplicateCUSIP.bondInfo.issuer} ${duplicateCUSIP.bondInfo.couponRate}% ${duplicateCUSIP.bondInfo.maturityDate}`,
                  variant: "destructive",
                  action: (
                    <button
                      onClick={() => handleSave(true)}
                      className="text-xs bg-destructive-foreground text-destructive px-2 py-1 rounded hover:bg-muted"
                    >
                      Save Anyway
                    </button>
                  ),
                });
                return;
              }
            }
            
            // Check for bond characteristic duplicates
            const duplicateBond = savedBondsData.bonds.find((bond: any) => 
              bond.bondInfo.issuer.toUpperCase() === bondData.issuer?.toUpperCase() &&
              Math.abs(bond.bondInfo.couponRate - (bondData.couponRate || 0)) < 0.001 &&
              bond.bondInfo.maturityDate === bondData.maturityDate &&
              bond.bondInfo.faceValue === bondData.faceValue &&
              (bond.bondInfo.currency || 'USD') === (bondData.currency || 'USD')
            );
            if (duplicateBond) {
              toast({
                title: "Similar Bond Detected",
                description: `Similar bond already exists: ${duplicateBond.bondInfo.issuer} ${duplicateBond.bondInfo.couponRate}% ${duplicateBond.bondInfo.maturityDate}`,
                variant: "destructive", 
                action: (
                  <button
                    onClick={() => handleSave(true)}
                    className="text-xs bg-destructive-foreground text-destructive px-2 py-1 rounded hover:bg-muted"
                  >
                    Save Anyway
                  </button>
                ),
              });
              return;
            }
          } catch (error) {
            console.warn("Failed to check for duplicates:", error);
            // Continue with save if duplicate check fails
          }
        }
        
        const response = await apiRequest("POST", "/api/bonds/save", {
          bondData,
          cashFlows: buildResult.cashFlows,
          category: 'user_created',
          allowDuplicates
        });
        
        const result = await response.json();
        
        if (result.success) {
          toast({
            title: "Bond Saved to Repository",
            description: `Saved as: ${result.filename}`,
          });
        } else if (result.isDuplicate && !allowDuplicates) {
          // Handle duplicate detection - ask user if they want to save anyway
          const duplicateType = result.duplicateType;
          const existingBond = result.existingBond;
          
          toast({
            title: `Duplicate ${duplicateType} Detected`,
            description: result.error,
            variant: "destructive",
            action: (
              <button
                onClick={() => handleSave(true)}
                className="text-xs bg-destructive-foreground text-destructive px-2 py-1 rounded hover:bg-muted"
              >
                Save Anyway
              </button>
            ),
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
    <div className="text-terminal-txt">
      {/* Mobile-optimized Header */}
      <header className="bg-terminal-panel border-b border-terminal-line px-4 py-3 lg:px-6 lg:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-4">
            <button
              onClick={() => setLocation('/')}
              className="flex items-center gap-2 text-sm text-terminal-txt/70 hover:text-terminal-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div className="h-4 w-px bg-terminal-line hidden sm:block"></div>
            <h1 className="text-base lg:text-lg font-bold text-terminal-accent mb-0">
              <span className="sm:hidden">Builder</span>
              <span className="hidden sm:inline">Bond Builder</span>
            </h1>
            {/* Hide session info on mobile */}
            <div className="hidden lg:flex items-center space-x-2 text-xs">
              <span className="text-terminal-txt/60">SESSION:</span>
              <span className="text-terminal-accent">JX001_2024</span>
              <span className="text-terminal-txt/60">|</span>
              <span className="text-terminal-txt/60">USER:</span>
              <span className="text-terminal-accent">JUAN_TRADER</span>
            </div>
          </div>
          
          {/* Desktop-only header actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSave()}
                className="form-button-secondary text-xs"
              >
                SAVE
              </button>
              <button
                onClick={handleReset}
                className="form-button-secondary text-xs text-terminal-warn"
              >
                RESET
              </button>
              <button
                onClick={() => window.location.href = '/calculator/bond_1749832694227_8aefc56'}
                className="form-button-secondary text-xs text-blue-400"
              >
                CALC
              </button>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="status-online"></div>
                <span>API ONLINE</span>
              </div>
              <div className="text-terminal-txt/60">
                {currentTime.toLocaleTimeString()} EST
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile-responsive main content with scroll container */}
      <main className="overflow-y-auto h-[calc(100vh-var(--nav-height))] lg:h-[calc(100vh-80px)]">
        <div className="lg:flex lg:min-h-full">
          {/* Desktop Sidebar - Hidden on Mobile */}
          <aside className={cn(
            "hidden lg:block bg-terminal-panel border-r border-terminal-line transition-all duration-300 overflow-y-auto terminal-scrollbar",
            sidebarOpen ? "lg:w-80 lg:p-4" : "lg:w-0 lg:p-0"
          )}>
            <div className={cn(
              "transition-opacity duration-300",
              sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
              <SavedBonds onLoadBond={handleLoadSavedBond} />
              
              {/* System Status */}
              <div className="mt-6">
                <h2 className="section-header">SYSTEM STATUS</h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-terminal-txt/60">API_RESPONSE:</span>
                    <span className={cn(
                      buildResult && buildResult.buildTime > 250 
                        ? "text-terminal-warn" 
                        : "text-terminal-accent"
                    )}>
                      {buildResult ? `${buildResult.buildTime}ms` : "< 50ms"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-txt/60">VALIDATION:</span>
                    <span className="text-terminal-accent">&lt; 2ms</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          
          {/* Desktop Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="hidden lg:block absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-terminal-panel border border-terminal-line rounded-r-md p-2 hover:bg-terminal-accent/10 transition-colors"
            style={{ left: sidebarOpen ? '320px' : '0px' }}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4 text-terminal-accent" />
            ) : (
              <ChevronRight className="h-4 w-4 text-terminal-accent" />
            )}
          </button>

          {/* Main Content Area */}
          <div className="flex-1 lg:flex">
            {/* Bond Form - Mobile accordion, Desktop left panel */}
            <div className="lg:w-1/2 p-4 pb-20 lg:pb-6 lg:p-6 lg:border-r lg:border-terminal-line lg:overflow-y-auto lg:terminal-scrollbar lg:max-h-[calc(100vh-120px)]">
              <BondForm
                key={`${bondData.issuer}-${bondData.maturityDate}-${bondData.couponRate}`}
                bondData={bondData}
                validationErrors={validationErrors}
                onDataChange={handleBondDataChange}
                onBuild={handleBuildBond}
                isBuilding={buildMutation.isPending}
              />
            </div>

            {/* Preview Panel - Desktop right panel */}
            <div className="hidden lg:block lg:w-1/2 lg:p-6 lg:overflow-y-auto lg:terminal-scrollbar lg:max-h-[calc(100vh-120px)]">
              <AnalyticsPanel 
                analytics={buildResult?.analytics} 
                cashFlows={buildResult?.cashFlows}
                buildStatus={buildResult?.status}
                buildTime={buildResult?.buildTime}
                bond={buildResult?.bond}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Footer Actions */}
      <footer className="fixed bottom-0 inset-x-0 bg-background/90 backdrop-blur border-t border-terminal-line lg:hidden p-3 pb-safe z-50">
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          <button
            onClick={handleReset}
            className="h-11 px-3 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md font-medium transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => handleSave()}
            className="h-11 px-3 text-sm bg-muted text-muted-foreground hover:bg-muted/80 rounded-md font-medium transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleBuildBond}
            disabled={buildMutation.isPending || Object.keys(validationErrors).length > 0}
            className="h-11 px-3 text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
          >
            {buildMutation.isPending ? 'Building...' : 'Build'}
          </button>
        </div>
      </footer>

      {/* Desktop Status Bar */}
      <div className="hidden lg:block h-6 bg-terminal-panel border-t border-terminal-line px-4 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-4">
          <span className="text-terminal-txt/60">STATUS:</span>
          <span className="text-terminal-accent">
            {buildMutation.isPending ? "BUILDING..." : "READY"}
          </span>
          <span className="text-terminal-txt/60">|</span>
          <span className="text-terminal-txt/60">LAST_BUILD:</span>
          <span className="text-terminal-accent">
            {buildResult ? new Date().toLocaleTimeString() : "--:--:--"}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-terminal-txt/60">API_CALLS:</span>
          <span className="text-terminal-accent">
            {(buildMutation.data ? 1 : 0) + (validateMutation.data ? 1 : 0)}
          </span>
          <span className="text-terminal-txt/60">|</span>
          <span className="text-terminal-txt/60">CACHE_SIZE:</span>
          <span className="text-terminal-accent">1.2MB</span>
        </div>
      </div>
    </div>
  );
}
