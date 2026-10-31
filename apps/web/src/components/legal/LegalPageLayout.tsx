"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import type { LegalDocument, LegalLocale } from "@/lib/legal/legal-content";
import { ThemeToggle } from "@/components/territory/ThemeToggle";

interface LegalPageLayoutProps {
  docEs: LegalDocument;
  docEn: LegalDocument;
  initialLocale?: LegalLocale;
}

export function LegalPageLayout({ docEs, docEn, initialLocale = "es" }: LegalPageLayoutProps) {
  const [locale, setLocale] = useState<LegalLocale>(initialLocale);
  const [theme, setTheme] = useState<ThemeMode>("dark");

  // Sync html data-theme for CSS tokens
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const doc = locale === "es" ? docEs : docEn;

  return (
    <div className="legal-viewport" data-theme={theme}>
      {/* Top sticky navigation bar */}
      <header className="legal-topbar glass">
        <div className="legal-topbar-inner">
          <div className="legal-topbar-left">
            <Link
              href="/"
              className="legal-back-button"
              aria-label={locale === "es" ? "Volver al mapa" : "Back to map"}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>{locale === "es" ? "Mapa" : "Map"}</span>
            </Link>

            <div className="legal-brand-group">
              <span className="zone-badge">Jumeirah · Kite</span>
              <span className="legal-app-title">Territorio</span>
            </div>
          </div>

          <div className="legal-topbar-actions">
            {/* Language toggle pill */}
            <div
              className="legal-lang-toggle"
              role="group"
              aria-label={locale === "es" ? "Seleccionar idioma" : "Select language"}
            >
              <button
                type="button"
                className={`lang-option ${locale === "es" ? "active" : ""}`}
                onClick={() => setLocale("es")}
                aria-pressed={locale === "es"}
              >
                ES
              </button>
              <button
                type="button"
                className={`lang-option ${locale === "en" ? "active" : ""}`}
                onClick={() => setLocale("en")}
                aria-pressed={locale === "en"}
              >
                EN
              </button>
            </div>

            {/* Theme toggle */}
            <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
          </div>
        </div>
      </header>

      {/* Main content reader container */}
      <main className="legal-content-wrap">
        <article className="legal-document">
          {/* Top Legal Review Notice Banner */}
          <div className="legal-notice-banner" role="status">
            <div className="notice-icon" aria-hidden="true">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="notice-body">
              <p className="notice-headline">{doc.draftNotice}</p>
              <p className="notice-subtext">{doc.draftDescription}</p>
            </div>
          </div>

          {/* Document Header */}
          <header className="legal-doc-header">
            <div className="legal-doc-eyebrow">
              <span className="season-pill">
                {locale === "es" ? "Fase 0 · MVP" : "Phase 0 · MVP"}
              </span>
              <time className="legal-date-badge">{doc.lastUpdated}</time>
            </div>
            <h1 className="legal-doc-title">{doc.title}</h1>
            <p className="legal-doc-subtitle">{doc.subtitle}</p>
          </header>

          {/* Document Body Sections */}
          <div className="legal-sections-stack">
            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} className="legal-section-card glass">
                <h2 className="legal-section-title">{section.title}</h2>

                {section.paragraphs.map((para, idx) => (
                  <p key={idx} className="legal-paragraph">
                    {para}
                  </p>
                ))}

                {section.bulletPoints && section.bulletPoints.length > 0 && (
                  <ul className="legal-bullet-list">
                    {section.bulletPoints.map((point, pIdx) => {
                      const colonIdx = point.indexOf(":");
                      if (colonIdx > 0) {
                        const boldPart = point.slice(0, colonIdx);
                        const restPart = point.slice(colonIdx);
                        return (
                          <li key={pIdx} className="legal-bullet-item">
                            <span className="bullet-bullet" aria-hidden="true">
                              •
                            </span>
                            <span>
                              <strong className="legal-bullet-strong">{boldPart}</strong>
                              {restPart}
                            </span>
                          </li>
                        );
                      }
                      return (
                        <li key={pIdx} className="legal-bullet-item">
                          <span className="bullet-bullet" aria-hidden="true">
                            •
                          </span>
                          <span>{point}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {section.callout && (
                  <div className="legal-callout-box">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="callout-icon"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p className="callout-text">{section.callout}</p>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Document Footer Navigation */}
          <footer className="legal-doc-footer glass">
            <div className="footer-links-row">
              <Link href={doc.relatedLinkHref} className="legal-related-link">
                <span>{doc.relatedLinkText}</span>
                <span aria-hidden="true">→</span>
              </Link>

              <Link href="/" className="legal-footer-home-link">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                <span>
                  {locale === "es" ? "Regresar al mapa interactivo" : "Back to interactive map"}
                </span>
              </Link>
            </div>

            <div className="footer-bottom-copy">
              <p>
                {locale === "es"
                  ? "Territorio · Juego de corredores para la pista de Jumeirah Beach – Kite Beach, Dubái."
                  : "Territory · Running game for the Jumeirah Beach – Kite Beach track, Dubai."}
              </p>
              <p className="footer-contact-row">
                <span>{locale === "es" ? "Contacto:" : "Contact:"}</span>
                <a href={`mailto:${doc.contactEmail}`} className="footer-email-link">
                  {doc.contactEmail}
                </a>
              </p>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}
