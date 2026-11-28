import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

/**
 * pulls data-access layer. New PR-list queries live here; the legacy inline
 * queries in routes.ts are tracked debt (pr-self-review baseline).
 * Every query is scoped by `workspaceId` (tenancy guard).
 */

/** One (PR, severity) bucket; `severity` is null for a review with no findings. */
export interface SeverityCountRow {
  prId: string;
  severity: string | null;
  n: number;
}

export class PullsRepository {
  constructor(private db: Db) {}

  /**
   * Finding counts per (PR, severity) over the latest review of EACH agent.
   * `reviews` rows exist only for done runs, so this is "latest done run per
   * agent". DISTINCT ON keeps the newest review per (pr, agent) — NULL
   * agent_ids collapse into one group — and the LEFT JOIN keeps reviewed-but-
   * clean PRs as a row with severity null. PRs with no review return no rows.
   */
  async latestReviewSeverityCounts(
    workspaceId: string,
    prIds: string[],
  ): Promise<SeverityCountRow[]> {
    if (prIds.length === 0) return [];
    const latest = this.db
      .selectDistinctOn([t.reviews.prId, t.reviews.agentId], {
        id: t.reviews.id,
        prId: t.reviews.prId,
      })
      .from(t.reviews)
      .where(
        and(
          eq(t.reviews.workspaceId, workspaceId),
          inArray(t.reviews.prId, prIds),
          eq(t.reviews.kind, 'review'),
        ),
      )
      .orderBy(t.reviews.prId, t.reviews.agentId, desc(t.reviews.createdAt))
      .as('latest');
    return this.db
      .select({
        prId: latest.prId,
        severity: t.findings.severity,
        n: sql<number>`count(${t.findings.id})`.mapWith(Number),
      })
      .from(latest)
      .leftJoin(t.findings, eq(t.findings.reviewId, latest.id))
      .groupBy(latest.prId, t.findings.severity);
  }
}
