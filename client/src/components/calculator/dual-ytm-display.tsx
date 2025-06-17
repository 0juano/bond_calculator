/**
 * Dual YTM Display Component - Shows both current and XIRR YTM results
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface DualYTMDisplayProps {
  primaryYTM: number;
  secondaryYTM: number;
  primaryAlgorithm: string;
  secondaryAlgorithm: string;
  discrepancyBP: number;
  showComparison?: boolean;
}

export function DualYTMDisplay({
  primaryYTM,
  secondaryYTM,
  primaryAlgorithm,
  secondaryAlgorithm,
  discrepancyBP,
  showComparison = false
}: DualYTMDisplayProps) {
  
  const formatYTM = (ytm: number) => `${ytm.toFixed(3)}%`;
  const getDiscrepancyColor = (bp: number) => {
    if (bp < 5) return 'bg-green-100 text-green-800';
    if (bp < 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (!showComparison) {
    // Single YTM display (production mode)
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold">{formatYTM(primaryYTM)}</span>
          <InfoTooltip text="Yield to Maturity - The annualized return if held to maturity" />
        </div>
        <div className="text-xs text-gray-500">
          Semi-annual compounding
        </div>
      </div>
    );
  }

  // Dual display mode (development/comparison)
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">YTM Comparison</h4>
          <InfoTooltip text="Comparing two YTM calculation methods during validation phase" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{primaryAlgorithm}:</span>
            <span className="font-semibold">{formatYTM(primaryYTM)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{secondaryAlgorithm}:</span>
            <span className="font-semibold">{formatYTM(secondaryYTM)}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-xs text-gray-500">Discrepancy:</span>
          <Badge className={getDiscrepancyColor(discrepancyBP)}>
            {discrepancyBP.toFixed(1)} bp
          </Badge>
        </div>
        
        <div className="text-xs text-gray-400">
          ⓘ Both results shown during algorithm evaluation
        </div>
      </CardContent>
    </Card>
  );
}