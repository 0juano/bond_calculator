[x] current yield is broken, the 2038 is showing 0.068% instead of 6.8% (i think should be around there)
[ ] **Number formatting – 2-dec + thousands separators**  
    • Update your `formatNumber()` helper: `Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)`  
    • Apply everywhere you render price, yield, spread, duration, convexity, etc. (e.g., `11.56 %`, `68.40`, `4,257 bp`).

[ ] **Metric tooltips (“ⓘ”)**  
    • Create a reusable `<InfoTooltip text="..."/>` component (simple `position: absolute` on hover).  
    • Add one to each metric label: Modified Duration, Convexity, DV01, Avg Life, etc.  
    • Copy concise defs from your docs: _“Price sensitivity: ∂Price/∂Yield × 100”_, etc.

[ ] **Fix DV01 calculation**  
    • Replace `dv01 = modDur * price / 0.01`  
      with `dv01 = modDur * price * 0.0001` (per 100 par).  
    • Unit-test ARGENT 35 & 30 → expect ≈ 0.039 when ModDur ≈ 5.761 and Price ≈ 68.40.

[ ] **Section title tweak**  
    • Change “Risk Metrics” title to "Key Metrics"

[ ] **Layout & new cash-flow panel**  
    • Move the Price Sensitivity box into the left column (flush with the Bond Pricing Calculator).  
    • Create a right-hand box titled “Cash-Flow Schedule”. Show next 10 lines inline; add a Enlarge button that opens a modal with the full table (scrollable, CSV-export).  
    • Use same card style + grid gap for visual harmony.
