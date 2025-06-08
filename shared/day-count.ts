export type DayCountConvention = '30/360' | '30E/360' | 'ACT/ACT' | 'ACT/360' | 'ACT/365' | 'BUS/252';

/**
 * Calculate year fraction between two dates using specified day count convention
 */
export function yearFrac(startDate: Date, endDate: Date, convention: DayCountConvention): number {
  switch (convention) {
    case '30/360':
      return yearFrac30360(startDate, endDate);
    case '30E/360':
      return yearFrac30E360(startDate, endDate);
    case 'ACT/ACT':
      return yearFracActualActual(startDate, endDate);
    case 'ACT/360':
      return yearFracActual360(startDate, endDate);
    case 'ACT/365':
      return yearFracActual365(startDate, endDate);
    case 'BUS/252':
      return yearFracBusiness252(startDate, endDate);
    default:
      throw new Error(`Unsupported day count convention: ${convention}`);
  }
}

/**
 * 30/360 (Bond Basis) - Standard US corporate bond convention
 */
function yearFrac30360(startDate: Date, endDate: Date): number {
  const d1 = startDate.getDate();
  const m1 = startDate.getMonth() + 1;
  const y1 = startDate.getFullYear();
  
  const d2 = endDate.getDate();
  const m2 = endDate.getMonth() + 1;
  const y2 = endDate.getFullYear();

  // 30/360 rules
  const day1 = d1 === 31 ? 30 : d1;
  const day2 = (d2 === 31 && (d1 === 30 || d1 === 31)) ? 30 : d2;

  const days = 360 * (y2 - y1) + 30 * (m2 - m1) + (day2 - day1);
  return days / 360;
}

/**
 * 30E/360 (European) - European bond convention
 */
function yearFrac30E360(startDate: Date, endDate: Date): number {
  const d1 = startDate.getDate();
  const m1 = startDate.getMonth() + 1;
  const y1 = startDate.getFullYear();
  
  const d2 = endDate.getDate();
  const m2 = endDate.getMonth() + 1;
  const y2 = endDate.getFullYear();

  // 30E/360 rules - always cap at 30
  const day1 = d1 === 31 ? 30 : d1;
  const day2 = d2 === 31 ? 30 : d2;

  const days = 360 * (y2 - y1) + 30 * (m2 - m1) + (day2 - day1);
  return days / 360;
}

/**
 * ACT/ACT - Actual days over actual days in year(s)
 */
function yearFracActualActual(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start.getFullYear() === end.getFullYear()) {
    // Same year
    const daysDiff = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    const daysInYear = isLeapYear(start.getFullYear()) ? 366 : 365;
    return daysDiff / daysInYear;
  } else {
    // Different years - more complex calculation
    let yearFraction = 0;
    let currentYear = start.getFullYear();
    let currentDate = new Date(start);
    
    while (currentYear <= end.getFullYear()) {
      const yearStart = currentYear === start.getFullYear() ? 
        new Date(start) : new Date(currentYear, 0, 1);
      const yearEnd = currentYear === end.getFullYear() ? 
        new Date(end) : new Date(currentYear + 1, 0, 1);
      
      const daysInPeriod = (yearEnd.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000);
      const daysInYear = isLeapYear(currentYear) ? 366 : 365;
      
      yearFraction += daysInPeriod / daysInYear;
      currentYear++;
    }
    
    return yearFraction;
  }
}

/**
 * ACT/360 - Actual days over 360
 */
function yearFracActual360(startDate: Date, endDate: Date): number {
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
  return daysDiff / 360;
}

/**
 * ACT/365 - Actual days over 365
 */
function yearFracActual365(startDate: Date, endDate: Date): number {
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
  return daysDiff / 365;
}

/**
 * BUS/252 - Business days over 252 (for Brazilian corporates and some EM bonds)
 * This is a simplified implementation - production would need proper holiday calendars
 */
function yearFracBusiness252(startDate: Date, endDate: Date): number {
  let businessDays = 0;
  const current = new Date(startDate);
  
  while (current < endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday or Sunday
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return businessDays / 252;
}

/**
 * Check if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Add period to date respecting end-of-month rules
 */
export function addPeriod(
  date: Date, 
  months: number, 
  endOfMonthRule: boolean = true
): Date {
  const result = new Date(date);
  const originalDay = date.getDate();
  const originalMonth = date.getMonth();
  const originalYear = date.getFullYear();
  
  // Add months
  result.setMonth(originalMonth + months);
  
  // Handle end-of-month rule
  if (endOfMonthRule && isEndOfMonth(date)) {
    // If original date was end of month, set to end of target month
    result.setMonth(result.getMonth() + 1, 0); // Set to last day of month
  } else if (result.getDate() !== originalDay) {
    // Day rolled over due to shorter month, set to last day of month
    result.setDate(0);
  }
  
  return result;
}

/**
 * Check if date is end of month
 */
function isEndOfMonth(date: Date): boolean {
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return date.getDate() === lastDayOfMonth;
} 