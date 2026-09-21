import { useMemo, useRef, memo } from 'react';
import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts';
import { COLORS } from '../config';
import { prepareSVGClone, embedFonts, createLegendItem, downloadSVG as downloadSVGHelper, addWhiteBackground, getAverageProfile } from '../utils';
import { ChartCard } from '../components';

const FACTORS = [
  { key: 'f1', label: 'Constraints on Government Powers' },
  { key: 'f2', label: 'Absence of Corruption' },
  { key: 'f3', label: 'Open Government' },
  { key: 'f4', label: 'Fundamental Rights' },
  { key: 'f5', label: 'Order and Security' },
  { key: 'f6', label: 'Regulatory Enforcement' },
  { key: 'f7', label: 'Civil Justice' },
  { key: 'f8', label: 'Criminal Justice' }
];

// WJP categorical palette in its fixed order - do not reorder.
const COMPARISON_COLORS = [
  '#181878', // Data indigo
  '#BF02AF', // Magenta
  '#3366FF', // Blue
  '#FF4D6A', // Pink
  '#9C89ED', // Violet
];

// Custom Y-axis tick component with line wrapping
const CustomYAxisTick = ({ x, y, payload }) => {
  const words = payload.value.split(' ');
  const lines = [];
  let currentLine = '';

  // Split into lines of maximum 3 words each
  words.forEach((word, i) => {
    if (currentLine && currentLine.split(' ').length >= 3) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  });
  if (currentLine) lines.push(currentLine);

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={-200}
          y={0}
          dy={i * 16 - (lines.length - 1) * 8}
          textAnchor="start"
          fill={COLORS.text}
          fontSize={14}
          fontWeight={400}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

function FactorComparisonChart({ allData, averages, selectedRegion, selectedYear, availableCountries, selectedCountries = ['__region_global'] }) {
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    if (selectedCountries.length === 0) return [];

    const data = FACTORS.map(factor => {
      const row = { label: factor.label, factor: factor.key };

      selectedCountries.forEach((country, index) => {
        if (country.startsWith('__region_')) {
          const regionName = country.replace('__region_', '');
          row[country] = getAverageProfile(averages, regionName, selectedYear)?.[factor.key] ?? 0;
        } else {
          // Get data for specific country
          const countryData = allData.find(
            d => d.country === country && d.year === selectedYear
          );
          row[country] = countryData?.[factor.key] || 0;
        }
      });

      return row;
    });

    return data;
  }, [allData, averages, selectedCountries, selectedYear]);

  const getCountryLabel = (country) => {
    if (country.startsWith('__region_')) {
      const regionName = country.replace('__region_', '');
      if (regionName === 'global') return 'Global Average';
      return regionName;
    }
    return country;
  };

  // Dynamic title based on first selection
  const chartTitle = useMemo(() => {
    if (selectedCountries.length === 0) return 'Factor Comparison';
    if (selectedCountries.length === 1) {
      const first = selectedCountries[0];
      if (first.startsWith('__region_')) {
        const regionName = first.replace('__region_', '');
        if (regionName === 'global') return 'Global Average';
        return `${regionName} Average`;
      }
      return first;
    }
    return `Comparing ${selectedCountries.length} Categories`;
  }, [selectedCountries]);

  async function downloadSVG() {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;

    const legendHeight = 60;
    const { clone, vbX, vbY, vbW, vbH } = prepareSVGClone(svg, legendHeight, 'top', {});

    // Add white background
    addWhiteBackground(clone, vbX, vbY, vbW, vbH);

    await embedFonts(clone);

    // Add legend items for each country/region
    const lx = vbX + 24;
    const ly = vbY + 20;
    let currentX = lx;

    selectedCountries.forEach((country, index) => {
      const label = getCountryLabel(country);
      const color = COMPARISON_COLORS[index % COMPARISON_COLORS.length];
      const legendItems = createLegendItem(currentX, ly, color, label, 'box', { size: 16 });
      legendItems.forEach(el => clone.appendChild(el));
      currentX += label.length * 8 + 50;
    });

    const fileName = selectedCountries.length === 1
      ? `ROLI_Factors_${getCountryLabel(selectedCountries[0]).replace(/\s+/g, '_')}_${selectedYear}.svg`
      : `ROLI_Factors_Comparison_${selectedYear}.svg`;
    downloadSVGHelper(clone, fileName);
  }

  if (chartData.length === 0) {
    return (
      <ChartCard
        title="Factor Comparison"
        isEmpty={true}
        emptyMessage="Please select countries to compare"
      />
    );
  }

  // Dynamic sizing based on number of selections
  const barSize = selectedCountries.length === 1 ? 32 :
                  selectedCountries.length === 2 ? 24 :
                  selectedCountries.length === 3 ? 20 :
                  selectedCountries.length === 4 ? 18 : 16;

  const chartHeight = selectedCountries.length === 1 ? 550 :
                      selectedCountries.length === 2 ? 600 :
                      selectedCountries.length === 3 ? 750 :
                      selectedCountries.length === 4 ? 900 : 1100;

  const categoryGap = selectedCountries.length <= 2 ? '35%' :
                      selectedCountries.length === 3 ? '50%' :
                      selectedCountries.length === 4 ? '70%' : '100%';

  return (
    <ChartCard
      title={chartTitle}
      subtitle="Comparative Radar Chart"
      onExport={downloadSVG}
      exportOptions={['full']}
    >
      {/* Legend */}
      <div className="legend-container" style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {selectedCountries.map((country, index) => (
          <div key={country} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: COMPARISON_COLORS[index % COMPARISON_COLORS.length],
              borderRadius: '2px'
            }} />
            <span style={{ fontSize: '14px', color: COLORS.text, fontWeight: '500' }}>{getCountryLabel(country)}</span>
          </div>
        ))}
      </div>

      <div ref={chartRef} className="bar-chart-container" style={{ width: '100%', height: `${chartHeight}px`, maxWidth: '1200px', margin: '0 auto' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 80, left: 120, bottom: 20 }}
            barCategoryGap={categoryGap}
          >
            <XAxis
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v) => v.toFixed(2)}
              tick={{ fontSize: 13, fill: COLORS.text }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={<CustomYAxisTick />}
              axisLine={false}
              tickLine={false}
              width={200}
            />

            {/* Grid lines */}
            <ReferenceLine x={0.25} stroke="#e5e5e5" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine x={0.5} stroke="#e5e5e5" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine x={0.75} stroke="#e5e5e5" strokeDasharray="3 3" strokeWidth={1} />

            {/* Bars for each selected country */}
            {selectedCountries.map((country, index) => (
              <Bar
                key={country}
                dataKey={country}
                fill={COMPARISON_COLORS[index % COMPARISON_COLORS.length]}
                radius={[0, 4, 4, 0]}
                barSize={barSize}
              >
                <LabelList
                  dataKey={country}
                  position="right"
                  formatter={(value) => value ? value.toFixed(2) : ''}
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    fill: COLORS.text
                  }}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

FactorComparisonChart.propTypes = {
  allData: PropTypes.arrayOf(PropTypes.object).isRequired,
  averages: PropTypes.shape({
    global: PropTypes.object,
    regions: PropTypes.object,
  }),
  selectedRegion: PropTypes.string.isRequired,
  selectedYear: PropTypes.string.isRequired,
  availableCountries: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedCountries: PropTypes.arrayOf(PropTypes.string)
};

export default memo(FactorComparisonChart);
