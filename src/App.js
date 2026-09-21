import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { ACTIVE_YEAR, REGION_OPTIONS, VARIABLE_OPTIONS, SUBFACTOR_GROUPS, COLORS } from './config';
import { InfoModal, HowToUseModal } from './modals';
import { filterByRegion, normalizeDataBundle, getCountriesForRegionYear, getCountryRegion } from './utils';
import './styles/responsive.css';

// Lazy load chart components for better initial bundle size
const TopBottomChart = lazy(() => import('./charts/TopBottomChart'));
const TimeSeriesChart = lazy(() => import('./charts/TimeSeriesChart'));
const RadarChartView = lazy(() => import('./charts/RadarChartView'));
const FactorComparisonChart = lazy(() => import('./charts/FactorComparisonChart'));
const CountryProfileChart = lazy(() => import('./charts/CountryProfileChart'));
const HumanRightsHeatmap = lazy(() => import('./charts/HumanRightsHeatmap'));
const CardHeatmap = lazy(() => import('./charts/CardHeatmap'));
const CountryChangeHeatmap = lazy(() => import('./charts/CountryChangeHeatmap'));
const RankingTable = lazy(() => import('./charts/RankingTable'));

// Tab configuration for chart type switcher
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

const AVAILABLE_YEARS = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'];
const DEFAULT_TIME_SERIES_REGION = REGION_OPTIONS.find(option => option.value !== 'global')?.value || 'global';

function getDefaultTimeSeriesEntity(region) {
  return region === 'global' ? '__region_global' : `__region_${region}`;
}

function getTimeSeriesEntityLabel(entity) {
  if (entity === '__region_global') return 'Global Average';
  if (entity.startsWith('__region_')) return `${entity.replace('__region_', '')} Average`;
  return entity;
}

function computeAverageFromEntries(entries, variable) {
  const values = entries.map(entry => entry[variable]).filter(value => value != null);
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
}

function selectedEntitiesToSeries(entities, allData, averages, variable, startYear, endYear) {
  return entities.map((entity, index) => {
    const points = [];

    for (let year = startYear; year <= endYear; year += 1) {
      const yearKey = String(year);
      let value = null;

      if (entity.startsWith('__region_')) {
        const regionName = entity.replace('__region_', '');
        value = regionName === 'global'
          ? (averages.global?.[yearKey]?.[variable] ?? null)
          : (averages.regions?.[regionName]?.[yearKey]?.[variable] ?? null);

        if (value == null) {
          const yearEntries = allData.filter(entry => entry.year === yearKey);
          const matchingEntries = regionName === 'global'
            ? yearEntries
            : filterByRegion(yearEntries, regionName);
          value = computeAverageFromEntries(matchingEntries, variable);
        }
      } else {
        const entry = allData.find(d => d.year === yearKey && d.country === entity);
        value = entry?.[variable] ?? null;
      }

      if (value != null) points.push({ year: yearKey, value });
    }

    return {
      key: entity,
      dataKey: `entity_${index}`,
      label: getTimeSeriesEntityLabel(entity),
      points,
    };
  }).filter(series => series.points.length >= 2);
}

export default function ROLIDashboard() {
  const [allData, setAllData] = useState([]);
  const [averages, setAverages] = useState({ global: {}, regions: {} });
  const [metadata, setMetadata] = useState({ years: [], regions: [], countriesByYear: {}, regionCountriesByYear: {}, countryRegionMap: {} });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_TIME_SERIES_REGION);
  const [selectedVariable, setSelectedVariable] = useState('roli');
  const [timeSeriesMode, setTimeSeriesMode] = useState('countries');
  const [timeSeriesEntities, setTimeSeriesEntities] = useState([getDefaultTimeSeriesEntity(DEFAULT_TIME_SERIES_REGION)]);
  const [expandedTimeSeriesRegions, setExpandedTimeSeriesRegions] = useState({});
  const [timeSeriesCountry, setTimeSeriesCountry] = useState('');
  const [timeSeriesVariables, setTimeSeriesVariables] = useState(['roli', 'f1', 'f2']);
  const [showRegionalAvg, setShowRegionalAvg] = useState(false);
  const [showGlobalAvg, setShowGlobalAvg] = useState(false);
  const [chartType, setChartType] = useState('timeseries');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [yearRange, setYearRange] = useState([2015, 2025]); // Year range for time series (2015-2025)
  const [selectedProfileCountry, setSelectedProfileCountry] = useState('__regional_avg__');
  const [selectedProfileRegion, setSelectedProfileRegion] = useState('global');
  const [radarYearsExpanded, setRadarYearsExpanded] = useState(true);
  const [selectedRadarYears, setSelectedRadarYears] = useState(['2025']); // Multiple years for comparison
  const [selectedRadarEntity, setSelectedRadarEntity] = useState('__region_global'); // Single entity for radar chart
  const [selectedRadarFactors, setSelectedRadarFactors] = useState(['roli', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']); // Factors/subfactors for radar
  const [radarFactorsExpanded, setRadarFactorsExpanded] = useState(true); // Accordion state for factors section
  const [expandedRadarFactorGroups, setExpandedRadarFactorGroups] = useState({}); // Accordion state for subfactor groups
  const [factorCompareCountries, setFactorCompareCountries] = useState(['__region_global']); // Countries/regions for Factor Comparison
  const [expandedFactorRegions, setExpandedFactorRegions] = useState({}); // Accordion state for Factor Comparison country selector
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isHowToUseModalOpen, setIsHowToUseModalOpen] = useState(false);
  const [heatmapYear, setHeatmapYear] = useState('2025');
  const [heatmapRegion, setHeatmapRegion] = useState('global');
  const [heatmapFactors, setHeatmapFactors] = useState(['roli', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']);
  const [cardHeatmapYear, setCardHeatmapYear] = useState('2025');
  const [cardHeatmapBaseYear, setCardHeatmapBaseYear] = useState('2015');
  const [cardHeatmapRegion, setCardHeatmapRegion] = useState('global');
  const [cardHeatmapVariable, setCardHeatmapVariable] = useState('roli');
  const [countryChangeCountry, setCountryChangeCountry] = useState('__region_global');
  const [countryChangeFactor, setCountryChangeFactor] = useState('f1');
  const [countryChangeYear, setCountryChangeYear] = useState('2025');
  const [countryChangeBaseYear, setCountryChangeBaseYear] = useState('2015');
  const [countryChangeRegion, setCountryChangeRegion] = useState('global');
  const [rankingYear, setRankingYear] = useState(ACTIVE_YEAR);
  const [rankingBaseYear, setRankingBaseYear] = useState('2015');
  const [rankingRegion, setRankingRegion] = useState('global');
  const [rankingVariable, setRankingVariable] = useState('roli');
  const selectedLabel = VARIABLE_OPTIONS.find(opt => opt.value === selectedVariable)?.label || selectedVariable;
  const regionLabel = REGION_OPTIONS.find(opt => opt.value === selectedRegion)?.label || selectedRegion;

  useEffect(() => {
    const CACHE_KEY = 'roli_data_cache';
    const CACHE_VERSION_KEY = 'roli_data_version';
    const CURRENT_VERSION = '2025.5'; // Update this when data changes

    // Try to load from localStorage cache first
    const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedVersion === CURRENT_VERSION && cachedData) {
      try {
        const parsed = normalizeDataBundle(JSON.parse(cachedData));
        setAllData(parsed.entries);
        setAverages(parsed.averages);
        setMetadata(parsed.metadata);
        setIsLoadingData(false);
        return; // Use cached data, skip fetch
      } catch (e) {
        // Invalid cache, continue to fetch
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_VERSION_KEY);
      }
    }

    // Fetch fresh data
    setIsLoadingData(true);
    fetch('/roli_data.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load data');
        return res.json();
      })
      .then(json => {
        const parsed = normalizeDataBundle(json);
        setAllData(parsed.entries);
        setAverages(parsed.averages);
        setMetadata(parsed.metadata);
        setIsLoadingData(false);
        // Cache the data for future visits
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
          localStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
        } catch (e) {
          // localStorage might be full or disabled, ignore
          console.warn('Could not cache data:', e.message);
        }
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setDataError(err.message);
        setIsLoadingData(false);
      });
  }, []);

  useEffect(() => {
    if (parseInt(cardHeatmapBaseYear, 10) > parseInt(cardHeatmapYear, 10)) {
      setCardHeatmapBaseYear(cardHeatmapYear);
    }
  }, [cardHeatmapBaseYear, cardHeatmapYear]);

  useEffect(() => {
    if (parseInt(countryChangeBaseYear, 10) > parseInt(countryChangeYear, 10)) {
      setCountryChangeBaseYear(countryChangeYear);
    }
  }, [countryChangeBaseYear, countryChangeYear]);

  useEffect(() => {
    if (parseInt(rankingBaseYear, 10) >= parseInt(rankingYear, 10)) {
      const years = AVAILABLE_YEARS.filter(y => parseInt(y, 10) < parseInt(rankingYear, 10));
      if (years.length > 0) {
        setRankingBaseYear(years[years.length - 1]);
      }
    }
  }, [rankingBaseYear, rankingYear]);

  const roliData = useMemo(() => {
    const byYear = allData.filter(d => d.year === ACTIVE_YEAR);
    return filterByRegion(byYear, selectedRegion);
  }, [allData, selectedRegion]);

  const availableCountries = useMemo(() => {
    const set = new Set(roliData.map(d => d.country));
    return [...set].sort();
  }, [roliData]);

  // Available countries for profile chart (based on profile region selection)
  const profileAvailableCountries = useMemo(() => {
    return getCountriesForRegionYear(metadata, selectedProfileRegion, ACTIVE_YEAR);
  }, [metadata, selectedProfileRegion]);

  const timeSeriesCountryOptions = useMemo(() => {
    const options = [];

    options.push({
      value: selectedRegion === 'global' ? '__region_global' : `__region_${selectedRegion}`,
      label: selectedRegion === 'global' ? 'Global Average' : `${regionLabel} Average`
    });

    if (selectedRegion !== 'global') {
      options.push({
        value: '__region_global',
        label: 'Global Average'
      });
    }

    getCountriesForRegionYear(metadata, selectedRegion, ACTIVE_YEAR).forEach(country => {
      options.push({ value: country, label: country });
    });

    return options;
  }, [metadata, selectedRegion, regionLabel]);

  useEffect(() => {
    setTimeSeriesEntities(current => current.filter(entity => {
      if (entity.startsWith('__region_')) return true;
      return availableCountries.includes(entity);
    }).length > 0 ? current.filter(entity => {
      if (entity.startsWith('__region_')) return true;
      return availableCountries.includes(entity);
    }) : [getDefaultTimeSeriesEntity(selectedRegion)]);
  }, [availableCountries, selectedRegion]);

  useEffect(() => {
    if (timeSeriesMode !== 'countries') return;

    const defaultEntity = getDefaultTimeSeriesEntity(selectedRegion);
    setTimeSeriesEntities(current => {
      if (current.length !== 1) return current;
      if (!current[0].startsWith('__region_')) return current;
      if (current[0] === defaultEntity) return current;
      return [defaultEntity];
    });
  }, [selectedRegion, timeSeriesMode]);

  useEffect(() => {
    if (!timeSeriesCountryOptions.some(option => option.value === timeSeriesCountry)) {
      setTimeSeriesCountry(timeSeriesCountryOptions[0]?.value || '');
    }
  }, [timeSeriesCountry, timeSeriesCountryOptions]);

  useEffect(() => {
    if (timeSeriesMode === 'countryFactors') {
      setShowRegionalAvg(false);
      setShowGlobalAvg(false);
    }
  }, [timeSeriesMode]);

  const timeSeriesReferenceSeries = useMemo(() => {
    const [startYear, endYear] = yearRange;
    const refs = [];

    if (timeSeriesMode === 'countries') {
      if (showRegionalAvg && selectedRegion !== 'global' && selectedVariable) {
        const points = [];
        for (let year = startYear; year <= endYear; year += 1) {
          const yearKey = String(year);
          let value = averages.regions?.[selectedRegion]?.[yearKey]?.[selectedVariable] ?? null;
          if (value == null) {
            value = computeAverageFromEntries(filterByRegion(allData.filter(entry => entry.year === yearKey), selectedRegion), selectedVariable);
          }
          if (value != null) points.push({ year: String(year), value });
        }
        if (points.length >= 2) refs.push({ key: 'regionalAvg', dataKey: 'reference_regional', label: `${regionLabel} Average`, points, style: 'referenceRegional' });
      }

      if (showGlobalAvg && selectedVariable) {
        const points = [];
        for (let year = startYear; year <= endYear; year += 1) {
          const yearKey = String(year);
          let value = averages.global?.[yearKey]?.[selectedVariable] ?? null;
          if (value == null) {
            value = computeAverageFromEntries(allData.filter(entry => entry.year === yearKey), selectedVariable);
          }
          if (value != null) points.push({ year: String(year), value });
        }
        if (points.length >= 2) refs.push({ key: 'globalAvg', dataKey: 'reference_global', label: 'Global Average', points, style: 'referenceGlobal' });
      }
    }

    return refs;
  }, [allData, averages, yearRange, timeSeriesMode, showRegionalAvg, selectedRegion, selectedVariable, regionLabel, showGlobalAvg]);

  const timeSeriesSeries = useMemo(() => {
    const [startYear, endYear] = yearRange;

    if (timeSeriesMode === 'countries') {
      return selectedEntitiesToSeries(timeSeriesEntities, allData, averages, selectedVariable, startYear, endYear);
    }

    if (!timeSeriesCountry) return [];

    return timeSeriesVariables.map((variableKey, index) => {
      const variableLabel = VARIABLE_OPTIONS.find(option => option.value === variableKey)?.label || variableKey;
      const points = [];

      for (let year = startYear; year <= endYear; year += 1) {
        const yearKey = String(year);
        let value = null;

        if (timeSeriesCountry.startsWith('__region_')) {
          const regionName = timeSeriesCountry.replace('__region_', '');
          value = regionName === 'global'
            ? (averages.global?.[yearKey]?.[variableKey] ?? null)
            : (averages.regions?.[regionName]?.[yearKey]?.[variableKey] ?? null);

          if (value == null) {
            const yearEntries = allData.filter(entry => entry.year === yearKey);
            const matchingEntries = regionName === 'global'
              ? yearEntries
              : filterByRegion(yearEntries, regionName);
            value = computeAverageFromEntries(matchingEntries, variableKey);
          }
        } else {
          const entry = allData.find(d => d.year === yearKey && d.country === timeSeriesCountry);
          value = entry?.[variableKey] ?? null;
        }

        if (value != null) points.push({ year: String(year), value });
      }

      return {
        key: variableKey,
        dataKey: `variable_${index}`,
        label: variableLabel,
        points,
      };
    }).filter(series => series.points.length >= 2);
  }, [timeSeriesMode, timeSeriesEntities, allData, averages, selectedVariable, yearRange, timeSeriesCountry, timeSeriesVariables]);

  const timeSeriesSubtitle = useMemo(() => {
    if (timeSeriesMode === 'countries') {
      return timeSeriesSeries.length === 1
        ? `${timeSeriesSeries[0].label} ${yearRange[0]}–${yearRange[1]}`
        : `Comparing ${timeSeriesSeries.length} categories, ${yearRange[0]}–${yearRange[1]}`;
    }

    return timeSeriesCountry
      ? `${getTimeSeriesEntityLabel(timeSeriesCountry)} ${yearRange[0]}–${yearRange[1]}`
      : `${yearRange[0]}–${yearRange[1]}`;
  }, [timeSeriesMode, timeSeriesSeries, yearRange, timeSeriesCountry]);

  if (roliData.length === 0) {
    return <div style={{ minHeight: '100vh', backgroundColor: COLORS.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: COLORS.muted, fontSize: '16px' }}>Loading data…</p>
    </div>;
  }

  // Show loading state
  if (isLoadingData) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.background, fontFamily: "'Inter Tight', sans-serif", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: COLORS.text, marginBottom: '12px' }}>Loading ROLI Data...</div>
          <div style={{ fontSize: '14px', color: COLORS.muted }}>Please wait while we load the data</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (dataError) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.background, fontFamily: "'Inter Tight', sans-serif", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: '#c0392b', marginBottom: '12px' }}>Error Loading Data</div>
          <div style={{ fontSize: '14px', color: COLORS.muted, marginBottom: '16px' }}>{dataError}</div>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: '600', color: 'white', backgroundColor: COLORS.primary, border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ minHeight: '100vh', backgroundColor: COLORS.background, fontFamily: "'Inter Tight', sans-serif" }}>
      {/* WJP Navigation Bar - Purple */}
      <div className="wjp-nav" style={{ backgroundColor: COLORS.primary, padding: '14px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: COLORS.white, fontSize: '18px', fontWeight: '600' }}>Rule of Law Index®</span>
          <nav style={{ display: 'flex', gap: '32px' }}>
            <button onClick={() => setIsInfoModalOpen(true)} style={{ background: 'none', border: 'none', color: COLORS.white, fontSize: '14px', fontWeight: '500', cursor: 'pointer', padding: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>ABOUT</button>
            <button onClick={() => setIsHowToUseModalOpen(true)} style={{ background: 'none', border: 'none', color: COLORS.white, fontSize: '14px', fontWeight: '500', cursor: 'pointer', padding: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>HOW TO USE IT</button>
          </nav>
        </div>
      </div>

      {/* Info Modals */}
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
      <HowToUseModal isOpen={isHowToUseModalOpen} onClose={() => setIsHowToUseModalOpen(false)} />

      {/* Main Content */}
      <div style={{ padding: '32px 24px' }}>
        {/* Header Banner */}
        <div className="dashboard-header" style={{ maxWidth: '1100px', margin: '0 auto 32px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: COLORS.primary,
            margin: '0 0 12px 0',
            fontFamily: "'Inter Tight', sans-serif",
            lineHeight: '1.2'
          }}>
            WJP Rule of Law Index® dashboard
          </h1>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: COLORS.muted, margin: '0 auto', maxWidth: '600px' }}>
            Explore results and download publication-ready visuals for presentations and reports.
          </p>
        </div>

        {/* Chart Type Tabs */}
        <div className="chart-tabs" style={{ maxWidth: '1100px', margin: '0 auto 32px', display: 'flex', justifyContent: 'center', gap: '0' }}>
          {CHART_TABS.map((tab, index) => (
            <button
              key={tab.key}
              onClick={() => setChartType(tab.key)}
              style={{
                padding: '14px 24px',
                fontSize: '13px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                border: '1px solid #e5e5e5',
                borderLeft: index === 0 ? '1px solid #e5e5e5' : 'none',
                backgroundColor: chartType === tab.key ? COLORS.primary : 'white',
                color: chartType === tab.key ? 'white' : COLORS.text,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

      {/* Two-Column Layout: Sidebar + Chart */}
      <div className="dashboard-main-layout" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '32px' }}>

        {/* Left Sidebar - Controls */}
        <div className="controls-sidebar" style={{ width: '280px', flexShrink: 0 }}>

          {/* Time Series Controls */}
          {chartType === 'timeseries' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #e5e5e5', borderRadius: '6px', overflow: 'hidden' }}>
                  <button onClick={() => setTimeSeriesMode('countries')} style={{ padding: '12px 10px', fontSize: '12px', fontWeight: '600', border: 'none', backgroundColor: timeSeriesMode === 'countries' ? COLORS.primary : 'white', color: timeSeriesMode === 'countries' ? 'white' : COLORS.text, cursor: 'pointer' }}>Countries</button>
                  <button onClick={() => setTimeSeriesMode('countryFactors')} style={{ padding: '12px 10px', fontSize: '12px', fontWeight: '600', border: 'none', borderLeft: '1px solid #e5e5e5', backgroundColor: timeSeriesMode === 'countryFactors' ? COLORS.primary : 'white', color: timeSeriesMode === 'countryFactors' ? 'white' : COLORS.text, cursor: 'pointer' }}>One Country, Many Variables</button>
                </div>
              </div>

              {timeSeriesMode === 'countries' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Countries to Compare</label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={timeSeriesEntities.includes('__region_global')}
                    onChange={(e) => {
                      if (e.target.checked && timeSeriesEntities.length < 7) {
                        setTimeSeriesEntities([...timeSeriesEntities, '__region_global']);
                      } else if (!e.target.checked) {
                        setTimeSeriesEntities(timeSeriesEntities.filter(entity => entity !== '__region_global'));
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: COLORS.primary }}
                  />
                  <span style={{ fontSize: '14px', color: COLORS.primary, fontWeight: '600' }}>Global Average</span>
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {REGION_OPTIONS.filter(region => region.value !== 'global').map(region => {
                    const regionKey = `__region_${region.value}`;
                    const regionCountries = getCountriesForRegionYear(metadata, region.value, ACTIVE_YEAR);
                    const isExpanded = expandedTimeSeriesRegions[region.value];
                    const isRegionSelected = timeSeriesEntities.includes(regionKey);

                    return (
                      <div key={region.value}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isExpanded ? '8px' : '0' }}>
                          <input
                            type="checkbox"
                            checked={isRegionSelected}
                            onChange={(e) => {
                              if (e.target.checked && timeSeriesEntities.length < 7) {
                                setTimeSeriesEntities([...timeSeriesEntities, regionKey]);
                              } else if (!e.target.checked) {
                                setTimeSeriesEntities(timeSeriesEntities.filter(entity => entity !== regionKey));
                              }
                            }}
                            disabled={!isRegionSelected && timeSeriesEntities.length >= 7}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: COLORS.primary }}
                          />
                          <span
                            onClick={() => setExpandedTimeSeriesRegions({ ...expandedTimeSeriesRegions, [region.value]: !isExpanded })}
                            style={{ flex: 1, fontSize: '14px', color: COLORS.primary, fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {region.label}
                          </span>
                          <span
                            onClick={() => setExpandedTimeSeriesRegions({ ...expandedTimeSeriesRegions, [region.value]: !isExpanded })}
                            style={{ fontSize: '14px', color: COLORS.primary, cursor: 'pointer', fontWeight: '300' }}
                          >
                            {isExpanded ? '−' : '+'}
                          </span>
                        </div>

                        {isExpanded && (
                          <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                            {regionCountries.map(country => (
                              <label key={country} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: timeSeriesEntities.length >= 7 && !timeSeriesEntities.includes(country) ? 'not-allowed' : 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={timeSeriesEntities.includes(country)}
                                  onChange={(e) => {
                                    if (e.target.checked && timeSeriesEntities.length < 7) {
                                      setTimeSeriesEntities([...timeSeriesEntities, country]);
                                    } else if (!e.target.checked) {
                                      setTimeSeriesEntities(timeSeriesEntities.filter(entity => entity !== country));
                                    }
                                  }}
                                  disabled={!timeSeriesEntities.includes(country) && timeSeriesEntities.length >= 7}
                                  style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: COLORS.primary }}
                                />
                                <span style={{ fontSize: '13px', color: timeSeriesEntities.length >= 7 && !timeSeriesEntities.includes(country) ? COLORS.muted : COLORS.text }}>{country}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {timeSeriesMode === 'countries' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Factor and Subfactor</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedVariable} onChange={(e) => setSelectedVariable(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    <optgroup label="Overall Index">
                      {VARIABLE_OPTIONS.filter(o => o.category === 'general').map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </optgroup>
                    <optgroup label="Factors">
                      {VARIABLE_OPTIONS.filter(o => o.category === 'factor').map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </optgroup>
                    {SUBFACTOR_GROUPS.map(group => (
                      <optgroup key={group.category} label={group.label}>
                        {VARIABLE_OPTIONS.filter(o => o.category === group.category).map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                      </optgroup>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              )}

              {timeSeriesMode === 'countryFactors' && (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Region</label>
                    <div style={{ position: 'relative' }}>
                      <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                        {REGION_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                      </select>
                      <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Country</label>
                    <div style={{ position: 'relative' }}>
                      <select value={timeSeriesCountry} onChange={(e) => setTimeSeriesCountry(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                        {timeSeriesCountryOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                      </select>
                      <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Factors & Subfactors to Compare</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '340px', overflowY: 'auto', paddingRight: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
                        <input
                          type="checkbox"
                          checked={timeSeriesVariables.includes('roli')}
                          onChange={(e) => {
                            if (e.target.checked && timeSeriesVariables.length < 7) {
                              setTimeSeriesVariables([...timeSeriesVariables, 'roli']);
                            } else if (!e.target.checked && timeSeriesVariables.length > 1) {
                              setTimeSeriesVariables(timeSeriesVariables.filter(variable => variable !== 'roli'));
                            }
                          }}
                          style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: COLORS.primary }}
                        />
                        <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: '600' }}>WJP Rule of Law Index: Overall Score</span>
                      </label>
                      {SUBFACTOR_GROUPS.map(group => {
                        const factorKey = group.category.replace('sf', 'f');
                        const factorOption = VARIABLE_OPTIONS.find(option => option.value === factorKey);
                        const subfactors = VARIABLE_OPTIONS.filter(option => option.category === group.category);
                        return (
                          <div key={group.category} style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
                              <input
                                type="checkbox"
                                checked={timeSeriesVariables.includes(factorKey)}
                                onChange={(e) => {
                                  if (e.target.checked && timeSeriesVariables.length < 7) {
                                    setTimeSeriesVariables([...timeSeriesVariables, factorKey]);
                                  } else if (!e.target.checked && timeSeriesVariables.length > 1) {
                                    setTimeSeriesVariables(timeSeriesVariables.filter(variable => variable !== factorKey));
                                  }
                                }}
                                style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: COLORS.primary }}
                              />
                              <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: '500' }}>{factorOption?.label}</span>
                            </label>
                            <div style={{ marginLeft: '22px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {subfactors.map(subfactor => (
                                <label key={subfactor.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '2px 0' }}>
                                  <input
                                    type="checkbox"
                                    checked={timeSeriesVariables.includes(subfactor.value)}
                                    onChange={(e) => {
                                      if (e.target.checked && timeSeriesVariables.length < 7) {
                                        setTimeSeriesVariables([...timeSeriesVariables, subfactor.value]);
                                      } else if (!e.target.checked && timeSeriesVariables.length > 1) {
                                        setTimeSeriesVariables(timeSeriesVariables.filter(variable => variable !== subfactor.value));
                                      }
                                    }}
                                    style={{ cursor: 'pointer', width: '12px', height: '12px', accentColor: COLORS.primary }}
                                  />
                                  <span style={{ fontSize: '11px', color: COLORS.muted }}>{subfactor.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Time Period Range Slider - Start year movable, end year fixed at 2025 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Time Period</label>
                <div style={{ padding: '8px 0' }}>
                  {/* Slider Track */}
                  <div style={{ position: 'relative', height: '4px', background: '#e5e5e5', borderRadius: '2px', marginBottom: '8px' }}>
                    {/* Purple filled portion from start year to 2025 */}
                    <div style={{
                      position: 'absolute',
                      left: `${((yearRange[0] - 2015) / 10) * 100}%`,
                      right: '0%',
                      height: '100%',
                      background: COLORS.primary,
                      borderRadius: '2px'
                    }} />
                    {/* Single slider for start year */}
                    <input
                      type="range"
                      min="2015"
                      max="2024"
                      value={yearRange[0]}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setYearRange([val, 2025]);
                      }}
                      style={{ position: 'absolute', width: '100%', height: '20px', top: '-8px', opacity: 0, cursor: 'pointer', zIndex: 2 }}
                    />
                    {/* Visual handle for start year */}
                    <div style={{ position: 'absolute', left: `calc(${((yearRange[0] - 2015) / 10) * 100}% - 8px)`, top: '-6px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: COLORS.primary, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', cursor: 'pointer' }} />
                    {/* Fixed indicator for 2025 */}
                    <div style={{ position: 'absolute', right: '-8px', top: '-6px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: COLORS.primary, border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  {/* Year labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: '500' }}>{yearRange[0]}</span>
                    <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: '500' }}>2025</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: '#f8f7f4', borderRadius: '6px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: COLORS.muted, margin: 0, lineHeight: 1.5 }}>
                  {timeSeriesMode === 'countries'
                    ? 'Select up to 7 countries or regional averages to compare over time.'
                    : 'Select one country and up to 7 factors or subfactors to compare over time.'}
                </p>
              </div>

              {timeSeriesMode === 'countries' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Reference Lines</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={showGlobalAvg} onChange={(e) => setShowGlobalAvg(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: COLORS.primary }} />
                    <span style={{ fontSize: '14px', color: COLORS.text }}>Global Average</span>
                  </label>
                  {selectedRegion !== 'global' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={showRegionalAvg} onChange={(e) => setShowRegionalAvg(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: COLORS.primary }} />
                      <span style={{ fontSize: '14px', color: COLORS.text }}>{regionLabel}</span>
                    </label>
                  )}
                </div>
              </div>
              )}
            </>
          )}

          {/* Top & Bottom Controls */}
          {chartType === 'topbottom' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Region</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {REGION_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Variable</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedVariable} onChange={(e) => setSelectedVariable(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    <optgroup label="Overall Index">
                      {VARIABLE_OPTIONS.filter(o => o.category === 'general').map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </optgroup>
                    <optgroup label="Factors">
                      {VARIABLE_OPTIONS.filter(o => o.category === 'factor').map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </optgroup>
                    {SUBFACTOR_GROUPS.map(group => (
                      <optgroup key={group.category} label={group.label}>
                        {VARIABLE_OPTIONS.filter(o => o.category === group.category).map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                      </optgroup>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                    <option value="2019">2019</option>
                    <option value="2018">2018</option>
                    <option value="2017">2017</option>
                    <option value="2016">2016</option>
                    <option value="2015">2015</option>
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Profile Controls */}
          {chartType === 'profile' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Region</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedProfileRegion} onChange={(e) => { setSelectedProfileRegion(e.target.value); setSelectedProfileCountry('__regional_avg__'); }} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {REGION_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Country</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedProfileCountry} onChange={(e) => setSelectedProfileCountry(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    <option value="__regional_avg__">{selectedProfileRegion === 'global' ? 'Global Average' : 'Regional Average'}</option>
                    {profileAvailableCountries.map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Factor Comparison Controls */}
          {chartType === 'factors' && (
            <>
              {/* Year Dropdown */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                    <option value="2019">2019</option>
                    <option value="2018">2018</option>
                    <option value="2017">2017</option>
                    <option value="2016">2016</option>
                    <option value="2015">2015</option>
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>

              {/* Countries to Compare */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Countries to Compare</label>

                {/* Global Average */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={factorCompareCountries.includes('__region_global')}
                    onChange={(e) => {
                      if (e.target.checked && factorCompareCountries.length < 5) {
                        setFactorCompareCountries([...factorCompareCountries, '__region_global']);
                      } else if (!e.target.checked) {
                        setFactorCompareCountries(factorCompareCountries.filter(c => c !== '__region_global'));
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: COLORS.primary }}
                  />
                  <span style={{ fontSize: '14px', color: COLORS.primary, fontWeight: '600' }}>Global Average</span>
                </label>

                {/* Regions with expandable countries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {REGION_OPTIONS.filter(r => r.value !== 'global').map(region => {
                    const regionKey = `__region_${region.value}`;
                    const regionCountries = getCountriesForRegionYear(metadata, region.value, selectedYear);
                    const isExpanded = expandedFactorRegions[region.value];
                    const isRegionSelected = factorCompareCountries.includes(regionKey);

                    return (
                      <div key={region.value}>
                        {/* Region Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isExpanded ? '8px' : '0' }}>
                          <input
                            type="checkbox"
                            checked={isRegionSelected}
                            onChange={(e) => {
                              if (e.target.checked && factorCompareCountries.length < 5) {
                                setFactorCompareCountries([...factorCompareCountries, regionKey]);
                              } else if (!e.target.checked) {
                                setFactorCompareCountries(factorCompareCountries.filter(c => c !== regionKey));
                              }
                            }}
                            disabled={!isRegionSelected && factorCompareCountries.length >= 5}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: COLORS.primary }}
                          />
                          <span
                            onClick={() => setExpandedFactorRegions({ ...expandedFactorRegions, [region.value]: !isExpanded })}
                            style={{ flex: 1, fontSize: '14px', color: COLORS.primary, fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {region.label}
                          </span>
                          <span
                            onClick={() => setExpandedFactorRegions({ ...expandedFactorRegions, [region.value]: !isExpanded })}
                            style={{ fontSize: '14px', color: COLORS.primary, cursor: 'pointer', fontWeight: '300' }}
                          >
                            {isExpanded ? '−' : '+'}
                          </span>
                        </div>

                        {/* Countries in Region */}
                        {isExpanded && (
                          <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                            {regionCountries.map(country => (
                              <label key={country} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: factorCompareCountries.length >= 5 && !factorCompareCountries.includes(country) ? 'not-allowed' : 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={factorCompareCountries.includes(country)}
                                  onChange={(e) => {
                                    if (e.target.checked && factorCompareCountries.length < 5) {
                                      setFactorCompareCountries([...factorCompareCountries, country]);
                                    } else if (!e.target.checked) {
                                      setFactorCompareCountries(factorCompareCountries.filter(c => c !== country));
                                    }
                                  }}
                                  disabled={!factorCompareCountries.includes(country) && factorCompareCountries.length >= 5}
                                  style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: COLORS.primary }}
                                />
                                <span style={{ fontSize: '13px', color: factorCompareCountries.length >= 5 && !factorCompareCountries.includes(country) ? COLORS.muted : COLORS.text }}>{country}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Heatmap Controls */}
          {chartType === 'heatmap' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Region</label>
                <div style={{ position: 'relative' }}>
                  <select value={heatmapRegion} onChange={(e) => setHeatmapRegion(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {REGION_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={heatmapYear} onChange={(e) => setHeatmapYear(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                    <option value="2019">2019</option>
                    <option value="2018">2018</option>
                    <option value="2017">2017</option>
                    <option value="2016">2016</option>
                    <option value="2015">2015</option>
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Factors & Sub-factors</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                  {/* Overall Index */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
                    <input
                      type="checkbox"
                      checked={heatmapFactors.includes('roli')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setHeatmapFactors([...heatmapFactors, 'roli']);
                        } else if (heatmapFactors.length > 1) {
                          setHeatmapFactors(heatmapFactors.filter(f => f !== 'roli'));
                        }
                      }}
                      style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: COLORS.primary }}
                    />
                    <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: '600' }}>WJP Rule of Law Index: Overall Score</span>
                  </label>
                  {/* 8 Factors with their subfactors */}
                  {SUBFACTOR_GROUPS.map(group => {
                    const factorKey = group.category.replace('sf', 'f');
                    const factorOption = VARIABLE_OPTIONS.find(o => o.value === factorKey);
                    const subfactors = VARIABLE_OPTIONS.filter(o => o.category === group.category);
                    return (
                      <div key={group.category} style={{ marginBottom: '8px' }}>
                        {/* Factor checkbox */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0' }}>
                          <input
                            type="checkbox"
                            checked={heatmapFactors.includes(factorKey)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setHeatmapFactors([...heatmapFactors, factorKey]);
                              } else if (heatmapFactors.length > 1) {
                                setHeatmapFactors(heatmapFactors.filter(f => f !== factorKey));
                              }
                            }}
                            style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: COLORS.primary }}
                          />
                          <span style={{ fontSize: '13px', color: COLORS.text, fontWeight: '500' }}>{factorOption?.label}</span>
                        </label>
                        {/* Subfactors */}
                        <div style={{ marginLeft: '22px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {subfactors.map(sf => (
                            <label key={sf.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '2px 0' }}>
                              <input
                                type="checkbox"
                                checked={heatmapFactors.includes(sf.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setHeatmapFactors([...heatmapFactors, sf.value]);
                                  } else if (heatmapFactors.length > 1) {
                                    setHeatmapFactors(heatmapFactors.filter(f => f !== sf.value));
                                  }
                                }}
                                style={{ cursor: 'pointer', width: '12px', height: '12px', accentColor: COLORS.primary }}
                              />
                              <span style={{ fontSize: '11px', color: COLORS.muted }}>{sf.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8f7f4', borderRadius: '6px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: COLORS.muted, margin: 0, lineHeight: 1.5 }}>
                  Select factors and sub-factors to display in the heatmap. Countries sorted alphabetically.
                </p>
              </div>
            </>
          )}

          {/* Card Heatmap Controls */}
          {chartType === 'cardheatmap' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Region</label>
                <div style={{ position: 'relative' }}>
                  <select value={cardHeatmapRegion} onChange={(e) => setCardHeatmapRegion(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {REGION_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Factor / Sub-factor</label>
                <div style={{ position: 'relative' }}>
                  <select value={cardHeatmapVariable} onChange={(e) => setCardHeatmapVariable(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    <optgroup label="Overall Index">
                      {VARIABLE_OPTIONS.filter(o => o.category === 'general').map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </optgroup>
                    <optgroup label="Factors">
                      {VARIABLE_OPTIONS.filter(o => o.category === 'factor').map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </optgroup>
                    {SUBFACTOR_GROUPS.map(group => (
                      <optgroup key={group.category} label={group.label}>
                        {VARIABLE_OPTIONS.filter(o => o.category === group.category).map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                      </optgroup>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Current Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={cardHeatmapYear} onChange={(e) => setCardHeatmapYear(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {AVAILABLE_YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Compare to Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={cardHeatmapBaseYear} onChange={(e) => setCardHeatmapBaseYear(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {AVAILABLE_YEARS
                      .filter(year => parseInt(year, 10) <= parseInt(cardHeatmapYear, 10))
                      .slice()
                      .reverse()
                      .map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8f7f4', borderRadius: '6px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: COLORS.muted, margin: 0, lineHeight: 1.5 }}>
                  Card-based visualization showing scores for each country. Cards are colored by performance and show change from the comparison year.
                </p>
              </div>
            </>
          )}

          {/* Country Change Heatmap Controls */}
          {chartType === 'countrychange' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Region</label>
                <div style={{ position: 'relative' }}>
                  <select value={countryChangeRegion} onChange={(e) => { setCountryChangeRegion(e.target.value); setCountryChangeCountry(e.target.value === 'global' ? '__region_global' : `__region_${e.target.value}`); }} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {REGION_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Country</label>
                <div style={{ position: 'relative' }}>
                  <select value={countryChangeCountry} onChange={(e) => setCountryChangeCountry(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    <option value={countryChangeRegion === 'global' ? '__region_global' : `__region_${countryChangeRegion}`}>
                      {countryChangeRegion === 'global' ? 'Global Average' : `${REGION_OPTIONS.find(r => r.value === countryChangeRegion)?.label || countryChangeRegion} Average`}
                    </option>
                    {getCountriesForRegionYear(metadata, countryChangeRegion, countryChangeYear).map(c => (<option key={c} value={c}>{c}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Factor</label>
                <div style={{ position: 'relative' }}>
                  <select value={countryChangeFactor} onChange={(e) => setCountryChangeFactor(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {VARIABLE_OPTIONS.filter(o => o.category === 'factor').map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Current Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={countryChangeYear} onChange={(e) => setCountryChangeYear(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {AVAILABLE_YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Compare to Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={countryChangeBaseYear} onChange={(e) => setCountryChangeBaseYear(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {AVAILABLE_YEARS
                      .filter(year => parseInt(year, 10) <= parseInt(countryChangeYear, 10))
                      .slice()
                      .reverse()
                      .map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8f7f4', borderRadius: '6px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: COLORS.muted, margin: 0, lineHeight: 1.5 }}>
                  See how a country's subfactors changed over time within a specific factor. Cards show percentage change for each subfactor.
                </p>
              </div>
            </>
          )}

          {/* Ranking Table Controls */}
          {chartType === 'ranking' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Region</label>
                <div style={{ position: 'relative' }}>
                  <select value={rankingRegion} onChange={(e) => setRankingRegion(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {REGION_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Variable</label>
                <div style={{ position: 'relative' }}>
                  <select value={rankingVariable} onChange={(e) => setRankingVariable(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {VARIABLE_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={rankingYear} onChange={(e) => setRankingYear(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {AVAILABLE_YEARS.map(year => (<option key={year} value={year}>{year}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Compare to Year</label>
                <div style={{ position: 'relative' }}>
                  <select value={rankingBaseYear} onChange={(e) => setRankingBaseYear(e.target.value)} style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}>
                    {AVAILABLE_YEARS.filter(y => y !== rankingYear).slice().reverse().map(year => (<option key={year} value={year}>{year}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f8f7f4', borderRadius: '6px', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: COLORS.muted, margin: 0, lineHeight: 1.5 }}>
                  View country rankings by score. Shows regional rank, global rank, and rank change compared to the selected base year.
                </p>
              </div>
            </>
          )}

          {/* Radar Controls */}
          {chartType === 'radar' && (
            <>
              {/* Region Dropdown */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Region</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedRadarEntity.startsWith('__region_') ? selectedRadarEntity.replace('__region_', '') : (() => {
                      // Find the region of the selected country
                      return getCountryRegion(metadata, selectedRadarEntity) || 'global';
                    })()}
                    onChange={(e) => {
                      const region = e.target.value;
                      if (region === 'global') {
                        setSelectedRadarEntity('__region_global');
                      } else {
                        setSelectedRadarEntity(`__region_${region}`);
                      }
                    }}
                    style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}
                  >
                    {REGION_OPTIONS.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
                  </select>
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>

              {/* Country Dropdown */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Country</label>
                <div style={{ position: 'relative' }}>
                  {(() => {
                    const currentRegion = selectedRadarEntity.startsWith('__region_')
                      ? selectedRadarEntity.replace('__region_', '')
                      : (() => {
                          return getCountryRegion(metadata, selectedRadarEntity) || 'global';
                        })();
                    const radarCountries = getCountriesForRegionYear(metadata, currentRegion, '2025');

                    return (
                      <select
                        value={selectedRadarEntity}
                        onChange={(e) => setSelectedRadarEntity(e.target.value)}
                        style={{ width: '100%', padding: '12px 40px 12px 12px', fontSize: '15px', fontWeight: '500', color: COLORS.primary, border: '1px solid #e5e5e5', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', appearance: 'none', outline: 'none' }}
                      >
                        <option value={currentRegion === 'global' ? '__region_global' : `__region_${currentRegion}`}>
                          {currentRegion === 'global' ? 'Global Average' : `${REGION_OPTIONS.find(r => r.value === currentRegion)?.label || currentRegion} Average`}
                        </option>
                        {radarCountries.map(c => (<option key={c} value={c}>{c}</option>))}
                      </select>
                    );
                  })()}
                  <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '36px', backgroundColor: COLORS.primary, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ color: 'white', fontSize: '10px' }}>▼</span>
                  </div>
                </div>
              </div>

              {/* Years Section - Collapsible with two columns, multiple selection */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  onClick={() => setRadarYearsExpanded(!radarYearsExpanded)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: radarYearsExpanded ? '12px' : '0' }}
                >
                  <label style={{ fontSize: '11px', fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer' }}>Years</label>
                  <span style={{ fontSize: '16px', color: COLORS.primary, fontWeight: '300' }}>{radarYearsExpanded ? '−' : '+'}</span>
                </div>
                {radarYearsExpanded && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                    {['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'].map(year => (
                      <label key={year} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedRadarYears.includes(year)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRadarYears([...selectedRadarYears, year].sort());
                            } else if (selectedRadarYears.length > 1) {
                              setSelectedRadarYears(selectedRadarYears.filter(y => y !== year));
                            }
                          }}
                          style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: COLORS.primary }}
                        />
                        <span style={{ fontSize: '13px', color: COLORS.text }}>{year}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Factors & Subfactors Section - Collapsible */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  onClick={() => setRadarFactorsExpanded(!radarFactorsExpanded)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: radarFactorsExpanded ? '12px' : '0' }}
                >
                  <label style={{ fontSize: '11px', fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer' }}>Factors & Subfactors</label>
                  <span style={{ fontSize: '16px', color: COLORS.primary, fontWeight: '300' }}>{radarFactorsExpanded ? '−' : '+'}</span>
                </div>
                {radarFactorsExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Overall Index */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '4px' }}>
                      <input
                        type="checkbox"
                        checked={selectedRadarFactors.includes('roli')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRadarFactors([...selectedRadarFactors, 'roli']);
                          } else if (selectedRadarFactors.length > 3) {
                            setSelectedRadarFactors(selectedRadarFactors.filter(f => f !== 'roli'));
                          }
                        }}
                        disabled={!selectedRadarFactors.includes('roli') && selectedRadarFactors.length < 3}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: COLORS.primary }}
                      />
                      <span style={{ fontSize: '14px', color: COLORS.primary, fontWeight: '600' }}>WJP Rule of Law Index: Overall Score</span>
                    </label>

                    {/* Factors with expandable subfactors */}
                    {SUBFACTOR_GROUPS.map((group, groupIndex) => {
                      const factorKey = `f${groupIndex + 1}`;
                      const factorLabel = VARIABLE_OPTIONS.find(v => v.value === factorKey)?.label || factorKey;
                      const subfactors = VARIABLE_OPTIONS.filter(v => v.category === group.category);
                      const isExpanded = expandedRadarFactorGroups[factorKey];
                      const isFactorSelected = selectedRadarFactors.includes(factorKey);

                      return (
                        <div key={factorKey}>
                          {/* Factor Header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isExpanded ? '8px' : '0' }}>
                            <input
                              type="checkbox"
                              checked={isFactorSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRadarFactors([...selectedRadarFactors, factorKey]);
                                } else if (selectedRadarFactors.length > 3) {
                                  setSelectedRadarFactors(selectedRadarFactors.filter(f => f !== factorKey));
                                }
                              }}
                              disabled={!isFactorSelected && selectedRadarFactors.length < 3}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: COLORS.primary }}
                            />
                            <span
                              onClick={() => setExpandedRadarFactorGroups({ ...expandedRadarFactorGroups, [factorKey]: !isExpanded })}
                              style={{ flex: 1, fontSize: '14px', color: COLORS.primary, fontWeight: '500', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              {factorLabel.replace(/^F\d+ - /, '')}
                            </span>
                            <span
                              onClick={() => setExpandedRadarFactorGroups({ ...expandedRadarFactorGroups, [factorKey]: !isExpanded })}
                              style={{ fontSize: '14px', color: COLORS.primary, cursor: 'pointer', fontWeight: '300' }}
                            >
                              {isExpanded ? '−' : '+'}
                            </span>
                          </div>

                          {/* Subfactors */}
                          {isExpanded && (
                            <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                              {subfactors.map(sf => {
                                const isSelected = selectedRadarFactors.includes(sf.value);
                                return (
                                  <label key={sf.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRadarFactors([...selectedRadarFactors, sf.value]);
                                        } else if (selectedRadarFactors.length > 3) {
                                          setSelectedRadarFactors(selectedRadarFactors.filter(f => f !== sf.value));
                                        }
                                      }}
                                      disabled={!isSelected && selectedRadarFactors.length < 3}
                                      style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: COLORS.primary }}
                                    />
                                    <span style={{ fontSize: '13px', color: COLORS.text }}>{sf.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Area - Chart */}
        <div className="chart-area" style={{ flex: 1, minWidth: 0 }}>
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <p style={{ fontSize: '16px', color: COLORS.muted }}>Loading chart...</p>
            </div>
          }>
            {chartType === 'topbottom' && <TopBottomChart allData={allData} averages={averages} selectedRegion={selectedRegion} selectedYear={selectedYear} variable={selectedVariable} label={selectedLabel} regionLabel={regionLabel} />}
            {chartType === 'timeseries' && timeSeriesSeries.length > 0 && (
              <TimeSeriesChart
                series={timeSeriesSeries}
                label={timeSeriesMode === 'countries' ? selectedLabel : 'Time Series'}
                subtitle={timeSeriesSubtitle}
                variable={timeSeriesMode === 'countries' ? selectedVariable : timeSeriesCountry}
                referenceSeries={timeSeriesReferenceSeries}
                yearRange={yearRange}
              />
            )}
            {chartType === 'factors' && (
              <FactorComparisonChart
                allData={allData}
                averages={averages}
                selectedRegion={selectedRegion}
                selectedYear={selectedYear}
                availableCountries={availableCountries}
                selectedCountries={factorCompareCountries}
              />
            )}
            {chartType === 'radar' && (
              <RadarChartView
                allData={allData}
                averages={averages}
                selectedEntity={selectedRadarEntity}
                selectedYears={selectedRadarYears}
                selectedFactors={selectedRadarFactors}
              />
            )}
            {chartType === 'profile' && (
              <CountryProfileChart
                allData={allData}
                averages={averages}
                selectedRegion={selectedProfileRegion}
                selectedCountry={selectedProfileCountry}
                selectedYear={ACTIVE_YEAR}
              />
            )}
            {chartType === 'heatmap' && (
              <HumanRightsHeatmap
                allData={allData}
                selectedYear={heatmapYear}
                selectedRegion={heatmapRegion}
                selectedFactors={heatmapFactors}
              />
            )}
            {chartType === 'cardheatmap' && (
              <CardHeatmap
                allData={allData}
                selectedYear={cardHeatmapYear}
                baseYear={cardHeatmapBaseYear}
                selectedRegion={cardHeatmapRegion}
                selectedVariable={cardHeatmapVariable}
              />
            )}
            {chartType === 'countrychange' && (
              <CountryChangeHeatmap
                allData={allData}
                averages={averages}
                selectedCountry={countryChangeCountry}
                selectedFactor={countryChangeFactor}
                selectedYear={countryChangeYear}
                baseYear={countryChangeBaseYear}
              />
            )}
            {chartType === 'ranking' && (
              <RankingTable
                allData={allData}
                selectedYear={rankingYear}
                baseYear={rankingBaseYear}
                selectedRegion={rankingRegion}
                selectedVariable={rankingVariable}
                variableLabel={VARIABLE_OPTIONS.find(opt => opt.value === rankingVariable)?.label || rankingVariable}
              />
            )}
          </Suspense>
        </div>
      </div>{/* Close dashboard-main-layout */}

      {/* Footer */}
      <div className="dashboard-footer" style={{ maxWidth: '1100px', margin: '40px auto 0', textAlign: 'center', paddingBottom: '40px' }}>
        <p style={{ fontSize: '13px', color: COLORS.muted, marginBottom: '8px' }}>
          Source: World Justice Project — Rule of Law Index® {
            chartType === 'timeseries' ? `${yearRange[0]}–${yearRange[1]}` :
            chartType === 'radar' ? [...selectedRadarYears].sort().join(', ') :
            chartType === 'profile' ? ACTIVE_YEAR :
            chartType === 'factors' ? selectedYear :
            chartType === 'heatmap' ? heatmapYear :
            chartType === 'cardheatmap' ? `${cardHeatmapBaseYear}–${cardHeatmapYear}` :
            chartType === 'countrychange' ? `${countryChangeBaseYear}–${countryChangeYear}` :
            chartType === 'ranking' ? `${rankingBaseYear}–${rankingYear}` :
            selectedYear
          }
        </p>
        <p style={{ fontSize: '12px', color: COLORS.muted }}>
          © {new Date().getFullYear()} World Justice Project. All rights reserved.
        </p>
      </div>
      </div>{/* Close main content padding div */}
    </div>
  );
}
