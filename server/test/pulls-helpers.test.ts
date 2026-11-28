/**
 * `modules/pulls/helpers.ts` — folding the repository's (PR, severity, n) rows
 * into the FINDINGS column counts. The SQL side is covered by reviews.it.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { foldFindingsCounts } from '../src/modules/pulls/helpers.js';

describe('foldFindingsCounts', () => {
  it('sums counts per PR and severity', () => {
    const out = foldFindingsCounts([
      { prId: 'a', severity: 'CRITICAL', n: 1 },
      { prId: 'a', severity: 'WARNING', n: 2 },
      { prId: 'a', severity: 'CRITICAL', n: 3 },
      { prId: 'b', severity: 'SUGGESTION', n: 4 },
    ]);
    expect(out.get('a')).toEqual({ CRITICAL: 4, WARNING: 2, SUGGESTION: 0 });
    expect(out.get('b')).toEqual({ CRITICAL: 0, WARNING: 0, SUGGESTION: 4 });
  });

  it('keeps a reviewed-but-clean PR (severity null) as zeros', () => {
    expect(foldFindingsCounts([{ prId: 'a', severity: null, n: 0 }]).get('a')).toEqual({
      CRITICAL: 0,
      WARNING: 0,
      SUGGESTION: 0,
    });
  });

  it('ignores severities outside the contract and leaves unreviewed PRs absent', () => {
    const out = foldFindingsCounts([{ prId: 'a', severity: 'INFO', n: 5 }]);
    expect(out.get('a')).toEqual({ CRITICAL: 0, WARNING: 0, SUGGESTION: 0 });
    expect(out.has('b')).toBe(false);
  });
});
