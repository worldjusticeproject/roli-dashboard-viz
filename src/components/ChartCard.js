import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { COLORS } from '../config';

export default function ChartCard({
  title,
  subtitle,
  onExport,
  exportOptions = ['full', 'bipanel'], // Default shows both options
  children,
  isEmpty = false,
  emptyMessage = "Please select options to display the chart."
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format) => {
    setShowExportMenu(false);
    if (onExport) onExport(format);
  };

  const showFull = exportOptions.includes('full');
  const showBipanel = exportOptions.includes('bipanel');
  const hasMultipleOptions = exportOptions.length > 1;

  return (
    <div className="chart-card" style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '32px 24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      marginBottom: '24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px'
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: COLORS.text,
            margin: '0 0 4px'
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{
              fontSize: '14px',
              color: COLORS.muted,
              margin: '0'
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {onExport && !isEmpty && (
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            {hasMultipleOptions ? (
              // Dropdown menu for multiple options
              <>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'white',
                    backgroundColor: COLORS.primary,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    marginTop: '0'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>↓</span> Export SVG
                  <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span>
                </button>
                {showExportMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid #e5e5e5',
                    overflow: 'hidden',
                    zIndex: 100,
                    minWidth: '160px'
                  }}>
                    {showFull && (
                      <button
                        onClick={() => handleExport('full')}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: COLORS.text,
                          backgroundColor: 'white',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        Full Slide
                      </button>
                    )}
                    {showBipanel && (
                      <button
                        onClick={() => handleExport('bipanel')}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '10px 16px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: COLORS.text,
                          backgroundColor: 'white',
                          border: 'none',
                          borderTop: showFull ? '1px solid #e5e5e5' : 'none',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        Bipanel (Square)
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              // Single button for one option (no dropdown)
              <button
                onClick={() => handleExport(exportOptions[0])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: COLORS.primary,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  marginTop: '0'
                }}
              >
                <span style={{ fontSize: '16px' }}>↓</span> Export SVG
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isEmpty ? (
        <p style={{
          fontSize: '14px',
          color: COLORS.muted,
          margin: '0'
        }}>
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

ChartCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  onExport: PropTypes.func,
  exportOptions: PropTypes.arrayOf(PropTypes.oneOf(['full', 'bipanel'])),
  children: PropTypes.node,
  isEmpty: PropTypes.bool,
  emptyMessage: PropTypes.string
};
