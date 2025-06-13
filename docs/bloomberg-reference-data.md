# Bloomberg Reference Data - Argentina Sovereign Bonds

This file contains real market data from Bloomberg terminal to validate our bond calculator accuracy.

## Current Market Data (June 2025)

| Ticker | Price  | Yield  | OAS (bp) | Duration | Notes |
|--------|--------|--------|----------|----------|-------|
| GD29   | 84.10  | 9.99%  | 602      | 1.80     | Argentina 2029 |
| GD30   | 80.19  | 10.45% | 646      | 2.19     | Argentina 2030 |
| GD38   | 72.25  | 10.88% | 660      | 5.01     | Argentina 2038 |
| GD46   | 66.13  | 10.78% | 627      | 5.73     | Argentina 2046 |
| GD35   | 68.24  | 10.83% | 655      | 5.77     | Argentina 2035 |
| GD41   | 63.13  | 10.83% | 642      | 6.16     | Argentina 2041 |

## Key Observations

1. **Price-Yield Relationship**: Higher prices correspond to lower yields (normal inverse relationship)
2. **Duration Pattern**: Longer maturity bonds generally have higher duration
3. **Spread Levels**: OAS ranges from ~600-660 bps across the curve
4. **Yield Curve**: Slight inversion with longer bonds showing similar yields to shorter ones

## Calculator Validation Targets

### Argentina 2038 (GD38) - Primary Test Bond
- **At Price 72.25**: Yield 10.88%, OAS 660bp, Duration 5.01
- **At Price 80.00**: Expected ~10.4% yield, ~620bp spread, ~4.8 duration

### Argentina 2030 (GD30)
- **At Price 80.19**: Yield 10.45%, OAS 646bp, Duration 2.19

## Testing Protocol

1. Load Argentina 2038 bond in calculator
2. Enter price 72.25 → Should show YTM ~10.88%, spread ~660bp, duration ~5.01
3. Enter price 80.00 → Should show YTM ~10.4%, spread ~620bp
4. Verify calculator matches Bloomberg professional terminal results

## Notes

- Prices are in percentage of face value (e.g., 72.25 = $722.50 per $1000 face)
- OAS = Option Adjusted Spread in basis points vs Treasury curve
- Duration = Modified Duration (price sensitivity to yield changes)
- Data source: Bloomberg Professional Terminal