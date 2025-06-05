import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

interface GoldenBondsProps {
  onLoadBond: (bondId: string) => void;
}

export default function GoldenBonds({ onLoadBond }: GoldenBondsProps) {
  const { data: goldenBonds, isLoading } = useQuery({
    queryKey: ["/api/bonds/golden"],
    staleTime: Infinity,
  });

  const bondDisplayData = [
    { id: "vanilla-5y", name: "VANILLA_5Y_5PCT", desc: "Plain 5% 5-year USD" },
    { id: "amortizing-10y", name: "AMORT_10Y_4.5PCT", desc: "Amortizing 4.5% 10-year" },
    { id: "callable-7y", name: "CALLABLE_7Y_6PCT", desc: "Callable 6% 7-year USD" },
    { id: "puttable-3y", name: "PUTTABLE_15Y_3.75PCT", desc: "Puttable 3.75% 15-year" },
    { id: "complex-combo", name: "COMBO_20Y_COMPLEX", desc: "Amort+Call+Put complex" },
  ];

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
