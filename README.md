# ROLI Dashboard – Data Visualization Tool

An interactive dashboard for the **World Justice Project Rule of Law Index (ROLI)**. Explore Top and Bottom Performers across all regions, factors, and 44 sub-factors with dynamic charts and SVG export.

## Features

- **Nine visualization types**:
  - **Time Series** — Line chart showing 2015-2025 trends with regional averages
  - **Country Profiles** — Detailed country performance breakdown
  - **Top & Bottom Performers** — Dynamic bar chart that adapts when regions have fewer than 10 countries
  - **Radar Chart** — Multi-year overlay with selectable factors and subfactors (minimum 3)
  - **Factor Comparison** — Multi-country comparison across all 8 factors
  - **Score Heatmap** — Color-coded table showing all countries and factors at a glance
  - **Change Heatmap** — Card-based visualization showing percentage change between years
  - **Country Change** — Analyze how a single country changed across all sub-factors within a factor
  - **Rankings** — Sortable country rankings with regional and global positions, rank change indicators
- **Built-in documentation**:
  - **"Learn about the Index"** — In-app modal explaining the Rule of Law Index structure, 8 factors, and 44 sub-factors
  - **"How to use this dashboard"** — Interactive guide to each visualization type
- **Region selector** — Global + 7 WJP regions + European Union (27 member states) + EU Enlargement (10 candidate countries)
- **Variable selector** — Overall Index, 8 factors, and 44 sub-factors grouped by factor
- **Regional average** reference lines and calculations
- **SVG export** — All charts downloadable with embedded fonts and legends
- **Mobile responsive** — Optimized layouts for all screen sizes

## Getting Started

### Prerequisites

- Node.js 16+
- npm

### Install and run

```bash
npm install
npm start
# → http://localhost:3000
```

### Re-generate data from Excel

The dataset is parsed from the official WJP Historical Data Excel file. If you update the source file in `data/`, re-run the parser to regenerate the JSON:

```bash
npm run parse-data
```

This writes `roli_data.json` to both `data/` (canonical copy) and `public/` (served by the app).

## Live Demo

**GitHub Pages:** [https://worldjusticeproject.github.io/roli-dashboard-viz](https://worldjusticeproject.github.io/roli-dashboard-viz)

The dashboard is automatically deployed to GitHub Pages on every push to `main`.

**Vercel:** [https://roli-dashboard.vercel.app](https://roli-dashboard.vercel.app)

Vercel is a separate deployment. A successful GitHub Pages workflow does not
update this URL. Its existing Vercel project must be connected to
`worldjusticeproject/roli-dashboard-viz`, with `main` as the production branch.
The Vercel build command sets `PUBLIC_URL=/`; GitHub Pages uses the
`homepage` subdirectory in `package.json`. Runtime data and assets use the
same deployment-specific base path.

To deploy manually, authenticate with `vercel login`, link this checkout to the
**existing** project that owns `roli-dashboard.vercel.app`, and run
`vercel --prod`. Do not create another project for this dashboard.

### Automation troubleshooting

- If Claude Code Review reports `Claude Code is not installed on this repository`,
  install or grant the [Claude GitHub App](https://github.com/apps/claude) access
  to `worldjusticeproject/roli-dashboard-viz`. The OAuth secret alone does not
  grant the app access after a repository transfer.
- Branch synchronization recreates `design` from `main` if the source branch was
  deleted after merging. It preserves any commits unique to `design`.
- The WJP palette applies to charts, change legends, SVG exports, and ranking
  indicators. Purple UI controls remain separate from the indigo chart palette.
  Change cards retain the dashboard's existing neutral band below 1% in magnitude.

## Collaboration Workflow

This project uses a two-branch workflow:
- **`main`** — Protected production branch, requires PR approval
- **`design`** — Designer's working branch for visual/UX changes

### For Main User (Maintainer)

**After merging any PR to `main`:** Run the sync script to update the designer's branch:

```bash
./sync-design.sh
```

This ensures the designer always works with the latest code. See `docs/maintainer/SYNC_GUIDE.md` for details.

### For Designer

Always work on the `design` branch. See comprehensive guides in `docs/designer/`:
- `docs/designer/START_HERE.md` — Quick setup guide
- `docs/designer/CLAUDE_CODE_SETUP.md` — How to use Claude Code locally (AI assistant)
- `docs/designer/DESIGNER_README.md` — Designer role context for Claude Code
- `docs/designer/DESIGN_GUIDE.md` — Complete design workflow
- `docs/designer/DESIGN_FILES_REFERENCE.md` — File-by-file reference

### Claude Code Integration

This repository has Claude Code integration:
- **GitHub Actions (@claude):** Only available to maintainer, uses maintainer's API quota
- **Local Claude Code:** Designers should use Claude Code locally with their own accounts
- See `docs/designer/CLAUDE_CODE_SETUP.md` for setup instructions

## Project Structure

```
src/
├── App.js                 # Main dashboard component
├── charts/                # All chart components (9 visualizations)
├── modals/                # InfoModal, HowToUseModal
├── components/            # Reusable UI (ChartCard)
├── config/                # Constants, colors, regions, EU countries
├── utils/                 # SVG export helpers, region filtering
└── styles/                # CSS files

scripts/
└── parse-roli-data.js     # Excel → JSON data pipeline

data/
└── roli_data.json         # Parsed dataset
```

## Tech Stack

| Technology | Role |
|---|---|
| React 18 | UI framework |
| Recharts | All chart visualizations |
| @craco/craco | Webpack configuration |
| xlsx | Excel → JSON parsing |

## Data Source

World Justice Project — [Rule of Law Index](https://worldjusticeproject.org/rule-law-index)

## Documentation

Full details on the directory layout, data pipeline, column mapping, and craco configuration are in [CLAUDE.md](CLAUDE.md).

The dashboard also includes **in-app documentation** accessible via two links in the header:
- **Learn about the Index** — Opens a modal with comprehensive information about the Rule of Law Index
- **How to use this dashboard** — Opens a guide explaining each of the nine visualization types
