import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { COLORS } from '../config';
import { getEmbeddedFontCSS, filterByRegion } from '../utils';

// Sort directions
const SORT_ASC = 'asc';
const SORT_DESC = 'desc';

export default function RankingTable({
  allData,
  selectedYear = '2025',
  baseYear = '2015',
  selectedRegion = 'global',
  selectedVariable = 'roli',
  variableLabel = 'Overall Score'
}) {
  // Sort state
  const [sortField, setSortField] = useState('rank');
  const [sortDirection, setSortDirection] = useState(SORT_ASC);

  // Get region label
  const regionLabel = selectedRegion === 'global' ? 'Global' : selectedRegion;

  // Process data for the ranking table
  const rankingData = useMemo(() => {
    // Filter by year and region
    const currentYearData = filterByRegion(
      allData.filter(d => d.year === selectedYear),
      selectedRegion
    );

    // Calculate global rankings for both years (to show rank change)
    const allCurrentYear = allData.filter(d => d.year === selectedYear);
    const allBaseYear = allData.filter(d => d.year === baseYear);

    // Sort globally to get true rankings
    const sortedCurrent = [...allCurrentYear]
      .filter(d => d[selectedVariable] != null)
      .sort((a, b) => b[selectedVariable] - a[selectedVariable]);

    const sortedBase = [...allBaseYear]
      .filter(d => d[selectedVariable] != null)
      .sort((a, b) => b[selectedVariable] - a[selectedVariable]);

    // Create rank maps
    const currentRankMap = new Map();
    sortedCurrent.forEach((d, i) => currentRankMap.set(d.country, i + 1));

    const baseRankMap = new Map();
    sortedBase.forEach((d, i) => baseRankMap.set(d.country, i + 1));

    // Build result array
    const result = currentYearData
      .filter(d => d[selectedVariable] != null)
      .map(current => {
        const globalRank = currentRankMap.get(current.country) || null;
        const baseRank = baseRankMap.get(current.country) || null;
        const rankChange = (baseRank && globalRank) ? baseRank - globalRank : null;

        return {
          country: current.country,
          region: current.region,
          score: current[selectedVariable],
          globalRank,
          rankChange
        };
      });

    // Sort within region by score to get regional rank
    result.sort((a, b) => b.score - a.score);
    result.forEach((item, index) => {
      item.regionalRank = index + 1;
    });

    return result;
  }, [allData, selectedYear, baseYear, selectedRegion, selectedVariable]);

  // Sorted data based on current sort state
  const sortedData = useMemo(() => {
    const data = [...rankingData];

    data.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'rank':
          aVal = a.regionalRank;
          bVal = b.regionalRank;
          break;
        case 'country':
          aVal = a.country.toLowerCase();
          bVal = b.country.toLowerCase();
          break;
        case 'score':
          aVal = a.score;
          bVal = b.score;
          break;
        case 'globalRank':
          aVal = a.globalRank || 999;
          bVal = b.globalRank || 999;
          break;
        case 'change':
          aVal = a.rankChange || 0;
          bVal = b.rankChange || 0;
          break;
        default:
          aVal = a.regionalRank;
          bVal = b.regionalRank;
      }

      if (typeof aVal === 'string') {
        return sortDirection === SORT_ASC
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === SORT_ASC ? aVal - bVal : bVal - aVal;
    });

    return data;
  }, [rankingData, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === SORT_ASC ? SORT_DESC : SORT_ASC);
    } else {
      setSortField(field);
      // Default sort direction based on field
      setSortDirection(field === 'country' ? SORT_ASC : (field === 'change' ? SORT_DESC : SORT_ASC));
    }
  };

  // Get sort indicator
  const getSortIndicator = (field) => {
    if (sortField !== field) return '';
    return sortDirection === SORT_ASC ? ' ▲' : ' ▼';
  };

  // Get rank change display
  const getRankChangeDisplay = (change) => {
    if (change === null) return { text: '—', color: COLORS.muted };
    if (change > 0) return { text: `▲${change}`, color: '#181878' };
    if (change < 0) return { text: `▼${Math.abs(change)}`, color: '#C41229' };
    return { text: '—', color: COLORS.muted };
  };

  // Download SVG function
  const downloadSVG = async () => {
    const fontCSS = await getEmbeddedFontCSS();

    const rowHeight = 32;
    const headerHeight = 80;
    const tableHeaderHeight = 36;
    const padding = 24;
    const legendHeight = 40;

    // Column widths
    const colWidths = {
      rank: 50,
      country: 180,
      score: 80,
      globalRank: 100,
      change: 80
    };
    const totalWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

    const width = totalWidth + padding * 2;
    const height = headerHeight + tableHeaderHeight + (sortedData.length * rowHeight) + legendHeight + padding * 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>
        ${fontCSS}
        text { font-family: 'Inter Tight', sans-serif; }
      </style>
      <rect width="100%" height="100%" fill="white"/>

      <!-- Title -->
      <text x="${width / 2}" y="28" text-anchor="middle" font-size="18" font-weight="700" fill="${COLORS.primary}">Rankings — ${variableLabel}</text>
      <text x="${width / 2}" y="50" text-anchor="middle" font-size="13" fill="${COLORS.muted}">${regionLabel} — ${selectedYear}</text>
    `;

    // Table header background
    const tableStartY = headerHeight;
    svg += `<rect x="${padding}" y="${tableStartY}" width="${totalWidth}" height="${tableHeaderHeight}" fill="#f8f7f4"/>`;

    // Table headers
    let colX = padding;
    const headers = [
      { key: 'rank', label: '#', width: colWidths.rank },
      { key: 'country', label: 'Country', width: colWidths.country },
      { key: 'score', label: 'Score', width: colWidths.score },
      { key: 'globalRank', label: 'Global Rank', width: colWidths.globalRank },
      { key: 'change', label: 'Change', width: colWidths.change }
    ];

    headers.forEach(header => {
      const textX = header.key === 'country' ? colX + 12 : colX + header.width / 2;
      const anchor = header.key === 'country' ? 'start' : 'middle';
      svg += `<text x="${textX}" y="${tableStartY + 22}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="${COLORS.text}">${header.label}</text>`;
      colX += header.width;
    });

    // Table rows
    sortedData.forEach((row, index) => {
      const y = tableStartY + tableHeaderHeight + (index * rowHeight);
      const bgColor = index % 2 === 0 ? 'white' : '#fafafa';
      const changeDisplay = getRankChangeDisplay(row.rankChange);

      // Row background
      svg += `<rect x="${padding}" y="${y}" width="${totalWidth}" height="${rowHeight}" fill="${bgColor}"/>`;

      // Row data
      colX = padding;

      // Rank
      svg += `<text x="${colX + colWidths.rank / 2}" y="${y + 20}" text-anchor="middle" font-size="13" font-weight="700" fill="${COLORS.primary}">${row.regionalRank}</text>`;
      colX += colWidths.rank;

      // Country
      const countryName = row.country.length > 22 ? row.country.substring(0, 20) + '...' : row.country;
      svg += `<text x="${colX + 12}" y="${y + 20}" font-size="12" font-weight="500" fill="${COLORS.text}">${countryName}</text>`;
      colX += colWidths.country;

      // Score
      svg += `<text x="${colX + colWidths.score / 2}" y="${y + 20}" text-anchor="middle" font-size="13" font-weight="600" fill="${COLORS.text}">${row.score.toFixed(2)}</text>`;
      colX += colWidths.score;

      // Global Rank
      svg += `<text x="${colX + colWidths.globalRank / 2}" y="${y + 20}" text-anchor="middle" font-size="12" fill="${COLORS.muted}">${row.globalRank || '—'}</text>`;
      colX += colWidths.globalRank;

      // Change
      svg += `<text x="${colX + colWidths.change / 2}" y="${y + 20}" text-anchor="middle" font-size="12" font-weight="600" fill="${changeDisplay.color}">${changeDisplay.text}</text>`;
    });

    // Legend
    const legendY = tableStartY + tableHeaderHeight + (sortedData.length * rowHeight) + 24;
    svg += `<text x="${padding}" y="${legendY}" font-size="10" fill="${COLORS.muted}">Rank change compared to ${baseYear}. ▲ = moved up, ▼ = moved down</text>`;

    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeRegion = regionLabel.replace(/\s+/g, '_');
    const safeVariable = selectedVariable.replace(/\s+/g, '_');
    a.download = `ranking-${safeRegion}-${safeVariable}-${selectedYear}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (rankingData.length === 0) {
    return (
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e5e5', padding: '40px', textAlign: 'center' }}>
        <p style={{ color: COLORS.muted }}>No data available for this selection.</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e5e5', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: COLORS.primary }}>
            Rankings — {variableLabel}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: COLORS.muted }}>
            {regionLabel} — {selectedYear} • {rankingData.length} countries
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

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f7f4' }}>
              <th
                onClick={() => handleSort('rank')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '700',
                  color: COLORS.text,
                  borderBottom: '2px solid #e5e5e5',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '60px'
                }}
              >
                #{getSortIndicator('rank')}
              </th>
              <th
                onClick={() => handleSort('country')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: '700',
                  color: COLORS.text,
                  borderBottom: '2px solid #e5e5e5',
                  cursor: 'pointer',
                  userSelect: 'none',
                  minWidth: '180px'
                }}
              >
                Country{getSortIndicator('country')}
              </th>
              <th
                onClick={() => handleSort('score')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '700',
                  color: COLORS.text,
                  borderBottom: '2px solid #e5e5e5',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '100px'
                }}
              >
                Score{getSortIndicator('score')}
              </th>
              <th
                onClick={() => handleSort('globalRank')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '700',
                  color: COLORS.text,
                  borderBottom: '2px solid #e5e5e5',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '100px'
                }}
              >
                Global Rank{getSortIndicator('globalRank')}
              </th>
              <th
                onClick={() => handleSort('change')}
                style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '700',
                  color: COLORS.text,
                  borderBottom: '2px solid #e5e5e5',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '100px'
                }}
              >
                Change{getSortIndicator('change')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => {
              const changeDisplay = getRankChangeDisplay(row.rankChange);

              return (
                <tr
                  key={row.country}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: index % 2 === 0 ? 'white' : '#fafafa',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#fafafa'}
                >
                  <td style={{
                    padding: '10px 16px',
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: '14px',
                    color: COLORS.primary
                  }}>
                    {row.regionalRank}
                  </td>
                  <td style={{
                    padding: '10px 16px',
                    fontWeight: '500',
                    color: COLORS.text
                  }}>
                    {row.country}
                  </td>
                  <td style={{
                    padding: '10px 16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: COLORS.text
                  }}>
                    {row.score.toFixed(2)}
                  </td>
                  <td style={{
                    padding: '10px 16px',
                    textAlign: 'center',
                    color: COLORS.muted
                  }}>
                    {row.globalRank || '—'}
                  </td>
                  <td style={{
                    padding: '10px 16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: changeDisplay.color
                  }}>
                    {changeDisplay.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid #e5e5e5',
        backgroundColor: '#f8f7f4',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '11px', color: COLORS.muted }}>
          Rank change compared to {baseYear}:
        </span>
        <span style={{ fontSize: '11px', color: '#181878', fontWeight: '500' }}>
          ▲ Moved up
        </span>
        <span style={{ fontSize: '11px', color: '#C41229', fontWeight: '500' }}>
          ▼ Moved down
        </span>
        <span style={{ fontSize: '11px', color: COLORS.muted }}>
          — No change / No data
        </span>
      </div>
    </div>
  );
}

RankingTable.propTypes = {
  allData: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedYear: PropTypes.string,
  baseYear: PropTypes.string,
  selectedRegion: PropTypes.string,
  selectedVariable: PropTypes.string,
  variableLabel: PropTypes.string
};
