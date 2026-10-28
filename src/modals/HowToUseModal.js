import { COLORS } from '../config';

export default function HowToUseModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="info-modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'sticky',
            top: '16px',
            left: '100%',
            marginLeft: '-56px',
            marginTop: '16px',
            marginBottom: '-48px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: COLORS.background,
            color: COLORS.text,
            fontSize: '24px',
            fontWeight: '300',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#e0e0e0'}
          onMouseOut={(e) => e.target.style.backgroundColor = COLORS.background}
        >
          ×
        </button>

        {/* Content */}
        <div style={{ padding: '40px 48px 48px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: COLORS.text, marginTop: 0, marginBottom: '16px', letterSpacing: '-0.5px' }}>
            How to use this dashboard
          </h2>

          <p style={{ fontSize: '16px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px' }}>
            This dashboard currently includes <strong>nine visualizations</strong>. Use the chart toggles to switch views, then refine what you see using the filters (year, geography, and indicator selection).
          </p>

          {/* Time Series */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            1) Time Series
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '8px' }}>
            Use this view to explore <strong>trends over time</strong> by year.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Choose the <strong>level</strong> of analysis: <strong>Global</strong>, <strong>Region</strong>, or <strong>Country</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Select the metric you want to track: the <strong>overall Rule of Law score</strong>, any of the <strong>8 factors</strong>, or any of the <strong>44 sub-factors</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Use it to identify <strong>long-term change</strong>, turning points, and whether progress is broad-based or concentrated in specific areas.</li>
          </ul>

          {/* Country Profiles */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            2) Country Profiles
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '8px' }}>
            Use this view to see a <strong>complete performance breakdown</strong> for a single country.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Select a <strong>country</strong> or view the <strong>regional average</strong>.</li>
            <li style={{ marginBottom: '8px' }}>See the <strong>overall score</strong> alongside all <strong>8 factors</strong> in a horizontal bar chart.</li>
            <li style={{ marginBottom: '8px' }}>Use it to understand a country's <strong>strengths and weaknesses</strong> at a glance.</li>
          </ul>

          {/* Top & Bottom Performers */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            3) Top & Bottom Performers
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '8px' }}>
            Use this view to see <strong>which countries perform best and worst</strong> on a selected indicator.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Pick a <strong>year</strong> and an indicator (overall score, factor, or sub-factor).</li>
            <li style={{ marginBottom: '8px' }}>Choose the scope: <strong>Global</strong> rankings or rankings <strong>within a region</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Use it to quickly spot <strong>leaders and laggards</strong>, compare gaps, and highlight standout performers for a specific topic.</li>
          </ul>

          {/* Radar Chart */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            4) Radar Chart
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '8px' }}>
            Use this view to compare a <strong>profile of performance across indicators</strong> for different years.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Choose the level: <strong>Global</strong>, <strong>Region</strong>, or <strong>Country</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Select the <strong>years</strong> you want to compare.</li>
            <li style={{ marginBottom: '8px' }}>Use it to understand <strong>how the shape of performance changes over time</strong>—which dimensions improve, stagnate, or decline relative to others.</li>
          </ul>

          {/* Factor Comparison */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            5) Factor Comparison
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '8px' }}>
            Use this view to compare the <strong>8 factors side-by-side</strong> for a selected year.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Pick the <strong>year</strong> and the entities to compare (e.g., multiple <strong>countries</strong>, <strong>regions</strong>, and/or <strong>global</strong>).</li>
            <li style={{ marginBottom: '8px' }}>The bar chart shows how each selected entity performs across the <strong>eight factor scores</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Use it to create quick, presentation-ready comparisons of <strong>strengths and weaknesses across factors</strong>.</li>
          </ul>

          {/* Score Heatmap */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            6) Score Heatmap
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '8px' }}>
            Use this view to see <strong>all countries and factors</strong> in a single color-coded table.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Select a <strong>year</strong> and <strong>region</strong> (or view globally).</li>
            <li style={{ marginBottom: '8px' }}>Choose which <strong>factors and sub-factors</strong> to display as columns.</li>
            <li style={{ marginBottom: '8px' }}>Colors range from <strong>red (low scores)</strong> through <strong>yellow</strong> to <strong>green (high scores)</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Use it to quickly identify <strong>patterns across multiple dimensions</strong> and spot outliers.</li>
          </ul>

          {/* Change Heatmap */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            7) Change Heatmap
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '8px' }}>
            Use this view to visualize <strong>percentage change over time</strong> for each country.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Select a <strong>base year</strong> and <strong>current year</strong> to compare.</li>
            <li style={{ marginBottom: '8px' }}>Choose a <strong>region</strong> and the <strong>indicator</strong> (overall score, factor, or sub-factor).</li>
            <li style={{ marginBottom: '8px' }}>Cards show <strong>percentage change</strong> with color coding: <strong>green = improved</strong>, <strong>red = declined</strong>, <strong>gray = stable</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Use the <strong>Top 5 / Top 10</strong> and <strong>Bottom 5 / Bottom 10</strong> buttons in the chart header to narrow the view to the biggest movers. They work independently, so you can show one group on its own or both side by side, and the SVG export matches what you see.</li>
            <li style={{ marginBottom: '8px' }}>Use it to quickly identify which countries have made <strong>progress or regressed</strong> over a specific period.</li>
          </ul>

          {/* Country Change */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            8) Country Change
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '8px' }}>
            Use this view to analyze <strong>how a single country changed across all sub-factors</strong> within a specific factor.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Select a <strong>country</strong> (or regional average) and a <strong>factor</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Choose the <strong>base year</strong> and <strong>current year</strong> to compare.</li>
            <li style={{ marginBottom: '8px' }}>See all <strong>sub-factors</strong> displayed as change cards with percentage change.</li>
            <li style={{ marginBottom: '8px' }}>Use it to understand <strong>where a country improved or declined</strong> within a specific dimension of rule of law.</li>
          </ul>

          {/* Rankings */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            9) Rankings
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '8px' }}>
            Use this view to see <strong>sortable country rankings</strong> with regional and global positions.
          </p>
          <ul style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '24px', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>Select a <strong>year</strong>, <strong>region</strong>, and <strong>indicator</strong> (overall score, factor, or sub-factor).</li>
            <li style={{ marginBottom: '8px' }}>See each country's <strong>regional rank</strong>, <strong>score</strong>, and <strong>global rank</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Compare to a <strong>base year</strong> to see rank changes: <strong>green ▲ = moved up</strong>, <strong>red ▼ = moved down</strong>.</li>
            <li style={{ marginBottom: '8px' }}>Click column headers to <strong>sort</strong> by any metric.</li>
          </ul>

          {/* Export visuals */}
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: COLORS.text, marginTop: '32px', marginBottom: '12px' }}>
            Export visuals
          </h3>
          <p style={{ fontSize: '15px', lineHeight: '1.7', color: COLORS.text, marginBottom: '16px' }}>
            Any chart can be exported as <strong>SVG</strong> to produce <strong>publication-ready graphics</strong> that can be edited and used in slides and reports.
          </p>
        </div>
      </div>
    </div>
  );
}
