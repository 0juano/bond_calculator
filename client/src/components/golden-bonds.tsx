import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

interface GoldenBondsProps {
  onLoadBond: (bondId: string) => void;
}

interface GoldenBondInfo {
  name: string;
  description: string;
  maturity: string;
}

export default function GoldenBonds({ onLoadBond }: GoldenBondsProps) {
  const { data: goldenBonds, isLoading } = useQuery<Record<string, GoldenBondInfo>>({
    queryKey: ["/api/bonds/golden"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bonds/golden");
      return response.json();
    },
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="section-header">GOLDEN_BONDS.exe</h2>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const bondDisplayData = goldenBonds 
    ? Object.entries(goldenBonds).map(([id, bond]) => ({
        id,
        name: bond.name,
        desc: bond.description,
      }))
    : [];

  return (
    <div className="space-y-4">
      <h2 className="section-header">GOLDEN_BONDS.exe</h2>
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
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
