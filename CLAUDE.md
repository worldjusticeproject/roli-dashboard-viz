# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive React dashboard for the World Justice Project Rule of Law Index (ROLI). Visualizes global rule of law data across 8 factors and 44 sub-factors from 2015-2026, with support for regional filtering and multiple chart types.

## Collaborator Roles

This project has multiple collaborators with different roles and permissions:

### Main User (aspardog) - Lead Developer & Maintainer
- **Permissions:** Full access to all branches, can merge to `main`
- **Responsibilities:** Core logic, data pipeline, architecture, code reviews, final approvals
- **Can modify:** Everything
- **Working branches:** `main` (via PR), `design`, feature branches

### Designer - Visual Design & UX
- **Permissions:** Write access to `design` branch only, cannot merge to `main` without approval
- **Responsibilities:** Visual design, color schemes, typography, spacing, responsive layouts, UX improvements
- **Can modify:** Styles (CSS, inline styles), colors in constants.js, component visual appearance
- **Cannot modify:** Core logic, data processing, configuration files, parsers
- **Working branch:** `design` (ALWAYS)
- **Important:** See `docs/designer/DESIGNER_README.md` for detailed designer-specific guidance

### How Claude Code Should Assist Based on User Role

**When assisting the Designer:**
- Focus ONLY on visual/styling changes
- Suggest modifications to CSS, inline styles, colors, spacing, typography
- NEVER modify component logic, data processing, or configuration
- ALWAYS verify they're working on `design` branch
- Recommend creating Pull Requests for review
- Reference `docs/designer/DESIGNER_README.md` for designer-specific guidelines
- Provide clear explanations of what each style property does
- Help with responsive design and mobile layouts

**When assisting Main User:**
- Full access to all architectural decisions
- Can modify core logic, data pipeline, configuration
- Can work on any branch
- Can approve and merge Pull Requests
- **IMPORTANT:** After any merge to `main` or commit to `main`, remind Main User to run `./sync-design.sh` to sync the designer's branch

**If user role is unclear:**
- Ask: "Are you the designer or the developer on this project?"
- Read context from their requests (design-focused vs logic-focused)
- Default to designer restrictions if uncertain (safer)

## Development Commands

**Prerequisites:** Node.js 16+

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm start

# Build for production
npm run build

# Run tests
npm test

# Run a single test file
npm test -- --testPathPattern="TimeSeriesChart"

# Run tests in watch mode (default)
npm test -- --watch

# Re-generate JSON data from Excel source
npm run parse-data

# Security audit (check for high-severity vulnerabilities)
npm run audit

# Automatically fix vulnerabilities
npm run audit:fix
```

**Note:** This project uses Create React App's default ESLint configuration via `react-app` preset. Linting runs automatically during `npm start` and `npm run build`. There is no separate lint command.

## Architecture

### Data Pipeline

**Source → Parser → JSON → App**

1. Excel file: `data/FINAL_2026_wjp_rule_of_law_index_HISTORICAL_DATA_FILE.xlsx`
2. Parser: `scripts/parse-roli-data.js` reads "Historical Data" sheet, normalizes country names, rounds scores
3. Writes to two locations:
   - `data/roli_data.json` (canonical, gitignored)
   - `public/roli_data.json` (served by app, tracked in git)
4. App fetches `/roli_data.json` at runtime

Run `npm run parse-data` after updating the Excel source file.

### Component Architecture

**Organized folder structure with barrel exports**

```
src/
├── App.js                    # Main dashboard component (state management)
├── index.js                  # React entry point
│
├── charts/                   # All chart components
│   ├── TimeSeriesChart.js    # Line chart showing 2015-2026 trends
│   ├── CountryProfileChart.js # Country performance breakdown
│   ├── TopBottomChart.js     # Horizontal bar chart (top/bottom performers)
│   ├── RadarChartView.js     # Multi-year radar with factor selection
│   ├── FactorComparisonChart.js # Multi-country factor comparison
│   ├── HumanRightsHeatmap.js # Score heatmap table
│   ├── CardHeatmap.js        # Change heatmap with cards
│   ├── CountryChangeHeatmap.js # Country subfactor change cards
│   └── RankingTable.js       # Interactive ranking table
│
├── modals/                   # Modal components
│   ├── index.js              # Barrel export
│   ├── InfoModal.js          # Rule of Law Index explanation
│   └── HowToUseModal.js      # Dashboard usage guide
│
├── components/               # Reusable UI components
│   ├── index.js              # Barrel export
│   └── ChartCard.js          # Chart container with export button
│
├── config/                   # Configuration and constants
│   ├── index.js              # Barrel export
│   └── constants.js          # ACTIVE_YEAR, regions, variables, colors
│
├── utils/                    # Utility functions
│   ├── index.js              # Barrel export
│   ├── svgExport.js          # Font fetching for SVG export
│   ├── svgExportHelpers.js   # SVG legend and element helpers
│   ├── regionFilter.js       # Region filtering helpers (filterByRegion, matchesRegion)
│   ├── changeUtils.js        # Change color/arrow/sort-bucket helpers
│   ├── dataBundle.js         # Data bundle normalization + averages/metadata lookups
│   └── topBottomByChange.js  # Change ordering + top/bottom selection (getTopBottomByChange)
│
└── styles/                   # CSS files
    └── responsive.css        # Mobile-responsive styles

scripts/
└── parse-roli-data.js        # Excel → JSON data pipeline

custom-presentation-graphics/ # Custom SVG graphics for presentations (gitignored)
└── *.svg                     # Standalone presentation-ready graphics

craco.config.js               # Webpack config for recharts transpilation
```

**Barrel exports** enable clean imports:
```js
import { RadarChartView, TimeSeriesChart } from './charts';
import { COLORS, REGION_OPTIONS } from './config';
import { InfoModal, HowToUseModal } from './modals';
```

### State Management

All state lives in `App.js`, organized by purpose:

**Core data & filters:**
- `allData` - Full dataset loaded from JSON
- `selectedRegion`, `selectedVariable`, `selectedYear` - Global filters
- `chartType` - Active visualization (see CHART_TABS below)

**Chart Type Configuration (`CHART_TABS` in App.js):**
```js
const CHART_TABS = [
  { key: 'timeseries', label: 'TIME SERIES' },
  { key: 'profile', label: 'COUNTRY PROFILES' },
  { key: 'topbottom', label: 'TOP & BOTTOM PERFORMERS' },
  { key: 'radar', label: 'RADAR CHART' },
  { key: 'factors', label: 'FACTOR COMPARISON' },
  { key: 'heatmap', label: 'SCORE HEATMAP' },
  { key: 'cardheatmap', label: 'CHANGE HEATMAP' },
  { key: 'countrychange', label: 'COUNTRY CHANGE' },
  { key: 'ranking', label: 'RANKINGS' }
];
```

**Chart-specific selections:**
- Time Series: `selectedCountry`, `yearRange`, `showRegionalAvg`, `showGlobalAvg`
- Country Profile: `selectedProfileCountry`, `selectedProfileRegion`
- Radar: `selectedRadarEntity`, `selectedRadarYears`, `selectedRadarFactors`
- Factor Comparison: `factorCompareCountries`
- Score Heatmap: `heatmapYear`, `heatmapRegion`, `heatmapFactors`
- Change Heatmap: `cardHeatmapYear`, `cardHeatmapBaseYear`, `cardHeatmapRegion`, `cardHeatmapVariable`
- Country Change: `countryChangeCountry`, `countryChangeFactor`, `countryChangeYear`, `countryChangeBaseYear`, `countryChangeRegion`
- Ranking Table: `rankingYear`, `rankingBaseYear`, `rankingRegion`, `rankingVariable`

**UI state:**
- Modal visibility: `isInfoModalOpen`, `isHowToUseModalOpen`
- Accordion expansion states for various selectors

**Key patterns:**
- Data filtering happens in `useMemo` hooks to prevent unnecessary re-renders
- Special values: `'__regional_avg__'` for regional averages, `'__region_[name]'` for region selection

### Constants Configuration

**`src/config/constants.js`** exports:
- `ACTIVE_YEAR` - Default year filter (currently '2026'). Update when new data is released
- `REGION_OPTIONS` - 10 regions including 'global', 'European Union', and 'EU Enlargement'
- `EU_COUNTRIES` - Array of 27 EU member state names for European Union filtering
- `EU_ENLARGEMENT_COUNTRIES` - Array of 10 EU candidate countries for EU Enlargement filtering
- `VARIABLE_OPTIONS` - Overall Index (1), Factors (8), Sub-factors (44)
  - Each has `value`, `label`, and `category` for grouping
- `SUBFACTOR_GROUPS` - Groups sub-factors by parent factor for UI organization
- `COLORS` - Color palette (top5, bottom5, background, text, muted, divider)
- `TS_COLORS` - Time series specific colors
- `FACTOR_COLORS` - Color for each of the 8 factors (f1-f8) in Country Profile chart
- `FACTOR_SHORT_LABELS` - Short display names for factors (e.g., '1. Constraints on Government Powers')
- `SUBFACTOR_SHORT_LABELS` - Short display names for all 44 subfactors

### Chart-Specific Logic

**TopBottomChart**
- Dynamic split: Shows min(5, floor(n/2)) top and bottom performers
- Automatically adjusts for small regions to prevent overlap
- Shows regional average reference line

**TimeSeriesChart**
- 2015-2026 data range (configurable via yearRange prop)
- Supports individual countries or regional/global averages
- Fixed Y-axis scale: 0 to 1

**CountryProfileChart**
- Displays all 8 factors with their subfactors in 4-column × 2-row grid
- Supports countries and regional averages (via `__regional_avg__` key)

**RadarChartView**
- Multi-year overlay with different colors per year
- Dynamic factor/subfactor selection (minimum 3 required)
- `ALL_FACTORS_MAP` in component maps keys to labels
- Supports regional averages and individual countries

**FactorComparisonChart**
- Multi-country/region comparison across all 8 factors (up to 5 selections)
- Uses `__region_global` and `__region_[name]` keys for region selection
- Dynamic spacing and sizing based on number of selections

**HumanRightsHeatmap (Score Heatmap)**
- Color-coded table: red (0) → yellow (0.5) → green (1)
- Sticky country column for horizontal scrolling

**CardHeatmap (Change Heatmap)**
- Card-based visualization showing percentage change between two years
- Color coding: green (improved), red (declined), gray (stable ±1%)
- Header toggles narrow the view to the biggest movers under the current filters: `Top 5` / `Top 10` and `Bottom 5` / `Bottom 10`
  - The two dimensions are independent (either group alone, or both together); within a dimension the counts are mutually exclusive, and clicking the active count returns that group to the full view
  - State lives in `App.js` as `cardHeatmapTopCount` / `cardHeatmapBottomCount` (`0` = off), passed down as `topCount` / `bottomCount` with `onTopCountChange` / `onBottomCountChange`
  - Selection comes from `getTopBottomByChange()` in `src/utils/topBottomByChange.js`, which reuses the card grid's own order (`sortByChange` / `compareByChange`, alphabetical tiebreak), drops countries without a base-year score (`change === null`), and caps each group at `floor(countries with data / 2)` like TopBottomChart so groups never overlap in small regions
  - Both groups keep the full view's descending order, so `bottom` ends with the largest decline (same convention as `slice(-n)` in TopBottomChart). A region with few declines can show stable or positive cards in the bottom group; they keep their real `getChangeColor` / `getChangeArrow` styling
  - `Download SVG` exports exactly what is on screen, with a group heading per section and the active selection named in the subtitle

**CountryChangeHeatmap (Country Change)**
- Shows one country/region + one factor → displays all subfactors as change cards
- Answers: "How did [Country] change across the subfactors of [Factor] from [Year] to [Year]?"
- Same card design as CardHeatmap but cards represent subfactors instead of countries
- Calculates factor-level change displayed in header
- Uses `__region_global` and `__region_[name]` keys for regional averages

**RankingTable (Rankings)**
- Interactive sortable table showing country rankings
- Shows regional rank, score, global rank, and rank change compared to base year
- Sortable by any column (click header to toggle sort direction)
- Filters by region and variable (any factor or subfactor)
- Green ▲ indicates moved up in ranking, red ▼ indicates moved down

### SVG Export

All charts support SVG download with embedded fonts:

**How it works:**
1. `getEmbeddedFontCSS()` in `src/utils/svgExport.js` fetches Inter Tight from Google Fonts
2. Converts font URLs to base64 data URIs for self-contained files
3. Charts manually construct legends in `downloadSVG()` functions using helper methods `el()` and `txt()` from `src/utils/svgExportHelpers.js`
4. Legends positioned at TOP of exported SVG with white background

### Informational Modals

Two modals in `src/modals/` accessible from header banner links:
- **InfoModal** - "Learn about the Index →" - Explains ROLI structure, 8 factors, 44 sub-factors
- **HowToUseModal** - "How to use this dashboard →" - Guide to all 9 visualization types

Both use click-outside-to-close and are state-controlled via `isInfoModalOpen`/`isHowToUseModalOpen` in App.js.

### Column Mapping (Excel → JSON)

Parser uses fixed column indices from "Historical Data" sheet. It skips headers using valid year labels, expands combined editions (2012-2013 and 2017-2018), and retains 2012–2026 in the JSON bundle; dashboard controls start at 2015:
- Col 0: Country name (normalized via lookup map)
- Col 1: Year
- Col 4: Region
- Col 5: `roli` (Overall Index)
- Col 6-12: `f1` + `sf11`-`sf16` (Factor 1 + sub-factors)
- Col 13-17: `f2` + `sf21`-`sf24` (Factor 2 + sub-factors)
- ...continues through Factor 8 (col 50-57: `f8` + `sf81`-`sf87`)

All scores rounded to 3 decimal places.

### Mobile Responsiveness

`src/responsive.css` provides breakpoints:
- Controls stack vertically on mobile
- Chart containers adjust padding
- Font sizes scale down appropriately

### Key Patterns

**Regional averages**:
- Time Series & Radar: Special value `'__regional_avg__'` triggers average calculations across filtered data
- Factor Comparison: Uses `__region_global` and `__region_[regionName]` keys for direct region selection
  - Example: `__region_East Asia and Pacific` calculates average for that region
  - `__region_global` calculates average across all countries

**Data filtering**: Two-stage filter - first by year, then by region (if not global)
- Uses `filterByRegion()` and `matchesRegion()` helpers from `src/utils/regionFilter.js`
- European Union and EU Enlargement filtering work by country list (EU_COUNTRIES, EU_ENLARGEMENT_COUNTRIES) rather than data region field

**Memoization**: Heavy use of `useMemo` for derived data (chartData, averages, available countries)

**Country normalization**: Parser maps Excel country names to display names (e.g., "Venezuela, RB" → "Venezuela")

**Dynamic scaling**: Charts adjust height, spacing, and element sizes based on number of selections to prevent overcrowding

### Performance Optimizations

**localStorage Caching (`src/App.js`):**
```js
const CACHE_KEY = 'roli_data_cache';
const CACHE_VERSION_KEY = 'roli_data_version';
const CURRENT_VERSION = '2026.1'; // Update when data changes
```
- First visit: Fetches data → saves to localStorage
- Subsequent visits: Instant load from cache
- **Important:** Update `CURRENT_VERSION` when data changes to invalidate cache

**Other optimizations:**
- Font preloading in `public/index.html`
- Data prefetching via `<link rel="prefetch">`
- HTTP caching configured in `vercel.json`
- Chart components lazy-loaded with `React.lazy()`
- Heavy use of `useMemo` and `React.memo`

### Security

Full details in `docs/security/SECURITY.md`.

**Key points:**
- HTTP security headers and CSP configured in `vercel.json`
- npm overrides in `package.json` for transitive dependency vulnerabilities
- Run `npm run audit` periodically; `npm run audit:fix` for automatic fixes

**Known limitation:** `xlsx` (devDependency) has unfixable vulnerabilities but is only used offline for data parsing, never in production bundle.

## Common Tasks

### Adding a New Chart Type

1. Create new chart component in `src/`
2. Add chart type to `chartType` state in `App.js`
3. Add toggle button in chart-toggle-container
4. Render conditionally in charts section
5. Add any new controls needed

### Updating to New Year Data

1. Replace Excel file in `data/`
2. Run `npm run parse-data`
3. Update `ACTIVE_YEAR` in `src/config/constants.js`
4. Update `CURRENT_VERSION` in `src/App.js` to invalidate localStorage cache (e.g., '2025.1' → '2026.1')
5. Year dropdowns, chart defaults, radar years, and the time-series endpoint derive from `ACTIVE_YEAR`. Follow `docs/maintainer/DATA_UPDATES.md` for validation.

### Modifying Colors

Edit `COLORS` or `TS_COLORS` in `src/config/constants.js`. Changes propagate to all components.

### Adding/Modifying Factors or Sub-factors

1. Update column mapping in `scripts/parse-roli-data.js` if Excel structure changed
2. Update `VARIABLE_OPTIONS` in `src/config/constants.js`
3. Update `SUBFACTOR_GROUPS` if adding new factor
4. Re-run parser

### Syncing Design Branch After Merge to Main (For Main User)

**CRITICAL:** After merging any PR to `main` or committing directly to `main`, you MUST sync the `design` branch so the designer works with your latest code.

**Quick command:**
```bash
./sync-design.sh
```

This script automatically:
1. Updates your local `main` branch
2. Switches to `design` branch
3. Merges `main` into `design`
4. Pushes updated `design` to GitHub
5. Returns you to your original branch

**When to sync:**
- ✅ Just merged a PR from designer → Run sync
- ✅ Just committed your own changes to `main` → Run sync
- ✅ Just pushed to `main` → Run sync

**Why this matters:**
- Prevents merge conflicts later
- Designer always works with current code
- Avoids duplicate work
- Ensures design changes apply to latest implementation

**For Claude Code:** When assisting Main User and you see commits/merges to `main`, remind them to run `./sync-design.sh` to keep the designer's branch updated.

See `docs/maintainer/SYNC_GUIDE.md` for detailed instructions and troubleshooting.

## Tech Stack

- **React 18** (Create React App foundation)
- **Recharts** - All chart rendering
- **craco** - Webpack configuration overrides
- **xlsx** - Excel parsing in data pipeline
- **Inter Tight font** (Google Fonts) - Typography

## Deployment

### GitHub Pages (Production)

**Live URL:** https://worldjusticeproject.github.io/roli-dashboard-viz

**Automatic deployment:** Every push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy-gh-pages.yml`) which:
1. Builds the React app with `npm run build`
2. Deploys the `build/` folder to GitHub Pages

**First-time setup (already done):**
1. Go to repository Settings → Pages
2. Under "Build and deployment", select "GitHub Actions" as the source
3. The workflow will handle the rest automatically

**Manual trigger:** You can also trigger a deploy manually from Actions → "Deploy to GitHub Pages" → "Run workflow"

### Local Development

```bash
npm start  # → http://localhost:3000
```

### Vercel (Alternative)

The repository also has `vercel.json` configured for deployment to Vercel if needed as an alternative hosting option.
