import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Maximize2, CalendarDays } from "lucide-react";
import { CashFlowResult } from "@shared/schema";
import { formatNumber, formatDate, formatPercent } from "@/lib/bond-utils";

interface CashFlowSchedulePanelProps {
  cashFlows: CashFlowResult[];
  isLoading: boolean;
  settlementDate?: string;
  bond?: {
    faceValue?: number | string;
    paymentFrequency?: number;
    couponRate?: number | string;
    couponRateChanges?: Array<{ effectiveDate: string; newCouponRate: number }>;
  };
  className?: string;
}

export function CashFlowSchedulePanel({ cashFlows, isLoading, settlementDate, bond, className }: CashFlowSchedulePanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filter to show only future payments
  const today = settlementDate ? new Date(settlementDate) : new Date();
  const futureFlows = cashFlows.filter(cf => new Date(cf.date) > today);
  
  // Get original principal for percentage calculations
  const originalPrincipal = cashFlows.length > 0 ? (cashFlows[0].remainingNotional || 0) + (cashFlows[0].principalPayment || 0) : 0;
  
  // Function to get coupon rate for a specific date
  const getCouponRateForDate = (date: string): number => {
    if (!bond) return 0;
    
    const paymentDate = new Date(date);
    let currentRate = typeof bond.couponRate === 'string' ? parseFloat(bond.couponRate) : (bond.couponRate || 0);
    
    if (bond.couponRateChanges) {
      // Find the applicable coupon rate for this payment date
      const sortedChanges = [...bond.couponRateChanges].sort((a, b) => 
        new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
      );
      
      for (const change of sortedChanges) {
        const changeDate = new Date(change.effectiveDate);
        if (paymentDate >= changeDate) {
          currentRate = change.newCouponRate;
        }
      }
    }
    
    return currentRate;
  };

  // Calculate remaining percentage
  const calculateRemainingPercent = (remainingNotional: number): number => {
    if (originalPrincipal === 0) return 0;
    return (remainingNotional / originalPrincipal) * 100;
  };

  // Compact table for the panel (4 columns)
  const CompactTable = ({ flows }: { flows: CashFlowResult[] }) => (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="border-green-800/30 hover:bg-transparent">
          <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center">Date</TableHead>
          <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center">Coupon</TableHead>
          <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center">Principal</TableHead>
          <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-center">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flows.map((payment, index) => (
          <TableRow key={index} className="border-green-800/30 hover:bg-gray-800/30">
            <TableCell className="font-mono text-xs text-green-400 px-2 py-1 text-center align-middle">
              {formatDate(payment.date)}
            </TableCell>
            <TableCell className="font-mono text-xs text-green-400 px-2 py-1 text-center align-middle">
              {formatNumber(payment.couponPayment || 0, 2)}
            </TableCell>
            <TableCell className="font-mono text-xs text-green-400 px-2 py-1 text-center align-middle">
              {formatNumber(payment.principalPayment || 0, 2)}
            </TableCell>
            <TableCell className="font-mono text-xs text-green-400 px-2 py-1 text-center align-middle font-medium">
              {formatNumber((payment.couponPayment || 0) + (payment.principalPayment || 0), 2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // Extended table for the modal (6 columns)
  const ExtendedTable = ({ flows }: { flows: CashFlowResult[] }) => (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="border-green-800/30 hover:bg-transparent">
          <TableHead className="text-green-400 font-mono text-sm text-center">Date</TableHead>
          <TableHead className="text-green-400 font-mono text-sm text-center">Coupon %</TableHead>
          <TableHead className="text-green-400 font-mono text-sm text-center">Coupon $</TableHead>
          <TableHead className="text-green-400 font-mono text-sm text-center">Principal $</TableHead>
          <TableHead className="text-green-400 font-mono text-sm text-center">Total $</TableHead>
          <TableHead className="text-green-400 font-mono text-sm text-center">Remaining %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flows.map((payment, index) => (
          <TableRow key={index} className="border-green-800/30 hover:bg-gray-800/30">
            <TableCell className="font-mono text-sm text-green-400 px-3 py-2 text-center align-middle">
              {formatDate(payment.date)}
            </TableCell>
            <TableCell className="font-mono text-sm text-green-400 px-3 py-2 text-center align-middle">
              {formatPercent(getCouponRateForDate(payment.date), 2)}
            </TableCell>
            <TableCell className="font-mono text-sm text-green-400 px-3 py-2 text-center align-middle">
              {formatNumber(payment.couponPayment || 0, 2)}
            </TableCell>
            <TableCell className="font-mono text-sm text-green-400 px-3 py-2 text-center align-middle">
              {formatNumber(payment.principalPayment || 0, 2)}
            </TableCell>
            <TableCell className="font-mono text-sm text-green-400 px-3 py-2 text-center align-middle font-medium">
              {formatNumber((payment.couponPayment || 0) + (payment.principalPayment || 0), 2)}
            </TableCell>
            <TableCell className="font-mono text-sm text-green-400 px-3 py-2 text-center align-middle">
              {formatPercent(calculateRemainingPercent(payment.remainingNotional || 0), 2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <Card className={`bg-gray-900 border-green-600 ${className}`}>
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Cash-Flow Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-green-400 border-t-transparent rounded-full mr-2"></div>
            <span className="text-gray-400">Loading cash flows...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cashFlows.length) {
    return (
      <Card className={`bg-gray-900 border-green-600 ${className}`}>
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Cash-Flow Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CalendarDays className="h-8 w-8 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No cash flows available</p>
            <p className="text-sm text-gray-500">Enter pricing data to generate schedule</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!futureFlows.length) {
    return (
      <Card className={`bg-gray-900 border-green-600 ${className}`}>
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Cash-Flow Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CalendarDays className="h-8 w-8 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No future payments</p>
            <p className="text-sm text-gray-500">All payments are in the past</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gray-900 border-green-600 flex flex-col ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-green-400 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Cash-Flow Schedule
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <Maximize2 className="h-3 w-3 mr-1" />
                Enlarge
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-6xl h-[80vh] bg-gray-900 border-green-600">
              <DialogHeader>
                <DialogTitle className="text-green-400">Complete Cash Flow Schedule</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto p-4">
                <ExtendedTable flows={futureFlows} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="overflow-hidden">
          <CompactTable flows={futureFlows} />
          {futureFlows.length > 0 && (
            <div className="mt-2 text-center">
              <span className="text-xs text-gray-500">
                Showing {futureFlows.length} future payment{futureFlows.length !== 1 ? 's' : ''}
                {cashFlows.length > futureFlows.length && (
                  <span> ({cashFlows.length - futureFlows.length} past payment{cashFlows.length - futureFlows.length !== 1 ? 's' : ''} hidden)</span>
                )}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}