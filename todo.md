# Bond Calculator Todo List

Always keep the @todo.md file in this location in the main folder. When there is a new todo, add it to the top.

---

## 🚨 HIGH PRIORITY - Active Development

### Treasury Cache Frontend Migration (BLOCKING PUBLIC LAUNCH)
**Status**: Backend complete, frontend migration needed
**Impact**: Users currently need FRED API keys - blocks public adoption

[ ] **Frontend Migration Tasks**:
  - [ ] Update Treasury hook to use `/api/treasury-rates` instead of `/api/ust-curve`
  - [ ] Remove FRED_API_KEY from client environment variables
  - [ ] Add "Treasury rates as of [date]" display in UI
  - [ ] Show stale data warning when rates >3 days old
  - [ ] Test calculator works without any API keys

[ ] **Production Deployment**:
  - [ ] Set up cron job for automatic updates (hourly or daily)
  - [ ] Add retry logic for FRED API failures
  - [ ] Configure admin notification for stale cache >7 days
  - [ ] Add pre-commit hook to warn about stale treasury data

### Hero Search Landing Page 
**Status**: Design ready, implementation pending
**Impact**: Major UX improvement - transforms calculator into search-first experience

[ ] **Implementation Tasks**:
  - [ ] Extract search into standalone `BondSearch.tsx` component
  - [ ] Create hero layout with centered search bar
  - [ ] Implement progressive disclosure (search → grid reveal)
  - [ ] Add `/` hotkey for search focus
  - [ ] Add Framer Motion animations for smooth transitions
  - [ ] Optimize for mobile with responsive search sizing



## 🎯 MEDIUM PRIORITY - Ready for Development

### Visual Harmonization Completion
**Status**: Navigation complete, theming pending
**Impact**: Professional cohesion between Calculator and Builder

[ ] **Navigation Flow**:
  - [ ] Update Calculator "← Back" button logic
  - [ ] Add "← Back to Calculator" button in Builder
  - [ ] Implement "Build Complete" → `/calculator/:newBondId` redirect

[ ] **Shared Theme System**:
  - [ ] Create `theme.ts` with centralized color palette
  - [ ] Extract reusable `Panel.tsx` component
  - [ ] Apply consistent styling to both Calculator and Builder
  - [ ] Replace hardcoded colors with theme variables


## 🔧 REFACTORING & TECHNICAL DEBT

### Calculator State Management (Step 3)
**Status**: Steps 1-2 complete, final step remaining
**Impact**: Clean architecture, maintainability

[ ] **Create Calculation Service**:
  - [ ] Extract YTM/price/spread calculations into `CalculatorService`
  - [ ] Move complex logic out of React hook
  - [ ] Reduce `useCalculatorState` to ~100 lines of pure state management

### XIRR Architecture Cleanup
**Status**: System works but naming is misleading
**Impact**: Code clarity

[ ] **Cleanup Tasks**:
  - [ ] Remove unused `current-solver.ts`
  - [ ] Rename "dual" references since we're XIRR-only now
  - [ ] Simplify `dual-ytm-display.tsx` component

### Storage Consolidation
**Status**: Multiple implementations exist
**Impact**: Simplified API, easier maintenance

[ ] **Unify Storage**:
  - [ ] Merge storage.ts, storage-temp.ts, bond-storage.ts
  - [ ] Create adapter pattern for file/database backends
  - [ ] Simplify API routes

### Code Organization
**Status**: Large files need splitting
**Impact**: Better maintainability

[ ] **Split Large Files**:
  - [ ] Break 800+ line routes.ts into domain files
  - [ ] Centralize constants and magic numbers
  - [ ] Standardize error handling

---

## ✅ COMPLETED ITEMS

### Recently Completed (June 2025)
- ✅ Treasury Cache Backend (Phases 1, 2, 5 complete)
- ✅ Calculator as Default Landing Page 
- ✅ Universal Top Bar Implementation
- ✅ Calculator Hook Refactoring (Steps 1-2)
- ✅ XIRR/Dual YTM Implementation
- ✅ Removed 31 Unused UI Components (64.6% reduction)
- ✅ Price Sensitivity Panel Bug Fix
- ✅ Calculator Field Display Bug for Low Prices
- ✅ Number Formatting & Thousands Separators
- ✅ Professional Metric Tooltips
- ✅ 2x2 Dashboard Grid Layout
- ✅ Cash Flow Panel with Enlarged View
- ✅ Price Sensitivity Table Improvements
- ✅ UI Harmonization (Design tokens, Navigation, Builder page)
- ✅ Mobile Responsiveness Phase 1 (Touch targets, Visual hierarchy)