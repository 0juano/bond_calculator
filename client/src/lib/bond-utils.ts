export function formatCurrency(amount: number | undefined, currency: string = "USD"): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(rate: number | undefined): string {
  if (rate === undefined || rate === null || isNaN(rate)) {
    return "0.000%";
  }
  return `${rate.toFixed(3)}%`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

export function formatNumber(num: number | undefined, decimals: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) {
    return "0" + (decimals > 0 ? "." + "0".repeat(decimals) : "");
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function safeToFixed(num: number | undefined, decimals: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) {
    return "0" + (decimals > 0 ? "." + "0".repeat(decimals) : "");
  }
  return num.toFixed(decimals);
}

export function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function getNextPaymentDate(currentDate: Date, frequency: number): Date {
  const monthsToAdd = 12 / frequency;
  return addMonths(currentDate, monthsToAdd);
}

export function validateBondDates(issueDate: string, maturityDate: string, firstCouponDate?: string): string[] {
  const errors: string[] = [];
  const issue = new Date(issueDate);
  const maturity = new Date(maturityDate);
  const firstCoupon = firstCouponDate ? new Date(firstCouponDate) : null;

  if (maturity <= issue) {
    errors.push("Maturity date must be after issue date");
  }

  if (firstCoupon && firstCoupon <= issue) {
    errors.push("First coupon date must be after issue date");
  }

  if (firstCoupon && firstCoupon >= maturity) {
    errors.push("First coupon date must be before maturity date");
  }

  return errors;
}

export function calculateYearsToMaturity(issueDate: string, maturityDate: string): number {
  const issue = new Date(issueDate);
  const maturity = new Date(maturityDate);
  const diffTime = maturity.getTime() - issue.getTime();
  return diffTime / (365.25 * 24 * 60 * 60 * 1000);
}

export function getBondTypeDisplay(bond: any): string {
  const types: string[] = [];
  
  if (bond.isCallable) types.push("CALLABLE");
  if (bond.isPuttable) types.push("PUTTABLE");
  if (bond.isAmortizing) types.push("AMORTIZING");
  if (bond.isFloating) types.push("FLOATING");
  
  return types.length > 0 ? types.join(" + ") : "VANILLA";
}

export function validateAmortizationSchedule(schedule: Array<{date: string, principalPercent: number}>, issueDate: string, maturityDate: string): string[] {
  const errors: string[] = [];
  
  if (!schedule || schedule.length === 0) {
    return errors;
  }

  const issue = new Date(issueDate);
  const maturity = new Date(maturityDate);
  let totalAmortization = 0;

  for (const amort of schedule) {
    const amortDate = new Date(amort.date);
    
    if (amortDate <= issue || amortDate >= maturity) {
      errors.push("Amortization dates must be between issue and maturity dates");
      break;
    }
    
    if (amort.principalPercent <= 0 || amort.principalPercent > 100) {
      errors.push("Amortization percentages must be between 0 and 100");
      break;
    }
    
    totalAmortization += amort.principalPercent;
  }

  if (totalAmortization > 100) {
    errors.push("Total amortization cannot exceed 100%");
  }

  return errors;
}
