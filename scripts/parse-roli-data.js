/**
 * parse-roli-data.js
 * Reads the WJP Historical Data Excel file and outputs a JSON bundle
 * containing country entries plus precomputed aggregates for the dashboard.
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const EXCEL_PATH = path.resolve(__dirname, '..', 'data', 'FINAL_2026_wjp_rule_of_law_index_HISTORICAL_DATA_FILE.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'data', 'roli_data.json');
const PUBLIC_PATH = path.resolve(__dirname, '..', 'public', 'roli_data.json');

const SCORE_COLUMNS = [
  [5, 'roli'],
  [6, 'f1'], [7, 'sf11'], [8, 'sf12'], [9, 'sf13'], [10, 'sf14'], [11, 'sf15'], [12, 'sf16'],
  [13, 'f2'], [14, 'sf21'], [15, 'sf22'], [16, 'sf23'], [17, 'sf24'],
  [18, 'f3'], [19, 'sf31'], [20, 'sf32'], [21, 'sf33'], [22, 'sf34'],
  [23, 'f4'], [24, 'sf41'], [25, 'sf42'], [26, 'sf43'], [27, 'sf44'], [28, 'sf45'], [29, 'sf46'], [30, 'sf47'], [31, 'sf48'],
  [32, 'f5'], [33, 'sf51'], [34, 'sf52'], [35, 'sf53'],
  [36, 'f6'], [37, 'sf61'], [38, 'sf62'], [39, 'sf63'], [40, 'sf64'], [41, 'sf65'],
  [42, 'f7'], [43, 'sf71'], [44, 'sf72'], [45, 'sf73'], [46, 'sf74'], [47, 'sf75'], [48, 'sf76'], [49, 'sf77'],
  [50, 'f8'], [51, 'sf81'], [52, 'sf82'], [53, 'sf83'], [54, 'sf84'], [55, 'sf85'], [56, 'sf86'], [57, 'sf87'],
];
const METRIC_KEYS = SCORE_COLUMNS.map(([, key]) => key);
const EU_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland', 'Italy', 'Latvia',
  'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania',
  'Slovak Republic', 'Slovenia', 'Spain', 'Sweden',
];
const EU_ENLARGEMENT_COUNTRIES = [
  'Albania', 'Bosnia and Herzegovina', 'Georgia', 'Kosovo', 'Moldova',
  'Montenegro', 'North Macedonia', 'Serbia', 'Türkiye', 'Ukraine',
];
const SPECIAL_REGIONS = ['global', 'European Union', 'EU enlargement'];

const COUNTRY_NAME_MAP = {
  'Venezuela, RB': 'Venezuela',
};

function round3(value) {
  return typeof value === 'number' ? Math.round(value * 1000) / 1000 : null;
}

function round6(value) {
  return typeof value === 'number' ? Math.round(value * 1000000) / 1000000 : null;
}

function expandYearLabel(rawYear) {
  const year = String(rawYear).trim();

  if (/^\d{4}-\d{4}$/.test(year)) {
    const [start, end] = year.split('-').map(Number);
    if (end >= start) {
      return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
    }
  }

  return /^\d{4}$/.test(year) ? [year] : [];
}

function makeMetricSnapshot(entry) {
  const result = {};
  METRIC_KEYS.forEach(metric => {
    result[metric] = entry[metric];
  });
  return result;
}

function attachComparisons(entries) {
  const byCountry = new Map();

  entries.forEach(entry => {
    if (!byCountry.has(entry.country)) byCountry.set(entry.country, []);
    byCountry.get(entry.country).push(entry);
  });

  byCountry.forEach(countryEntries => {
    const entriesByYear = new Map(countryEntries.map(entry => [entry.year, entry]));

    countryEntries.forEach(entry => {
      const comparisons = {};

      entriesByYear.forEach((baseEntry, baseYear) => {
        if (baseYear === entry.year) return;

        const metricComparisons = {};
        METRIC_KEYS.forEach(metric => {
          const currentValue = entry[metric];
          const baseValue = baseEntry[metric];
          metricComparisons[metric] = [
            currentValue !== null && baseValue !== null ? round3(currentValue - baseValue) : null,
            currentValue !== null && baseValue !== null && baseValue !== 0
              ? round6((currentValue - baseValue) / baseValue)
              : null,
          ];
        });

        comparisons[baseYear] = metricComparisons;
      });

      entry.comparisons = comparisons;
    });
  });
}

function matchesRegion(entry, region) {
  if (region === 'global') return true;
  if (region === 'European Union') return EU_COUNTRIES.includes(entry.country);
  if (region === 'EU enlargement') return EU_ENLARGEMENT_COUNTRIES.includes(entry.country);
  return entry.region === region;
}

function computeAverageProfile(entries) {
  const profile = {};

  METRIC_KEYS.forEach(metric => {
    const values = entries.map(entry => entry[metric]).filter(value => value != null);
    profile[metric] = values.length > 0
      ? round3(values.reduce((sum, value) => sum + value, 0) / values.length)
      : null;
  });

  return profile;
}

function buildAggregates(entries) {
  const years = [...new Set(entries.map(entry => entry.year))].sort();
  const baseRegions = [...new Set(entries.map(entry => entry.region))].sort();
  const allRegions = [...SPECIAL_REGIONS, ...baseRegions];
  const entriesByYear = {};
  const averages = { global: {}, regions: {} };
  const regionCountriesByYear = {};
  const countriesByYear = {};
  const countryRegionMap = {};

  entries.forEach(entry => {
    if (!entriesByYear[entry.year]) entriesByYear[entry.year] = [];
    entriesByYear[entry.year].push(entry);
    countryRegionMap[entry.country] = entry.region;
  });

  years.forEach(year => {
    const yearEntries = entriesByYear[year] || [];
    countriesByYear[year] = [...new Set(yearEntries.map(entry => entry.country))].sort();
    averages.global[year] = computeAverageProfile(yearEntries);
    regionCountriesByYear.global = regionCountriesByYear.global || {};
    regionCountriesByYear.global[year] = countriesByYear[year];

    allRegions.filter(region => region !== 'global').forEach(region => {
      const regionEntries = yearEntries.filter(entry => matchesRegion(entry, region));

      if (!averages.regions[region]) averages.regions[region] = {};
      averages.regions[region][year] = computeAverageProfile(regionEntries);

      if (!regionCountriesByYear[region]) regionCountriesByYear[region] = {};
      regionCountriesByYear[region][year] = [...new Set(regionEntries.map(entry => entry.country))].sort();
    });
  });

  return {
    averages,
    metadata: {
      years,
      regions: allRegions,
      countriesByYear,
      regionCountriesByYear,
      countryRegionMap,
    },
  };
}

function parseData() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('Excel file not found:', EXCEL_PATH);
    process.exit(1);
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets['Historical Data'];

  if (!sheet) {
    console.error('Sheet "Historical Data" not found in workbook.');
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const dataRows = rows.slice(1);
  const entries = [];

  for (const row of dataRows) {
    const rawCountry = row[0];
    const years = expandYearLabel(row[1]);
    const region = row[4];

    if (!rawCountry || !region || years.length === 0) continue;

    const country = COUNTRY_NAME_MAP[rawCountry] || rawCountry;

    years.forEach(year => {
      const entry = { country, year, region };
      SCORE_COLUMNS.forEach(([colIdx, key]) => {
        entry[key] = round3(row[colIdx]);
      });
      entries.push(entry);
    });
  }

  attachComparisons(entries);
  const { averages, metadata } = buildAggregates(entries);
  const bundle = {
    entries,
    averages,
    metadata,
  };

  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(bundle, null, 2));
  fs.writeFileSync(PUBLIC_PATH, JSON.stringify(bundle));

  const countries = [...new Set(entries.map(entry => entry.country))];
  console.log(`✓ Parsed ${entries.length} entries → ${OUTPUT_PATH}`);
  console.log(`  Countries: ${countries.length} | Regions: ${metadata.regions.length} | Years: ${metadata.years.length}`);
  console.log(`  Years: ${metadata.years.join(', ')}`);
  console.log(`  Regions: ${metadata.regions.join(', ')}`);
  console.log(`✓ Public copy written with ${metadata.years[0]}-${metadata.years[metadata.years.length - 1]}: ${entries.length} entries → ${PUBLIC_PATH}`);
}

parseData();
