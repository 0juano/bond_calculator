import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

interface InfoTooltipProps {
  text: string;
  className?: string;
}

/**
 * Reusable info tooltip component that shows an info icon
 * with explanatory text on hover
 */
export function InfoTooltip({ text, className }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-3 w-3 text-gray-400 hover:text-gray-300 cursor-help ${className}`}
          aria-label="More information"
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipPrimitive.Portal>
        <TooltipContent 
          side="top" 
          className="max-w-xs z-[60] bg-gray-800 border border-gray-600 text-gray-100 px-2 py-1 rounded shadow-lg"
          sideOffset={5}
          avoidCollisions={true}
          collisionPadding={10}
        >
          <p className="text-xs whitespace-pre-wrap">{text}</p>
        </TooltipContent>
      </TooltipPrimitive.Portal>
    </Tooltip>
  );
}