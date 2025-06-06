import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { CashFlowResult } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/bond-utils";

interface CashFlowTableProps {
  cashFlows: CashFlowResult[];
  isLoading: boolean;
}

export default function CashFlowTable({ cashFlows, isLoading }: CashFlowTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const summary = useMemo(() => {
    if (!cashFlows.length) return null;
    
    const totalCoupons = cashFlows.reduce((sum, flow) => sum + flow.couponPayment, 0);
    const totalPrincipal = cashFlows.reduce((sum, flow) => sum + flow.principalPayment, 0);
    const paymentCount = cashFlows.length;
    
    return { totalCoupons, totalPrincipal, paymentCount };
  }, [cashFlows]);

  const getPaymentTypeStyle = (type: string) => {
    switch (type) {
      case "COUPON":
        return "terminal-text-blue";
      case "AMORTIZATION":
        return "terminal-text-amber";
      case "CALL":
        return "terminal-text-red";
      case "PUT":
        return "terminal-text-purple";
      case "MATURITY":
        return "terminal-text-green";
      default:
        return "terminal-text-muted";
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "COUPON":
        return "CPN";
      case "AMORTIZATION":
        return "AMT";
      case "CALL":
        return "CALL";
      case "PUT":
        return "PUT";
      case "MATURITY":
        return "MAT";
      default:
        return type;
    }
  };

  // Reusable table component for both inline and dialog views
  const CashFlowTableContent = ({ maxHeight = "max-h-96" }: { maxHeight?: string }) => (
    <div className="terminal-panel">
      <div className={`${maxHeight} overflow-y-auto terminal-scrollbar`}>
        <Table className="terminal-table">
          <TableHeader className="sticky top-0 bg-card">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-xs font-bold terminal-text-green w-24">DATE</TableHead>
              <TableHead className="text-xs font-bold terminal-text-green text-right w-20">COUPON</TableHead>
              <TableHead className="text-xs font-bold terminal-text-green text-right w-20">PRINCIPAL</TableHead>
              <TableHead className="text-xs font-bold terminal-text-green text-right w-24">TOTAL</TableHead>
              <TableHead className="text-xs font-bold terminal-text-green text-right w-24">REMAINING</TableHead>
              <TableHead className="text-xs font-bold terminal-text-green text-center w-16">TYPE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashFlows.map((flow, index) => (
              <TableRow 
                key={index} 
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <TableCell className="text-xs font-mono">
                  {formatDate(flow.date)}
                </TableCell>
                <TableCell className="text-xs font-mono text-right">
                  {formatCurrency(flow.couponPayment)}
                </TableCell>
                <TableCell className="text-xs font-mono text-right">
                  {formatCurrency(flow.principalPayment)}
                </TableCell>
                <TableCell className="text-xs font-mono text-right font-semibold terminal-text-green">
                  {formatCurrency(flow.totalPayment)}
                </TableCell>
                <TableCell className="text-xs font-mono text-right">
                  {formatCurrency(flow.remainingNotional)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-1 py-0 ${getPaymentTypeStyle(flow.paymentType)}`}
                  >
                    {getPaymentTypeLabel(flow.paymentType)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {summary && (
        <div className="border-t border-border p-3 bg-muted/30">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="terminal-text-muted">Total Payments:</span>
              <span className="ml-2 font-mono font-semibold terminal-text-green">
                {summary.paymentCount}
              </span>
            </div>
            <div>
              <span className="terminal-text-muted">Total Coupons:</span>
              <span className="ml-2 font-mono font-semibold terminal-text-blue">
                {formatCurrency(summary.totalCoupons)}
              </span>
            </div>
            <div>
              <span className="terminal-text-muted">Total Principal:</span>
              <span className="ml-2 font-mono font-semibold terminal-text-amber">
                {formatCurrency(summary.totalPrincipal)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-header">[CASH_FLOW_SCHEDULE]</h3>
        </div>
        <div className="terminal-panel p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!cashFlows.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-header">[CASH_FLOW_SCHEDULE]</h3>
        </div>
        <div className="terminal-panel p-8 text-center">
          <div className="terminal-text-muted text-sm">
            No cash flows generated. Build a bond to see cash flow schedule.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="section-header">[CASH_FLOW_SCHEDULE]</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted terminal-text-green hover:terminal-text-amber"
              title="Expand cash flow schedule"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl w-[95vw] h-[90vh] terminal-panel">
            <DialogHeader>
              <DialogTitle className="section-header">[CASH_FLOW_SCHEDULE_EXPANDED]</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <CashFlowTableContent maxHeight="h-full" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <CashFlowTableContent />
    </div>
  );
}