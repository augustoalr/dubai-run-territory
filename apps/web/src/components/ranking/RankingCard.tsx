"use client";

import type { RankedRunner } from "@dubai-run/core";
import { useI18n } from "@/i18n";
import { getInitials } from "@/lib/territory/mock-data";

interface RankingCardProps {
  runner: RankedRunner;
  isCurrentUser: boolean;
}

export function RankingCard({ runner, isCurrentUser }: RankingCardProps) {
  const { t } = useI18n();

  return (
    <article
      className={`ranking-runner-card glass ${isCurrentUser ? "is-current-user" : ""}`}
      aria-label={t.rankingPositionAria(runner.rank, runner.alias ?? t.anonymousRunner)}
    >
      <div className="card-left">
        <div className="card-rank-badge">
          <span className="card-rank-hash">#</span>
          <span className="card-rank-num">{runner.rank}</span>
        </div>

        <div className="card-avatar">{getInitials(runner.alias)}</div>

        <div className="card-runner-info">
          <div className="card-alias-row">
            <span className="card-alias" title={runner.alias ?? t.anonymousRunner}>
              {runner.alias ?? t.anonymousRunner}
            </span>
            {isCurrentUser && <span className="card-you-pill">{t.you}</span>}
          </div>
          <div className="card-submetrics">
            <span>{t.rankingCellsCount(runner.cellsOwned)}</span>
            <span className="card-metric-dot">·</span>
            <span>
              {runner.distanceInZoneKm} {t.rankingKmUnit}
            </span>
          </div>
        </div>
      </div>

      <div className="card-right">
        <div className="card-score">
          <span className="card-points">{runner.points}</span>
          <span className="card-points-unit">{t.rankingPointsSuffix}</span>
        </div>
      </div>
    </article>
  );
}
