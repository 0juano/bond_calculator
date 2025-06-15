# Bond JSON Specification v1.1

## 1. Introduction

This document provides the definitive specification for the JSON format used to represent bond data for any type of bond (sovereign, corporate, municipal, etc.). The structure is designed to be static and self-contained, serving as a permanent record of the bond's contractual terms.

This specification is intended for developers, data architects, and LLMs that will be creating, parsing, or validating this JSON data. All data should reflect the bond's original prospectus and not be updated with market-based or time-sensitive information.

## 2. Root Object Structure

The root of the JSON is a single object containing five top-level keys.

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `metadata` | Object | Yes | Contains data about the JSON document itself |
| `bondInfo` | Object | Yes | Contains the fundamental, static identifiers and terms of the bond |
| `features` | Object | Yes | A set of boolean flags describing the bond's key structural features |
| `cashFlowSchedule` | Array<Object> | Yes | A complete, pre-calculated list of all payment events over the bond's life |
| `schedules` | Object | Yes | Contains the raw schedules that define variable coupon rates and amortization |

## 3. Field Definitions

### 3.1 metadata Object

| Key | Type | Required | Description & Validation Rules |
|-----|------|----------|-------------------------------|
| `id` | String | Yes | A unique identifier for the bond record. Example: `bond_1718279400001_abcdefg` |
| `name` | String | Yes | The official name of the security. Format: `ISSUER COUPON% MATURITY_DATE` |
| `created` | String | Yes | ISO 8601 timestamp of when the JSON record was created. Format: `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `modified` | String | Yes | ISO 8601 timestamp of when the JSON record was last modified. Format: `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `version` | String | Yes | The version of this specification. Follows semantic versioning, e.g., `1.1` |
| `source` | String | Yes | The origin of the data. Example: `USER_CREATED`, `PROSPECTUS_PARSED` |

### 3.2 bondInfo Object

| Key | Type | Required | Description & Validation Rules |
|-----|------|----------|-------------------------------|
| `ticker` | String | No | The common market ticker symbol for the bond. Example: `GD29`. See section 7 for Argentina bond naming conventions |
| `issuer` | String | Yes | The legal name of the issuing entity. Example: `REPUBLIC OF ARGENTINA`, `APPLE INC` |
| `cusip` | String | No | The 9-character CUSIP identifier. Can be null if not available |
| `isin` | String | No | The 12-character ISIN identifier. Must be a valid ISIN if provided |
| `faceValue` | Number | Yes | The initial face value (par value) of one unit of the bond. Must be a positive number |
| `couponRate` | Number | Yes | The initial coupon rate at the time of issue, expressed as a percentage. E.g., `1.25` for 1.25% |
| `issueDate` | String | Yes | The date the bond was issued. Format: `YYYY-MM-DD`. Must be before `maturityDate` |
| `maturityDate` | String | Yes | The date the bond matures. Format: `YYYY-MM-DD`. Must be after `issueDate` |
| `firstCouponDate` | String | No | The date of the first coupon payment. Format: `YYYY-MM-DD`. If omitted, must be calculable |
| `paymentFrequency` | Number | Yes | The number of coupon payments per year. E.g., `2` for semi-annually, `4` for quarterly |
| `dayCountConvention` | String | Yes | The convention used for accruing interest. Example: `30/360`, `ACT/ACT`, `ACT/360`, `ACT/365` |
| `currency` | String | Yes | The 3-letter ISO 4217 currency code. Example: `USD`, `EUR`, `GBP` |
| `settlementDays` | Number | Yes | The number of business days for settlement. E.g., `2` for T+2, `3` for T+3 |

### 3.3 features Object

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `isAmortizing` | Boolean | Yes | `true` if the bond repays principal in installments before maturity |
| `isCallable` | Boolean | Yes | `true` if the issuer has the right to redeem the bond early |
| `isPuttable` | Boolean | Yes | `true` if the holder has the right to sell the bond back early |
| `isVariableCoupon` | Boolean | Yes | `true` if the coupon rate changes over the bond's life |
| `isInflationLinked` | Boolean | Yes | `true` if payments are linked to an inflation index |
| `hasStepUpCoupon` | Boolean | Yes | `true` if the coupon rate increases over time (a specific type of `isVariableCoupon`) |

### 3.4 cashFlowSchedule Array

This is an array of objects, where each object represents a single payment event. The array must contain every payment from the first coupon to the final maturity payment. All monetary amounts should be rounded to a maximum of 3 decimal places.

#### cashFlowSchedule Object Structure

| Key | Type | Required | Description & Validation Rules |
|-----|------|----------|-------------------------------|
| `date` | String | Yes | The date of the payment. Format: `YYYY-MM-DD` |
| `couponPayment` | Number | Yes | The amount of the coupon payment on this date, per `faceValue`. Precision: 3 decimal places |
| `principalPayment` | Number | Yes | The amount of the principal payment on this date, per `faceValue`. Precision: 3 decimal places |
| `totalPayment` | Number | Yes | The sum of `couponPayment` and `principalPayment`. Must equal their sum exactly |
| `remainingNotional` | Number | Yes | The outstanding principal after this payment has been made. Must be >= 0. Precision: 3 decimals |
| `paymentType` | String | Yes | The type of payment. Allowed values: `COUPON`, `AMORTIZATION`, `MATURITY` |

### 3.5 schedules Object

This object contains the raw schedules that define how and when variable features of the bond take effect. It is essential for validating the `cashFlowSchedule`.

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `amortizationSchedule` | Array<Object> | No* | Defines the dates and percentages of principal repayment |
| `couponRateChanges` | Array<Object> | No* | Defines the dates and new rates for step-up/step-down coupons |

*Required only if the corresponding feature flag is `true`

#### amortizationSchedule Object Structure

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `date` | String | Yes | The date the principal repayment occurs. Format: `YYYY-MM-DD` |
| `principalPercent` | Number | Yes | The percentage of the original face value being repaid. Precision: 3 decimal places |

#### couponRateChanges Object Structure

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `effectiveDate` | String | Yes | The date the new coupon rate becomes effective. Format: `YYYY-MM-DD` |
| `newCouponRate` | Number | Yes | The new annual coupon rate as a percentage. Precision: 3 decimal places |

## 4. Validation Rules

A valid bond JSON file must adhere to the following logical rules:

1. **Date Consistency**: `issueDate` must be before all payment dates in `cashFlowSchedule`. The `maturityDate` must be equal to the date of the final entry in the `cashFlowSchedule`.

2. **Final Balance**: The `remainingNotional` in the last `cashFlowSchedule` entry must be 0.

3. **Amortization Total**: If `amortizationSchedule` exists, the sum of all `principalPercent` values must equal 100.

4. **Payment Calculation**: For each entry in `cashFlowSchedule`, `totalPayment` must equal `couponPayment + principalPayment`.

5. **Notional Reduction**: For each `cashFlowSchedule` entry, the `remainingNotional` must equal the previous entry's `remainingNotional` minus the current `principalPayment`.

6. **Feature Consistency**:
   - If `isAmortizing` is `true`, `amortizationSchedule` must exist and be non-empty
   - If `isVariableCoupon` is `true`, `couponRateChanges` must exist and be non-empty
   - If `hasStepUpCoupon` is `true`, `isVariableCoupon` must also be `true`

## 5. Example Bond Types

This specification supports all major bond types:

- **Vanilla Bonds**: Fixed coupon, bullet maturity
- **Sovereign Bonds**: Government issued (like Argentina GD series)
- **Corporate Bonds**: Company issued (Apple, Microsoft, etc.)
- **Municipal Bonds**: Local government issued
- **Amortizing Bonds**: Principal repaid over time
- **Callable/Puttable Bonds**: Early redemption options
- **Step-Up Bonds**: Increasing coupon rates
- **Zero Coupon Bonds**: No periodic interest payments

## 6. Argentina Bond Naming Conventions

Argentina sovereign bonds follow specific naming conventions based on their governing law:

### 6.1 NY Law Bonds (ARGENT Series)

Bonds governed by New York law use the `ARGENT` prefix:

**Format:** `ARGENT [COUPON] [YEAR]`

**Examples:**
- `ARGENT 1 29` - 1% coupon, 2029 maturity
- `ARGENT 0125 30` - 0.125% coupon, 2030 maturity  
- `ARGENT 4125 35` - 4.125% coupon, 2035 maturity

**Rules:**
- Coupon rates use whole numbers when possible (1 for 1.00%)
- Fractional rates use decimals without the dot (0125 for 0.125%)
- Years use last two digits (29 for 2029, 30 for 2030)
- Spaces separate prefix, coupon, and year

### 6.2 Local Law Bonds (ARGBON Series)

Bonds governed by Argentine local law use the `ARGBON` prefix:

**Format:** `ARGBON [COUPON] [YEAR]`

**Examples:**
- `ARGBON 3 24` - 3% coupon, 2024 maturity
- `ARGBON 2 26` - 2% coupon, 2026 maturity

### 6.3 Implementation Notes

- The `ticker` field should contain the appropriate ARGENT or ARGBON designation
- The `name` field should follow the standard format: `REPUBLIC OF ARGENTINA [COUPON]% [MATURITY_DATE]`
- Both fields serve different purposes: `ticker` for market identification, `name` for official documentation

### 6.4 Ticker Examples by Bond Type

| ISIN | Ticker | Name | Governing Law |
|------|--------|------|---------------|
| US040114HX11 | ARGENT 1 29 | REPUBLIC OF ARGENTINA 1.000% 2029-07-09 | New York |
| US040114HS26 | ARGENT 0125 30 | REPUBLIC OF ARGENTINA 0.125% 2030-07-09 | New York |
| ARARGE3209S6 | ARGBON 0375 30 | REPUBLIC OF ARGENTINA 0.375% 2030-07-09 | Argentine |

## 7. Change Log

### Version 1.1 (Current)
- Added `created` and `modified` timestamps to `metadata`
- Added `firstCouponDate` and `settlementDays` fields to `bondInfo`
- Added `hasStepUpCoupon` to `features` for more specific description
- Added precision requirements for all monetary and percentage values
- Added a dedicated, comprehensive Validation Rules section
- Refined field descriptions to include validation context
- Removed the BULLET payment type to reduce ambiguity; use AMORTIZATION and MATURITY
- Expanded scope from sovereign-only to all bond types
- Made `ticker` and `isin` optional to support broader bond universe

### Version 1.0
- Initial specification for sovereign bonds only