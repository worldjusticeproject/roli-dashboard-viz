import { getChangeSortBucket } from './changeUtils';

const toPercent = (change) =>
  change === null || change === undefined || Number.isNaN(change) ? null : change * 100;

/**
 * Comparator shared by the Change Heatmap card grid and the top/bottom selection:
 * biggest improvements first, then the stable band (rows without a base-year score
 * last inside it), then declines. Ties break alphabetically by country.
 * @param {{ country: string, change: number|null }} a
 * @param {{ country: string, change: number|null }} b
 * @returns {number} Standard comparator result
 */
export function compareByChange(a, b) {
  const changeA = toPercent(a.change);
  const changeB = toPercent(b.change);
  const bucketA = getChangeSortBucket(changeA);
  const bucketB = getChangeSortBucket(changeB);

  if (bucketA !== bucketB) return bucketA - bucketB;

  if (changeA === null && changeB === null) return a.country.localeCompare(b.country);
  if (changeA === null) return 1;
  if (changeB === null) return -1;
  if (changeA !== changeB) return changeB - changeA;

  return a.country.localeCompare(b.country);
}

/**
 * Sort rows with `compareByChange` without mutating the input.
 * @param {Array<{ country: string, change: number|null }>} rows
 * @returns {Array} New sorted array
 */
export function sortByChange(rows) {
  return [...rows].sort(compareByChange);
}

/**
 * Pick the biggest movers from Change Heatmap rows.
 *
 * Rows are sorted with `compareByChange`, so both groups come back in the same
 * descending order as the full card grid and `bottom` ends with the largest
 * decline (the `slice(-n)` convention used by TopBottomChart). Rows without a
 * base-year score (`change === null`) are excluded from both groups.
 *
 * Each group is capped at `floor(rows with data / 2)`, like TopBottomChart, so
 * no country can land in both groups in a small region.
 *
 * @param {Array<{ country: string, change: number|null }>} rows - Card rows
 * @param {Object} [options]
 * @param {number} [options.topCount=5] - Requested size of the top group (0 = none)
 * @param {number} [options.bottomCount=5] - Requested size of the bottom group (0 = none)
 * @returns {{ top: Array, bottom: Array, withDataCount: number }} Selected groups
 */
export function getTopBottomByChange(rows, { topCount = 5, bottomCount = 5 } = {}) {
  const sorted = sortByChange(rows || []);
  const withData = sorted.filter(row => toPercent(row.change) !== null);
  const maxPerGroup = Math.floor(withData.length / 2);

  const topSize = Math.min(Math.max(topCount, 0), maxPerGroup);
  const bottomSize = Math.min(Math.max(bottomCount, 0), maxPerGroup);

  return {
    top: topSize > 0 ? withData.slice(0, topSize) : [],
    bottom: bottomSize > 0 ? withData.slice(-bottomSize) : [],
    withDataCount: withData.length
  };
}
