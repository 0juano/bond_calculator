import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Bond definition schema
export const bonds = pgTable("bonds", {
  id: serial("id").primaryKey(),
  issuer: text("issuer").notNull(),
  cusip: text("cusip"),
  isin: text("isin"),
  faceValue: decimal("face_value", { precision: 15, scale: 2 }).notNull(),
  couponRate: decimal("coupon_rate", { precision: 8, scale: 5 }).notNull(),
  issueDate: text("issue_date").notNull(),
  maturityDate: text("maturity_date").notNull(),
  firstCouponDate: text("first_coupon_date"),
  paymentFrequency: integer("payment_frequency").notNull().default(2), // Semi-annual
  dayCountConvention: text("day_count_convention").notNull().default("30/360"),
  currency: text("currency").notNull().default("USD"),
  isAmortizing: boolean("is_amortizing").default(false),
  isCallable: boolean("is_callable").default(false),
  isPuttable: boolean("is_puttable").default(false),
  isVariableCoupon: boolean("is_variable_coupon").default(false),
  settlementDays: integer("settlement_days").default(3),
  amortizationSchedule: jsonb("amortization_schedule").$type<AmortizationRow[]>(),
  callSchedule: jsonb("call_schedule").$type<CallRow[]>(),
  putSchedule: jsonb("put_schedule").$type<PutRow[]>(),
  couponRateChanges: jsonb("coupon_rate_changes").$type<CouponRateChangeRow[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cash flow result schema
export const cashFlows = pgTable("cash_flows", {
  id: serial("id").primaryKey(),
  bondId: integer("bond_id").references(() => bonds.id),
  date: text("date").notNull(),
  couponPayment: decimal("coupon_payment", { precision: 15, scale: 2 }).default("0"),
  principalPayment: decimal("principal_payment", { precision: 15, scale: 2 }).default("0"),
  totalPayment: decimal("total_payment", { precision: 15, scale: 2 }).notNull(),
  remainingNotional: decimal("remaining_notional", { precision: 15, scale: 2 }).notNull(),
  paymentType: text("payment_type").notNull(), // COUPON, AMORTIZATION, CALL, PUT, MATURITY
});

// Supporting types for schedules
export interface AmortizationRow {
  date: string;
  principalPercent: number;
}

export interface CallRow {
  firstCallDate: string;
  lastCallDate: string;
  callPrice: number;
}

export interface PutRow {
  firstPutDate: string;
  lastPutDate: string;
  putPrice: number;
}

export interface CouponRateChangeRow {
  effectiveDate: string;
  newCouponRate: number;
}

// Cash flow calculation result
export interface CashFlowResult {
  date: string;
  couponPayment: number;
  principalPayment: number;
  totalPayment: number;
  remainingNotional: number;
  paymentType: string;
}

// Bond analytics result
export interface BondAnalytics {
  // Existing metrics
  yieldToWorst: number;
  duration: number;          // Modified Duration
  averageLife: number;
  convexity: number;
  totalCoupons: number;
  presentValue: number;
  
  // New missing metrics
  yieldToMaturity: number;        // Separate from YTW for callable bonds
  macaulayDuration: number;       // Explicit Macaulay Duration
  marketPrice: number;            // Current market price
  cleanPrice: number;             // Price without accrued interest
  dirtyPrice: number;             // Price with accrued interest
  accruedInterest: number;        // Interest accrued since last payment
  daysToNextCoupon: number;       // Days until next coupon payment
  dollarDuration: number;         // DV01 - dollar duration
  optionAdjustedSpread?: number;  // For bonds with embedded options
  
  // Additional useful metrics
  currentYield: number;           // Annual coupon / market price
  yieldToCall?: number;           // For callable bonds
  yieldToPut?: number;           // For puttable bonds
  
  // Spread metrics
  spread?: number;                // Spread over interpolated Treasury curve
}

// Complete bond result with cash flows and analytics
export interface BondResult {
  bond: BondDefinition;
  cashFlows: CashFlowResult[];
  analytics: BondAnalytics;
  buildTime: number;
  status: string;
}

// Validation response
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

// Insert schemas
export const insertBondSchema = createInsertSchema(bonds).omit({
  id: true,
  createdAt: true,
}).extend({
  faceValue: z.number().positive(),
  couponRate: z.number().min(0).max(50),
  paymentFrequency: z.number().int().min(1).max(12),
  settlementDays: z.number().int().min(0).max(30).optional().default(3),
  settlementDate: z.string().optional(), // Add settlement date for calculations
  marketPrice: z.number().positive().optional(), // Market price for yield calculations
  targetYield: z.number().min(0).max(50).optional(), // Target yield for price calculations
  isin: z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, "ISIN must be 12 characters (2 letters, 9 alphanumeric, 1 digit)").optional().or(z.literal("")),
  amortizationSchedule: z.array(z.object({
    date: z.string(),
    principalPercent: z.number().min(0).max(100),
  })).optional(),
  callSchedule: z.array(z.object({
    firstCallDate: z.string(),
    lastCallDate: z.string(),
    callPrice: z.number().positive(),
  })).optional(),
  putSchedule: z.array(z.object({
    firstPutDate: z.string(),
    lastPutDate: z.string(),
    putPrice: z.number().positive(),
  })).optional(),
  couponRateChanges: z.array(z.object({
    effectiveDate: z.string(),
    newCouponRate: z.number().min(0).max(50),
  })).optional(),
});

export const insertCashFlowSchema = createInsertSchema(cashFlows).omit({
  id: true,
});

// UST Curve Types
export interface USTCurveData {
  recordDate: string; // Date when Treasury rates were recorded (market date)
  tenors: Record<string, number>; // tenor -> yield %
  marketTime?: string; // When the Treasury actually published this data
}

export interface USTCurvePoint {
  tenor: string;
  maturityYears: number;
  yieldPercent: number;
}

export interface USTCurveResponse extends USTCurveData {
  cached: boolean;
  stale?: boolean;
  cacheAge?: number;
  warning?: string;
}

// Types
export type BondDefinition = typeof bonds.$inferSelect;
export type InsertBond = z.infer<typeof insertBondSchema>;
export type CashFlow = typeof cashFlows.$inferSelect;
export type InsertCashFlow = z.infer<typeof insertCashFlowSchema>;

// IMPORTANT: All couponRate and couponRateChanges must be in percentage format (e.g., 5.0 for 5%, 0.5 for 0.5%). Never use decimals (e.g., 0.05 for 5%).
export const GOLDEN_BONDS = {
  "vanilla-5y": {
    issuer: "US TREASURY",
    cusip: "912828XM7",
    isin: "US9128283M71",
    faceValue: 1000,
    couponRate: 5.0,
    issueDate: "2024-01-15",
    maturityDate: "2029-01-15",
    firstCouponDate: "2024-07-15",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: false,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: false,
    settlementDays: 3,
  },
  "amortizing-10y": {
    issuer: "CORPORATE BONDS INC",
    cusip: "123456789",
    isin: "US1234567890",
    faceValue: 1000,
    couponRate: 4.5,
    issueDate: "2024-01-15",
    maturityDate: "2034-01-15",
    firstCouponDate: "2024-07-15",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: false,
    settlementDays: 3,
    amortizationSchedule: [
      { date: "2027-01-15", principalPercent: 25 },
      { date: "2030-01-15", principalPercent: 25 },
      { date: "2032-01-15", principalPercent: 25 },
    ],
  },
  "callable-7y": {
    issuer: "MUNICIPAL AUTHORITY",
    cusip: "987654321",
    isin: "US9876543210",
    faceValue: 1000,
    couponRate: 5.25,
    issueDate: "2024-01-15",
    maturityDate: "2031-01-15",
    firstCouponDate: "2024-07-15",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: false,
    isCallable: true,
    isPuttable: false,
    isVariableCoupon: false,
    settlementDays: 3,
    callSchedule: [
      { firstCallDate: "2027-01-15", lastCallDate: "2031-01-15", callPrice: 102.5 },
    ],
  },
  "puttable-3y": {
    issuer: "BANK OF AMERICA",
    cusip: "456789123",
    isin: "US4567891234",
    faceValue: 1000,
    couponRate: 3.75,
    issueDate: "2024-01-15",
    maturityDate: "2027-01-15",
    firstCouponDate: "2024-07-15",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: false,
    isCallable: false,
    isPuttable: true,
    isVariableCoupon: false,
    settlementDays: 3,
    putSchedule: [
      { firstPutDate: "2025-01-15", lastPutDate: "2026-01-15", putPrice: 98.0 },
    ],
  },
  "variable-step-up": {
    issuer: "TREASURY STEP UP CORP",
    cusip: "987654321",
    isin: "US9876543210",
    faceValue: 1000,
    couponRate: 3.0,
    issueDate: "2024-01-15",
    maturityDate: "2029-01-15",
    firstCouponDate: "2024-07-15",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: false,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: true,
    settlementDays: 3,
    couponRateChanges: [
      { effectiveDate: "2025-01-15", newCouponRate: 4.0 },
      { effectiveDate: "2026-01-15", newCouponRate: 5.0 },
      { effectiveDate: "2027-01-15", newCouponRate: 5.5 },
    ],
  },
  "al30d-argentina": {
    issuer: "REPUBLIC OF ARGENTINA",
    isin: "ARARGE3209S6",
    cusip: null,
    faceValue: 1000,
    couponRate: 0.125,
    issueDate: "2020-09-04",
    maturityDate: "2030-07-09",
    firstCouponDate: "2021-07-09",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: true,
    settlementDays: 2,
    amortizationSchedule: [
      { date: "2024-07-09", principalPercent: 4 },
      { date: "2025-01-09", principalPercent: 8 },
      { date: "2025-07-09", principalPercent: 8 },
      { date: "2026-01-09", principalPercent: 8 },
      { date: "2026-07-09", principalPercent: 8 },
      { date: "2027-01-09", principalPercent: 8 },
      { date: "2027-07-09", principalPercent: 8 },
      { date: "2028-01-09", principalPercent: 8 },
      { date: "2028-07-09", principalPercent: 8 },
      { date: "2029-01-09", principalPercent: 8 },
      { date: "2029-07-09", principalPercent: 8 },
      { date: "2030-01-09", principalPercent: 8 },
      { date: "2030-07-09", principalPercent: 8 }
    ],
    couponRateChanges: [
      { effectiveDate: "2021-07-09", newCouponRate: 0.5 },
      { effectiveDate: "2023-07-09", newCouponRate: 0.75 },
      { effectiveDate: "2027-07-09", newCouponRate: 1.75 }
    ]
  },
  "ae38d-argentina": {
    issuer: "REPUBLIC OF ARGENTINA",
    isin: "ARARGE3209U2",
    cusip: null,                // local-law bonds do not carry a CUSIP
    faceValue: 1000,
    couponRate: 0.125,          // initial rate (Sep-2020 → Jul-2021)
    issueDate: "2020-09-04",
    maturityDate: "2038-01-09",
    firstCouponDate: "2021-07-09",
    paymentFrequency: 2,        // semi-annual
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: true,
    isCallable: false,
    isPuttable: false,
    isVariableCoupon: true,
    settlementDays: 2,
    amortizationSchedule: [
      { date: "2027-07-09", principalPercent: 4.545 },
      { date: "2028-01-09", principalPercent: 4.545 },
      { date: "2028-07-09", principalPercent: 4.545 },
      { date: "2029-01-09", principalPercent: 4.545 },
      { date: "2029-07-09", principalPercent: 4.545 },
      { date: "2030-01-09", principalPercent: 4.545 },
      { date: "2030-07-09", principalPercent: 4.545 },
      { date: "2031-01-09", principalPercent: 4.545 },
      { date: "2031-07-09", principalPercent: 4.545 },
      { date: "2032-01-09", principalPercent: 4.545 },
      { date: "2032-07-09", principalPercent: 4.545 },
      { date: "2033-01-09", principalPercent: 4.545 },
      { date: "2033-07-09", principalPercent: 4.545 },
      { date: "2034-01-09", principalPercent: 4.545 },
      { date: "2034-07-09", principalPercent: 4.545 },
      { date: "2035-01-09", principalPercent: 4.545 },
      { date: "2035-07-09", principalPercent: 4.545 },
      { date: "2036-01-09", principalPercent: 4.545 },
      { date: "2036-07-09", principalPercent: 4.545 },
      { date: "2037-01-09", principalPercent: 4.545 },
      { date: "2037-07-09", principalPercent: 4.545 },
      { date: "2038-01-09", principalPercent: 4.545 }
    ],
    couponRateChanges: [
      { effectiveDate: "2021-07-09", newCouponRate: 2.00 },
      { effectiveDate: "2022-07-09", newCouponRate: 3.875 },
      { effectiveDate: "2023-07-09", newCouponRate: 4.25 },
      { effectiveDate: "2024-07-09", newCouponRate: 5.00 }
    ]
  },
} as const;

export const bondAnalytics = pgTable("bond_analytics", {
  // ... existing code ...
});
