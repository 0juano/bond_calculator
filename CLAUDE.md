# Claude Code Project Memory

TypeScript/React BondTerminal project with Express backend - A comprehensive fixed-income analysis platform with three components: Bond Builder, Universal Calculator, and Comparables Builder (planned).

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

# 🔄 STANDARD WORKFLOW (ALWAYS FOLLOW)

1. **First think through the problem**, read the codebase for relevant files, and write a plan to projectplan.md
2. The plan should have a **list of todo items** that you can check off as you complete them
3. **Before you begin working**, check in with me and I will verify the plan
4. Then, begin working on the todo items, **marking them as complete as you go**
5. Please every step of the way just give me a **high level explanation** of what changes you made
6. Make every task and code change you do **as simple as possible**. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. **Everything is about simplicity**
7. Finally, add a **review section** to the projectplan.md file with a summary of the changes you made and any other relevant information

# BONDTERMINAL AGENT PRINCIPLES

## 🔍 RESEARCH-FIRST PRINCIPLE 🔍

**BEFORE implementing complex algorithms or mathematical functions:**

1. **ASK THE USER**: "Should I research existing open source libraries for [specific functionality] first?"
2. **CHECK npm/GitHub**: Search for existing, well-maintained packages
3. **EVALUATE OPTIONS**: Compare libraries for:
   - Maintenance status and popularity
   - TypeScript support
   - License compatibility
   - Performance and accuracy
   - Dependencies and bundle size
4. **JUSTIFY CUSTOM IMPLEMENTATION**: Only implement from scratch if:
   - No suitable library exists
   - Existing libraries have critical limitations
   - Custom implementation provides specific advantages
   - User explicitly prefers custom solution

**Examples of when to research first:**
- Complex mathematical calculations (IRR, XIRR, statistical functions)
- Date/time handling beyond basic operations
- Financial formulas and algorithms
- Data validation and parsing
- Chart/visualization components

**This principle applies especially to:**
- Financial calculations (YTM, duration, convexity)
- Mathematical solvers (Newton-Raphson, bisection)
- Data format parsers (CSV, Excel, PDF)
- Cryptographic functions
- Complex algorithms with established implementations

**Learning from XIRR implementation:** We spent significant time implementing Formula.js XIRR from scratch when existing npm packages might have provided the same functionality with less effort and potentially better testing.

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

# BONDTERMINAL FUNCTIONALITY

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

## 📋 Bond JSON Specification

See `docs/bond-json-specification.md` for complete spec. Key principle: JSON contains ONLY bond behavior, NEVER calculated values.

## 🧪 Key Testing Requirement

**Never say "fix is working" without MCP verification!** Always test with browser automation and cross-reference with Bloomberg data.

