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
  yieldToWorst: number;
  duration: number;
  averageLife: number;
  convexity: number;
  totalCoupons: number;
  presentValue: number;
  optionAdjustedSpread?: number;
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
  settlementDays: z.number().int().min(0).max(30),
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

// Types
export type BondDefinition = typeof bonds.$inferSelect;
export type InsertBond = z.infer<typeof insertBondSchema>;
export type CashFlow = typeof cashFlows.$inferSelect;
export type InsertCashFlow = z.infer<typeof insertCashFlowSchema>;

// Golden bond templates
export const GOLDEN_BONDS = {
  "vanilla-5y": {
    issuer: "US TREASURY",
    cusip: "912828XM7",
    isin: "US9128283M71",
    faceValue: 1000000,
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
    settlementDays: 3,
  },
  "amortizing-10y": {
    issuer: "CORPORATE BONDS INC",
    cusip: "123456789",
    isin: "US1234567890",
    faceValue: 1000000,
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
    faceValue: 1000000,
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
    settlementDays: 3,
    callSchedule: [
      { firstCallDate: "2027-01-15", lastCallDate: "2031-01-15", callPrice: 102.5 },
    ],
  },
  "puttable-3y": {
    issuer: "BANK OF AMERICA",
    cusip: "456789123",
    isin: "US4567891234",
    faceValue: 1000000,
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
    settlementDays: 3,
    putSchedule: [
      { firstPutDate: "2025-01-15", lastPutDate: "2026-01-15", putPrice: 98.0 },
    ],
  },
  "complex-combo": {
    issuer: "COMPLEX SECURITIES LLC",
    cusip: "789123456",
    isin: "US7891234567",
    faceValue: 1000000,
    couponRate: 5.5,
    issueDate: "2024-01-15",
    maturityDate: "2039-01-15",
    firstCouponDate: "2024-07-15",
    paymentFrequency: 2,
    dayCountConvention: "30/360",
    currency: "USD",
    isAmortizing: true,
    isCallable: true,
    isPuttable: true,
    isFloating: false,
    settlementDays: 3,
    amortizationSchedule: [
      { date: "2034-01-15", principalPercent: 50 },
    ],
    callSchedule: [
      { firstCallDate: "2029-01-15", lastCallDate: "2039-01-15", callPrice: 103.0 },
    ],
    putSchedule: [
      { firstPutDate: "2027-01-15", lastPutDate: "2032-01-15", putPrice: 97.5 },
    ],
  },
} as const;
