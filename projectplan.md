# Project Plan: Show Full Analytics Grid with Placeholder Values

## Goal
Modify the Calculator page's empty state to show the full analytics grid with placeholder values (dashes "–") instead of the current landing page style.

## Todo Items

- [ ] Modify Grid.tsx to always show the full 4-panel layout, even when no bond is selected
- [ ] Update PricingPanel to show placeholder values when no bond is selected
- [ ] Update RiskMetricsPanel to show placeholder values when no bond is selected
- [ ] Ensure PriceSensitivityPanel shows empty state when no bond is selected
- [ ] Ensure CashFlowSchedulePanel shows empty state when no bond is selected
- [ ] Remove the EmptyStateHero component usage from Grid.tsx
- [ ] Apply a "disabled" or "muted" visual state to panels when no bond is selected
- [ ] Test that all panels render correctly with placeholder values

## Technical Approach

1. **Grid Component Changes**:
   - Remove the condition that shows EmptyStateHero when no bond
   - Always render the 4-panel grid
   - Pass a flag to panels indicating empty state

2. **Panel Updates**:
   - Modify each panel to accept an `isEmpty` prop
   - Show "–" for all numeric values when empty
   - Use muted colors/opacity for empty state

3. **Visual Design**:
   - Keep panels visible but clearly indicate no data
   - Use consistent placeholder formatting across all panels
   - Maintain grid layout structure

## Implementation Steps

1. Start by modifying Grid.tsx to remove EmptyStateHero usage
2. Update each panel component to handle empty state
3. Test the changes to ensure proper placeholder display