import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

interface SavedBondsProps {
  onLoadBond: (bondId: string) => void;
}

interface SavedBondInfo {
  metadata: {
    id: string;
    name: string;
    created: string;
    modified: string;
    version: string;
    source: string;
  };
  bondInfo: {
    issuer: string;
    cusip?: string;
    isin?: string;
    couponRate: number;
    maturityDate: string;
  };
}

export default function SavedBonds({ onLoadBond }: SavedBondsProps) {
  const { data: savedBondsData, isLoading, error } = useQuery<{bonds: SavedBondInfo[]}>({
    queryKey: ["/api/bonds/saved"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bonds/saved");
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });

  const bondDisplayData = useMemo(() => {
    if (!savedBondsData?.bonds) return [];
    
    return savedBondsData.bonds.map((bond) => ({
      id: bond.metadata.id,
      name: bond.metadata.name,
      desc: `${bond.bondInfo.issuer} ${bond.bondInfo.couponRate}% ${bond.bondInfo.maturityDate}`,
      isin: bond.bondInfo.isin,
    }));
  }, [savedBondsData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="section-header">SAVED_BONDS.exe</h2>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="section-header">SAVED_BONDS.exe</h2>
        <div className="text-red-400 text-xs p-3 bg-red-900/20 border border-red-700">
          ERROR: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="section-header">SAVED_BONDS.exe</h2>
      <div className="space-y-2">
        {bondDisplayData.map((bond) => (
          <Button
            key={bond.id}
            onClick={() => onLoadBond(bond.id)}
            variant="outline"
            className="w-full text-left p-3 h-auto border-border hover:border-primary hover:bg-muted/50 transition-colors"
          >
            <div>
              <div className="font-medium terminal-text-green text-xs">
                {bond.name}
              </div>
              <div className="terminal-text-muted text-xs mt-1">
                {bond.desc}
              </div>
              {bond.isin && (
                <div className="terminal-text-muted text-xs mt-1 font-mono">
                  ISIN: {bond.isin}
                </div>
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}