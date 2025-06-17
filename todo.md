Always keep the @todo.md file in this location in the main folder. When there is a new todo, add it to the top

## 🔧 Refactoring Roadmap

### High Priority Refactoring

[ ] **1. Simplify Calculator State Management**
    • Split 585-line `useCalculatorState` hook into focused modules
    • Extract API calls, validation, and pure state logic
    • Create dedicated calculation service
    
    **Implementation approach:**
    ```typescript
    // hooks/useCalculatorAPI.ts
    export const useCalculatorAPI = () => {
      const fetchBondData = async (bondId: string) => { /* ... */ };
      const fetchTreasuryCurve = async () => { /* ... */ };
      return { fetchBondData, fetchTreasuryCurve };
    };
    
    // hooks/useCalculatorValidation.ts
    export const useCalculatorValidation = () => {
      const validatePrice = (price: number) => { /* ... */ };
      const validateYTM = (ytm: number) => { /* ... */ };
      return { validatePrice, validateYTM };
    };
    
    // services/calculatorService.ts
    export class CalculatorService {
      calculateYTM(bond: Bond, price: number): number { /* ... */ }
      calculatePrice(bond: Bond, ytm: number): number { /* ... */ }
      calculateSpread(ytm: number, treasuryYield: number): number { /* ... */ }
    }
    
    // hooks/useCalculatorState.ts (simplified)
    export const useCalculatorState = () => {
      const api = useCalculatorAPI();
      const validation = useCalculatorValidation();
      const calculator = new CalculatorService();
      // Now only ~100 lines of pure state management
    };
    ```

[ ] **2. Remove Unused UI Components**
    • Audit 47+ shadcn/ui components
    • Remove unused: avatar, carousel, menubar, navigation-menu, pagination, sidebar, etc.
    • Reduce bundle size and maintenance burden
    
    **Components to remove:**
    ```bash
    # Run audit script to identify unused components
    grep -r "from '@/components/ui/" client/src | cut -d"'" -f2 | sort | uniq
    
    # Components likely unused (verify before deletion):
    - accordion.tsx
    - alert-dialog.tsx
    - avatar.tsx
    - breadcrumb.tsx
    - calendar.tsx
    - carousel.tsx
    - checkbox.tsx
    - collapsible.tsx
    - context-menu.tsx
    - drawer.tsx
    - dropdown-menu.tsx
    - menubar.tsx
    - navigation-menu.tsx
    - pagination.tsx
    - popover.tsx
    - progress.tsx
    - radio-group.tsx
    - scroll-area.tsx
    - sidebar.tsx
    - slider.tsx
    - sonner.tsx
    - switch.tsx
    - toggle-group.tsx
    - toggle.tsx
    ```

[ ] **3. Consolidate Storage Implementations**
    • Merge storage.ts, storage-temp.ts, and bond-storage.ts
    • Create single abstraction with file/database adapters
    • Simplify API routes
    
    **Unified storage interface:**
    ```typescript
    // server/storage/interface.ts
    export interface BondStorage {
      save(bond: Bond): Promise<SavedBond>;
      get(id: string): Promise<SavedBond | null>;
      list(filter?: BondFilter): Promise<SavedBond[]>;
      delete(id: string): Promise<void>;
    }
    
    // server/storage/file-adapter.ts
    export class FileStorageAdapter implements BondStorage {
      constructor(private basePath: string) {}
      async save(bond: Bond) { /* file system implementation */ }
      // ... other methods
    }
    
    // server/storage/database-adapter.ts  
    export class DatabaseStorageAdapter implements BondStorage {
      constructor(private db: DrizzleClient) {}
      async save(bond: Bond) { /* database implementation */ }
      // ... other methods
    }
    
    // server/storage/index.ts
    export const createStorage = (): BondStorage => {
      return process.env.DATABASE_URL 
        ? new DatabaseStorageAdapter(db)
        : new FileStorageAdapter('./saved_bonds');
    };
    ```

### Medium Priority Refactoring

[ ] **4. Improve Code Organization**
    • Split 800+ line routes.ts into domain files
    • Centralize magic numbers and constants
    • Standardize error handling patterns
    
    **Route splitting approach:**
    ```typescript
    // server/routes/bonds.routes.ts
    export const bondRoutes = (app: Express) => {
      app.post('/api/bonds/build', buildBond);
      app.post('/api/bonds/validate', validateBond);
      app.get('/api/bonds/:id', getBond);
      app.post('/api/bonds', saveBond);
    };
    
    // server/routes/treasury.routes.ts
    export const treasuryRoutes = (app: Express) => {
      app.get('/api/ust-curve', getUSTCurve);
      app.get('/api/treasury-rates', getTreasuryRates);
    };
    
    // server/routes/pricing.routes.ts
    export const pricingRoutes = (app: Express) => {
      app.get('/api/pricing/argentina', getArgentinaPricing);
      app.get('/api/pricing/calculate', calculatePricing);
    };
    
    // server/routes/index.ts
    export const setupRoutes = (app: Express) => {
      bondRoutes(app);
      treasuryRoutes(app);
      pricingRoutes(app);
    };
    ```
    
    **Constants centralization:**
    ```typescript
    // shared/constants.ts
    export const CALCULATION_CONSTANTS = {
      MAX_YTM_ITERATIONS: 1000,
      YTM_TOLERANCE: 1e-10,
      DEFAULT_FACE_VALUE: 1000,
      CACHE_DURATION_MS: 1800000, // 30 minutes
      MAX_SPREAD_BPS: 5000,
      MIN_PRICE_PERCENT: 0.1,
      MAX_PRICE_PERCENT: 200,
    };
    
    export const BLOOMBERG_REFERENCES = {
      GD38: {
        price72_25: { ytm: 10.88, spread: 660, duration: 5.01 },
        price80_00: { ytm: 10.4, spread: 620, duration: 4.8 }
      }
    };
    ```

[ ] **5. Enhance Test Structure**
    • Migrate all tests to TypeScript
    • Add proper test runner configuration
    • Improve test coverage reporting
    
    **Test configuration setup:**
    ```json
    // vitest.config.ts
    import { defineConfig } from 'vitest/config';
    
    export default defineConfig({
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './tests/setup.ts',
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          thresholds: {
            lines: 80,
            functions: 80,
            branches: 70,
            statements: 80
          }
        }
      }
    });
    ```

### Low Priority Refactoring

[ ] **6. Performance Optimizations**
    • Implement React.memo for expensive components
    • Add useMemo for complex calculations
    • Optimize re-render patterns
    
    **Memoization examples:**
    ```typescript
    // components/calculator/analytics-panel.tsx
    export const AnalyticsPanel = React.memo(({ bond, analytics }) => {
      const formattedMetrics = useMemo(() => ({
        duration: formatNumber(analytics.modifiedDuration),
        convexity: formatNumber(analytics.convexity),
        dv01: formatCurrency(analytics.dv01)
      }), [analytics]);
      
      return <div>{/* ... */}</div>;
    }, (prevProps, nextProps) => {
      // Custom comparison for deep equality
      return prevProps.bond.id === nextProps.bond.id &&
             prevProps.analytics.ytm === nextProps.analytics.ytm;
    });
    ```

[ ] **7. Reduce Code Duplication**
    • Create shared utility libraries
    • Consolidate number formatting functions
    • Share validation logic between frontend/backend
    
    **Shared utilities structure:**
    ```typescript
    // shared/utils/formatting.ts
    export const formatters = {
      number: (value: number, decimals = 2) => { /* ... */ },
      percent: (value: number, decimals = 2) => { /* ... */ },
      currency: (value: number, currency = 'USD') => { /* ... */ },
      date: (value: Date, format = 'MM/DD/YYYY') => { /* ... */ }
    };
    
    // shared/utils/validation.ts
    export const validators = {
      isValidCUSIP: (cusip: string) => { /* ... */ },
      isValidISIN: (isin: string) => { /* ... */ },
      isValidCouponRate: (rate: number) => rate >= 0 && rate <= 100,
      isValidPrice: (price: number) => price > 0 && price < 200
    };
    ```

[x] current yield is broken, the 2038 is showing 0.068% instead of 6.8% (i think should be around there)
[x] **Number formatting – 2-dec + thousands separators**  
    • ✅ Updated components to use centralized `formatNumber()` and `formatPercent()` from bond-utils
    • ✅ Applied consistent 2-decimal formatting with thousands separators throughout
    • ✅ Replaced inline `.toFixed()` calls with proper Intl.NumberFormat usage

[x] **Metric tooltips ("ⓘ")**  
    • ✅ Created reusable `<InfoTooltip />` component using Radix UI tooltips
    • ✅ Added tooltips to all key metrics: Modified Duration, Convexity, DV01, etc.
    • ✅ Included concise definitions like "Price sensitivity: ∂Price/∂Yield × 100"
    • ✅ **Updated with detailed professional tooltips (June 2025)**:
      - Technical Value: "Dirty price if the bond were at par: principal + accrued interest. Used to gauge true cost."
      - Parity: "Clean price expressed as a % of technical value. < 100% = trading below principal + accrued."
      - Current Yield: "Annual coupon ÷ clean price. Ignores capital gain/loss at maturity—quick income snapshot."
      - Modified Duration: "% price change for a 1% (100 bp) move in yield. First-order interest-rate risk."
      - DV01: "Dollar Value of 1 bp: how many currency units the bond gains or loses per 0.01% yield move."
      - Convexity: "Second-order price sensitivity—adjusts duration for large rate moves; higher = less curve risk."
      - Macaulay Duration: "Time-weighted average until cash flows are received. Basis for modified duration."
      - Average Life: "Weighted-average maturity when principal is amortized; key for sinking-fund or amortizing bonds."
      - Reference Treasury Yield: "Interpolated U.S. Treasury yield at identical maturity—anchor for spread calculations."
    • ✅ Touch device support: Radix UI automatically handles tap behavior on mobile devices

[x] **Fix DV01 calculation**  
    • ✅ Verified DV01 calculation already uses correct formula: `modDur * price * 0.0001`
    • ✅ Both production and core calculators implement the proper formula

[x] **Section title tweak**  
    • ✅ Changed "Risk Metrics" title to "Key Metrics"

[x] **Layout & new cash-flow panel**  
    • ✅ Moved Price Sensitivity to left column alongside Bond Pricing Calculator
    • ✅ Created new Cash-Flow Schedule panel in right column with compact view + Enlarge modal
    • ✅ Implemented consistent card styling and visual harmony
    • ✅ Added comprehensive cash flow table with summary statistics

## 🎉 All Todo Items Completed Successfully!

The bond calculator now features:
- ✅ Professional 2-column layout with logical grouping
- ✅ Consistent number formatting with thousands separators
- ✅ Helpful tooltips explaining financial metrics
- ✅ Accurate DV01 calculations
- ✅ Comprehensive cash flow visualization
- ✅ Bloomberg-validated calculations

**Layout verified with MCP Puppeteer testing showing excellent user experience and professional appearance.**

[x] **Panel height alignment**
    • ✅ Added h-full class to all panels for consistent height matching
    • ✅ Bond Pricing Calculator and Key Metrics panels now align perfectly
    • ✅ Price Sensitivity and Cash-Flow Schedule start at same height
    • ✅ Added subtle padding adjustments for visual balance

[x] **2x2 Dashboard Grid Layout**
    • ✅ Implemented proper 2x2 grid using CSS Grid with auto-rows-fr
    • ✅ Top row: Bond Pricing Calculator + Key Metrics with matching heights
    • ✅ Bottom row: Price Sensitivity + Cash Flow Schedule with aligned tops
    • ✅ Uniform 16px gaps between all grid cells
    • ✅ Panels stretch to match row partner heights automatically
    • ✅ Mobile responsive: stacks vertically on screens ≤768px
    • ✅ Added placeholder states for empty panels
    • ✅ Flex layout ensures content distribution within panels

## 🚧 New Requirements - Layout & Data Updates

[x] **Cash-Flow Panel Improvements**
    • ✅ **Collapsed view**: Shows all cash flows that fit naturally in panel height
    • ✅ **Keep existing 4 columns**: Date, Coupon $, Principal $, Total $
    • ✅ **Enlarged view**: Click "Enlarge" button opens full-screen modal with extended table
    • ✅ **Extended table columns** (6 total):
      1. Date
      2. Coupon % (annual rate) - calculated from bond coupon rate changes
      3. Coupon $
      4. Principal $
      5. Total $
      6. Remaining % (of principal still outstanding after payment)

[x] **Grid Layout Adjustments**
    • ✅ **Top row height matching**: Bond Pricing Calculator + Key Metrics stay equal height
    • ✅ **Bottom row auto height**: Price Sensitivity + Cash-Flow Schedule natural heights
    • ✅ **No padding tricks needed** for bottom row - let them be natural height
    • ✅ **Maintain uniform gaps** between all panels (16px)
    • ✅ **Preserve mobile responsive** stacking logic

[x] **Implementation Details**
    • ✅ Use `md:auto-rows-min` instead of `auto-rows-fr` for grid
    • ✅ Top row panels: `flex flex-col md:h-full` for equal heights
    • ✅ Bottom row panels: natural height, no forced stretching
    • ✅ Cash-Flow panel: fit content to panel height naturally
    • ✅ Modal: `w-screen max-w-none h-[80vh]` for full-width extended table
    • ✅ Calculate Remaining % as: `remainingPrincipal / originalPrincipal * 100`
    • ✅ Reuse same data source for modal, no fresh fetch needed
    • ✅ Enhanced formatting with proper 2-decimal precision throughout

## ✅ Additional Refinements - Completed

[x] **Cash-Flow Schedule (collapsed) - 10 Payment Limit**
    • ✅ Display only next 10 future payments in collapsed view
    • ✅ Update footer: "Showing 10 future payments (X more hidden)" - dynamic count
    • ✅ Enlarged modal keeps showing full schedule (no limit)
    • ✅ Preserve current four-column layout for collapsed state

[x] **Price Sensitivity Table - Split First Column**
    • ✅ Split first column into two separate columns:
      - Px % Chg → percentage moves (-5%, -3%, ..., +5%)
      - Price → corresponding prices (69.45, 70.91, ...)
    • ✅ New header order: Px % Chg | Price | YTM | SoT
    • ✅ Ensure numeric cells are center-aligned for clean scanability
    • ✅ Update responsive breakpoints for extra column

[x] **Implementation Details**
    • ✅ Cash-Flow slice: `futureFlows.slice(0, 10)` for collapsed view
    • ✅ Footer with dynamic count: `(${futureFlows.length - 10} more hidden)`
    • ✅ Price Sensitivity: separate `<th>` and `<td>` elements for split columns
    • ✅ Center-align all numeric data for better readability
    • ✅ Test responsive behavior with additional column

## ✅ Cash-Flow Schedule Totals Row - Completed

[x] **Cash-Flow Schedule (enlarged view only) - Totals Footer**
    • ✅ Add `<tfoot>` totals row that stays visually anchored to bottom
    • ✅ Label first cell "Total (future)"
    • ✅ Aggregate only future payments (paymentDate > today || settlementDate):
      - Coupon $ → Σ couponPayment
      - Principal $ → Σ principalPayment  
      - Total $ → Σ (couponPayment + principalPayment)
      - Leave Coupon % and Remaining % cells blank with "—"
    • ✅ Center-align numeric cells with font-semibold for subtle emphasis
    • ✅ Format numbers with house style (thousands commas, 2 decimals)
    • ✅ Make totals row sticky at bottom with `sticky bottom-0`
    • ✅ Consistent styling with existing panels (green colors, typography, borders)
    • ✅ Accessibility: use `<th scope="row">` for label, `<th scope="col">` for headers