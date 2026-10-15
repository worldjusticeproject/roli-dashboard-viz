# Data updates

## Current release: 2026

- Source: `data/FINAL_2026_wjp_rule_of_law_index_HISTORICAL_DATA_FILE.xlsx`, sheet `Historical Data`.
- Coverage: 143 countries in 2026; 1,837 country-year records across 2012–2026 in the generated bundle.
- Dashboard controls cover 2015–2026, with 2026 selected by default across all nine visualizations.
- Combined editions 2012–2013 and 2017–2018 are copied to each constituent year; these are shared edition scores, not independent annual observations.
- Scores are rounded to three decimals before comparisons and averages are computed. Missing scores remain null.
- The parser excludes header rows by validating year labels. The 2026 workbook has two header rows.
- `public/roli_data.json` is the tracked deployment artifact. Source workbooks and the canonical `data/roli_data.json` remain locally stored and gitignored.

## Update procedure

1. Place the new historical workbook in `data/` and update `EXCEL_PATH` in `scripts/parse-roli-data.js`. Confirm the sheet and 58-column layout still match the parser.
2. Run `npm run parse-data` to regenerate both JSON copies, including comparisons, averages, and country/region metadata.
3. Update `ACTIVE_YEAR` in `src/config/constants.js`. Year selectors, chart defaults, and the time-series endpoint derive from it.
4. Increment `CURRENT_VERSION` in `src/App.js` (currently `2026.1`). This invalidates localStorage and versions the JSON request to avoid stale browser data.
5. Validate source scores, unique country/year keys, year coverage, regional averages, and comparisons. Run `npm run build` and review the nine chart types.
6. Update the release details here, the root README, technical guidance, and `docs/index.html`. Preserve historical dates in security records and illustrative examples.
7. Commit the parser, application changes, generated public JSON, and documentation together. Push to `main` through the repository's permitted workflow.
8. Confirm the GitHub Pages deployment and automatic `design` branch synchronization succeed. Vercel is a separate deployment; follow the root README if its Git integration is not active.
