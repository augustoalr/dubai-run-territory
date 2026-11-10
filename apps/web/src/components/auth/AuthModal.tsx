"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/supabase";
import { validateEmail } from "@/lib/supabase/validation";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null;
  return <AuthModalDialog onClose={onClose} />;
}

function AuthModalDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { isConfigured, isEmailLoginEnabled, signInWithGoogle, signInWithOtp, verifyOtp } =
    useAuth();

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsLoading(false);
      setErrorMessage(t.authGenericError);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setErrorMessage(t.authGenericError);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await signInWithOtp(email);
    setIsLoading(false);

    if (error) {
      setErrorMessage(t.authGenericError);
      return;
    }

    setIsOtpSent(true);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) return;

    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await verifyOtp(email, otpCode);
    setIsLoading(false);

    if (error) {
      setErrorMessage(t.authGenericError);
      return;
    }

    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={onClose}
    >
      <div className="modal-card glass auth-modal-card" onClick={(e) => e.stopPropagation()}>
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
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h2 id="auth-modal-title" className="modal-title">
              {t.authModalTitle}
            </h2>
            <p className="modal-subtitle">{t.authModalSubtitle}</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
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

        {!isConfigured ? (
          <div className="auth-notice-banner">
            <div className="flex items-center gap-2 mb-1 font-semibold text-color-mine">
              <span className="zone-badge">{t.mvpBadge}</span>
            </div>
            <p className="text-xs leading-relaxed text-text-secondary">
              {t.authNotConfiguredNotice}
            </p>
          </div>
        ) : (
          <div className="auth-modal-body">
            {/* Google OAuth Button */}
            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="flex-shrink-0"
              >
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{t.authContinueGoogle}</span>
            </button>

            {/* Email OTP Conditional Flow */}
            {isEmailLoginEnabled && (
              <>
                <div className="auth-divider">
                  <span className="auth-divider-line" />
                  <span className="auth-divider-text">{t.authOrDivider}</span>
                  <span className="auth-divider-line" />
                </div>

                {!isOtpSent ? (
                  <form onSubmit={handleSendOtp} className="auth-form">
                    <div className="auth-input-group">
                      <label htmlFor="auth-email" className="auth-input-label">
                        {t.authEmailLabel}
                      </label>
                      <input
                        id="auth-email"
                        type="email"
                        required
                        className="auth-input"
                        placeholder={t.authEmailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </div>
                    <button
                      type="submit"
                      className="action-btn-primary"
                      disabled={isLoading || !email.trim()}
                    >
                      {isLoading ? t.authSendingOtp : t.authSendOtp}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="auth-form">
                    <p className="auth-notice-text">{t.authOtpSentNotice}</p>
                    <div className="auth-input-group">
                      <label htmlFor="auth-otp" className="auth-input-label">
                        {t.authOtpCodeLabel}
                      </label>
                      <input
                        id="auth-otp"
                        type="text"
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="auth-input auth-otp-input"
                        placeholder={t.authOtpPlaceholder}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      className="action-btn-primary"
                      disabled={isLoading || otpCode.length < 6}
                    >
                      {isLoading ? t.authVerifyingOtp : t.authVerifyOtp}
                    </button>
                    <button
                      type="button"
                      className="auth-secondary-btn"
                      onClick={() => setIsOtpSent(false)}
                      disabled={isLoading}
                    >
                      {t.authChangeEmail}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
