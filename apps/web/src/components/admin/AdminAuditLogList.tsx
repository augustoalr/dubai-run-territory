"use client";

import { useI18n } from "@/i18n";
import type { AdminAuditLogItem } from "@/lib/admin";

interface AdminAuditLogListProps {
  logs: AdminAuditLogItem[];
}

export function AdminAuditLogList({ logs }: AdminAuditLogListProps) {
  const { t, formatDate } = useI18n();

  if (logs.length === 0) {
    return (
      <div className="profile-state-card">
        <p className="profile-state-desc">{t.adminEmptyAudit}</p>
      </div>
    );
  }

  return (
    <ul className="admin-audit-list">
      {logs.map((entry) => {
        const metadataAlias =
          typeof entry.metadata.admin_alias === "string" && entry.metadata.admin_alias.length > 0
            ? entry.metadata.admin_alias
            : null;
        const actor = entry.adminAlias ?? metadataAlias ?? t.adminDeletedAccount;
        const actionLabel = t.adminAuditActions[entry.action];
        const targetLabel = t.adminTargetTypes[entry.targetType];

        return (
          <li key={entry.id} className="admin-audit-item">
            <div className="admin-card-header">
              <div className="admin-card-heading">
                <span className="admin-card-title">{actionLabel}</span>
                <span className="admin-card-meta">
                  {targetLabel} · {entry.targetId.slice(0, 8)} · {t.adminActorLabel}: {actor}
                </span>
              </div>
              <span className="admin-card-meta">{formatDate(entry.createdAt)}</span>
            </div>
            <p className="admin-detail-note">{entry.reason}</p>
          </li>
        );
      })}
    </ul>
  );
}
