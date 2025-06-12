# Claude Code Project Memory

This repository is a TypeScript/React project with an Express backend for bond calculations and analytics.

@docs/ADDING_BONDS.md

## Development Commands
- Install dependencies: `npm install`
- Dev server: `npm run dev` 
- Type checking: `npm run check` (required before commits)
- Build verification: `npm run build`
- Treasury data: `npm run curve` or `./curve.sh`

## Code Standards
- TypeScript with strict type checking
- Kebab-case/camelCase naming conventions
- Prettier-compatible formatting (no explicit config)
- Use `decimal.js` for financial calculations (precision-safe)
- Follow existing patterns in neighboring components

## Commits and PRs
- Write clear, descriptive commit messages.
- Summarize your changes in the pull request description.

# BOND CALCULATOR AGENT PRINCIPLES

## 🚨 CRITICAL ARCHITECTURE PRINCIPLE 🚨

**ALL BOND INFORMATION MUST BE JSON-FIRST WITH EXOGENOUS VARIABLES ONLY**

### Core Principle:
- **Bond JSON files contain ONLY exogenous variables** - the inputs that describe how the bond behaves
- **NO calculated values** like YTM, duration, spread, present value, etc. should ever be stored in the bond JSON
- **Calculator takes JSON + market price → calculates analytics in real-time**

### What Goes IN the Bond JSON:
✅ **Bond Definition:**
- Issuer, CUSIP, ISIN
- Face value, coupon rate, issue/maturity dates
- Payment frequency, day count convention
- Callable/puttable/amortizing flags

✅ **Cash Flow Schedule:**
- Payment dates
- Coupon amounts
- Principal payments
- Payment types (COUPON, AMORTIZATION, MATURITY, CALL, PUT)

✅ **Bond Behavior Rules:**
- Call/put schedules
- Amortization schedules  
- Coupon rate changes

### What NEVER Goes in Bond JSON:
❌ **Calculated Analytics:**
- Yield to Maturity (YTM)
- Duration, convexity
- Spread to Treasury
- Present value, dirty/clean price
- Accrued interest

### Why This Matters:
1. **Clean Separation:** Bond definition vs. market-dependent calculations
2. **Reusability:** Same bond JSON works for any market price/settlement date
3. **Accuracy:** Analytics always calculated fresh from current market data
4. **Transparency:** Users see exactly what drives the calculation

### Implementation:
- Build bond → Generate JSON with cash flows → **SAVE** to repository or **EXPORT** for download
- Load bond JSON → Input market price → Calculate analytics
- JSON files are portable and contain complete bond definition
- Calculator is pure function: `f(bondJSON, marketPrice, settlementDate) → analytics`

### Critical Distinction - SAVE vs EXPORT:
- **SAVE**: Stores bond JSON in repository (`saved_bonds/`) for later use in calculator
- **EXPORT**: Downloads bond files to user's computer for external use
- Bond Builder **SAVE** button → repository storage
- Analytics Panel **EXPORT** buttons → user downloads

This principle must NEVER be violated. Bond JSONs describe behavior, not results. 