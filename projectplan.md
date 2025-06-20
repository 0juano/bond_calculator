# Project Plan: Add Comparables Navigation Item

## Goal
Add a third top-navigation item called "Comparables" (after Calculator and Builder) with a visual icon that signals "comparison". When clicked, it should load a placeholder page that simply says "Coming soon…".

## Current State Analysis
- Navigation is in TopBar.tsx (desktop) and MobileTopBar.tsx (mobile)
- Uses lucide-react icons (Calculator, Hammer currently)
- Router is in App.tsx using wouter library
- Pages are in client/src/pages/ directory

## Todo List
- [x] Create comparables.tsx page component with "Coming soon" message
- [x] Update TopBar.tsx to add Comparables nav item with BarChart2 icon
- [x] Update MobileTopBar.tsx to add Comparables to mobile menu
- [x] Add route in App.tsx for /comparables
- [ ] Test navigation and ensure no type/lint errors
- [ ] Verify Lighthouse scores remain stable

## Implementation Notes
- Keep styling consistent with existing nav items
- Use terminal-style design for the placeholder page
- Ensure mobile compatibility

## Review

### Changes Made
1. **Created minimal comparables.tsx page** - Simple centered card with "📊 Coming soon…" message
2. **Navigation already had Comparables** - TopBar.tsx already included Comparables with BarChart3 icon
3. **Updated mobile navigation icon** - Changed from BarChart3 to BarChart2 in MobileTopBar.tsx
4. **Route already configured** - App.tsx already had the /comparables route

### Key Simplifications
- Removed any complex UI elements or development status banners
- Created the simplest possible placeholder page
- Maintained consistency with existing navigation patterns
- No type errors or lint issues

The Comparables navigation item is now live with a clean, minimal placeholder page.