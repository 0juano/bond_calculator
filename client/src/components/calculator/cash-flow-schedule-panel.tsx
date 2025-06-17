import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Maximize2, CalendarDays } from "lucide-react";
import { CashFlowResult } from "@shared/schema";
import { formatCurrency, formatDate, formatNumber } from "@/lib/bond-utils";

interface CashFlowSchedulePanelProps {
  cashFlows: CashFlowResult[];
  isLoading: boolean;
  bond?: {
    faceValue?: number | string;
    paymentFrequency?: number;
    couponRate?: number | string;
    couponRateChanges?: Array<{ effectiveDate: string; newCouponRate: number }>;
  };
  className?: string;
}

export function CashFlowSchedulePanel({ cashFlows, isLoading, bond, className }: CashFlowSchedulePanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Show next 8 payments in the compact view
  const compactCashFlows = cashFlows.slice(0, 8);
  const hasMoreFlows = cashFlows.length > 8;

  // Calculate summary
  const totalCouponPayments = cashFlows.reduce((sum, cf) => sum + (cf.couponPayment || 0), 0);
  const totalPrincipalPayments = cashFlows.reduce((sum, cf) => sum + (cf.principalPayment || 0), 0);
  const totalPayments = totalCouponPayments + totalPrincipalPayments;

  const CashFlowRows = ({ flows, showAll = false }: { flows: CashFlowResult[], showAll?: boolean }) => (
    <>
      {flows.map((payment, index) => (
        <TableRow key={index} className="border-green-800/30 hover:bg-gray-800/30">
          <TableCell className="font-mono text-xs text-green-400 px-2 py-1">
            {formatDate(payment.date)}
          </TableCell>
          <TableCell className="font-mono text-xs text-green-400 text-right px-2 py-1">
            {formatNumber(payment.couponPayment || 0, 2)}
          </TableCell>
          <TableCell className="font-mono text-xs text-green-400 text-right px-2 py-1">
            {formatNumber(payment.principalPayment || 0, 2)}
          </TableCell>
          <TableCell className="font-mono text-xs text-green-400 text-right px-2 py-1 font-medium">
            {formatNumber((payment.couponPayment || 0) + (payment.principalPayment || 0), 2)}
          </TableCell>
          {showAll && (
            <TableCell className="font-mono text-xs text-gray-400 text-right px-2 py-1">
              {formatNumber(payment.remainingNotional || 0, 2)}
            </TableCell>
          )}
        </TableRow>
      ))}
    </>
  );

  if (isLoading) {
    return (
      <Card className={`bg-gray-900 border-green-600 h-full ${className}`}>
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
      <Card className={`bg-gray-900 border-green-600 h-full ${className}`}>
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

  return (
    <Card className={`bg-gray-900 border-green-600 ${className}`}>
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
            <DialogContent className="max-w-4xl max-h-[80vh] bg-gray-900 border-green-600">
              <DialogHeader>
                <DialogTitle className="text-green-400">Complete Cash Flow Schedule</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-green-800/30 hover:bg-transparent">
                      <TableHead className="text-green-400 font-mono text-xs">Date</TableHead>
                      <TableHead className="text-green-400 font-mono text-xs text-right">Coupon</TableHead>
                      <TableHead className="text-green-400 font-mono text-xs text-right">Principal</TableHead>
                      <TableHead className="text-green-400 font-mono text-xs text-right">Total</TableHead>
                      <TableHead className="text-green-400 font-mono text-xs text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <CashFlowRows flows={cashFlows} showAll={true} />
                  </TableBody>
                </Table>
              </div>
              <div className="border-t border-green-800/30 pt-4 mt-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-gray-400">Total Coupons</div>
                    <div className="text-green-400 font-mono">{formatNumber(totalCouponPayments, 2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">Total Principal</div>
                    <div className="text-green-400 font-mono">{formatNumber(totalPrincipalPayments, 2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400">Total Payments</div>
                    <div className="text-green-400 font-mono font-medium">{formatNumber(totalPayments, 2)}</div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-green-800/30 hover:bg-transparent">
                <TableHead className="text-green-400 font-mono text-xs h-8 px-2">Date</TableHead>
                <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-right">Coupon</TableHead>
                <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-right">Principal</TableHead>
                <TableHead className="text-green-400 font-mono text-xs h-8 px-2 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <CashFlowRows flows={compactCashFlows} />
              {hasMoreFlows && (
                <TableRow className="border-green-800/30">
                  <TableCell colSpan={4} className="text-center py-2">
                    <span className="text-gray-400 text-xs">
                      ... and {cashFlows.length - 8} more payments
                    </span>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}