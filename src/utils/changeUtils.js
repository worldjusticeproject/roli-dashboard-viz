import { COLORS } from '../config';

/**
 * WJP divergent scale for change data ("ROLI Percentage Changes").
 * Six fixed bins, most improving -> most declining. Backgrounds are solid hex
 * tints (not rgba) so they render identically in the exported SVGs.
 */
const CHANGE_BINS = [
  { min:  4.1, accent: '#181878', bg: '#E3E3EF', text: '#181878' },
  { min:  2.1, accent: '#7272BC', bg: '#EEEEF7', text: '#181878' },
  { min:  1.0, accent: '#CCCCFF', bg: '#F9F9FF', text: '#181878' },
  { min: -2.0, accent: '#FEBECC', bg: '#FFF7F9', text: '#C41229' },
  { min: -4.0, accent: '#EB6975', bg: '#FDEDEE', text: '#C41229' },
  { min: -Infinity, accent: '#C41229', bg: '#F8E3E5', text: '#C41229' },
];

const NEUTRAL = { bg: '#f5f5f5', accent: '#9e9e9e', text: COLORS.muted };

/**
 * Get color scheme based on percentage change
 * @param {number|null} changePercent - The percentage change value
 * @returns {{ bg: string, accent: string, text: string }} Color scheme object
 */
export function getChangeColor(changePercent) {
  if (changePercent === null || changePercent === undefined || isNaN(changePercent)) {
    return NEUTRAL;
  }

  // Stable band: changes under 1% in either direction read as "no real change"
  if (Math.abs(changePercent) < 1) return NEUTRAL;

  const bin = CHANGE_BINS.find(b => changePercent >= b.min);
  return { bg: bin.bg, accent: bin.accent, text: bin.text };
}

/**
 * Get arrow symbol for change direction and magnitude
 * @param {number|null} changePercent - The percentage change value
 * @returns {string} Arrow symbol
 */
export function getChangeArrow(changePercent) {
  if (changePercent === null || changePercent === undefined || isNaN(changePercent)) {
    return '—';
  }
  if (Math.abs(changePercent) < 1) return '→';
  if (changePercent > 0) {
    return changePercent >= 10 ? '↑↑' : '↑';
  } else {
    return changePercent <= -10 ? '↓↓' : '↓';
  }
}

/**
 * Get sort bucket for change percentage (used for sorting cards)
 * @param {number|null} changePercent - The percentage change value
 * @returns {number} Sort bucket (0 = improved, 1 = neutral/null, 2 = declined)
 */
export function getChangeSortBucket(changePercent) {
  if (changePercent === null || changePercent === undefined || isNaN(changePercent)) return 1;
  if (changePercent > 1) return 0;
  if (changePercent < -1) return 2;
  return 1;
}
