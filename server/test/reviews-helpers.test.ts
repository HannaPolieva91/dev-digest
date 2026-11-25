import { describe, it, expect } from 'vitest';
import { taskLine, usageLine } from '../src/modules/reviews/helpers.js';

/**
 * Unit coverage for the review task-line. The key invariant: our trusted
 * instruction always tells the model to review the whole diff and never
 * withhold a security/correctness finding — no matter what the PR text claims.
 */

describe('taskLine', () => {
  const pull = { number: 3, title: 'test: vulnerable fixture', author: 'burnjohn' } as never;

  it('names the PR being reviewed', () => {
    const line = taskLine(pull);
    expect(line).toContain('#3');
    expect(line).toContain('test: vulnerable fixture');
  });

  it('keeps the non-negotiable "never withhold security" rule', () => {
    const line = taskLine(pull);
    expect(line).toMatch(/never .*withhold .*(or downgrade )?.*security/i);
    expect(line).toMatch(/review the entire diff/i);
  });
});

describe('usageLine (M1 cost badge)', () => {
  it('formats tokens with separators and the cost', () => {
    // Same string as the client badge's formatUsd(0.00020792) → "$0.00021".
    expect(usageLine(1642, 64, 0.00020792)).toBe('Usage: 1,642 in / 64 out · $0.00021');
    expect(usageLine(12000, 1500, 0.06)).toBe('Usage: 12,000 in / 1,500 out · $0.060');
  });

  it('unknown cost reads "cost n/a", never $0', () => {
    expect(usageLine(100, 50, null)).toBe('Usage: 100 in / 50 out · cost n/a');
  });

  it('a non-finite cost reads "cost n/a", never "$NaN"', () => {
    expect(usageLine(1, 1, Number.NaN)).toBe('Usage: 1 in / 1 out · cost n/a');
    expect(usageLine(1, 1, Number.POSITIVE_INFINITY)).toBe('Usage: 1 in / 1 out · cost n/a');
  });

  it('a tiny non-zero cost never rounds down to $0', () => {
    expect(usageLine(20, 5, 3e-7)).toBe('Usage: 20 in / 5 out · <$0.000001');
  });
});
