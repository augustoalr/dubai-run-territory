"use client";

import { useI18n } from "@/i18n";

interface LocaleToggleProps {
  className?: string;
}

export function LocaleToggle({ className = "" }: LocaleToggleProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={`legal-lang-toggle ${className}`} role="group" aria-label={t.selectLanguage}>
      <button
        type="button"
        className={`lang-option ${locale === "es" ? "active" : ""}`}
        onClick={() => setLocale("es")}
        aria-pressed={locale === "es"}
        aria-label="Español"
      >
        ES
      </button>
      <button
        type="button"
        className={`lang-option ${locale === "en" ? "active" : ""}`}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
