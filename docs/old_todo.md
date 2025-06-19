# 📋 **BondTerminal - Exhaustive Implementation TODO**

## **🎯 Project Overview**
Building a Bloomberg YAS-style interactive BondTerminal that allows real-time price ↔ yield calculations, scenario analysis, and risk metrics visualization. The BondTerminal will integrate with the existing bond builder system and provide a professional trading workstation experience.

**Key Features**:
- Interactive price/yield/spread calculations
- Real-time scenario analysis (+/- basis points)
- Risk metrics dashboard (duration, convexity, DV01)
- Settlement date controls with accrued interest
- Exportable results and shareable URLs

---

## **📊 Phase 1: Foundation & Architecture** 
*Total Estimated Time: 3-4 days*

### **TODO #0.5: Observability & Monitoring Infrastructure** 
*Priority: CRITICAL | Time: 2 hours | Dependencies: None*

**Objective**: Set up logging, error tracking, and performance monitoring before building BondTerminal features

**Current State**: 
- No centralized error tracking
- No performance monitoring for calculation endpoints
- No logging strategy for debugging calculation issues

**Technical Details**:
- Install and configure **Sentry** for frontend error tracking
- Add **Grafana/Prometheus** or **Datadog** for backend metrics
- Implement structured logging for calculation performance
- Add database query monitoring (pg_stat_statements equivalent)
- Set up alerts for slow calculations (>200ms)

**Monitoring Requirements**:
```typescript
// Frontend error boundary with Sentry
import * as Sentry from "@sentry/react";

// Backend calculation monitoring
import { performance } from 'perf_hooks';

function calculateYTM(bond: Bond): number {
  const start = performance.now();
  try {
    const result = ytmSolver(bond);
    const duration = performance.now() - start;
    
    // Log slow calculations
    if (duration > 200) {
      logger.warn('Slow YTM calculation', { 
        duration, 
        bondId: bond.id, 
        complexity: bond.isCallable ? 'callable' : 'vanilla' 
      });
    }
    
    return result;
  } catch (error) {
    Sentry.captureException(error, { extra: { bondId: bond.id } });
    throw error;
  }
}
```

**Alert Thresholds**:
- YTM calculation > 200ms
- Frontend error rate > 1%
- BondTerminal page load > 2s
- Memory usage > 80%

**File Changes Required**:
- `package.json` - Add Sentry, monitoring dependencies
- `client/src/lib/monitoring.ts` - Error tracking setup
- `server/middleware/monitoring.ts` - Performance monitoring
- `server/middleware/logging.ts` - Structured logging

**Acceptance Criteria**:
- [ ] Sentry captures frontend errors with bond context
- [ ] Slow calculation alerts trigger correctly
- [ ] Performance dashboards show calculation metrics
- [ ] Logs include sufficient context for debugging
- [ ] Monitoring overhead < 5ms per request

---

### **TODO #1: Fix Routing and Page Structure** 
*Priority: CRITICAL | Time: 45 minutes | Dependencies: None*

**Objective**: Establish proper routing infrastructure for the BondTerminal

**Current State**: 
- Basic routing exists but BondTerminal route missing
- App.tsx needs update to include BondTerminal route
- Error in import for non-existent bond-calculator page

**Technical Details**:
- Update `client/src/App.tsx` to include BondTerminal route `/calculator/:bondId?`
- Handle optional bondId parameter (for direct deep linking to specific bonds)
- Implement route guards to prevent access without bond data
- Add breadcrumb navigation between builder and BondTerminal

**Implementation Notes**:
```typescript
// Route structure needed:
// /calculator              -> Bond selector screen
// /calculator/123          -> BondTerminal for bond ID 123  
// /calculator/golden:al30d -> BondTerminal for golden bond AL30D

// App.tsx changes needed:
function Router() {
  return (
    <Switch>
      <Route path="/" component={BondBuilder} />
      <Route path="/builder" component={BondBuilder} />
      <Route path="/calculator/:bondId?" component={BondCalculator} />
      <Route component={NotFound} />
    </Switch>
  );
}
```

**File Changes Required**:
- `client/src/App.tsx` - Add BondTerminal route
- Create `client/src/pages/bond-calculator.tsx` 

**Challenges**:
- Need to handle both saved bonds (numeric IDs) and golden bonds (string IDs)
- URL state management for bookmarking BondTerminal configurations
- Proper error handling for invalid bond IDs
- TypeScript import resolution

**Acceptance Criteria**:
- [ ] Calculator route properly registered in App.tsx
- [ ] Direct navigation to `/calculator` shows bond selector
- [ ] Direct navigation to `/calculator/123` loads specific bond
- [ ] Back navigation preserves user's place in bond builder
- [ ] URL reflects current calculator state for sharing
- [ ] TypeScript compilation passes without errors

---

### **TODO #2: Create BondTerminal Page Shell** 
*Priority: HIGH | Time: 2 hours | Dependencies: TODO #1*

**Objective**: Build the main BondTerminal page with loading states, error handling, and basic layout structure

**Current State**: 
- Page has been created but needs integration with BondTerminal state
- Basic bond loading logic exists but needs error handling
- UI layout is placeholder, needs proper BondTerminal interface

**Technical Details**:
- Create comprehensive `client/src/pages/bond-calculator.tsx`
- Implement three distinct UI states:
  1. **Bond Selector Mode**: When no bondId provided - shows selection interface
  2. **Loading Mode**: While fetching bond data and building analytics  
  3. **BondTerminal Mode**: Interactive BondTerminal interface when bond is loaded
- Add proper TypeScript interfaces for all component props
- Implement error boundaries for graceful error handling

**Data Flow Requirements**:
```typescript
// Bond loading logic needed:
1. Check if bondId is golden bond (starts with 'golden:')
2. If golden -> fetch from /api/bonds/golden/:id/build  
3. If regular -> fetch from /api/bonds/:id then build
4. Handle loading states and errors appropriately
5. Pass bond data to BondTerminal components

// State management needed:
interface CalculatorPageState {
  bond: BondDefinition | null;
  bondResult: BondResult | null;
  isLoading: boolean;
  error: string | null;
  calculatorState: CalculatorState;
}
```

**Layout Structure**:
```
┌─────────── BondTerminal Header ───────────┐
│ Bond Info | Navigation | Quick Actions  │
├────────────────────────────────────────┤
│ ┌─── Pricing Panel ────┐ ┌─ Risk ────┐ │
│ │ Price/Yield/Spread   │ │ Duration   │ │  
│ │ Settlement Date      │ │ Convexity  │ │
│ └─────────────────────┘ │ DV01       │ │
│ ┌─── Accrued Panel ───┐ │ Avg Life   │ │
│ │ Clean/Dirty Price    │ └───────────┘ │
│ │ Days to Coupon       │ ┌─ Scenario ─┐ │
│ └─────────────────────┘ │ +/-50bp     │ │
│                         │ P&L Impact  │ │
│                         └─────────────┘ │
├────────────────────────────────────────┤
│ 📊 Cash Flow Schedule (Collapsible)    │
└────────────────────────────────────────┘
```

**Error Handling Requirements**:
- Network failures during bond loading
- Invalid bond IDs (404 errors)
- Calculation timeouts
- Invalid user inputs (negative prices, etc.)
- Browser compatibility issues
- Malformed API responses

**File Changes Required**:
- `client/src/pages/bond-calculator.tsx` - Main BondTerminal page
- Update imports in `client/src/App.tsx`

**Acceptance Criteria**:
- [ ] Page renders correctly in all three modes
- [ ] Loading spinners and skeleton states implemented
- [ ] Error states show helpful messages and recovery options
- [ ] Responsive design works on mobile and desktop
- [ ] Accessibility features (ARIA labels, keyboard navigation)
- [ ] Performance optimized (no unnecessary re-renders)

---

### **TODO #3.5: Precision-Safe Math & Day-Count Infrastructure** 
*Priority: CRITICAL | Time: 2 hours | Dependencies: TODO #2*

**Objective**: Implement precision-safe decimal arithmetic and day-count convention strategy pattern

**Current State**: 
- All calculations use JavaScript floating-point numbers (dangerous for financial math)
- Day count conventions are hard-coded as strings
- No strategy pattern for different market conventions

**Technical Details**:
- Install and configure `decimal.js` for all financial calculations
- Create `shared/day-count.ts` with strategy pattern for different conventions
- Implement support for: `30/360`, `30E/360`, `ACT/ACT`, `ACT/365`, `BUS/252` (Brazilian corporates)
- Replace all arithmetic in `server/storage-temp.ts` with Decimal operations
- Add tolerance parameters to all iterative solvers

**Day-Count Strategy Pattern**:
```typescript
interface DayCountConvention {
  code: '30/360' | '30E/360' | 'ACT/ACT' | 'ACT/365' | 'BUS/252';
  yearFraction(startDate: Date, endDate: Date): Decimal;
  description: string;
}

class Act365Convention implements DayCountConvention {
  code = 'ACT/365' as const;
  yearFraction(start: Date, end: Date): Decimal {
    const days = daysBetween(start, end);
    return new Decimal(days).div(365);
  }
  description = 'Actual days / 365 fixed';
}

// Factory function
export function getDayCountConvention(code: string): DayCountConvention;
```

**Precision Requirements**:
- All bond prices must use Decimal arithmetic (prevents 32nds rounding errors)
- All yield calculations must use Decimal (prevents tiny coupon errors)
- Newton-Raphson solver must include `eps` tolerance parameter
- Cash flow calculations must preserve precision to 10 decimal places

**File Changes Required**:
- `shared/day-count.ts` - New day count strategy system
- `shared/decimal-utils.ts` - Decimal arithmetic helpers
- Update `server/storage-temp.ts` - Replace all Math operations with Decimal
- Update `shared/schema.ts` - Add day count convention enum

**Acceptance Criteria**:
- [ ] All financial calculations use Decimal arithmetic
- [ ] Day count strategy pattern supports 5+ conventions
- [ ] Newton-Raphson solvers include tolerance parameters
- [ ] Zero rounding errors in price/yield calculations
- [ ] Brazilian BUS/252 convention works correctly
- [ ] Performance impact < 20% vs floating point

---

### **TODO #3: Bond Selector Component** 
*Priority: MEDIUM | Time: 1.5 hours | Dependencies: TODO #2*

**Objective**: Create an interface for users to select bonds from saved bonds or golden templates

**Current State**: 
- Golden bonds already exist in schema
- API endpoints exist for fetching bonds
- Need to create user-friendly selection interface

**Technical Details**:
- Build `client/src/components/bond-selector.tsx` 
- Implement search/filter functionality for saved bonds
- Display golden bond templates in organized grid
- Add bond preview cards with key information
- Implement lazy loading for large bond lists

**Data Requirements**:
```typescript
interface BondPreview {
  id: string | number;
  issuer: string;
  couponRate: number;
  maturityDate: string;
  isin?: string;
  currency: string;
  isCallable?: boolean;
  isPuttable?: boolean;
  isAmortizing?: boolean;
  description?: string;
  lastCalculated?: string;
}

interface BondSelectorProps {
  onSelect: (bondId: string) => void;
  recentBonds?: BondPreview[];
}
```

**Features Needed**:
- **Search**: Filter by issuer, ISIN, or description
- **Categories**: Separate sections for Golden Bonds vs Saved Bonds
- **Preview Cards**: Show key bond information at a glance
- **Quick Actions**: "Calculate" button that navigates to calculator
- **Recently Used**: Track and display recently calculated bonds
- **Sorting**: By maturity, issuer, coupon rate, etc.

**API Integration**:
- GET `/api/bonds` - Fetch saved bonds list
- GET `/api/bonds/golden` - Fetch golden bond templates
- Implement client-side filtering and sorting
- Add pagination for large bond lists

**UI/UX Considerations**:
- Grid layout for bond cards (responsive: 1 col mobile, 2-3 cols tablet, 4 cols desktop)
- Loading states for API calls
- Empty states when no bonds found
- Clear visual distinction between golden and saved bonds
- Search debouncing to avoid excessive API calls
- Keyboard navigation support

**File Changes Required**:
- `client/src/components/bond-selector.tsx` - New component
- Update `client/src/pages/bond-calculator.tsx` to use selector

**Acceptance Criteria**:
- [ ] Search functionality works across all bond fields
- [ ] Golden bonds display with special styling (gold border/accent)
- [ ] Bond cards show essential information clearly
- [ ] Click handling navigates to BondTerminal with correct bond ID
- [ ] Performance optimized for 100+ bonds
- [ ] Mobile-responsive grid layout
- [ ] Keyboard accessibility

---

## **🔧 Phase 2: State Management & Business Logic** 
*Total Estimated Time: 3-4 days*

### **TODO #4: BondTerminal State Hook** 
*Priority: CRITICAL | Time: 4 hours | Dependencies: TODO #2, TODO #3.5*

**Objective**: Create comprehensive state management for BondTerminal inputs, outputs, and UI interactions with precision-safe calculations

**Current State**: 
- Hook partially created but has TypeScript errors with 'yield' keyword
- Need to fix reserved keyword issue and complete implementation
- Missing integration with calculation API
- **CRITICAL**: Current floating-point math will cause rounding errors with tiny coupons and 32nds pricing

**Technical Details**:
- Build `client/src/hooks/useCalculatorState.ts`
- **⚠️ PRECISION**: Replace all number arithmetic with `decimal.js` for financial calculations
- Implement reactive state that triggers recalculations when inputs change
- Handle three-way relationship between Price ↔ Yield ↔ Spread
- Add field locking mechanism (when user sets price, yield becomes calculated)
- Implement debounced API calls to avoid excessive requests
- Add tolerance parameter (`eps = 1e-10`) to prevent Newton-Raphson cycling

**TypeScript Issues to Fix**:
```typescript
// PROBLEM: 'yield' is reserved keyword in TypeScript
export interface CalculatorInput {
  price?: number;
  yield?: number;     // ❌ ERROR: Reserved keyword
  spread?: number;
}

// SOLUTION: Rename to yieldValue
export interface CalculatorInput {
  price?: number;
  yieldValue?: number;  // ✅ FIXED
  spread?: number;
}
```

**State Management Architecture**:
```typescript
interface CalculatorState {
  // Input values
  input: CalculatorInput;
  
  // Calculation results
  analytics?: BondAnalytics;
  bondResult?: BondResult;
  
  // UI state
  isCalculating: boolean;
  error?: string;
  lastCalculated?: number;
  
  // Actions
  setPrice: (price: number) => void;
  setYieldValue: (yieldValue: number) => void;
  setSpread: (spread: number) => void;
  setSettlementDate: (date: string) => void;
  lockField: (field: 'PRICE' | 'YIELD' | 'SPREAD') => void;
  unlockField: () => void;
  resetToMarket: () => void;
  runScenario: (shockBp: number) => void;
}
```

**Calculation Logic Requirements**:
- When user inputs price → calculate yield
- When user inputs yield → calculate price  
- When user inputs spread → calculate price and yield relative to benchmark
- Real-time updates with 300ms debounce
- Maintain field locking (don't overwrite user's manual inputs)

**API Integration**:
- Create new endpoint `/api/bonds/calculate` for real-time calculations
- Fallback to existing `/api/bonds/build` if calculate endpoint unavailable
- Handle network errors gracefully

**File Changes Required**:
- `client/src/hooks/useCalculatorState.ts` - Fix TypeScript errors
- `server/routes.ts` - Add new calculate endpoint
- Update BondTerminal page to use the hook

**Acceptance Criteria**:
- [ ] TypeScript compilation passes without errors
- [ ] Price/yield calculations work in both directions
- [ ] Field locking prevents unwanted overwrites
- [ ] Debouncing prevents excessive API calls
- [ ] Error states handled gracefully
- [ ] Performance optimized (memoized calculations)

---

### **TODO #5: Enhanced Calculation API** 
*Priority: HIGH | Time: 3 hours | Dependencies: TODO #4*

**Objective**: Create real-time calculation endpoint for interactive price/yield solving with yield-to-worst support

**Current State**: 
- Only `/api/bonds/build` exists (full bond building)
- Need lighter endpoint for real-time calculations
- Existing calculation logic in storage-temp.ts can be leveraged
- **MISSING**: Yield-to-worst calculation for callable/puttable bonds

**Technical Details**:
- Add POST `/api/bonds/calculate` endpoint to `server/routes.ts`
- Implement price-to-yield and yield-to-price solving
- **🎯 YTW PRIORITY**: Add `yieldToWorst(bond, marketPrice)` helper that iterates over call/put dates
- Add spread calculation against benchmark curves
- Support settlement date overrides for accrued interest
- Return enhanced analytics with real-time metrics

**API Specification**:
```typescript
// Request
interface CalculateRequest {
  bond: BondDefinition;
  marketPrice?: number;        // If provided, solve for yield
  targetYield?: number;        // If provided, solve for price
  targetSpread?: number;       // If provided, solve for price via spread
  settlementDate?: string;     // Override settlement date
  benchmarkCurve?: RateCurve;  // For spread calculations
}

// Response
interface CalculateResponse {
  analytics: BondAnalytics;
  cashFlows?: CashFlowResult[];
  calculationTime: number;
  status: 'success' | 'error';
  message?: string;
}
```

**Calculation Priorities**:
1. If `marketPrice` provided → solve for yield using existing YTM logic
2. If `targetYield` provided → solve for price using present value
3. If `targetSpread` provided → solve via benchmark curve + spread
4. Return enhanced analytics with settlement-specific calculations

**Performance Requirements**:
- Response time < 50ms for simple bonds
- Response time < 200ms for complex bonds (callable, amortizing)
- Proper error handling for invalid inputs
- Input validation using Zod schemas

**File Changes Required**:
- `server/routes.ts` - Add calculate endpoint
- Enhance `server/storage-temp.ts` calculation methods
- Add validation schemas to `shared/schema.ts`

**Acceptance Criteria**:
- [ ] Endpoint responds within performance targets
- [ ] Price-to-yield solving works accurately
- [ ] Yield-to-price solving works accurately
- [ ] Settlement date overrides affect accrued interest
- [ ] Error handling for edge cases (negative rates, etc.)
- [ ] Input validation prevents server crashes

---

### **TODO #6: BondTerminal Utility Functions** 
*Priority: MEDIUM | Time: 1 hour | Dependencies: TODO #4*

**Objective**: Create helper functions for formatting, validation, and calculations

**Technical Details**:
- Build `client/src/lib/calculator-utils.ts`
- Implement price formatting (decimal vs fractional)
- Add input validation functions
- Create formatting utilities for different number types

**Utility Functions Needed**:
```typescript
// Price formatting
export function formatPrice(price: number, format: 'DECIMAL' | 'FRACTIONAL'): string {
  if (format === 'FRACTIONAL') {
    // Convert to 32nds: 100.5 → "100-16"
    const whole = Math.floor(price);
    const fraction = (price - whole) * 32;
    return `${whole}-${Math.round(fraction).toString().padStart(2, '0')}`;
  }
  return price.toFixed(4);
}

// Percentage formatting
export function formatPercent(value: number, precision: number = 3): string {
  return `${value.toFixed(precision)}%`;
}

// Basis points formatting
export function formatBasisPoints(value: number): string {
  return `${(value * 100).toFixed(0)}bp`;
}

// Input validation
export function validatePrice(price: string): { isValid: boolean; error?: string } {
  const num = parseFloat(price);
  if (isNaN(num)) return { isValid: false, error: 'Invalid number' };
  if (num <= 0) return { isValid: false, error: 'Price must be positive' };
  if (num > 10000) return { isValid: false, error: 'Price seems unrealistic' };
  return { isValid: true };
}

// Scenario calculations
export function calculatePriceChange(duration: number, yieldShock: number, basePrice: number): number {
  // Simplified duration-based approximation
  return -(duration / 100) * yieldShock * basePrice;
}
```

**File Changes Required**:
- `client/src/lib/calculator-utils.ts` - New utility file

**Acceptance Criteria**:
- [ ] Price formatting handles both decimal and fractional formats
- [ ] Input validation catches common errors
- [ ] Utility functions are pure (no side effects)
- [ ] Functions handle edge cases gracefully
- [ ] TypeScript types are properly defined

---

## **🎨 Phase 3: UI Components** 
*Total Estimated Time: 4-5 days*

### **TODO #7: Pricing Panel Component** 
*Priority: HIGH | Time: 3 hours | Dependencies: TODO #4, TODO #6*

**Objective**: Create the main interactive pricing interface with price/yield/spread inputs

**Technical Details**:
- Build `client/src/components/calculator/pricing-panel.tsx`
- Implement three linked input fields with locking mechanism
- Add real-time validation and formatting
- Support both decimal and fractional price display
- Implement keyboard shortcuts (P for price, Y for yield, S for spread)

**Component Architecture**:
```typescript
interface PricingPanelProps {
  calculatorState: CalculatorState;
  className?: string;
}

// Internal state for local input handling
interface LocalInputs {
  priceInput: string;
  yieldInput: string;
  spreadInput: string;
}
```

**Key Features**:
- **Field Locking**: When user inputs price, yield becomes calculated (read-only)
- **Real-time Updates**: Changes trigger debounced calculations
- **Input Validation**: Visual feedback for invalid inputs
- **Format Toggle**: Switch between decimal (100.500) and fractional (100-16) price display
- **Precision Control**: Adjustable decimal places for yield display
- **Settlement Date**: Date picker with business day validation

**Visual Indicators**:
- **Locked Field**: Yellow lock icon + yellow border
- **Calculating**: Spinning indicator in input field
- **Error State**: Red border + error message below
- **Derived Value**: Grayed out text for calculated fields

**User Interactions**:
```typescript
// Input flow examples:
1. User types "102.5" in price field
   → Price locked, yield becomes calculated
   → API call triggered after 300ms debounce
   
2. User types "3.85" in yield field  
   → Yield locked, price becomes calculated
   → API call triggered after 300ms debounce

3. User clicks lock icon on spread field
   → Spread locked, price and yield become calculated
```

**File Changes Required**:
- `client/src/components/calculator/pricing-panel.tsx` - New component
- Update BondTerminal page to include pricing panel

**Acceptance Criteria**:
- [ ] Three-way price/yield/spread relationship works correctly
- [ ] Field locking prevents unwanted overwrites
- [ ] Input validation provides clear feedback
- [ ] Decimal/fractional price formatting works
- [ ] Settlement date picker affects calculations
- [ ] Keyboard shortcuts work (P, Y, S keys)
- [ ] Mobile-responsive layout

---

### **TODO #8: Risk Metrics Panel** 
*Priority: HIGH | Time: 2 hours | Dependencies: TODO #7*

**Objective**: Display calculated risk metrics with real-time updates

**Technical Details**:
- Build `client/src/components/calculator/risk-metrics-panel.tsx`
- Display duration, convexity, DV01, average life, current yield
- Add tooltips explaining each metric
- Implement color-coding for risk levels

**Metrics to Display**:
```typescript
interface RiskMetrics {
  modifiedDuration: number;      // Price sensitivity to yield changes
  macaulayDuration: number;      // Weighted average time to cash flows  
  convexity: number;             // Second-order price sensitivity
  dollarDuration: number;        // DV01 - dollar value of 1 basis point
  averageLife: number;           // Weighted average principal repayment
  currentYield: number;          // Annual coupon / market price
  yieldToCall?: number;          // For callable bonds
  yieldToPut?: number;           // For puttable bonds
}
```

**Visual Design**:
- Grid layout with metric cards
- Color-coded risk levels (green/yellow/red for low/medium/high duration)
- Trend indicators for metrics changes
- Tooltips with explanations and formulas

**Real-time Updates**:
- Metrics update when calculator state changes
- Smooth animations for value changes
- Loading states while calculating

**File Changes Required**:
- `client/src/components/calculator/risk-metrics-panel.tsx` - New component

**Acceptance Criteria**:
- [ ] All risk metrics display correctly
- [ ] Tooltips explain each metric clearly
- [ ] Color coding helps identify risk levels
- [ ] Real-time updates work smoothly
- [ ] Mobile-responsive grid layout

---

### **TODO #9: Scenario Analysis Panel** 
*Priority: MEDIUM | Time: 2 hours | Dependencies: TODO #7*

**Objective**: Provide "what-if" analysis with basis point shocks

**Technical Details**:
- Build `client/src/components/calculator/scenario-panel.tsx`
- Implement preset shock buttons (-100bp, -50bp, +50bp, +100bp)
- Calculate and display price impact for each scenario
- Add P&L impact calculations for different notional amounts

**Scenario Features**:
```typescript
interface ScenarioConfig {
  shockBp: number;              // Basis point shock amount
  label: string;                // Display label ("-50bp")
  color: string;                // Button color theme
}

const presetScenarios: ScenarioConfig[] = [
  { shockBp: -100, label: "-100bp", color: "bg-green-600" },
  { shockBp: -50,  label: "-50bp",  color: "bg-green-500" },
  { shockBp: -25,  label: "-25bp",  color: "bg-green-400" },
  { shockBp: 0,    label: "Market", color: "bg-gray-600" },
  { shockBp: 25,   label: "+25bp",  color: "bg-red-400" },
  { shockBp: 50,   label: "+50bp",  color: "bg-red-500" },
  { shockBp: 100,  label: "+100bp", color: "bg-red-600" },
];
```

**Calculations Required**:
- Duration-based price approximation
- Convexity adjustment for large moves
- P&L impact per $1MM notional
- Percentage price change

**User Interactions**:
- Click scenario button → temporarily apply shock
- Auto-reset to market after 3 seconds
- Visual indicator for active scenario

**File Changes Required**:
- `client/src/components/calculator/scenario-panel.tsx` - New component

**Acceptance Criteria**:
- [ ] Scenario buttons trigger yield shocks correctly
- [ ] Price impact calculations are accurate
- [ ] P&L calculations work for different notionals
- [ ] Auto-reset functionality works
- [ ] Visual feedback for active scenario

---

### **TODO #10: Accrued Interest Panel** 
*Priority: MEDIUM | Time: 1.5 hours | Dependencies: TODO #7*

**Objective**: Display settlement-related calculations and accrued interest

**Technical Details**:
- Build `client/src/components/calculator/accrued-panel.tsx`
- Calculate and display clean price, dirty price, accrued interest
- Show days to next coupon payment
- Add settlement date controls

**Settlement Calculations**:
```typescript
interface AccruedInfo {
  settlementDate: Date;
  cleanPrice: number;           // Price without accrued
  dirtyPrice: number;           // Price with accrued  
  accruedInterest: number;      // Interest since last payment
  daysToNextCoupon: number;     // Days until next payment
  lastCouponDate: Date;         // Previous coupon date
  nextCouponDate: Date;         // Next coupon date
}
```

**Date Controls**:
- Settlement date picker with business day validation
- Preset buttons (Today, T+1, T+2, T+3)
- Highlight weekends and holidays

**File Changes Required**:
- `client/src/components/calculator/accrued-panel.tsx` - New component

**Acceptance Criteria**:
- [ ] Accrued interest calculation is accurate
- [ ] Clean/dirty price distinction is clear
- [ ] Settlement date affects all calculations
- [ ] Business day validation works

---

### **TODO #11: Calculator Layout Component** 
*Priority: HIGH | Time: 1 hour | Dependencies: TODOs #7-10*

**Objective**: Orchestrate all calculator components in responsive grid layout

**Technical Details**:
- Build `client/src/components/calculator/calculator-layout.tsx`
- Implement responsive grid system
- Add collapsible cash flow section
- Manage component interactions and data flow

**Layout Specifications**:
```css
/* Desktop Layout */
.calculator-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 1.5rem;
}

/* Mobile Layout */
@media (max-width: 768px) {
  .calculator-grid {
    grid-template-columns: 1fr;
  }
}
```

**Component Orchestration**:
- Pass BondTerminal state to all child components
- Handle loading states across all panels
- Manage error boundaries for individual components

**File Changes Required**:
- `client/src/components/calculator/calculator-layout.tsx` - New component
- Update BondTerminal page to use layout component

**Acceptance Criteria**:
- [ ] Responsive grid layout works on all screen sizes
- [ ] Component interactions are smooth
- [ ] Loading states are coordinated
- [ ] Error boundaries prevent cascading failures

---

## **🔧 Phase 4: Enhanced Features** 
*Total Estimated Time: 2-3 days*

### **TODO #12: BondTerminal Header Component** 
*Priority: MEDIUM | Time: 1 hour | Dependencies: TODO #11*

**Objective**: Create header with bond information and quick actions

**Features**:
- Bond summary (issuer, coupon, maturity)
- Feature badges (callable, puttable, amortizing)
- Navigation breadcrumbs
- Quick action buttons (save, export, share)

### **TODO #13: Export & Share Functionality** 
*Priority: LOW | Time: 2 hours | Dependencies: TODO #12*

**Objective**: Allow users to export BondTerminal results and share configurations

**Features**:
- PDF report generation
- CSV export of cash flows and analytics
- URL sharing with BondTerminal state
- Save BondTerminal configurations

### **TODO #14: Keyboard Shortcuts** 
*Priority: LOW | Time: 1 hour | Dependencies: TODO #11*

**Objective**: Add power-user keyboard shortcuts for efficiency

**Shortcuts**:
- `P` - Focus price input
- `Y` - Focus yield input  
- `S` - Focus spread input
- `ESC` - Unlock all fields
- `CTRL+S` - Save configuration
- `CTRL+E` - Export results

### **TODO #15: Mobile Optimization** 
*Priority: MEDIUM | Time: 2 hours | Dependencies: TODO #11*

**Objective**: Ensure BondTerminal works well on mobile devices

**Features**:
- Collapsible panels for small screens
- Touch-friendly input controls
- Optimized layout for portrait/landscape
- Performance optimization for mobile browsers

---

## **🧪 Phase 5: Testing & Polish** 
*Total Estimated Time: 2-3 days*

### **TODO #16: Unit Tests** 
*Priority: HIGH | Time: 6 hours | Dependencies: All TODOs*

**Test Coverage**:
- BondTerminal state hook tests
- Utility function tests  
- Component rendering tests
- API endpoint tests
- **🧪 EDGE CASES**: Critical financial scenarios that break most systems

**Golden Test Cases** (Must Pass):
```typescript
// Edge case bonds that commonly break bond analytics systems
const edgeCaseBonds = [
  {
    name: "Stub Period Floater",
    description: "Odd first coupon period (47 days vs 180)",
    issueDate: "2024-01-15",
    firstCouponDate: "2024-03-01",  // 47 days
    nextCouponDate: "2024-09-01",   // 184 days
    paymentFrequency: 2,
    dayCount: "ACT/ACT",
    expectedYTM: 5.234,  // Pre-calculated reference
  },
  
  {
    name: "Zero Coupon Bond", 
    description: "0% coupon rate, price ≈ discount factor",
    couponRate: 0.0,
    faceValue: 100,
    marketPrice: 67.89,
    maturityYears: 5,
    expectedYTM: 8.000,  // Exact: (100/67.89)^(1/5) - 1
  },
  
  {
    name: "Deep Discount Callable",
    description: "YTC < YTM < YTW scenario",
    marketPrice: 85.0,
    callPrice: 103.0,
    callDate: "2026-01-15",
    maturityDate: "2029-01-15", 
    expectedYTM: 7.45,
    expectedYTC: 6.23,
    expectedYTW: 6.23,  // Should be YTC
  },
  
  {
    name: "Brazilian BUS/252",
    description: "Business days only, 252 day year",
    dayCount: "BUS/252",
    currency: "BRL",
    holidays: ["2024-02-12", "2024-04-21"],  // Carnaval, Tiradentes
    expectedAccruedDays: 15,  // Business days only
  }
];
```

### **TODO #17: Integration Tests** 
*Priority: MEDIUM | Time: 3 hours | Dependencies: TODO #16*

**Test Scenarios**:
- End-to-end BondTerminal workflows
- Price/yield solving accuracy
- Error handling scenarios
- Mobile responsiveness

### **TODO #18: Performance Optimization** 
*Priority: MEDIUM | Time: 2 hours | Dependencies: TODO #17*

**Optimizations**:
- Memoization of expensive calculations
- Debouncing of API calls
- Code splitting for BondTerminal components
- Bundle size optimization

---

### **TODO #18.5: Cross-Browser CI Matrix** 
*Priority: MEDIUM | Time: 1 hour | Dependencies: TODO #17*

**Objective**: Ensure BondTerminal works across all browser engines, especially mobile

**Current State**: 
- Only testing in Chrome during development
- Number formatting and keyboard shortcuts may break in other browsers
- Mobile BondTerminal performance unknown

**CI Matrix Requirements**:
```yaml
# .github/workflows/browser-tests.yml
matrix:
  browser:
    - chrome-latest
    - firefox-latest
    - safari-latest
    - edge-latest
    - chrome-mobile  # Android Chrome
    - safari-mobile  # iOS Safari
  os:
    - ubuntu-latest
    - macos-latest
    - windows-latest
```

**Critical Test Scenarios**:
- **Number Formatting**: 32nds display, decimal parsing
- **Keyboard Shortcuts**: P/Y/S keys, ESC unlock
- **Touch Interactions**: Mobile input handling
- **Decimal Precision**: Financial calculations accuracy
- **Performance**: BondTerminal load time < 2s on mobile

**Browser-Specific Concerns**:
- **Firefox**: Strict security mode may block some features
- **Safari**: Different number input behavior
- **Mobile**: Touch event handling, viewport scaling
- **Edge**: Legacy compatibility for corporate users

**File Changes Required**:
- `.github/workflows/browser-tests.yml` - CI configuration
- Add Playwright browser testing setup
- Mobile-specific test scenarios

**Acceptance Criteria**:
- [ ] All browsers pass BondTerminal functionality tests
- [ ] Mobile performance meets 2s load time target
- [ ] Number formatting works across all engines
- [ ] Keyboard shortcuts work in all desktop browsers
- [ ] Touch interactions work on mobile devices

### **TODO #19: Accessibility Audit** 
*Priority: MEDIUM | Time: 2 hours | Dependencies: TODO #18*

**Requirements**:
- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation
- Color contrast verification

---

### **TODO #20: Security & Data Protection** 
*Priority: HIGH | Time: 3 hours | Dependencies: TODO #17*

**Objective**: Secure the application against common attack vectors and protect financial data

**Security Requirements**:
- **SQL Injection Prevention**: Sanitize any CSV upload filenames, use parameterized queries
- **Input Validation**: Validate all bond parameters to prevent calculation exploits
- **Rate Limiting**: Prevent abuse of calculation endpoints
- **Data Sanitization**: Clean all user inputs before processing

**Implementation Details**:
```typescript
// CSV upload security (if implemented)
function sanitizeCSVFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 100);
}

// Input validation for bond data
const bondInputSchema = z.object({
  couponRate: z.number().min(0).max(100),
  faceValue: z.number().min(1).max(1000000000),
  maturityDate: z.string().refine(isValidDate),
});
```

**Rate Limiting**:
- Max 60 calculations per minute per IP
- Max 10 concurrent calculations per session
- Progressive backoff for repeated errors

**File Changes Required**:
- `server/middleware/security.ts` - Input validation
- `server/middleware/rate-limit.ts` - API rate limiting
- Update all API endpoints with validation

**Acceptance Criteria**:
- [ ] All inputs validated before processing
- [ ] Rate limiting prevents abuse
- [ ] No SQL injection vectors
- [ ] Financial data properly sanitized

---

### **TODO #21: Future-Proofing & Extensibility** 
*Priority: LOW | Time: 2 hours | Dependencies: TODO #20*

**Objective**: Add hooks and infrastructure for future features without immediate UI

**Future Hooks**:
```sql
-- Bond annotations table (no UI yet, but schema is cheap)
CREATE TABLE bond_notes (
  id SERIAL PRIMARY KEY,
  bond_id INTEGER REFERENCES bonds(id),
  user_id INTEGER, -- For future auth
  note_text TEXT,
  note_type VARCHAR(20) DEFAULT 'analysis', -- 'analysis', 'warning', 'bookmark'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Calculation history for audit trails
CREATE TABLE calculation_history (
  id SERIAL PRIMARY KEY,
  bond_id INTEGER,
  input_price DECIMAL(10,4),
  output_yield DECIMAL(8,4),
  market_data_snapshot JSONB,
  calculated_at TIMESTAMP DEFAULT NOW(),
  calculation_time_ms INTEGER
);
```

**Extensibility Patterns**:
- Plugin architecture for custom calculators
- Configurable calculation engines
- Market data source abstraction
- User preference storage

**File Changes Required**:
- `shared/schema.ts` - Add future table schemas
- `server/migrations/` - Database migration files
- Document extension points in README

**Acceptance Criteria**:
- [ ] Database schema supports future features
- [ ] Extension points documented
- [ ] No breaking changes to existing APIs
- [ ] Migration strategy defined

---

## **📊 Final Milestones & Success Criteria**

### **MVP (Minimum Viable Product)**
*Target: End of Phase 3*
- [ ] Basic price/yield calculations work
- [ ] Risk metrics display correctly
- [ ] Mobile-responsive layout
- [ ] Error handling for common cases

### **Full Feature Set**
*Target: End of Phase 4*
- [ ] All calculator features implemented
- [ ] Export/share functionality works
- [ ] Keyboard shortcuts implemented
- [ ] Professional UI/UX polish

### **Production Ready**
*Target: End of Phase 5*
- [ ] Comprehensive test coverage (>90%)
- [ ] Performance optimized (<2s initial load)
- [ ] Accessibility compliant
- [ ] Documentation complete

---

## **🎯 Key Technical Decisions**

### **State Management**
- **Choice**: Custom hooks with useCallback/useMemo
- **Rationale**: Lighter than Redux, better performance than context
- **Trade-offs**: More boilerplate, but better TypeScript integration

### **API Design**
- **Choice**: RESTful endpoints with enhanced calculation endpoint
- **Rationale**: Builds on existing API patterns
- **Trade-offs**: Multiple endpoints vs single GraphQL endpoint

### **Styling**
- **Choice**: Tailwind CSS with existing design system
- **Rationale**: Consistency with bond builder
- **Trade-offs**: Larger bundle size vs faster development

### **Testing Strategy**
- **Choice**: Jest + React Testing Library + Playwright
- **Rationale**: Industry standard, good TypeScript support
- **Trade-offs**: Setup complexity vs comprehensive coverage

---

## **🚀 Getting Started**

### **Priority Order for Implementation**
1. **Phase 1** - Critical foundation work
2. **TODO #4** - Calculator state hook (highest complexity)
3. **TODO #7** - Pricing panel (highest user value)
4. **TODO #8** - Risk metrics (core functionality)
5. **Remaining TODOs** - Based on user feedback

### **Development Environment Setup**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run check

# Run tests (once implemented)
npm test
```

### **Branching Strategy**
- `feature/calculator-foundation` - Phase 1 work
- `feature/calculator-state` - State management 
- `feature/calculator-ui` - UI components
- `feature/calculator-polish` - Final polish

This comprehensive TODO provides a roadmap for building a professional-grade BondTerminal that integrates seamlessly with the existing bond builder system while providing advanced financial analysis capabilities.
