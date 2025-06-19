# BondTerminal API Documentation

## Overview

The BondTerminal is a robust, generalized analytics engine designed to handle any type of bond through JSON-defined cash flows. It provides comprehensive bond analytics including pricing, yields, risk metrics, and spread calculations.

## Key Features

- **Universal Bond Support**: Handles any bond type (vanilla, amortizing, callable, puttable, variable coupon)
- **Multiple YTM Solvers**: Newton-Raphson, Brent's method, and Bisection with automatic fallback
- **Accurate Analytics**: YTM, duration, convexity, spreads, and more
- **Treasury Curve Integration**: Calculate spreads vs UST curve
- **Flexible Input/Output**: Price-to-yield or yield-to-price calculations
- **Production Ready**: Comprehensive error handling and validation

## Quick Start

```typescript
import { BondCalculatorPro } from './bond-calculator-production';

const calculator = new BondCalculatorPro();

// Calculate analytics from price
const analytics = calculator.analyze({
  bond: bondDefinition,
  settlementDate: new Date('2025-06-09'),
  price: 72.25, // as percentage of face value
  treasuryCurve: ustCurveData
});

console.log(`YTM: ${analytics.yields.ytm}%`);
console.log(`Modified Duration: ${analytics.risk.modifiedDuration}`);
console.log(`Spread: ${analytics.spreads?.treasury} bps`);
```

## Bond Definition Format

The BondTerminal accepts bonds in the following JSON format:

```typescript
interface Bond {
  // Basic information
  faceValue: number;
  currency: string;
  dayCountConvention: '30/360' | 'ACT/ACT' | 'ACT/360' | 'ACT/365';
  
  // Cash flows (the core data)
  cashFlows: Array<{
    date: string;           // ISO date format
    coupon: number;         // Coupon payment amount
    principal: number;      // Principal payment amount
    total: number;          // Total payment (coupon + principal)
    outstandingNotional: number; // Remaining principal after payment
  }>;
  
  // Optional metadata
  metadata?: {
    issuer?: string;
    isin?: string;
    cusip?: string;
    name?: string;
  };
}
```

### Example Bond Definition

```json
{
  "faceValue": 1000,
  "currency": "USD",
  "dayCountConvention": "30/360",
  "cashFlows": [
    {
      "date": "2025-07-09",
      "coupon": 25,
      "principal": 0,
      "total": 25,
      "outstandingNotional": 1000
    },
    {
      "date": "2026-01-09",
      "coupon": 25,
      "principal": 0,
      "total": 25,
      "outstandingNotional": 1000
    },
    // ... more cash flows
    {
      "date": "2030-07-09",
      "coupon": 25,
      "principal": 1000,
      "total": 1025,
      "outstandingNotional": 0
    }
  ],
  "metadata": {
    "issuer": "ABC Corp",
    "isin": "US123456789",
    "name": "ABC Corp 5% 2030"
  }
}
```

## API Methods

### `analyze(inputs)`

Main method that calculates all bond analytics.

#### Parameters

```typescript
{
  bond: Bond;                    // Bond definition
  settlementDate: Date;          // Settlement date
  price?: number;                // Price as % of face (e.g., 72.25)
  yield?: number;                // Yield as decimal (e.g., 0.1088)
  treasuryCurve?: {              // Optional treasury curve
    date: string;
    tenors: Array<{
      years: number;
      rate: number;              // As percentage (e.g., 4.28)
    }>;
  };
}
```

**Note**: Either `price` or `yield` must be provided.

#### Returns

```typescript
{
  price: {
    clean: number;               // Clean price as % of face
    dirty: number;               // Dirty price as % of face
    cleanDollar: number;         // Clean price in dollars
    dirtyDollar: number;         // Dirty price in dollars
    accruedInterest: number;     // Accrued interest in dollars
  };
  
  yields: {
    ytm: number;                 // Yield to maturity (%)
    ytw: number;                 // Yield to worst (%)
    current: number;             // Current yield (%)
  };
  
  risk: {
    modifiedDuration: number;    // Modified duration
    macaulayDuration: number;    // Macaulay duration
    effectiveDuration: number;   // Effective duration
    convexity: number;           // Convexity
    dv01: number;                // Dollar value of 1bp
  };
  
  spreads?: {
    treasury: number;            // Spread vs treasury (bps)
    zSpread: number;             // Z-spread (bps)
  };
  
  analytics: {
    averageLife: number;         // Weighted average life
    totalCashFlows: number;      // Sum of future cash flows
    daysToNextPayment: number;   // Days to next payment
    nextPaymentDate?: string;    // Next payment date
    nextPaymentAmount?: number;  // Next payment amount
  };
  
  metadata: {
    calculationDate: string;     // Calculation timestamp
    settlementDate: string;      // Settlement date used
    algorithm: string;           // YTM solver algorithm
    iterations: number;          // Solver iterations
    precision: number;           // Calculation precision
    warnings?: string[];         // Any warnings
  };
}
```

### `priceFromYield(bond, yield, settlementDate)`

Calculate bond price given a yield.

#### Parameters
- `bond`: Bond definition
- `yield`: Yield as decimal (e.g., 0.1088 for 10.88%)
- `settlementDate`: Settlement date

#### Returns
```typescript
{
  clean: number;                 // Clean price as % of face
  dirty: number;                 // Dirty price as % of face
  accruedInterest: number;       // Accrued interest in dollars
}
```

### `yieldFromPrice(bond, price, settlementDate)`

Calculate yield given a bond price.

#### Parameters
- `bond`: Bond definition
- `price`: Price as percentage of face value
- `settlementDate`: Settlement date

#### Returns
```typescript
{
  yield: number;                 // Yield as percentage
  algorithm: string;             // Solver algorithm used
  iterations: number;            // Number of iterations
}
```

## Treasury Curve Format

The treasury curve should be provided in the following format:

```typescript
{
  date: string;                  // Curve date (ISO format)
  tenors: Array<{
    years: number;               // Tenor in years
    rate: number;                // Rate as percentage
  }>;
}
```

### Example Treasury Curve

```typescript
const treasuryCurve = {
  date: '2025-06-09',
  tenors: [
    { years: 0.083, rate: 4.50 },  // 1 month
    { years: 0.25, rate: 4.55 },   // 3 months
    { years: 0.5, rate: 4.60 },    // 6 months
    { years: 1, rate: 4.50 },      // 1 year
    { years: 2, rate: 4.40 },      // 2 years
    { years: 5, rate: 4.20 },      // 5 years
    { years: 10, rate: 4.10 },     // 10 years
    { years: 30, rate: 4.30 }      // 30 years
  ]
};
```

## Usage Examples

### Example 1: Calculate Analytics from Price

```typescript
const analytics = calculator.analyze({
  bond: argentinaBond,
  settlementDate: new Date('2025-06-09'),
  price: 72.25,
  treasuryCurve: ustCurve
});

console.log('Bond Analytics:');
console.log(`YTM: ${analytics.yields.ytm.toFixed(2)}%`);
console.log(`Modified Duration: ${analytics.risk.modifiedDuration.toFixed(2)}`);
console.log(`Spread: ${analytics.spreads?.treasury.toFixed(0)} bps`);
console.log(`Average Life: ${analytics.analytics.averageLife.toFixed(2)} years`);
```

### Example 2: Calculate Price from Yield

```typescript
const priceResult = calculator.priceFromYield(
  bond,
  0.1088, // 10.88% yield
  new Date('2025-06-09')
);

console.log(`Clean Price: ${priceResult.clean.toFixed(2)}%`);
console.log(`Dirty Price: ${priceResult.dirty.toFixed(2)}%`);
console.log(`Accrued Interest: $${priceResult.accruedInterest.toFixed(2)}`);
```

### Example 3: Scenario Analysis

```typescript
const yields = [0.08, 0.09, 0.10, 0.11, 0.12];

for (const yield of yields) {
  const result = calculator.priceFromYield(bond, yield, settlementDate);
  console.log(`Yield: ${(yield * 100).toFixed(0)}% → Price: ${result.dirty.toFixed(2)}%`);
}
```

## Error Handling

The BondTerminal includes comprehensive error handling:

```typescript
try {
  const analytics = calculator.analyze({
    bond: invalidBond,
    settlementDate: new Date(),
    price: -10 // Invalid price
  });
} catch (error) {
  console.error('Calculation failed:', error.message);
  // Error: Price must be between 0 and 500% of face value
}
```

## Integration with Bond Builder

The BondTerminal is designed to work seamlessly with bonds created by the Bond Builder:

```typescript
// Load bond from Bond Builder
const bondJson = await fetch('/api/bonds/golden/ae38d-argentina');
const bondData = await bondJson.json();

// Convert to BondTerminal format
const bond: Bond = {
  faceValue: bondData.bondInfo.faceValue,
  currency: bondData.bondInfo.currency,
  dayCountConvention: bondData.bondInfo.dayCountConvention,
  cashFlows: bondData.cashFlowSchedule.map(cf => ({
    date: cf.date,
    coupon: cf.couponPayment,
    principal: cf.principalPayment,
    total: cf.totalPayment,
    outstandingNotional: cf.remainingNotional
  })),
  metadata: {
    issuer: bondData.bondInfo.issuer,
    isin: bondData.bondInfo.isin,
    cusip: bondData.bondInfo.cusip,
    name: bondData.metadata?.name
  }
};

// Calculate analytics
const analytics = calculator.analyze({
  bond,
  settlementDate: new Date(),
  price: 95.50
});
```

## Performance Considerations

- **Caching**: Consider caching calculation results for frequently accessed bonds
- **Precision**: Uses Decimal.js for high-precision calculations
- **Convergence**: YTM solver typically converges in 5-15 iterations
- **Batch Processing**: For multiple bonds, reuse the BondTerminal instance

## Limitations

- **Callable/Puttable Bonds**: YTW calculation currently returns YTM (enhancement planned)
- **Inflation-Linked Bonds**: Not currently supported
- **Credit Spreads**: Only treasury spreads are calculated
- **Options**: Embedded options are not valued separately

## Version History

- **v1.0.0** (Current): Initial production release with core functionality
- **v1.1.0** (Planned): Add callable/puttable bond support for YTW
- **v1.2.0** (Planned): Add credit spread calculations
- **v2.0.0** (Planned): Support for exotic bond types