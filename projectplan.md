# Project Plan

## Overview
This document serves as a working plan for the bond calculator project - a professional-grade, retro-terminal bond platform that delivers Bloomberg-accurate fixed-income analytics. Tasks will be tracked here and checked off as they are completed.

## Current Project Status
- Bond calculator application with TypeScript/React frontend and Express backend
- Three main components: Bond Builder, Universal Calculator, and Comparables Builder (planned)
- Core functionality exists but needs refinement and optimization
- Goal: Achieve Bloomberg-level accuracy (±1 bp YTM difference) with excellent mobile performance

## Success Criteria
| Area           | Metric                        | Target |
| -------------- | ----------------------------- | ------ |
| Accuracy       | YTM difference vs Bloomberg   | ≤ 1 bp |
| UX             | Lighthouse mobile score       | ≥ 95   |
| Quality        | Unit-test coverage            | ≥ 95%  |
| Performance    | P95 page load on 4G           | < 2s   |

## Current Sprint Tasks - Calculator Empty State Enhancement

### Goal: Create an engaging empty state that guides users to select a bond and start analyzing

### Analysis:
Currently, when no bond is selected, the calculator shows:
- A minimal "No Bond Selected" message in the sticky header
- No content in the main area (Grid component returns null)
- No guidance on how to get started

### Todo List:
- [ ] Create EmptyStateHero component with visual appeal and clear CTA
- [ ] Add quick access to popular bonds (Argentina sovereigns)
- [ ] Add recent bonds section if user has history
- [ ] Implement smooth transition from empty state to loaded state
- [ ] Add keyboard shortcut hints (/ for search)
- [ ] Ensure mobile responsiveness
- [ ] Test the complete flow from empty → search → bond selection → analytics

### Implementation Details:

1. **EmptyStateHero Component** (`/client/src/components/calculator/empty-state-hero.tsx`):
   - Large bond icon or illustration
   - "Start Your Bond Analysis" heading
   - "Search for a bond to calculate yield, duration, and more" subheading
   - Prominent search bar (duplicate of sticky search for convenience)
   - Keyboard shortcut hint

2. **Popular Bonds Section**:
   - Quick access cards for Argentina sovereigns (GD29, GD30, GD38, etc.)
   - Show key info: ticker, coupon, maturity
   - One-click selection

3. **Recent Bonds Section** (if applicable):
   - Show last 3-5 bonds user analyzed
   - Based on localStorage or session history
   - Clear history option

4. **Visual Design**:
   - Maintain terminal aesthetic
   - Use subtle animations for engagement
   - Ensure contrast and readability

5. **Integration**:
   - Replace null return in Grid component with EmptyStateHero
   - Smooth transition when bond is selected
   - Maintain consistency with existing design

## Previous Sprint Tasks - Hero Search Landing Page ✅

### Goal: Transform the bond calculator into a search-first experience with progressive disclosure

### Todo List:
- [x] Extract search functionality into standalone `BondSearch.tsx` component (already existed)
- [x] Create hero layout with centered search bar
- [x] Implement progressive disclosure (search → grid reveal)
- [x] Add `/` hotkey for search focus (fixed with additional cmd+k/ctrl+k shortcuts)
- [x] Add Framer Motion animations for smooth transitions
- [x] Optimize for mobile with responsive search sizing
- [x] Test the complete implementation flow
- [x] Update todo.md to mark tasks as complete

## Sprint Breakdown (Planned)

### Sprint 1 - Schema + Kernel (2 weeks)
- [ ] Validate cash-flow engine accuracy
- [ ] Ensure bond JSON specification compliance
- [ ] Test kernel pricing within 1¢ of reference calculations

### Sprint 2 - Calculator MVP (2 weeks)
- [ ] Implement three-way calculator (Price ↔ YTM ↔ Spread)
- [ ] Add risk metrics (duration, convexity)
- [ ] Validate against Bloomberg reference data (GD38 at 72.25 → 10.88% ±1bp)
- [ ] Prevent infinite recalculation loops

### Sprint 3 - Bond Builder Enhancement (2 weeks)
- [ ] Add intelligent bond creation features
- [ ] Implement validation against specification
- [ ] Support complex bonds (amortizing, step-up)

### Sprint 4 - Comparables Tool (2 weeks)
- [ ] Build filtering and screening interface
- [ ] Add charting capabilities
- [ ] Export functionality (CSV/JSON)

## Testing Protocol

### Before claiming any fix works:
1. **Test with MCP Puppeteer** - Use browser automation to verify actual results
2. **Use https://bonistas.com/** - Cross-reference price/yield/duration calculations
3. **Compare to Bloomberg data** - Check against reference values in docs
4. **Test edge cases** - Try different price levels
5. **Verify no infinite loops** - Ensure calculations complete and stop

### Standard Tests:
- **Unit tests**: Math functions with decimal.js precision
- **Integration tests**: API endpoints and UI flows
- **Bloomberg validation**: Cross-check against reference data
- **Mobile performance**: Lighthouse CI with minimum score 90
- **E2E scenario**: Load bond → enter price → verify YTM accuracy

## Risk Mitigation
- Use decimal.js for all financial calculations to avoid floating-point errors
- Implement 30-minute cache for market data to prevent API rate limits
- Add schema validation for all bond JSON inputs
- Test on mobile devices regularly to catch UX issues early

## Architecture & Code Organization
- `/client/src/components/ui/` - shadcn/ui components (audit needed)
- `/client/src/components/calculator/` - Bond-specific components
- `/client/src/hooks/` - Custom React hooks
- `/shared/` - Shared types and calculation logic
- `/server/` - Express API and storage

### Architecture Decisions
- Calculator state uses custom hook pattern
- Multiple YTM solvers with automatic fallback
- Bond storage supports file and database backends
- Price inputs always as percentage of face value

### Refactoring Guidelines
- Prefer composition over complex components
- Use decimal.js for all financial calculations
- Validate against Bloomberg reference data
- Keep bond JSONs free of calculated values

## Priority Refactoring Areas
1. **High Priority**:
   - Simplify calculator state management (split 585-line hook)
   - Remove unused UI components (47+ components, many unused)
   - Consolidate storage implementations

2. **Medium Priority**:
   - Split large route files (800+ lines)
   - Centralize constants and magic numbers
   - Improve test organization

3. **Low Priority**:
   - Component optimization with React.memo
   - Error handling standardization
   - Address prop drilling with Context

## Notes
This plan will be updated with specific tasks as we identify areas for improvement. All changes should follow the principle of simplicity - minimal code impact with maximum benefit.

## Review Section

### Changes Made for Hero Search Landing Page:

1. **Enhanced Bond Calculator Page** - Transformed the calculator into a search-first experience with progressive disclosure:
   - Added hero view with centered search when no bond is selected
   - Implemented smooth Framer Motion transitions between hero and calculator views
   - Used AnimatePresence for seamless view switching

2. **Responsive Search Component** - Optimized BondSearch for all screen sizes:
   - Dynamic height: 12px (mobile) → 14px (tablet) → 16px (desktop)
   - Responsive text sizes and icon scaling
   - Improved placeholder text that adapts to screen width

3. **Progressive Disclosure Flow**:
   - Landing: Clean hero page with prominent search bar
   - Selection: Search bar triggers bond selection
   - Analytics: Grid animates in after bond loads
   - Sticky header maintains context during analysis

4. **Keyboard Navigation**:
   - `/` hotkey focuses the appropriate search bar (hero or sticky)
   - Smart ref handling based on current view state

5. **Animation Details**:
   - Hero exit: Fade out with slight upward motion
   - Calculator entry: Fade in with subtle downward motion 
   - Grid component already had entrance animations
   - Smooth 300ms transitions throughout

### Impact:
- Transforms the calculator from a dense analytics page to an inviting search experience
- Progressive disclosure reduces cognitive load for new users
- Mobile-optimized search ensures usability on all devices
- Professional animations enhance perceived quality

### Next Steps:
- Test the implementation with real bonds
- Verify mobile responsiveness on actual devices
- Update todo.md to mark hero search tasks complete