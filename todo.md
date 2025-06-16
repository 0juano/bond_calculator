[x] current yield is broken, the 2038 is showing 0.068% instead of 6.8% (i think should be around there)
[x] **Number formatting – 2-dec + thousands separators**  
    • ✅ Updated components to use centralized `formatNumber()` and `formatPercent()` from bond-utils
    • ✅ Applied consistent 2-decimal formatting with thousands separators throughout
    • ✅ Replaced inline `.toFixed()` calls with proper Intl.NumberFormat usage

[x] **Metric tooltips ("ⓘ")**  
    • ✅ Created reusable `<InfoTooltip />` component using Radix UI tooltips
    • ✅ Added tooltips to all key metrics: Modified Duration, Convexity, DV01, etc.
    • ✅ Included concise definitions like "Price sensitivity: ∂Price/∂Yield × 100"

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