import { useMemo, useRef, useState, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import { TS_COLORS } from '../config';
import { prepareSVGClone, embedFonts, downloadSVG as downloadSVGHelper, createLegendItem } from '../utils';
import { ChartCard } from '../components';

const CHART_SIZES = {
  full: { width: '100%', height: 500, maxWidth: undefined },
  bipanel: { width: '100%', height: 400, maxWidth: '600px' }
};

// WJP categorical palette in its fixed order - do not reorder.
// TS_COLORS.line is the first stop (#181878).
const SERIES_COLORS = [
  TS_COLORS.line,
  '#BF02AF', // Magenta
  '#3366FF', // Blue
  '#FF4D6A', // Pink
  '#9C89ED', // Violet
  '#226640', // Green
  '#FFB52B', // Amber
];

function getSeriesColor(index, style) {
  if (style === 'referenceRegional') return TS_COLORS.regionalAvg;
  if (style === 'referenceGlobal') return TS_COLORS.globalAvg;
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function TimeSeriesChart({ series = [], referenceSeries = [], variable, label, subtitle, yearRange = [2015, 2025] }) {
  const chartRef = useRef(null);
  const [exportMode, setExportMode] = useState(null);

  const allSeries = useMemo(() => [...referenceSeries, ...series], [referenceSeries, series]);

  const chartData = useMemo(() => {
    const [startYear, endYear] = yearRange;
    const rows = [];

    for (let year = startYear; year <= endYear; year += 1) {
      const row = { year: String(year) };
      allSeries.forEach((currentSeries) => {
        const point = currentSeries.points.find(item => item.year === row.year);
        row[currentSeries.dataKey || currentSeries.key] = point?.value ?? null;
      });
      rows.push(row);
    }

    return rows;
  }, [allSeries, yearRange]);

  const captureAndDownload = useCallback(async (format) => {
    const svg = chartRef.current?.querySelector('svg');
    if (!svg) return;

    const isBipanel = format === 'bipanel';
    const legendHeight = allSeries.length > 0 ? 80 : 0;
    const { clone, bbox } = prepareSVGClone(svg, legendHeight, 'top', {});
    await embedFonts(clone);

    if (allSeries.length > 0) {
      const legendY = bbox.y - legendHeight + 10;
      let xOffset = bbox.x + 10;

      allSeries.forEach((currentSeries, index) => {
        const labelText = currentSeries.label.length > 28 ? `${currentSeries.label.slice(0, 25)}...` : currentSeries.label;
        const items = createLegendItem(xOffset, legendY, getSeriesColor(index, currentSeries.style), labelText, 'line', {
          width: 28,
          height: 5,
          textOptions: { fontSize: 13, fontWeight: 500 }
        });
        items.forEach(el => clone.appendChild(el));
        xOffset += 28 + 6 + labelText.length * 7 + 24;
      });
    }

    const suffix = isBipanel ? '_bipanel' : '';
    const fileLabel = series.length === 1 ? series[0].label.replace(/\s+/g, '_') : `comparison_${series.length}_series`;
    downloadSVGHelper(clone, `ROLI_${fileLabel}_${variable}${suffix}.svg`);
  }, [allSeries, series, variable]);

  const downloadSVG = useCallback(async (format = 'full') => {
    if (format === 'bipanel') {
      setExportMode('bipanel');
      await new Promise(resolve => setTimeout(resolve, 100));
      await captureAndDownload(format);
      setExportMode(null);
    } else {
      await captureAndDownload(format);
    }
  }, [captureAndDownload]);

  if (series.length === 0) return null;

  return (
    <ChartCard
      title={label}
      subtitle={subtitle}
      onExport={downloadSVG}
    >
      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', paddingLeft: '16px', flexWrap: 'wrap' }}>
        {allSeries.map((currentSeries, index) => (
          <div key={currentSeries.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '5px', backgroundColor: getSeriesColor(index, currentSeries.style), borderRadius: '3px' }} />
            <span style={{ fontSize: '13px', color: TS_COLORS.axis }}>{currentSeries.label}</span>
          </div>
        ))}
      </div>
      <div ref={chartRef} style={{ maxWidth: exportMode ? CHART_SIZES[exportMode].maxWidth : CHART_SIZES.full.maxWidth }}>
        <ResponsiveContainer width="100%" height={exportMode ? CHART_SIZES[exportMode].height : CHART_SIZES.full.height}>
          <LineChart data={chartData} margin={{ top: 24, right: 32, left: 16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={TS_COLORS.grid} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 13, fill: TS_COLORS.axis, fontWeight: 500 }}
              axisLine={{ stroke: TS_COLORS.grid, strokeWidth: 1 }}
              tickLine={{ stroke: TS_COLORS.axis, strokeWidth: 1 }}
              interval={0}
              padding={{ left: 20, right: 0 }}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
              tickFormatter={(v) => v.toFixed(2)}
              tick={{ fontSize: 13, fill: TS_COLORS.axis }}
              axisLine={{ stroke: TS_COLORS.grid, strokeWidth: 1 }}
              tickLine={false}
            />
            {allSeries.map((currentSeries, index) => (
              <Line
                key={currentSeries.key}
                type="linear"
                dataKey={currentSeries.dataKey || currentSeries.key}
                stroke={getSeriesColor(index, currentSeries.style)}
                strokeWidth={currentSeries.style ? 3 : (index - referenceSeries.length === 0 ? 4.5 : 4)}
                strokeDasharray={currentSeries.style ? '8 4' : undefined}
                dot={{ r: currentSeries.style ? 0 : 4, fill: getSeriesColor(index, currentSeries.style), strokeWidth: 0 }}
                isAnimationActive={false}
                connectNulls={false}
              >
                <LabelList
                  dataKey={currentSeries.dataKey || currentSeries.key}
                  content={({ x, y, value }) => {
                    if (currentSeries.style || value == null) return null;
                    return (
                      <text
                        x={x}
                        y={y - 12}
                        textAnchor="middle"
                        fontSize={13}
                        fontWeight={600}
                        fill={getSeriesColor(index, currentSeries.style)}
                      >
                        {Number(value).toFixed(2)}
                      </text>
                    );
                  }}
                />
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

TimeSeriesChart.propTypes = {
  series: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    points: PropTypes.arrayOf(PropTypes.shape({
      year: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })).isRequired,
    style: PropTypes.string,
  })),
  referenceSeries: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    points: PropTypes.arrayOf(PropTypes.shape({
      year: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })).isRequired,
    style: PropTypes.string,
  })),
  variable: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  yearRange: PropTypes.arrayOf(PropTypes.number),
};

export default memo(TimeSeriesChart);
