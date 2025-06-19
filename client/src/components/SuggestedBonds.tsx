import { TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewport } from "@/hooks/useViewport";

interface SuggestedBond {
  id: string;
  name: string;
  description: string;
  yield?: string;
  price?: string;
}

interface SuggestedBondsProps {
  onSelect: (bondId: string) => void;
  className?: string;
}

/**
 * Suggested Bonds Component
 * Shows 2 featured bonds below the search for quick access
 */
export function SuggestedBonds({ onSelect, className }: SuggestedBondsProps) {
  const { isDesktop } = useViewport();
  
  // Featured bonds for quick access - using real saved bond IDs
  const suggestedBonds: SuggestedBond[] = [
    {
      id: "bond_1749835000_abcd123",
      name: "ARGENT 5 38",
      description: "Argentina USD 2038",
      yield: "10.88%",
      price: "72.25"
    },
    {
      id: "bond_1749832694227_8aefc56", 
      name: "ARGENT 0.75 30",
      description: "Argentina USD 2030",
      yield: "10.45%",
      price: "80.19"
    }
  ];

  return (
    <div className={cn("w-full", className)}>
      {/* Section title */}
      <h3 className="text-sm font-semibold text-terminal-accent mb-4 text-center">
        Popular Bonds
      </h3>
      
      {/* Vertical stack on mobile, horizontal grid on desktop */}
      <div className={cn(
        "space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:max-w-2xl lg:mx-auto"
      )}>
        {suggestedBonds.map((bond) => (
        <button
          key={bond.id}
          onClick={() => onSelect(bond.id)}
          className={cn(
            "w-full p-4 rounded-lg border border-terminal-line/50",
            "bg-terminal-panel/30 hover:bg-terminal-panel/50",
            "hover:border-terminal-accent/50 hover:shadow-lg",
            "transition-all duration-200 group",
            "text-left touch-manipulation",
            "min-h-[100px]" // Proper touch targets
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Star className="h-4 w-4 text-terminal-accent/60 group-hover:text-terminal-accent flex-shrink-0" />
              <h3 className="text-xs font-semibold text-terminal-accent whitespace-nowrap overflow-hidden text-ellipsis">
                {bond.name}
              </h3>
            </div>
          </div>
          
          <p className="text-xs text-terminal-txt/60 mb-3">
            {bond.description}
          </p>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-terminal-txt/40" />
              <span className="text-terminal-txt/80">YTM {bond.yield}</span>
            </div>
            <span className="text-terminal-txt/60">
              ${bond.price}
            </span>
          </div>
        </button>
      ))}
      </div>
    </div>
  );
}