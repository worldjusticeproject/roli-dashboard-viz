import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { COLORS, FACTOR_COLORS, FACTOR_SHORT_LABELS, SUBFACTOR_SHORT_LABELS } from '../config';
import { getEmbeddedFontCSS, getChangeColor, getChangeArrow, getChangeSortBucket } from '../utils';

// Factor structure with their subfactors
const FACTOR_STRUCTURE = {
  f1: ['sf11', 'sf12', 'sf13', 'sf14', 'sf15', 'sf16'],
  f2: ['sf21', 'sf22', 'sf23', 'sf24'],
  f3: ['sf31', 'sf32', 'sf33', 'sf34'],
  f4: ['sf41', 'sf42', 'sf43', 'sf44', 'sf45', 'sf46', 'sf47', 'sf48'],
  f5: ['sf51', 'sf52', 'sf53'],
  f6: ['sf61', 'sf62', 'sf63', 'sf64', 'sf65'],
  f7: ['sf71', 'sf72', 'sf73', 'sf74', 'sf75', 'sf76', 'sf77'],
  f8: ['sf81', 'sf82', 'sf83', 'sf84', 'sf85', 'sf86', 'sf87'],
};

export default function CountryChangeHeatmap({
  allData,
  averages,
  selectedCountry = '__region_global',
  selectedFactor = 'f1',
  selectedYear = '2025',
  baseYear = '2015'
}) {
  // Get country/region label
  const entityLabel = useMemo(() => {
    if (selectedCountry === '__region_global') return 'Global Average';
    if (selectedCountry.startsWith('__region_')) {
      return `${selectedCountry.replace('__region_', '')} Average`;
    }
    return selectedCountry;
  }, [selectedCountry]);

  // Get factor label and color
  const factorLabel = FACTOR_SHORT_LABELS[selectedFactor] || selectedFactor;
  const factorColor = FACTOR_COLORS[selectedFactor] || COLORS.primary;

  // Get subfactors for the selected factor
  const subfactors = useMemo(() => {
    return FACTOR_STRUCTURE[selectedFactor] || [];
  }, [selectedFactor]);

  // Process data for the cards
  const cardData = useMemo(() => {
    const result = [];

    // Get current year data
    let currentData = null;
    let baseData = null;

    if (selectedCountry === '__region_global') {
      // Global average
      currentData = averages?.global?.[selectedYear] || null;
      baseData = averages?.global?.[baseYear] || null;
    } else if (selectedCountry.startsWith('__region_')) {
      // Regional average
      const regionName = selectedCountry.replace('__region_', '');
      currentData = averages?.regions?.[regionName]?.[selectedYear] || null;
      baseData = averages?.regions?.[regionName]?.[baseYear] || null;
    } else {
      // Specific country
      currentData = allData.find(d => d.country === selectedCountry && d.year === selectedYear) || null;
      baseData = allData.find(d => d.country === selectedCountry && d.year === baseYear) || null;
    }

    if (!currentData) {
      return [];
    }

    // Calculate change for each subfactor
    subfactors.forEach(sf => {
      const currentValue = currentData[sf];
      const baseValue = baseData ? baseData[sf] : null;

      let change = null;
      let changeAbsolute = null;

      if (currentValue != null && baseValue != null && baseValue !== 0) {
        changeAbsolute = currentValue - baseValue;
        change = changeAbsolute / baseValue;
      }

      result.push({
        key: sf,
        label: SUBFACTOR_SHORT_LABELS[sf] || sf,
        value: currentValue,
        baseValue,
        change,
        changeAbsolute
      });
    });

    // Sort by change: biggest improvements first, then neutral, then declines
    result.sort((a, b) => {
      const changeA = a.change !== null ? a.change * 100 : null;
      const changeB = b.change !== null ? b.change * 100 : null;
      const bucketA = getChangeSortBucket(changeA);
      const bucketB = getChangeSortBucket(changeB);

      if (bucketA !== bucketB) return bucketA - bucketB;

      if (changeA === null && changeB === null) return 0;
      if (changeA === null) return 1;
      if (changeB === null) return -1;
      if (changeA !== changeB) return changeB - changeA;

      return 0;
    });

    return result;
  }, [allData, averages, selectedCountry, selectedYear, baseYear, subfactors]);

  // Also calculate the factor-level change
  const factorChange = useMemo(() => {
    let currentData = null;
    let baseData = null;

    if (selectedCountry === '__region_global') {
      currentData = averages?.global?.[selectedYear] || null;
      baseData = averages?.global?.[baseYear] || null;
    } else if (selectedCountry.startsWith('__region_')) {
      const regionName = selectedCountry.replace('__region_', '');
      currentData = averages?.regions?.[regionName]?.[selectedYear] || null;
      baseData = averages?.regions?.[regionName]?.[baseYear] || null;
    } else {
      currentData = allData.find(d => d.country === selectedCountry && d.year === selectedYear) || null;
      baseData = allData.find(d => d.country === selectedCountry && d.year === baseYear) || null;
    }

    if (!currentData || !baseData) return null;

    const currentValue = currentData[selectedFactor];
    const baseValue = baseData[selectedFactor];

    if (currentValue == null || baseValue == null || baseValue === 0) return null;

    return {
      value: currentValue,
      baseValue,
      change: ((currentValue - baseValue) / baseValue) * 100
    };
  }, [allData, averages, selectedCountry, selectedFactor, selectedYear, baseYear]);

  // Download SVG function
  const downloadSVG = async () => {
    const fontCSS = await getEmbeddedFontCSS();

    const cardWidth = 220;
    const cardHeight = 110;
    const cardGap = 16;
    const padding = 24;
    const headerHeight = 100;
    const legendHeight = 60;
    const cardsPerRow = Math.min(4, cardData.length);

    const rows = Math.ceil(cardData.length / cardsPerRow);
    const width = padding * 2 + cardsPerRow * cardWidth + (cardsPerRow - 1) * cardGap;
    const height = headerHeight + rows * cardHeight + (rows - 1) * cardGap + legendHeight + padding * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>
        ${fontCSS}
        text { font-family: 'Inter Tight', sans-serif; }
      </style>
      <rect width="100%" height="100%" fill="white"/>

      <!-- Title -->
      <text x="${width/2}" y="28" text-anchor="middle" font-size="18" font-weight="700" fill="${COLORS.text}">${entityLabel}</text>
      <text x="${width/2}" y="50" text-anchor="middle" font-size="14" font-weight="600" fill="${factorColor}">${factorLabel}</text>
      <text x="${width/2}" y="72" text-anchor="middle" font-size="13" fill="${COLORS.muted}">Change from ${baseYear} to ${selectedYear}</text>
    `;

    // Draw cards
    cardData.forEach((item, index) => {
      const col = index % cardsPerRow;
      const row = Math.floor(index / cardsPerRow);
      const x = padding + col * (cardWidth + cardGap);
      const y = headerHeight + row * (cardHeight + cardGap);

      const changePercent = item.change !== null ? item.change * 100 : null;
      const colors = getChangeColor(changePercent);
      const arrow = getChangeArrow(changePercent);

      // Card background with rounded corners
      svg += `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="8" fill="${colors.bg}" stroke="#e5e5e5" stroke-width="1"/>`;

      // Color accent bar at top
      svg += `<rect x="${x}" y="${y}" width="${cardWidth}" height="6" rx="8" fill="${colors.accent}"/>`;
      svg += `<rect x="${x}" y="${y + 4}" width="${cardWidth}" height="4" fill="${colors.accent}"/>`;

      // Subfactor name (may need truncation)
      const subfactorName = item.label.length > 35 ? item.label.substring(0, 33) + '...' : item.label;
      svg += `<text x="${x + 12}" y="${y + 28}" font-size="11" font-weight="600" fill="${COLORS.text}">${subfactorName}</text>`;

      // Percentage change
      const changeText = changePercent !== null
        ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`
        : '—';
      svg += `<text x="${x + 12}" y="${y + 60}" font-size="24" font-weight="700" fill="${colors.text}">${changeText}</text>`;
      svg += `<text x="${x + 115}" y="${y + 60}" font-size="18" fill="${colors.text}">${arrow}</text>`;

      // Score details
      svg += `<text x="${x + 12}" y="${y + 88}" font-size="10" fill="${COLORS.muted}">${baseYear}:</text>`;
      svg += `<text x="${x + 40}" y="${y + 88}" font-size="11" font-weight="700" fill="${COLORS.text}">${item.baseValue !== null ? item.baseValue.toFixed(2) : '—'}</text>`;
      svg += `<text x="${x + cardWidth - 46}" y="${y + 88}" text-anchor="end" font-size="10" fill="${COLORS.muted}">${selectedYear}:</text>`;
      svg += `<text x="${x + cardWidth - 12}" y="${y + 88}" text-anchor="end" font-size="11" font-weight="700" fill="${COLORS.text}">${item.value !== null ? item.value.toFixed(2) : '—'}</text>`;
    });

    // Legend
    const legendY = headerHeight + rows * cardHeight + (rows - 1) * cardGap + 30;
    svg += `<text x="${padding}" y="${legendY}" font-size="11" font-weight="600" fill="${COLORS.muted}">Change:</text>`;

    // Legend items
    svg += `<rect x="${padding + 60}" y="${legendY - 10}" width="20" height="14" rx="2" fill="#FDEDEE" stroke="#EB6975" stroke-width="1"/>`;
    svg += `<text x="${padding + 85}" y="${legendY}" font-size="10" fill="#C41229">Declined</text>`;

    svg += `<rect x="${padding + 145}" y="${legendY - 10}" width="20" height="14" rx="2" fill="#f5f5f5" stroke="#bdbdbd" stroke-width="1"/>`;
    svg += `<text x="${padding + 170}" y="${legendY}" font-size="10" fill="${COLORS.muted}">No change</text>`;

    svg += `<rect x="${padding + 245}" y="${legendY - 10}" width="20" height="14" rx="2" fill="#EEEEF7" stroke="#7272BC" stroke-width="1"/>`;
    svg += `<text x="${padding + 270}" y="${legendY}" font-size="10" fill="#181878">Improved</text>`;

    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeEntityLabel = entityLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    a.download = `country-change-${safeEntityLabel}-${selectedFactor}-${baseYear}-to-${selectedYear}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (cardData.length === 0) {
    return (
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e5e5', padding: '40px', textAlign: 'center' }}>
        <p style={{ color: COLORS.muted }}>No data available for this selection.</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e5e5', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: COLORS.text }}>
            {entityLabel}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '600', color: factorColor }}>
            {factorLabel}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: COLORS.muted }}>
            Change from {baseYear} to {selectedYear}
            {factorChange && (
              <span style={{
                marginLeft: '12px',
                fontWeight: '600',
                color: Math.abs(factorChange.change) < 1 ? COLORS.muted : factorChange.change > 0 ? '#181878' : '#C41229'
              }}>
                Factor: {factorChange.change > 0 ? '+' : ''}{factorChange.change.toFixed(1)}%
                <span style={{ fontWeight: '400', marginLeft: '8px' }}>
                  ({factorChange.baseValue.toFixed(2)} → {factorChange.value.toFixed(2)})
                </span>
              </span>
            )}
          </p>
        </div>
        <button
          onClick={downloadSVG}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            color: COLORS.primary,
            backgroundColor: 'white',
            border: `1px solid ${COLORS.primary}`,
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Download SVG
        </button>
      </div>

      {/* Card Grid */}
      <div style={{
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {cardData.map((item) => {
          const changePercent = item.change !== null ? item.change * 100 : null;
          const colors = getChangeColor(changePercent);
          const arrow = getChangeArrow(changePercent);

          return (
            <div
              key={item.key}
              style={{
                backgroundColor: colors.bg,
                borderRadius: '12px',
                padding: '0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e8e8e8',
                overflow: 'hidden',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              {/* Color accent bar */}
              <div style={{
                height: '6px',
                backgroundColor: colors.accent,
                width: '100%'
              }} />

              <div style={{ padding: '14px 16px' }}>
                {/* Subfactor name */}
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: COLORS.text,
                  marginBottom: '10px',
                  lineHeight: '1.3',
                  minHeight: '32px'
                }}>
                  {item.label}
                </div>

                {/* Percentage Change - Main Value */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                  marginBottom: '10px'
                }}>
                  <span style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: colors.text,
                    lineHeight: 1
                  }}>
                    {changePercent !== null
                      ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`
                      : '—'}
                  </span>
                  <span style={{
                    fontSize: '18px',
                    color: colors.text
                  }}>
                    {arrow}
                  </span>
                </div>

                {/* Score details */}
                <div style={{
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: COLORS.muted }}>
                    {baseYear}: <span style={{ fontWeight: '700', color: COLORS.text }}>{item.baseValue !== null ? item.baseValue.toFixed(2) : '—'}</span>
                  </span>
                  <span style={{ color: COLORS.muted }}>
                    {selectedYear}: <span style={{ fontWeight: '700', color: COLORS.text }}>{item.value !== null ? item.value.toFixed(2) : '—'}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #e5e5e5',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        alignItems: 'center',
        backgroundColor: '#f8f7f4'
      }}>
        {/* Color scale for change */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: COLORS.muted }}>Change ({baseYear}→{selectedYear}):</span>

          {/* Negative side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '24px', height: '16px', backgroundColor: '#FDEDEE', borderRadius: '3px', border: '1px solid #EB6975' }} />
            <span style={{ fontSize: '11px', color: '#C41229', fontWeight: '500' }}>Declined</span>
          </div>

          {/* Neutral */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '24px', height: '16px', backgroundColor: '#f5f5f5', borderRadius: '3px', border: '1px solid #bdbdbd' }} />
            <span style={{ fontSize: '11px', color: COLORS.muted, fontWeight: '500' }}>No change</span>
          </div>

          {/* Positive side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '24px', height: '16px', backgroundColor: '#EEEEF7', borderRadius: '3px', border: '1px solid #7272BC' }} />
            <span style={{ fontSize: '11px', color: '#181878', fontWeight: '500' }}>Improved</span>
          </div>
        </div>

        {/* Arrow indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#181878' }}>↑↑ +10%+</span>
          <span style={{ fontSize: '12px', color: '#7272BC' }}>↑ +1% to +10%</span>
          <span style={{ fontSize: '12px', color: COLORS.muted }}>→ ±1%</span>
          <span style={{ fontSize: '12px', color: '#EB6975' }}>↓ -1% to -10%</span>
          <span style={{ fontSize: '12px', color: '#C41229' }}>↓↓ -10%+</span>
        </div>
      </div>
    </div>
  );
}

CountryChangeHeatmap.propTypes = {
  allData: PropTypes.arrayOf(PropTypes.object).isRequired,
  averages: PropTypes.shape({
    global: PropTypes.object,
    regions: PropTypes.object,
  }),
  selectedCountry: PropTypes.string,
  selectedFactor: PropTypes.string,
  selectedYear: PropTypes.string,
  baseYear: PropTypes.string
};
