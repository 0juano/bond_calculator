# 📱 Mobile Responsiveness Todo

**Status**: Phase 1 Complete - Foundation and polish achieved. Phase 2 ready for implementation.

---

## 🚨 PHASE 2: Professional Polish (Ready to Implement)

### Spacing Rhythm - PREMIUM FEEL
[ ] **Standardize vertical padding**:
  - [ ] Use consistent `py-6` or `gap-6` for hero, cards, panels
  - [ ] Remove slight "step" feeling when scrolling
  - [ ] Create spacing utility for consistent rhythm

### Search Usability - DETAIL POLISH
[ ] **Improve search interaction**:
  - [ ] Hide placeholder text when user types
  - [ ] Implement `:focus:not(:placeholder-shown)` pattern
  - [ ] Ensure long tickers stay visible edge to edge
  - [ ] Test with Argentina bond tickers (ARGENT...)

```css
.search-input:focus:not(:placeholder-shown)::placeholder { 
  opacity: 0; 
  transition: opacity 0.2s ease;
}
```

### Performance Monitoring - SAFEGUARDS
[ ] **Set up monitoring**:
  - [ ] Automated Lighthouse mobile checks
  - [ ] Monitor gradient paint time impact  
  - [ ] Add performance budget CI checks
  - [ ] Create regression prevention alerts

---

## 🔄 REMAINING MILESTONES

### Tables & Data Visualization (Milestone 6)
[ ] **Responsive tables**:
  - [ ] Add horizontal scroll wrapper for wide tables
  - [ ] Implement sticky headers with nav offset
  - [ ] Optimize chart sizing for mobile viewports
  - [ ] Consider mobile-specific layouts for complex data

### Testing & Quality Assurance (Milestone 7)
[ ] **Automated testing**:
  - [ ] Write Playwright mobile tests
  - [ ] Set up Lighthouse CI for mobile
  - [ ] Manual testing on real devices
  - [ ] Performance budget verification
  - [ ] Accessibility audit

---

## 🔮 FUTURE ENHANCEMENTS

### Guard Message Copy - MINOR IMPROVEMENT
[ ] **A/B test improvements**:
  - [ ] Test shortened footer: "Your screen 430px · Minimum 768px"
  - [ ] Compare scan speed vs explicit messaging
  - [ ] Implement based on user feedback

### Deep Link Recovery - ADVANCED UX
[ ] **Smart recovery**:
  - [ ] Store blocked Builder URLs in localStorage
  - [ ] Auto-redirect on desktop when user returns
  - [ ] Handle edge case confusion gracefully
  - [ ] Add state management for URL recovery

---

## ✅ COMPLETED - PHASE 1

### Touch Target Compliance ✅
- Hamburger menu: 44px+ with `menu-trigger` class
- Navigation links: 44px+ with `touch-target` class
- Bond cards: 100px minimum height
- Guard buttons: `size="lg"` (44px)
- Sticky footer: `h-11` (44px) minimum

### Visual Hierarchy ✅
- Section headers: Dimmed to muted green (80% opacity)
- Panel titles: Updated in all panels
- Action buttons: Bright terminal accent maintained
- Strategic contrast: Headers recede, CTAs pop

### Accessibility Enhancement ✅
- Terminal green: Enhanced to 55% lightness
- Color hierarchy: Added `--terminal-green-muted`
- WCAG compliance: Improved contrast ratios
- Touch manipulation: Better mobile response

### Mobile Foundation ✅
- Navigation: Responsive drawer <640px
- Hero Search: Mobile-first sizing
- Calculator: Single column stacking
- Builder: Smart mobile guard <768px

**Result**: Transformed from "D-grade mobile experience" to **"A-grade premium mobile application"** ready for professional bond traders.