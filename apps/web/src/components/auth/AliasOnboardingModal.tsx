"use client";

import { useState } from "react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/supabase";
import { validateAlias } from "@/lib/supabase/validation";

export function AliasOnboardingModal() {
  const { t } = useI18n();
  const { user, profile, isLoading, saveAlias, signOut } = useAuth();

  const [alias, setAlias] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isSubmitting || isSigningOut;

  // Show only when user is logged in, profile loaded, and alias is not yet set
  const needsOnboarding = Boolean(
    !isLoading && user && profile && (profile.alias === null || profile.alias === ""),
  );

  if (!needsOnboarding) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setErrorMessage(null);

    const validation = validateAlias(alias);
    if (!validation.valid) {
      switch (validation.error) {
        case "TOO_SHORT":
          setErrorMessage(t.aliasErrorTooShort);
          return;
        case "TOO_LONG":
          setErrorMessage(t.aliasErrorTooLong);
          return;
        case "CONTAINS_WHITESPACE":
          setErrorMessage(t.aliasErrorWhitespace);
          return;
        case "CONTAINS_CONTROL_CHARS":
          setErrorMessage(t.aliasErrorControlChars);
          return;
        default:
          setErrorMessage(t.aliasErrorGeneric);
          return;
      }
    }

    setIsSubmitting(true);
    const result = await saveAlias(validation.normalized);
    setIsSubmitting(false);

    if (!result.success) {
      if (result.error === "ALIAS_TAKEN") {
        setErrorMessage(t.aliasErrorTaken);
      } else if (result.error === "INVALID_FORMAT") {
        setErrorMessage(t.aliasErrorWhitespace);
      } else {
        setErrorMessage(t.aliasErrorGeneric);
      }
    }
  };

  const handleSignOut = async () => {
    if (isBusy) return;
    setIsSigningOut(true);
    setErrorMessage(null);
    try {
      const res = await signOut();
      if (res.error) {
        setErrorMessage(t.profileLogoutError);
      }
    } catch {
      setErrorMessage(t.profileLogoutError);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div
      className="modal-backdrop alias-onboarding-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alias-modal-title"
    >
      <div className="modal-card glass alias-modal-card">
        <div className="modal-header">
          <div className="modal-icon-badge">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <h2 id="alias-modal-title" className="modal-title">
              {t.aliasModalTitle}
            </h2>
            <p className="modal-subtitle">{t.aliasModalSubtitle}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form alias-form">
          <div className="auth-input-group">
            <div className="flex items-center justify-between">
              <label htmlFor="runner-alias-input" className="auth-input-label">
                {t.aliasLabel}
              </label>
              <span className="alias-char-counter">{alias.length} / 20</span>
            </div>
            <input
              id="runner-alias-input"
              type="text"
              required
              minLength={3}
              maxLength={20}
              className="auth-input"
              placeholder={t.aliasPlaceholder}
              value={alias}
              onChange={(e) => {
                setAlias(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isBusy}
              autoFocus
              autoComplete="nickname"
            />
            <span className="auth-input-hint">{t.aliasHelp}</span>
          </div>

          <button
            type="submit"
            className="action-btn-primary"
            disabled={isBusy || alias.trim().length < 3}
          >
            {isSubmitting ? t.aliasSavingBtn : t.aliasSaveBtn}
          </button>

          <button
            type="button"
            className="auth-secondary-btn"
            onClick={handleSignOut}
            disabled={isBusy}
          >
            {isSigningOut ? t.profileLogoutLoggingOut : t.logout}
          </button>
        </form>
      </div>
    </div>
  );
}
