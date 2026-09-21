import { useMemo, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { COLORS, VARIABLE_OPTIONS, SUBFACTOR_SHORT_LABELS } from '../config';
import { prepareSVGClone, embedFonts, createLegendItem, downloadSVG as downloadSVGHelper, getAverageProfile } from '../utils';
import { ChartCard } from '../components';

// All possible factors and subfactors with their labels
const ALL_FACTORS_MAP = {
  roli: { label: 'WJP Rule of Law Index: Overall Score', shortLabel: 'Overall Score' },
  f1: { label: 'Constraints on Government Powers', shortLabel: 'Constraints on\nGovernment Powers' },
  f2: { label: 'Absence of Corruption', shortLabel: 'Absence of Corruption' },
  f3: { label: 'Open Government', shortLabel: 'Open Government' },
  f4: { label: 'Fundamental Rights', shortLabel: 'Fundamental Rights' },
  f5: { label: 'Order and Security', shortLabel: 'Order and Security' },
  f6: { label: 'Regulatory Enforcement', shortLabel: 'Regulatory Enforcement' },
  f7: { label: 'Civil Justice', shortLabel: 'Civil Justice' },
  f8: { label: 'Criminal Justice', shortLabel: 'Criminal Justice' },
};

// Build short labels for subfactors using predefined short labels (without number prefix)
VARIABLE_OPTIONS.filter(v => v.value.startsWith('sf')).forEach(sf => {
  const shortLabel = SUBFACTOR_SHORT_LABELS[sf.value] || sf.label;
  // Remove the number prefix (e.g., "1.1 Limited by legislature" -> "Limited by legislature")
  const labelWithoutNumber = shortLabel.replace(/^\d+\.\d+\s+/, '');
  // Add line breaks for labels longer than 20 characters
  let formattedLabel = labelWithoutNumber;
  if (labelWithoutNumber.length > 20) {
    // Split at roughly the middle on a word boundary
    const words = labelWithoutNumber.split(' ');
    const midPoint = Math.ceil(words.length / 2);
    formattedLabel = words.slice(0, midPoint).join(' ') + '\n' + words.slice(midPoint).join(' ');
  }
  ALL_FACTORS_MAP[sf.value] = {
    label: sf.label,
    shortLabel: formattedLabel
  };
});

// Colors for different years.
// WJP categorical palette in its fixed order - do not reorder.
const YEAR_COLORS = [
  '#181878', // Data indigo
  '#BF02AF', // Magenta
  '#3366FF', // Blue
  '#FF4D6A', // Pink
  '#9C89ED', // Violet
  '#226640', // Green
  '#FFB52B', // Amber
];

// Custom tick component to show values with year colors + label
const CustomAxisTick = ({ payload, x, y, cx, cy, combinedData, sortedYears, radarFactors }) => {
  const factor = radarFactors.find(f => f.label === payload.value);
  if (!factor) return null;

  // Get the data point for this factor
  const dataPoint = combinedData.find(d => d.factor === factor.key);

  // Calculate position offset based on angle
  const angle = Math.atan2(y - cy, x - cx);
  const offsetDistance = 50;
  const labelX = x + Math.cos(angle) * offsetDistance;
  const labelY = y + Math.sin(angle) * offsetDistance;

  // Determine text anchor based on position
  let textAnchor = 'middle';
  if (x > cx + 10) textAnchor = 'start';
  else if (x < cx - 10) textAnchor = 'end';

  // Split label for multi-line labels
  const lines = factor.shortLabel.split('\n');

  // Build values with colors for each year
  const yearValues = sortedYears.map((year, index) => ({
    year,
    value: dataPoint?.[`year_${year}`],
    color: YEAR_COLORS[index % YEAR_COLORS.length]
  }));

  return (
    <g>
      {/* Values with year colors, separated by | */}
      <text
        x={labelX}
        y={labelY - (lines.length > 1 ? 12 : 8)}
        textAnchor={textAnchor}
        fontSize={14}
        fontWeight={600}
      >
        {yearValues.map((yv, idx) => (
          <tspan key={yv.year}>
            <tspan fill={yv.color}>
              {yv.value !== undefined ? yv.value.toFixed(2) : ''}
            </tspan>
            {idx < yearValues.length - 1 && (
              <tspan fill={COLORS.muted}> | </tspan>
            )}
          </tspan>
        ))}
      </text>
      {/* Label */}
      {lines.map((line, index) => (
        <text
          key={index}
          x={labelX}
          y={labelY + 8 + (index * 14)}
          textAnchor={textAnchor}
          fill={COLORS.muted}
          fontSize={12}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

function RadarChartView({
  allData,
  averages,
  selectedEntity,
  selectedYears,
  selectedFactors = ['roli', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']
}) {
  const chartRef = useRef(null);

  // Build radarFactors from selectedFactors, ensuring 'roli' is always first (top of radar)
  const radarFactors = useMemo(() => {
    // Sort factors so 'roli' is always first if present
    const sortedFactors = [...selectedFactors].sort((a, b) => {
      if (a === 'roli') return -1;
      if (b === 'roli') return 1;
      return 0;
    });

    return sortedFactors.map(key => ({
      key,
      label: ALL_FACTORS_MAP[key]?.label || key,
      shortLabel: ALL_FACTORS_MAP[key]?.shortLabel || key
    }));
  }, [selectedFactors]);

  // Get label for an entity
  const getEntityLabel = (entity) => {
    if (entity === '__region_global') return 'Global Average';
    if (entity.startsWith('__region_')) {
      const regionName = entity.replace('__region_', '');
      return `${regionName} Average`;
    }
    return entity; // Country name
  };

  // Data for multiple years (for overlay)
  const multiYearData = useMemo(() => {
    if (!selectedEntity || selectedYears.length === 0) return [];

    const sortedYears = [...selectedYears].sort();

    return sortedYears.map(year => {
      const factorData = radarFactors.map(factor => {
        let value = 0;

        if (selectedEntity === '__region_global') {
          value = getAverageProfile(averages, 'global', year)?.[factor.key] ?? 0;
        } else if (selectedEntity.startsWith('__region_')) {
          const regionName = selectedEntity.replace('__region_', '');
          value = getAverageProfile(averages, regionName, year)?.[factor.key] ?? 0;
        } else {
          const countryData = allData.find(d => d.year === year && d.country === selectedEntity);
          value = countryData?.[factor.key] ?? 0;
        }

        return { factor: factor.key, label: factor.label, [`year_${year}`]: value, fullMark: 1 };
      });

      return { year, data: factorData };
    });
  }, [allData, averages, selectedEntity, selectedYears, radarFactors]);

  // Combined data for multi-year radar
  const combinedData = useMemo(() => {
    if (multiYearData.length === 0) return [];

    // Start with factor structure
    const combined = radarFactors.map(factor => ({
      factor: factor.key,
      label: factor.label,
      fullMark: 1
    }));

    // Add each year's values
    multiYearData.forEach(({ year, data }) => {
      data.forEach((item, index) => {
        combined[index][`year_${year}`] = item[`year_${year}`];
      });
    });

    return combined;
  }, [multiYearData, radarFactors]);

  // Get the title based on selected entity
  const chartTitle = useMemo(() => {
    if (!selectedEntity) return 'Comparative Radar Chart';
    return getEntityLabel(selectedEntity);
  }, [selectedEntity]);

  const sortedYears = useMemo(() => [...selectedYears].sort(), [selectedYears]);

  async function downloadSVG() {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;

    const legendHeight = 60;
    const { clone, vbX, vbY } = prepareSVGClone(svg, legendHeight, 'top', {});
    await embedFonts(clone);

    // Add legend items for years
    const lx = vbX + 24;
    const ly = vbY + 20;
    let currentX = lx;

    sortedYears.forEach((year, index) => {
      const color = YEAR_COLORS[index % YEAR_COLORS.length];
      const legendItems = createLegendItem(currentX, ly, color, year, 'line', { width: 24 });
      legendItems.forEach(el => clone.appendChild(el));
      currentX += 80;
    });

    downloadSVGHelper(clone, `ROLI_Radar_${chartTitle.replace(/\s+/g, '_')}.svg`);
  }

  if (combinedData.length === 0 || !selectedEntity || selectedFactors.length < 3) {
    return (
      <ChartCard
        title="Comparative Radar Chart"
        isEmpty={true}
        emptyMessage={selectedFactors.length < 3 ? "Please select at least 3 factors or subfactors." : "Please select a country or region."}
      />
    );
  }

  return (
    <ChartCard
      title={chartTitle}
      subtitle="Comparative Radar Chart"
      onExport={downloadSVG}
      exportOptions={['full']}
    >
      {/* Legend for years */}
      <div className="legend-container" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {sortedYears.map((year, index) => (
          <div key={year} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '24px',
              height: '3px',
              backgroundColor: YEAR_COLORS[index % YEAR_COLORS.length],
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '14px', color: COLORS.text, fontWeight: '500' }}>{year}</span>
          </div>
        ))}
      </div>

      <div ref={chartRef} className="radar-chart-container" style={{ width: '100%', height: '680px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="75%"
            data={combinedData}
            margin={{ top: 90, right: 130, bottom: 90, left: 130 }}
          >
            <PolarGrid
              stroke={COLORS.divider}
              strokeWidth={1}
            />
            <PolarAngleAxis
              dataKey="label"
              tick={<CustomAxisTick combinedData={combinedData} sortedYears={sortedYears} radarFactors={radarFactors} />}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 1]}
              ticks={[0.2, 0.4, 0.6, 0.8, 1.0]}
              tick={{ fontSize: 11, fill: COLORS.muted }}
              axisLine={false}
              tickFormatter={(value) => value.toFixed(1)}
            />

            {sortedYears.map((year, index) => (
              <Radar
                key={year}
                name={year}
                dataKey={`year_${year}`}
                stroke={YEAR_COLORS[index % YEAR_COLORS.length]}
                fill={YEAR_COLORS[index % YEAR_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
                dot={{ r: 4, fill: YEAR_COLORS[index % YEAR_COLORS.length] }}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

RadarChartView.propTypes = {
  allData: PropTypes.arrayOf(PropTypes.object).isRequired,
  averages: PropTypes.shape({
    global: PropTypes.object,
    regions: PropTypes.object,
  }),
  selectedEntity: PropTypes.string.isRequired,
  selectedYears: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedFactors: PropTypes.arrayOf(PropTypes.string)
};

export default memo(RadarChartView);
