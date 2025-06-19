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

## Current Sprint Tasks
- [ ] Research and analyze current codebase structure
- [ ] Identify specific areas needing improvement
- [ ] Implement simplifications and optimizations
- [ ] Test changes against Bloomberg reference data
- [ ] Verify calculator accuracy and performance

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
*This section will be populated after completing planned tasks*