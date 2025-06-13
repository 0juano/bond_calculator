# YAS Bond Builder & Cash Flow Calculator

> **A professional-grade bond analysis tool with retro Bloomberg-inspired interface**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express.js-404D59?style=flat&logo=express)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

## 🎯 Overview

YAS Bond Builder is a comprehensive fixed-income analysis tool that allows power users to create, analyze, and visualize any type of USD bond from scratch. Built with a retro Bloomberg terminal aesthetic, it provides instant cash flow calculations and analytics for vanilla, amortizing, callable, and puttable bonds.

### Key Features

- **🏗️ Universal Bond Builder**: Create any bond type with comprehensive parameter support
- **⚡ Real-time Analytics**: Instant yield-to-worst, duration, convexity, and average life calculations
- **📊 Cash Flow Visualization**: Complete payment schedule with interactive tables
- **🎨 Retro Terminal UI**: Bloomberg-inspired dark theme with monospace typography
- **💾 Auto-save**: Automatic localStorage persistence of bond drafts
- **🏆 Golden Bond Templates**: Pre-configured bond examples for quick testing
- **✅ Live Validation**: Real-time form validation with detailed error reporting
- **🔥 Production Calculator**: Robust YTM solver with multiple algorithms and high precision
- **📈 UST Curve Integration**: Real-time Treasury data from FRED API for spread calculations
- **💱 Amortizing Bond Support**: Accurate calculations for bonds with principal payments

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**

### Installation & Setup

```bash
# Clone the repository
git clone <repository-url>
cd bond_calculator

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at **http://localhost:3000**

### Environment Setup

Create a `.env` file for configuration:

```env
# Required: FRED API key for real-time Treasury data
FRED_API_KEY=your_32_character_api_key_here

# Optional: Database functionality  
DATABASE_URL=postgresql://username:password@localhost:5432/bonds_db
```

#### Getting a FRED API Key (Free)

1. Visit [https://fredaccount.stlouisfed.org/apikey](https://fredaccount.stlouisfed.org/apikey)
2. Create a free account or sign in
3. Request an API key (instant approval)
4. Copy the 32-character key to your `.env` file

Without a FRED API key, the application will throw an error when trying to access Treasury data.

## 📁 Project Structure

```
bond_calculator/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── calculator/   # Bond calculator components
│   │   │   ├── bond-form.tsx # Main bond input form
│   │   │   ├── cash-flow-table.tsx # Payment schedule display
│   │   │   ├── analytics-panel.tsx # Bond metrics display
│   │   │   └── golden-bonds.tsx    # Template selector
│   │   ├── pages/            # Application pages
│   │   │   ├── bond-builder.tsx    # Main application page
│   │   │   ├── bond-calculator.tsx # Interactive calculator
│   │   │   └── not-found.tsx       # 404 page
│   │   ├── hooks/            # Custom React hooks
│   │   │   └── useCalculatorState.ts # Three-way calculator logic
│   │   ├── lib/              # Utility functions
│   │   └── main.tsx          # Application entry point
│   └── index.html            # HTML template
├── server/                   # Express backend
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # API route definitions
│   ├── storage.ts           # Database operations
│   ├── storage-temp.ts      # Temporary storage (no DB)
│   └── vite.ts              # Vite development integration
├── shared/                  # Shared types and schemas
│   ├── schema.ts            # Zod schemas and TypeScript types
│   └── bond-calculator-production.ts # Robust calculation engine
├── docs/                    # Documentation ✨ NEW
│   ├── bond-json-specification.md  # Bond JSON format spec v1.1
│   └── bloomberg-reference-data.md # Market validation data
├── saved_bonds/             # JSON bond repository
│   ├── user_created/        # User-created bonds
│   └── imported/            # Imported bond files
├── package.json             # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── drizzle.config.ts       # Database ORM configuration
└── components.json         # shadcn/ui configuration
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **TanStack Query** - Server state management
- **Wouter** - Lightweight routing
- **Lucide React** - Icon library

### Backend
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **Zod** - Runtime type validation
- **Drizzle ORM** - Type-safe database toolkit
- **PostgreSQL** - Primary database (optional)

### Development Tools
- **tsx** - TypeScript execution
- **ESBuild** - Fast bundling
- **PostCSS** - CSS processing
- **Drizzle Kit** - Database migrations

## 📊 Bond Types Supported

### 1. Vanilla Bonds
- Fixed coupon rate
- Regular payment schedule
- Standard maturity

### 2. Amortizing Bonds
- Principal payments throughout life
- Customizable amortization schedule
- Declining notional balance

### 3. Callable Bonds
- Issuer call options
- Multiple call periods
- Call price specifications

### 4. Puttable Bonds
- Investor put options
- Flexible put schedules
- Put price definitions

### 5. Variable Coupon Bonds
- Rate changes over time
- Step-up/step-down structures
- Date-specific rate adjustments

## 🔧 API Endpoints

### Bond Operations
```http
POST /api/bonds/build          # Build bond with cash flows
POST /api/bonds/validate       # Validate bond parameters
POST /api/bonds                # Save bond to database
GET  /api/bonds/:id            # Retrieve saved bond
```

### Golden Bond Templates
```http
GET  /api/bonds/golden         # List all golden bonds
GET  /api/bonds/golden/:id     # Get specific golden bond
```

### Treasury Data (NEW)
```http
GET  /api/ust-curve           # Get current US Treasury yield curve
```

**Live Treasury Data Features:**
- Real-time yield curve from Federal Reserve Economic Data (FRED)
- Complete curve: 1M, 3M, 6M, 1Y, 2Y, 3Y, 5Y, 7Y, 10Y, 20Y, 30Y
- 30-minute caching for performance
- Used for spread calculations and benchmarking

## 📈 Analytics Calculated

- **Yield to Worst (YTW)** - Lowest possible yield scenario
- **Modified Duration** - Price sensitivity to yield changes
- **Macaulay Duration** - Weighted average time to cash flows
- **Convexity** - Second-order price sensitivity
- **Average Life** - Weighted average principal repayment time
- **Present Value** - Current market value
- **Total Coupons** - Sum of all coupon payments

## 🎨 UI Features

### Terminal-Inspired Design
- Dark theme with green accent colors
- Monospace typography for data display
- Bloomberg terminal aesthetic
- Responsive mobile design

### Interactive Components
- Real-time form validation
- Auto-saving drafts
- Expandable sections for complex features
- Toast notifications for user feedback

### Data Visualization
- Sortable cash flow tables with expandable view
- Payment type categorization
- Remaining notional tracking
- **Annual coupon rate display** (not semi-annual)
- **Complete summary totals** (payment count, coupon sum, principal sum, total cash flow)
- Export capabilities
- **NEW:**
  - **Dynamic payment timeline chart**: Visualizes real cash flow data, not sample data
  - **Auto-scaling timeline**: Chart automatically scales from issue date to maturity
  - **Stacked bar chart**: Shows Coupons, Principal, and Options (Call/Put) payments
  - **Interactive and robust**: Handles data changes and avoids canvas errors
  - **Professional Bloomberg-style visualization**

## 🧪 Golden Bond Templates

Pre-configured bond examples for testing and learning:

1. **vanilla-5y** - 5% 5-year US Treasury
2. **amortizing-10y** - 4.5% 10-year corporate with amortization
3. **callable-7y** - 5.25% 7-year municipal with call options
4. **puttable-3y** - 3.75% 3-year Bank of America with put options
5. **variable-step-up** - Treasury step-up bond with coupon rate changes
6. **complex-combo** - Complex bond with amortization, call, and put features
7. **al30d-argentina** - 🆕 **AL30D Argentina sovereign bond** (2020-2030) with step-up coupon structure
8. **ae38d-argentina** - 🆕 **AE38D Argentina sovereign bond** (2020-2038) with step-up coupon and amortization

> **Note:** All coupon rates and couponRateChanges are always in percentage format (e.g., 5.0 for 5%, 0.5 for 0.5%).

### 🏆 AL30D - Argentina Sovereign Bond (NEW)

Recently added authentic **AL30D** template based on official SEC prospectus specifications:

- **Issuer**: Republic of Argentina
- **ISIN**: ARARGE3209S6
- **Maturity**: July 9, 2030
- **Structure**: Amortizing bond with step-up coupon rates
- **Face Value**: $1 USD (minimum legal denomination)

**Step-up Coupon Schedule:**
- 2020-2021: 0.125% p.a. (long first coupon)
- 2021-2023: 0.500% p.a.
- 2023-2027: 0.750% p.a.
- 2027-2030: 1.750% p.a.

**Amortization Schedule:**
- July 2024: 4% principal payment
- Jan/Jul 2025-2030: 12 equal payments of 8% each

### 🏆 AE38D - Argentina Sovereign Bond (NEW)

Recently added authentic **AE38D** template based on official SEC prospectus specifications:

- **Issuer**: Republic of Argentina
- **ISIN**: ARARGE3209U2
- **Maturity**: January 9, 2038
- **Structure**: Amortizing bond with step-up coupon rates
- **Face Value**: $1,000 USD (minimum legal denomination)

**Step-up Coupon Schedule:**
- 2020-2021: 0.125% p.a. (long first coupon)
- 2021-2022: 2.00% p.a.
- 2022-2023: 3.875% p.a.
- 2023-2024: 4.25% p.a.
- 2024-2038: 5.00% p.a.

**Amortization Schedule:**
- 22 equal installments of 4.545% each, every Jan/Jul from 2027-07-09 to 2038-01-09

## 💾 Data Persistence

### Local Storage
- Automatic draft saving
- Form state preservation
- No data loss on refresh

### Database (Optional)
- PostgreSQL with Drizzle ORM
- Full bond definitions
- Cash flow history
- User session management

## 🚀 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run check        # TypeScript type checking

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:push      # Push schema changes to database

# Treasury Data (NEW)
npm run curve        # Get current Treasury yield curve
npm run rates        # Get key Treasury rates (2Y, 5Y, 10Y, 30Y)
./curve.sh           # Treasury curve script (full curve)
./curve.sh key       # Key rates only
./curve.sh date      # Curve with date header
```

## 🔧 Configuration

### Environment Variables
```env
NODE_ENV=development|production
DATABASE_URL=postgresql://...    # Optional database connection
```

### Port Configuration
- **Development**: http://localhost:3000
- **Production**: Configurable via environment

## 🎯 Use Cases

### Investment Analysis
- Term sheet validation
- Cash flow modeling
- Yield scenario analysis
- Duration risk assessment

### Portfolio Management
- Individual bond analysis
- Comparative studies
- Risk metric calculation
- Maturity profiling

### Educational
- Bond mathematics learning
- Cash flow understanding
- Options impact analysis
- Yield curve studies

## 🎮 Interactive Bond Calculator

### Three-Way Calculator ✨ **NEW**
- **Bidirectional Calculations**: Price ↔ YTM ↔ Spread all work as both inputs and outputs
- **Intelligent Field Locking**: Edit any field and the other two automatically calculate
- **No Infinite Loops**: Smart dependency management prevents continuous recalculations
- **Bloomberg Validation**: Results match professional terminal accuracy

### Calculator Features
- **Bond Search & Selection**: Intelligent search across saved bonds and golden templates
- **Real-time Price/Yield/Spread Calculations**: Interactive pricing with three-way functionality
- **Risk Metrics Dashboard**: Duration, convexity, DV01, and scenario analysis
- **Settlement Controls**: Date picker with accrued interest calculations
- **Responsive Design**: Mobile-optimized with Bloomberg terminal aesthetics

### Bond Selector Implementation
- **Search-based Selection**: Auto-complete with keyboard navigation
- **Visual Categories**: Color-coded icons for golden bonds (🌟), user-created (👤), and imported (📄)
- **Performance Optimized**: Limits results to 10 bonds for fast rendering
- **Type-safe**: Full TypeScript coverage with proper interfaces

### Validation & Testing
- **Bloomberg Reference Data**: Real market data for Argentina sovereign bonds (GD29, GD30, GD38, etc.)
- **Professional Accuracy**: Calculator results match Bloomberg terminal values
- **Expected Results**: GD38 at 72.25 → YTM 10.88%, spread 660bp, duration 5.01

## 🏗️ Development Guidelines

### Adding New Bond Templates
Follow the conventions in `docs/ADDING_BONDS.md` and the comprehensive Bond JSON Specification v1.1 in `docs/bond-json-specification.md`:
- **Coupon rates**: Always percentage format (5.0 for 5%, not 0.05)
- **Face value**: Use 1000 unless special case (sovereign bonds)
- **Dates**: ISO format (YYYY-MM-DD)
- **Boolean flags**: Explicitly set all (`isAmortizing`, `isCallable`, `isPuttable`, `isVariableCoupon`)
- **JSON Format**: Follow the v1.1 specification for consistent bond data structure

### Code Standards
- Use TypeScript with strict type checking
- Follow existing patterns in neighboring components
- Implement precision-safe math with `decimal.js` for calculations
- Always run `npm run check` before committing
- Test calculator results against Bloomberg reference data in `docs/bloomberg-reference-data.md`

## 🔮 Future Enhancements

### Planned Features
- **OCR Integration** - Extract bond terms from documents
- **QuantLib Integration** - Advanced pricing models
- **Portfolio Analysis** - Multi-bond portfolios
- **Market Data** - Real-time pricing feeds
- **Export Options** - PDF reports, Excel export

### Technical Improvements
- WebSocket real-time updates
- Advanced charting capabilities
- Mobile app development
- API rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Bloomberg Terminal design
- Built with modern web technologies
- Designed for fixed-income professionals

## 📝 Changelog

### [Latest] - June 2025 ✨
- **MAJOR: Three-Way Bond Calculator**
  - Price ↔ YTM ↔ Spread bidirectional calculations
  - Intelligent field locking prevents infinite recalculation loops
  - Bloomberg-validated accuracy with professional terminal results
- **BUG FIX: Price Conversion Logic**
  - Fixed critical price interpretation bug where inputs were misunderstood
  - Calculator now correctly treats price inputs as percentage of face value
  - Eliminates impossible YTM calculations (66%+ yields)
- **NEW: Bloomberg Reference Data Integration**
  - Added real market data for Argentina sovereign bonds validation
  - Professional accuracy benchmarks for GD29, GD30, GD38, GD46, GD35, GD41
  - Calculator results now match Bloomberg terminal values
- **NEW: Bond JSON Specification v1.1**
  - Comprehensive specification for all bond types (not just sovereigns)
  - Universal JSON format for vanilla, corporate, municipal, and complex bonds
  - Complete validation rules and field definitions

### [Previous] - Treasury Integration
- **Real-time Treasury Data Integration**
  - FRED API integration for live US Treasury yield curve
  - Complete 11-tenor curve (1M to 30Y) with 30-minute caching
  - Environment variable configuration with `.env` support
  - Easy access commands: `npm run curve`, `./curve.sh`
  - Secure API key management (not committed to Git)
- Payment timeline chart now uses real cash flow data
- Timeline auto-scales to bond maturity
- Stacked bar chart visualizes Coupons, Principal, and Options (Call/Put)
- Chart is interactive and robust (no canvas reuse errors)
- Improved chart destruction and React integration

## Cash Flow Table Display

- The `COUPON_%` column in the cash flow schedule now displays the **annual coupon rate** for each period (e.g., 0.500% for a 0.5% annual coupon), not the per-period rate. This matches standard bond market conventions.
- The actual coupon payment (`COUPON_$`) is still calculated based on the payment frequency and the current coupon rate.

## 🧠 Technical Learnings & Architecture

### Bond Calculator Architecture Cleanup
- **Simplified Calculator Stack**: Removed redundant calculator implementations, keeping only:
  - Bond Builder (frontend + API)
  - Production Calculator (`BondCalculatorPro` - robust YTM solver)
  - UST Curve API (FRED integration)
  - Frontend calculator interface
- **JSON-First Architecture**: Complex bonds with predefined cash flows take precedence over generated ones
- **High-Precision Math**: Using `decimal.js` for financial calculations to avoid floating-point errors

### Amortizing Bond Calculations
- **Market Price Interpretation**: For amortizing bonds, market prices are quoted as percentage of **current outstanding notional**, not original face value
- **Price Adjustment Logic**: When market quotes 80% for a bond with $960 outstanding (after amortization), the effective price is 80% × $960 = $768, or 76.8% of original $1000 face value
- **Production Calculator**: `BondCalculatorPro` correctly handles this by using `currentOutstanding` in dollar price calculations

### YTM Solver Robustness
- **Multiple Algorithms**: Newton-Raphson (primary), Brent's method, Bisection (fallback)
- **Automatic Fallback**: If one algorithm fails, automatically tries the next
- **Convergence Tracking**: Detailed metadata about algorithm used, iterations, and precision
- **Bracket Finding**: Intelligent initial guess and bracket detection for difficult cases

### Real-World Bond Testing
- **AL30 Argentina 2030**: Successfully validates at 80% price → 10.475% YTM (expected 10.45%)
- **Variable Coupon Bonds**: Handles step-up coupon structures with predefined cash flows
- **Treasury Spread**: Accurate spread calculations using interpolated Treasury curve

---

**Built with ❤️ for the fixed-income community** 