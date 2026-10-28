import { getTopBottomByChange, sortByChange } from '../topBottomByChange';

// Change values are fractions (0.05 = +5.0%), matching comparisons[baseYear][variable].
const row = (country, change) => ({ country, change });

const names = rows => rows.map(r => r.country);

describe('getTopBottomByChange', () => {
  it('returns both groups in the full view order, bottom ending with the largest decline', () => {
    const rows = [
      row('Chile', -0.228),
      row('Brazil', 0.050),
      row('Peru', 0.043),
      row('Ghana', 0.041),
      row('Kenya', 0.039),
      row('Nepal', 0.036),
      row('Spain', -0.136),
      row('Italy', -0.148),
      row('Japan', -0.158),
      row('Egypt', -0.188),
      row('India', 0.021),
      row('Mali', -0.115)
    ];

    const { top, bottom } = getTopBottomByChange(rows, { topCount: 5, bottomCount: 5 });

    expect(names(top)).toEqual(['Brazil', 'Peru', 'Ghana', 'Kenya', 'Nepal']);
    expect(names(bottom)).toEqual(['Spain', 'Italy', 'Japan', 'Egypt', 'Chile']);
    // Both groups share the descending order of the full grid.
    expect(bottom[bottom.length - 1].country).toBe('Chile');
    expect(bottom[0].change).toBeGreaterThan(bottom[bottom.length - 1].change);
  });

  it('excludes countries without a base-year score from both groups', () => {
    const rows = [
      row('Alpha', 0.10),
      row('Bravo', null),
      row('Charlie', 0.05),
      row('Delta', undefined),
      row('Echo', -0.05),
      row('Foxtrot', -0.10),
      row('Golf', null)
    ];

    const { top, bottom, withDataCount } = getTopBottomByChange(rows, { topCount: 5, bottomCount: 5 });

    expect(withDataCount).toBe(4);
    expect(names(top)).toEqual(['Alpha', 'Charlie']);
    expect(names(bottom)).toEqual(['Echo', 'Foxtrot']);
    expect([...top, ...bottom].map(r => r.country)).not.toContain('Bravo');
    expect([...top, ...bottom].map(r => r.country)).not.toContain('Golf');
  });

  it('breaks ties alphabetically by country', () => {
    const rows = [
      row('Zambia', 0.039),
      row('Moldova', 0.039),
      row('Poland', 0.039),
      row('Angola', 0.05),
      row('Benin', -0.02),
      row('Chad', -0.03),
      row('Denmark', -0.04),
      row('Ecuador', -0.05),
      row('France', -0.06),
      row('Gabon', -0.07)
    ];

    const { top } = getTopBottomByChange(rows, { topCount: 4, bottomCount: 0 });

    expect(names(top)).toEqual(['Angola', 'Moldova', 'Poland', 'Zambia']);
  });

  it('caps each group at floor(countries with data / 2) in a small region', () => {
    const rows = [
      row('A', 0.09),
      row('B', 0.08),
      row('C', 0.07),
      row('D', 0.06),
      row('E', 0.05),
      row('F', -0.05),
      row('G', -0.06),
      row('H', -0.07),
      row('I', null)
    ];

    const { top, bottom, withDataCount } = getTopBottomByChange(rows, { topCount: 5, bottomCount: 5 });

    // 8 countries with data -> 4 per group, so no country appears twice.
    expect(withDataCount).toBe(8);
    expect(top).toHaveLength(4);
    expect(bottom).toHaveLength(4);
    expect(names(top)).toEqual(['A', 'B', 'C', 'D']);
    expect(names(bottom)).toEqual(['E', 'F', 'G', 'H']);
    const overlap = names(top).filter(c => names(bottom).includes(c));
    expect(overlap).toEqual([]);
  });

  it('caps a 10-row request the same way, keeping the groups disjoint', () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      row(`C${String(i).padStart(2, '0')}`, (7 - i) / 100)
    );

    const { top, bottom } = getTopBottomByChange(rows, { topCount: 10, bottomCount: 10 });

    expect(top).toHaveLength(7);
    expect(bottom).toHaveLength(7);
    expect(names(top).filter(c => names(bottom).includes(c))).toEqual([]);
    expect(bottom[bottom.length - 1].country).toBe('C14');
  });

  it('returns only the requested group when the other is switched off', () => {
    const rows = [
      row('A', 0.09),
      row('B', 0.08),
      row('C', -0.05),
      row('D', -0.06),
      row('E', -0.07),
      row('F', -0.08)
    ];

    expect(getTopBottomByChange(rows, { topCount: 5, bottomCount: 0 }).bottom).toEqual([]);
    expect(names(getTopBottomByChange(rows, { topCount: 0, bottomCount: 2 }).bottom)).toEqual(['E', 'F']);
    expect(getTopBottomByChange(rows, { topCount: 0, bottomCount: 0 })).toMatchObject({ top: [], bottom: [] });
  });

  it('does not mutate the input array', () => {
    const rows = [row('B', -0.05), row('A', 0.05), row('C', 0.01)];
    const snapshot = names(rows);

    getTopBottomByChange(rows, { topCount: 5, bottomCount: 5 });

    expect(names(rows)).toEqual(snapshot);
  });

  it('defaults to five per group and tolerates empty input', () => {
    expect(getTopBottomByChange([])).toEqual({ top: [], bottom: [], withDataCount: 0 });

    const rows = Array.from({ length: 20 }, (_, i) => row(`C${i}`, (10 - i) / 100));
    const { top, bottom } = getTopBottomByChange(rows);
    expect(top).toHaveLength(5);
    expect(bottom).toHaveLength(5);
  });
});

describe('sortByChange', () => {
  it('orders improvements, then the stable band, then declines, with nulls last inside the stable band', () => {
    const rows = [
      row('Decline', -0.08),
      row('Missing', null),
      row('Stable', 0.004),
      row('Improve', 0.08),
      row('StableDown', -0.006)
    ];

    expect(names(sortByChange(rows))).toEqual(['Improve', 'Stable', 'StableDown', 'Missing', 'Decline']);
  });
});
