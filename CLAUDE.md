# Claude Code Project Memory

TypeScript/React bond calculator project with Express backend.

@docs/ADDING_BONDS.md
@docs/bond-json-specification.md
@docs/bloomberg-reference-data.md

## Commands
- `npm run dev` - Dev server
- `npm run check` - Type checking (required before commits)
- `npm run build` - Build verification

## Standards
- TypeScript strict mode, `decimal.js` for calculations
- Follow existing patterns, Prettier formatting

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

# BOND CALCULATOR FUNCTIONALITY

## 🎯 Three-Way Calculator (Critical Feature)

The calculator supports **bidirectional calculations** between Price ↔ YTM ↔ Spread:

### How It Works:
- **User edits ANY field** → Calculator locks that field → Calculates the other two
- **Price input** → Calculate YTM and Spread
- **YTM input** → Calculate Price and Spread  
- **Spread input** → Calculate Price and YTM

### Price Input Interpretation:
- **User enters price as percentage of face value** (e.g., 80 = 80% of face value)
- **Calculator converts correctly**: `(marketPrice / bond.faceValue) * 100`
- **NOT dollar amounts**: Don't interpret 80 as $80 (8% of $1000 face)

### Field Locking Mechanism:
- Prevents infinite recalculation loops
- Uses `lockedField` state to track which field is being edited
- Only updates non-locked fields after calculation
- Debounced with 300ms delay for smooth UX

## 🏦 Bloomberg Validation Protocol

### ALWAYS validate calculator results against Bloomberg reference data:

**Argentina 2038 (GD38) Expected Results:**
- At price 72.25: YTM 10.88%, spread 660bp, duration 5.01
- At price 80.00: YTM ~10.4%, spread ~620bp, duration ~4.8

### Testing Protocol:
1. Load Argentina 2038: `/calculator/bond_1749486682344_9sgdd0cou`
2. Test price 72.25 → Verify YTM ~10.88%, spread ~660bp
3. Test price 80.00 → Verify YTM ~10.4%, not 66%+
4. Ensure no infinite recalculation loops

### Red Flags (Calculator Broken):
- YTM > 50% (indicates price conversion bug)
- Continuous recalculation (infinite loop)
- Spread > 5000bp (unrealistic for investment grade)

## 📋 Bond JSON Specification v1.1

Follow the comprehensive specification in `docs/bond-json-specification.md`:
- Supports ALL bond types (sovereign, corporate, municipal)
- Complete validation rules and field definitions
- Precision standards (3 decimal places for monetary values)
- Required vs optional fields clearly defined

## 🧪 Testing Requirements

### Before claiming calculator fixes work:
1. **Test with MCP Puppeteer** - Use browser automation to verify actual results
2. **Use https://bonistas.com/** - Cross-reference price/yield/duration calculations
3. **Compare to Bloomberg data** - Check against reference values in docs
4. **Test edge cases** - Try different price levels
5. **Verify no infinite loops** - Ensure calculations complete and stop

### Never say "fix is working" without MCP verification!