import type { Container } from '../../platform/container.js';
import { PullsRepository } from './repository.js';
import { foldFindingsCounts, type FindingsCounts } from './helpers.js';

/**
 * pulls service. Business logic for new PR-list features; no HTTP and no raw
 * SQL here — persistence goes through PullsRepository, pure transforms through
 * helpers.ts. (Older list/detail logic still lives inline in routes.ts.)
 */
export class PullsService {
  private repo: PullsRepository;

  constructor(container: Container) {
    this.repo = new PullsRepository(container.db);
  }

  /**
   * FINDINGS column — per-severity counts summed over the latest review of
   * each agent. Spec: client/specs/pr-list-findings-column.md.
   */
  async findingsCountsByPr(
    workspaceId: string,
    prIds: string[],
  ): Promise<Map<string, FindingsCounts>> {
    return foldFindingsCounts(await this.repo.latestReviewSeverityCounts(workspaceId, prIds));
  }
}
