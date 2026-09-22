import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { COLORS, VARIABLE_OPTIONS } from '../config';
import { getEmbeddedFontCSS, filterByRegion, getChangeColor, getChangeArrow, getChangeSortBucket } from '../utils';

export default function CardHeatmap({
  allData,
  selectedYear = '2025',
  baseYear = '2015',
  selectedRegion = 'global',
  selectedVariable = 'roli'
}) {
  // Get variable label
  const variableLabel = useMemo(() => {
    const option = VARIABLE_OPTIONS.find(v => v.value === selectedVariable);
    return option ? option.label : selectedVariable;
  }, [selectedVariable]);

  // Get region label
  const regionLabel = selectedRegion === 'global' ? 'Global' : selectedRegion;

  // Process data for the card heatmap
  const cardData = useMemo(() => {
    // Filter by year and region
    const currentYearData = filterByRegion(
      allData.filter(d => d.year === selectedYear),
      selectedRegion
    );

    const result = [];

    currentYearData.forEach(current => {
      const baseData = allData.find(d => d.country === current.country && d.year === baseYear);
      const currentValue = current[selectedVariable];
      const baseValue = baseData ? baseData[selectedVariable] : null;
      const precomputedComparison = current.comparisons?.[baseYear]?.[selectedVariable];
      const changeAbsolute = Array.isArray(precomputedComparison)
        ? precomputedComparison[0]
        : currentValue !== null && baseValue !== null
          ? currentValue - baseValue
          : null;
      const change = Array.isArray(precomputedComparison)
        ? precomputedComparison[1]
        : currentValue !== null && baseValue !== null && baseValue !== 0
          ? (currentValue - baseValue) / baseValue
          : null;

      result.push({
        country: current.country,
        region: current.region,
        value: currentValue,
        baseValue,
        change,
        changeAbsolute
      });
    });

    // Sort by change: biggest improvements first, then neutral, then declines.
    result.sort((a, b) => {
      const changeA = a.change !== null ? a.change * 100 : null;
      const changeB = b.change !== null ? b.change * 100 : null;
      const bucketA = getChangeSortBucket(changeA);
      const bucketB = getChangeSortBucket(changeB);

      if (bucketA !== bucketB) return bucketA - bucketB;

      if (changeA === null && changeB === null) return a.country.localeCompare(b.country);
      if (changeA === null) return 1;
      if (changeB === null) return -1;
      if (changeA !== changeB) return changeB - changeA;

      return a.country.localeCompare(b.country);
    });

    return result;
  }, [allData, selectedYear, baseYear, selectedRegion, selectedVariable]);

  // Download SVG function
  const downloadSVG = async () => {
    const fontCSS = await getEmbeddedFontCSS();

    const cardWidth = 180;
    const cardHeight = 100;
    const cardGap = 16;
    const padding = 24;
    const headerHeight = 80;
    const legendHeight = 60;
    const cardsPerRow = 5;

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
      <text x="${width/2}" y="32" text-anchor="middle" font-size="18" font-weight="700" fill="${COLORS.primary}">${variableLabel}</text>
      <text x="${width/2}" y="54" text-anchor="middle" font-size="13" fill="${COLORS.muted}">${regionLabel} — Change from ${baseYear} to ${selectedYear}</text>
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

      // Country name
      const countryName = item.country.length > 20 ? item.country.substring(0, 18) + '...' : item.country;
      svg += `<text x="${x + 12}" y="${y + 28}" font-size="12" font-weight="600" fill="${COLORS.text}">${countryName}</text>`;

      // Percentage change
      const changeText = changePercent !== null
        ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`
        : '—';
      svg += `<text x="${x + 12}" y="${y + 55}" font-size="22" font-weight="700" fill="${colors.text}">${changeText}</text>`;
      svg += `<text x="${x + 95}" y="${y + 55}" font-size="16" fill="${colors.text}">${arrow}</text>`;

      // Score details
      svg += `<text x="${x + 12}" y="${y + 78}" font-size="10" fill="${COLORS.muted}">${baseYear}:</text>`;
      svg += `<text x="${x + 40}" y="${y + 78}" font-size="11" font-weight="700" fill="${COLORS.text}">${item.baseValue !== null ? item.baseValue.toFixed(2) : '—'}</text>`;
      svg += `<text x="${x + cardWidth - 46}" y="${y + 78}" text-anchor="end" font-size="10" fill="${COLORS.muted}">${selectedYear}:</text>`;
      svg += `<text x="${x + cardWidth - 12}" y="${y + 78}" text-anchor="end" font-size="11" font-weight="700" fill="${COLORS.text}">${item.value !== null ? item.value.toFixed(2) : '—'}</text>`;
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

    // Arrow legend
    svg += `<text x="${padding + 360}" y="${legendY}" font-size="10" fill="#181878">↑↑ +10%+</text>`;
    svg += `<text x="${padding + 420}" y="${legendY}" font-size="10" fill="#7272BC">↑ Improved</text>`;
    svg += `<text x="${padding + 500}" y="${legendY}" font-size="10" fill="${COLORS.muted}">→ Stable</text>`;
    svg += `<text x="${padding + 560}" y="${legendY}" font-size="10" fill="#EB6975">↓ Declined</text>`;
    svg += `<text x="${padding + 640}" y="${legendY}" font-size="10" fill="#C41229">↓↓ -10%+</text>`;

    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `card-heatmap-change-${selectedVariable}-${selectedRegion}-${baseYear}-to-${selectedYear}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e5e5', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: COLORS.primary }}>
            {variableLabel}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: COLORS.muted }}>
            {regionLabel} — Change from {baseYear} to {selectedYear}
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px'
      }}>
        {cardData.map((item) => {
          const changePercent = item.change !== null ? item.change * 100 : null;
          const colors = getChangeColor(changePercent);
          const arrow = getChangeArrow(changePercent);

          return (
            <div
              key={item.country}
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
                {/* Country name */}
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: COLORS.text,
                  marginBottom: '8px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.country}
                </div>

                {/* Percentage Change - Main Value */}
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                  marginBottom: '8px'
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

CardHeatmap.propTypes = {
  allData: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedYear: PropTypes.string,
  baseYear: PropTypes.string,
  selectedRegion: PropTypes.string,
  selectedVariable: PropTypes.string
};
