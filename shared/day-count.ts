import Decimal from 'decimal.js';

/**
 * Day count convention interface for calculating year fractions
 */
export interface DayCountConvention {
  code: '30/360' | '30E/360' | 'ACT/ACT' | 'ACT/365' | 'BUS/252';
  description: string;
  yearFraction(startDate: Date, endDate: Date): Decimal;
}

/**
 * Utility functions for date calculations
 */
export function daysBetween(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export function isBusinessDay(date: Date, holidays: Date[] = []): boolean {
  if (isWeekend(date)) return false;
  
  // Check if date is in holidays list
  const dateStr = date.toISOString().split('T')[0];
  return !holidays.some(holiday => 
    holiday.toISOString().split('T')[0] === dateStr
  );
}

export function businessDaysBetween(
  startDate: Date, 
  endDate: Date, 
  holidays: Date[] = []
): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    if (isBusinessDay(current, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Add business days to a date, skipping weekends and holidays
 */
export function addBusinessDays(
  startDate: Date, 
  businessDays: number, 
  holidays: Date[] = []
): Date {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < businessDays) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result, holidays)) {
      addedDays++;
    }
  }
  
  return result;
}

/**
 * Get settlement date as T+1 business days from today
 */
export function getDefaultSettlementDate(holidays: Date[] = []): string {
  const today = new Date();
  const settlementDate = addBusinessDays(today, 1, holidays);
  return settlementDate.toISOString().split('T')[0];
}

/**
 * 30/360 Day Count Convention (Bond Basis)
 * Assumes 30 days per month and 360 days per year
 */
export class Thirty360Convention implements DayCountConvention {
  code = '30/360' as const;
  description = '30/360 Bond Basis - 30 days per month, 360 days per year';

  yearFraction(startDate: Date, endDate: Date): Decimal {
    const d1 = startDate.getDate();
    const m1 = startDate.getMonth() + 1;
    const y1 = startDate.getFullYear();
    
    const d2 = endDate.getDate();
    const m2 = endDate.getMonth() + 1;
    const y2 = endDate.getFullYear();
    
    // Adjust day counts according to 30/360 rules
    let adjustedD1 = d1;
    let adjustedD2 = d2;
    
    if (d1 === 31) adjustedD1 = 30;
    if (d2 === 31 && adjustedD1 === 30) adjustedD2 = 30;
    
    const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (adjustedD2 - adjustedD1);
    return new Decimal(days).div(360);
  }
}

/**
 * 30E/360 Day Count Convention (European)
 * European version of 30/360 with different end-of-month rules
 */
export class Thirty360EuropeanConvention implements DayCountConvention {
  code = '30E/360' as const;
  description = '30E/360 European - Modified 30/360 with European rules';

  yearFraction(startDate: Date, endDate: Date): Decimal {
    const d1 = Math.min(startDate.getDate(), 30);
    const m1 = startDate.getMonth() + 1;
    const y1 = startDate.getFullYear();
    
    const d2 = Math.min(endDate.getDate(), 30);
    const m2 = endDate.getMonth() + 1;
    const y2 = endDate.getFullYear();
    
    const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
    return new Decimal(days).div(360);
  }
}

/**
 * ACT/ACT Day Count Convention (ISDA)
 * Actual days divided by actual days in year
 */
export class ActualActualConvention implements DayCountConvention {
  code = 'ACT/ACT' as const;
  description = 'Actual/Actual ISDA - Actual days divided by actual days in year';

  yearFraction(startDate: Date, endDate: Date): Decimal {
    const actualDays = daysBetween(startDate, endDate);
    
    // For periods spanning multiple years, calculate weighted average
    if (startDate.getFullYear() !== endDate.getFullYear()) {
      let totalFraction = new Decimal(0);
      const current = new Date(startDate);
      
      while (current.getFullYear() <= endDate.getFullYear()) {
        const yearStart = new Date(current.getFullYear(), 0, 1);
        const yearEnd = new Date(current.getFullYear() + 1, 0, 1);
        
        const periodStart = current.getTime() > startDate.getTime() ? yearStart : startDate;
        const periodEnd = yearEnd.getTime() < endDate.getTime() ? yearEnd : endDate;
        
        if (periodStart < periodEnd) {
          const periodDays = daysBetween(periodStart, periodEnd);
          const yearDays = this.isLeapYear(current.getFullYear()) ? 366 : 365;
          totalFraction = totalFraction.plus(new Decimal(periodDays).div(yearDays));
        }
        
        current.setFullYear(current.getFullYear() + 1);
      }
      
      return totalFraction;
    } else {
      // Same year - simple calculation
      const yearDays = this.isLeapYear(startDate.getFullYear()) ? 366 : 365;
      return new Decimal(actualDays).div(yearDays);
    }
  }

  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
}

/**
 * ACT/365 Day Count Convention (Fixed)
 * Actual days divided by 365 (fixed)
 */
export class Actual365Convention implements DayCountConvention {
  code = 'ACT/365' as const;
  description = 'Actual/365 Fixed - Actual days divided by 365';

  yearFraction(startDate: Date, endDate: Date): Decimal {
    const actualDays = daysBetween(startDate, endDate);
    return new Decimal(actualDays).div(365);
  }
}

/**
 * BUS/252 Day Count Convention (Brazilian)
 * Business days divided by 252 (typical business days per year)
 */
export class Business252Convention implements DayCountConvention {
  code = 'BUS/252' as const;
  description = 'Business/252 - Business days divided by 252 (Brazilian standard)';

  constructor(private holidays: Date[] = []) {}

  yearFraction(startDate: Date, endDate: Date): Decimal {
    const businessDays = businessDaysBetween(startDate, endDate, this.holidays);
    return new Decimal(businessDays).div(252);
  }
}

/**
 * Factory function to get day count convention by code
 */
export function getDayCountConvention(
  code: string, 
  holidays: Date[] = []
): DayCountConvention {
  switch (code) {
    case '30/360':
      return new Thirty360Convention();
    case '30E/360':
      return new Thirty360EuropeanConvention();
    case 'ACT/ACT':
      return new ActualActualConvention();
    case 'ACT/365':
      return new Actual365Convention();
    case 'BUS/252':
      return new Business252Convention(holidays);
    default:
      throw new Error(`Unsupported day count convention: ${code}`);
  }
}

/**
 * Get all available day count conventions
 */
export function getAvailableConventions(): Array<{
  code: string;
  description: string;
  region: string;
}> {
  return [
    { code: '30/360', description: '30/360 Bond Basis', region: 'US Corporate' },
    { code: '30E/360', description: '30E/360 European', region: 'European' },
    { code: 'ACT/ACT', description: 'Actual/Actual ISDA', region: 'Government Bonds' },
    { code: 'ACT/365', description: 'Actual/365 Fixed', region: 'Money Markets' },
    { code: 'BUS/252', description: 'Business/252', region: 'Brazilian Markets' },
  ];
} 