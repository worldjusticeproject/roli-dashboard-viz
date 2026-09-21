import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { COLORS, VARIABLE_OPTIONS } from '../config';
import { getEmbeddedFontCSS, filterByRegion } from '../utils';

// WJP divergent scale for index scores ("ROLI Scores"), weaker -> stronger.
// Magenta/red = weaker, green = stronger; intermediate values interpolate
// between neighbouring stops.
const SCORE_RAMP = [
  '#D40276', '#E10F3C', '#EB5934', '#EF863C', '#F2A241', '#E8AB46',
  '#DFB44B', '#CCC555', '#90A96A', '#578E7F', '#28594F',
];

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// Returns [r, g, b] for a 0-1 score on the ramp above.
function scoreRgb(value) {
  const v = Math.max(0, Math.min(1, value));
  const pos = v * (SCORE_RAMP.length - 1);
  const i = Math.min(Math.floor(pos), SCORE_RAMP.length - 2);
  const t = pos - i;
  const from = hexToRgb(SCORE_RAMP[i]);
  const to = hexToRgb(SCORE_RAMP[i + 1]);
  return from.map((c, k) => Math.round(c + t * (to[k] - c)));
}

function getHeatmapColor(value) {
  if (value === null || value === undefined) return '#e0e0e0';
  const [r, g, b] = scoreRgb(value);
  return `rgb(${r}, ${g}, ${b})`;
}

// This ramp is dark at BOTH ends, so cell labels flip to white wherever the
// fill is too dark to carry near-black text.
function getHeatmapTextColor(value) {
  if (value === null || value === undefined) return '#222221';
  const [r, g, b] = scoreRgb(value);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#222221' : '#ffffff';
}

export default function HumanRightsHeatmap({
  allData,
  selectedYear = '2025',
  selectedRegion = 'global',
  selectedFactors = ['roli', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']
}) {
  // Get region label
  const regionLabel = selectedRegion === 'global' ? 'Global' : selectedRegion;

  // Helper function to split long labels into multiple lines
  const splitLabel = (label, maxCharsPerLine = 18) => {
    if (label.length <= maxCharsPerLine) return [label];

    const words = label.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      if (currentLine.length === 0) {
        currentLine = word;
      } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Build factors list with labels
  const factorsList = useMemo(() => {
    return selectedFactors.map(key => {
      const option = VARIABLE_OPTIONS.find(v => v.value === key);
      const fullLabel = option ? option.label.replace(/^[A-Z0-9.]+ - /, '').replace(/^\d+\.\d+ - /, '') : key;
      return {
        key,
        label: fullLabel,
        labelLines: splitLabel(fullLabel),
        shortLabel: option ? option.label.split(' - ')[0] : key
      };
    });
  }, [selectedFactors]);

  // Process data for the heatmap
  const heatmapData = useMemo(() => {
    // Filter by year and region
    const yearData = filterByRegion(
      allData.filter(d => d.year === selectedYear),
      selectedRegion
    );

    const result = yearData.map(countryData => {
      const factors = {};
      selectedFactors.forEach(key => {
        factors[key] = countryData[key];
      });

      return {
        country: countryData.country,
        region: countryData.region,
        factors
      };
    });

    // Sort alphabetically by country name
    result.sort((a, b) => a.country.localeCompare(b.country));

    return result;
  }, [allData, selectedYear, selectedRegion, selectedFactors]);

  // Download SVG function
  const downloadSVG = async () => {
    const fontCSS = await getEmbeddedFontCSS();

    const cellWidth = 90;
    const cellHeight = 32;
    const cellGap = 4;
    const countryColWidth = 150;
    const maxLabelLines = Math.max(...factorsList.map(f => f.labelLines.length));
    const headerHeight = 50 + (maxLabelLines * 12);
    const padding = 20;
    const legendHeight = 50;

    const contentWidth = countryColWidth + (factorsList.length * (cellWidth + cellGap));
    const width = contentWidth + padding * 2;
    const height = headerHeight + (heatmapData.length * cellHeight) + legendHeight + padding * 2;
    const titleCenterX = padding + contentWidth / 2;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>
        ${fontCSS}
        text { font-family: 'Inter Tight', sans-serif; }
      </style>
      <rect width="100%" height="100%" fill="white"/>

      <!-- Title -->
      <text x="${titleCenterX}" y="28" text-anchor="middle" font-size="16" font-weight="700" fill="${COLORS.primary}">Score Heatmap - ${selectedYear}</text>
      <text x="${titleCenterX}" y="46" text-anchor="middle" font-size="12" fill="${COLORS.muted}">${regionLabel}</text>
    `;

    // Header row
    const headerY = headerHeight;
    svg += `<text x="${padding + 10}" y="${headerY - 8}" font-size="10" font-weight="600" fill="${COLORS.text}">Country</text>`;

    factorsList.forEach((factor, i) => {
      const x = padding + countryColWidth + (i * (cellWidth + cellGap)) + cellWidth / 2;
      const lines = factor.labelLines;
      const lineHeight = 12;
      const startY = headerY - 8 - ((lines.length - 1) * lineHeight);

      lines.forEach((line, lineIndex) => {
        svg += `<text x="${x}" y="${startY + (lineIndex * lineHeight)}" text-anchor="middle" font-size="9" font-weight="600" fill="${COLORS.text}">${line}</text>`;
      });
    });

    // Data rows
    heatmapData.forEach((row, rowIndex) => {
      const y = headerHeight + (rowIndex * cellHeight);

      // Country name
      const displayName = row.country.length > 18 ? row.country.substring(0, 18) + '...' : row.country;
      svg += `<text x="${padding + 10}" y="${y + cellHeight / 2 + 4}" font-size="10" fill="${COLORS.text}">${displayName}</text>`;

      // Factor cells
      factorsList.forEach((factor, colIndex) => {
        const x = padding + countryColWidth + (colIndex * (cellWidth + cellGap));
        const value = row.factors[factor.key];
        const color = getHeatmapColor(value);
        svg += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight - 2}" fill="${color}" rx="3"/>`;
        svg += `<text x="${x + cellWidth / 2}" y="${y + cellHeight / 2 + 4}" text-anchor="middle" font-size="13" font-weight="600" fill="${getHeatmapTextColor(value)}">${value !== null && value !== undefined ? value.toFixed(2) : '—'}</text>`;
      });
    });

    // Legend
    const legendY = headerHeight + (heatmapData.length * cellHeight) + 25;
    svg += `<text x="${padding}" y="${legendY}" font-size="10" font-weight="600" fill="${COLORS.muted}">Score:</text>`;

    const scaleX = padding + 50;
    const scaleWidth = 150;
    for (let i = 0; i <= 10; i++) {
      const v = i / 10;
      svg += `<rect x="${scaleX + (i * scaleWidth / 10)}" y="${legendY - 10}" width="${scaleWidth / 10 + 1}" height="14" fill="${getHeatmapColor(v)}"/>`;
    }
    svg += `<text x="${scaleX}" y="${legendY + 16}" font-size="9" fill="${COLORS.muted}">0.0 (Low)</text>`;
    svg += `<text x="${scaleX + scaleWidth}" y="${legendY + 16}" text-anchor="end" font-size="9" fill="${COLORS.muted}">1.0 (High)</text>`;

    svg += '</svg>';

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatmap-${selectedRegion}-${selectedYear}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e5e5', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: COLORS.primary }}>
            Score Heatmap
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: COLORS.muted }}>
            {regionLabel} — {selectedYear}
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

      {/* Heatmap Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f7f4' }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontWeight: '600',
                color: COLORS.text,
                borderBottom: '2px solid #e5e5e5',
                position: 'sticky',
                left: 0,
                backgroundColor: '#f8f7f4',
                minWidth: '140px'
              }}>
                Country
              </th>
              {factorsList.map(factor => (
                <th key={factor.key} style={{
                  padding: '12px 6px',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: COLORS.text,
                  borderBottom: '2px solid #e5e5e5',
                  minWidth: '90px',
                  maxWidth: '120px',
                  verticalAlign: 'bottom'
                }}>
                  <div style={{ fontSize: '10px', color: COLORS.primary, fontWeight: '600', lineHeight: '1.3' }}>
                    {factor.labelLines.map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < factor.labelLines.length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row, rowIndex) => (
              <tr key={row.country} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{
                  padding: '8px 16px',
                  fontWeight: '500',
                  color: COLORS.text,
                  position: 'sticky',
                  left: 0,
                  backgroundColor: rowIndex % 2 === 0 ? 'white' : '#fafafa',
                  fontSize: '12px'
                }}>
                  {row.country}
                </td>
                {factorsList.map(factor => {
                  const value = row.factors[factor.key];
                  const bgColor = getHeatmapColor(value);

                  return (
                    <td key={factor.key} style={{
                      padding: '10px 6px',
                      textAlign: 'center',
                      backgroundColor: bgColor,
                      borderLeft: '3px solid white',
                      borderRight: '3px solid white'
                    }}>
                      <span style={{ fontWeight: '700', color: getHeatmapTextColor(value), fontSize: '14px' }}>
                        {value !== null && value !== undefined ? value.toFixed(2) : '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend - Only score scale, no change indicators */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f8f7f4'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: '600', color: COLORS.muted }}>Score:</span>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: COLORS.muted, marginRight: '4px' }}>0.0</span>
            <div style={{ display: 'flex', borderRadius: '3px', overflow: 'hidden' }}>
              {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(v => (
                <div key={v} style={{ width: '16px', height: '14px', backgroundColor: getHeatmapColor(v) }} />
              ))}
            </div>
            <span style={{ fontSize: '10px', color: COLORS.muted, marginLeft: '4px' }}>1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

HumanRightsHeatmap.propTypes = {
  allData: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedYear: PropTypes.string,
  selectedRegion: PropTypes.string,
  selectedFactors: PropTypes.arrayOf(PropTypes.string)
};
