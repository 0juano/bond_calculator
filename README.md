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

### Environment Setup (Optional)

For database functionality, create a `.env` file:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/bonds_db
```

## 📁 Project Structure

```
bond_calculator/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── bond-form.tsx # Main bond input form
│   │   │   ├── cash-flow-table.tsx # Payment schedule display
│   │   │   ├── analytics-panel.tsx # Bond metrics display
│   │   │   └── golden-bonds.tsx    # Template selector
│   │   ├── pages/            # Application pages
│   │   │   ├── bond-builder.tsx    # Main application page
│   │   │   └── not-found.tsx       # 404 page
│   │   ├── hooks/            # Custom React hooks
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
│   └── schema.ts            # Zod schemas and TypeScript types
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

## 🧪 Golden Bond Templates

Pre-configured bond examples for testing and learning:

1. **vanilla-5y** - 5% 5-year US Treasury
2. **amortizing-10y** - 4.5% 10-year corporate with amortization
3. **callable-7y** - 5.25% 7-year municipal with call options
4. **puttable-3y** - 3.75% 3-year Bank of America with put options
5. **variable-step-up** - Treasury step-up bond with coupon rate changes
6. **complex-combo** - Complex bond with amortization, call, and put features
7. **al30d-argentina** - 🆕 **AL30D Argentina sovereign bond** (2020-2030) with step-up coupon structure

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

---

**Built with ❤️ for the fixed-income community** 