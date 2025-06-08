# Adding a New Golden Bond

> **All coupon rates and couponRateChanges must be in percentage format (e.g., 5.0 for 5%, 0.5 for 0.5%). Never use decimals (e.g., 0.05 for 5%).**

This guide ensures all new bonds are added consistently and correctly in the codebase.

## Universal Field Conventions

- **couponRate**: Enter as a percentage (e.g., `5.0` for 5%, `0.5` for 0.5%, `1.75` for 1.75%). Never use decimal form (e.g., `0.05` for 5% is incorrect).
- **couponRateChanges**: All `newCouponRate` values must be in percentage format (e.g., `0.5` for 0.5%).
- **faceValue**: Use `1000` for all bonds unless the bond is a special case (e.g., a sovereign bond with a different legal denomination).
- **amortizationSchedule**: `principalPercent` is a percentage of the original face value (e.g., `8` for 8%).
- **callSchedule/putSchedule**: `callPrice`/`putPrice` is a percentage of face value (e.g., `102.5` for 102.5%).
- **Dates**: Use ISO format (`YYYY-MM-DD`).
- **paymentFrequency**: Use `2` for semi-annual, `1` for annual, `4` for quarterly, etc.
- **currency**: Use standard currency codes (e.g., `USD`).
- **All boolean flags**: (`isAmortizing`, `isCallable`, `isPuttable`, `isVariableCoupon`) must be explicitly set.

## Example Bond Object

```ts
{
  issuer: "EXAMPLE ISSUER",
  cusip: "123456789",
  isin: "US1234567890",
  faceValue: 1000,
  couponRate: 4.5, // 4.5%
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
  amortizationSchedule: [],
  callSchedule: [],
  putSchedule: [],
  couponRateChanges: [],
}
```

## Checklist for Adding a New Bond

- [ ] All rates are in percentage format (not decimals)
- [ ] faceValue is 1000 (unless a special case)
- [ ] Dates are ISO format (YYYY-MM-DD)
- [ ] Schedules (amortization, call, put) use correct fields and formats
- [ ] All boolean flags are set
- [ ] Bond tested in UI and cash flow/analytics look correct

## Validation & Testing

- Load the new bond in the app
- Check the cash flow table for correct coupon and principal payments
- Check the analytics panel for reasonable values
- Confirm coupon % and $ match expectations for each payment

## Tips

- If in doubt, check an existing bond for reference (see AL30D and AE38D Argentina for complex amortizing/step-up sovereigns)
- When unsure about a field, ask the team or check the README
- Always use percentage format for coupon rates and changes
- Consistency is key for maintainability and correctness 