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
  };
  bondInfo: {
    issuer: string;
    couponRate: number;
    maturityDate: string;
    isin?: string;
  };
  category?: string;
}

export default function SavedBonds({ onLoadBond }: SavedBondsProps) {
  const { data: savedBondsData, isLoading } = useQuery<{bonds: SavedBondInfo[]}>({
    queryKey: ["/api/bonds/saved"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bonds/saved");
      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });

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

  const bondDisplayData = savedBondsData?.bonds 
    ? savedBondsData.bonds.map((bond) => ({
        id: bond.metadata.id,
        name: bond.metadata.name,
        desc: `${bond.bondInfo.issuer} ${bond.bondInfo.couponRate}% ${bond.bondInfo.maturityDate}`,
        isin: bond.bondInfo.isin,
      }))
    : [];

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
                <div className="terminal-text-muted text-xs mt-1">
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
