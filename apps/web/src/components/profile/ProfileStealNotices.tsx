"use client";

import { useI18n } from "@/i18n";
import type { StealNoticeItem } from "@/lib/profile";

interface ProfileStealNoticesProps {
  notices: StealNoticeItem[];
  readIds: ReadonlySet<string>;
  onMarkRead: (noticeId: string) => void;
  onMarkAllRead: () => void;
}

export function ProfileStealNotices({
  notices,
  readIds,
  onMarkRead,
  onMarkAllRead,
}: ProfileStealNoticesProps) {
  const { t, formatDate } = useI18n();

  const unreadCount = notices.reduce(
    (count, notice) => (readIds.has(notice.id) ? count : count + 1),
    0,
  );

  return (
    <section className="profile-section-card" aria-labelledby="profile-notices-heading">
      <div className="profile-section-header">
        <div className="profile-section-title-row">
          <h2 id="profile-notices-heading" className="profile-section-title">
            {t.profileNoticesTitle}
          </h2>
          <span className={`profile-unread-pill ${unreadCount > 0 ? "is-unread" : "is-clear"}`}>
            {unreadCount > 0 ? t.profileNoticesUnreadCount(unreadCount) : t.profileNoticesAllRead}
          </span>
        </div>

        {unreadCount > 0 && (
          <button type="button" className="profile-text-action-btn" onClick={onMarkAllRead}>
            {t.profileMarkAllRead}
          </button>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="profile-empty-box">
          <p className="profile-empty-title">{t.profileNoNoticesTitle}</p>
          <p className="profile-empty-desc">{t.profileNoNoticesDesc}</p>
        </div>
      ) : (
        <ul className="profile-notices-list" aria-label={t.profileNoticesAria}>
          {notices.map((notice) => {
            const isRead = readIds.has(notice.id);
            const actor = notice.actorAlias ?? t.anonymousRunner;
            const leagueLabel = notice.leagueCode ? t.leagues[notice.leagueCode] : null;
            const message = leagueLabel
              ? t.profileNoticeStole(actor, leagueLabel)
              : t.profileNoticeStoleGenericLeague(actor);

            return (
              <li
                key={notice.id}
                className={`profile-notice-item ${isRead ? "is-read" : "is-unread"}`}
              >
                <div className="profile-notice-body">
                  <div className="profile-notice-top">
                    {!isRead && <span className="profile-notice-dot" aria-hidden="true" />}
                    <p className="profile-notice-text">{message}</p>
                  </div>
                  <span className="profile-notice-date">{formatDate(notice.createdAt)}</span>
                </div>

                <div className="profile-notice-action">
                  {isRead ? (
                    <span className="profile-notice-read-tag">{t.profileNoticeRead}</span>
                  ) : (
                    <button
                      type="button"
                      className="profile-notice-mark-btn"
                      onClick={() => onMarkRead(notice.id)}
                      aria-label={t.profileMarkReadAria(actor)}
                    >
                      {t.profileMarkRead}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
