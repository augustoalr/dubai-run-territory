"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/supabase";

interface AppMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppMenuModal({ isOpen, onClose }: AppMenuModalProps) {
  const { t } = useI18n();
  const { user, profile, openAuthModal, signOut } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-menu-title"
      onClick={onClose}
    >
      <div className="modal-card glass app-menu-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-icon-badge">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
          <div>
            <h2 id="app-menu-title" className="modal-title">
              {t.menuTitle}
            </h2>
            <p className="modal-subtitle">{t.menuSubtitle}</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={t.menuCloseAria}
          >
            ✕
          </button>
        </div>

        {/* User Account / Login Section */}
        <div className="menu-account-section">
          {user ? (
            <div className="menu-user-card">
              <div className="menu-user-header">
                <div className="menu-user-avatar">
                  {profile?.alias ? profile.alias[0].toUpperCase() : "R"}
                </div>
                <div className="menu-user-info">
                  <div className="menu-user-name">{profile?.alias ?? t.anonymousRunner}</div>
                  {user.email && <div className="menu-user-email">{user.email}</div>}
                  <span className="menu-user-status-pill">{t.menuUserLogged}</span>
                </div>
              </div>
              <button
                type="button"
                className="menu-logout-btn"
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>{t.logout}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="menu-login-card"
              onClick={() => {
                onClose();
                openAuthModal();
              }}
            >
              <div className="menu-item-icon">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="menu-item-content text-left">
                <span className="menu-item-title">{t.login}</span>
                <span className="menu-item-desc">{t.menuLoginDesc}</span>
              </div>
              <span className="menu-item-arrow" aria-hidden="true">
                →
              </span>
            </button>
          )}
        </div>

        <div className="app-menu-lang-row flex items-center justify-between py-2 px-1 border-b border-border-glass">
          <span className="text-sm font-medium text-text-secondary">{t.menuLanguage}</span>
          <LocaleToggle />
        </div>

        <nav className="app-menu-nav" aria-label="Navegación principal y legal">
          <Link href="/ranking" className="menu-nav-item" onClick={onClose}>
            <div className="menu-item-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
                <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <div className="menu-item-content">
              <span className="menu-item-title">{t.menuRankingTitle}</span>
              <span className="menu-item-desc">{t.menuRankingDesc}</span>
            </div>
            <span className="menu-item-arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link href="/terminos" className="menu-nav-item" onClick={onClose}>
            <div className="menu-item-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="menu-item-content">
              <span className="menu-item-title">{t.menuTermsTitle}</span>
              <span className="menu-item-desc">{t.menuTermsDesc}</span>
            </div>
            <span className="menu-item-arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link href="/privacidad" className="menu-nav-item" onClick={onClose}>
            <div className="menu-item-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="menu-item-content">
              <span className="menu-item-title">{t.menuPrivacyTitle}</span>
              <span className="menu-item-desc">{t.menuPrivacyDesc}</span>
            </div>
            <span className="menu-item-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </nav>

        <div className="app-menu-info-box">
          <span className="zone-badge">{t.mvpBadge}</span>
          <p className="app-menu-info-text">{t.menuInfoText}</p>
        </div>

        <div className="modal-footer">
          <button type="button" className="action-btn-primary" onClick={onClose}>
            {t.backToMap}
          </button>
        </div>
      </div>
    </div>
  );
}
