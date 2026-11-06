"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/i18n";
import { importWatchFile } from "@/lib/recording/run-importer";
import type { StoredRun } from "@/lib/recording/indexeddb-storage";

interface UploadWatchFileCardProps {
  onRunImported: (run: StoredRun) => void;
}

export function UploadWatchFileCard({ onRunImported }: UploadWatchFileCardProps) {
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const stored = await importWatchFile(file);
      setSuccessMessage(
        t.fileSaveSuccess(
          (stored.distanceMeters / 1000).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        ),
      );
      onRunImported(stored);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.fileReadError;
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <section className="glass upload-watch-card" aria-label={t.advancedOption}>
      <div className="upload-watch-header">
        <span className="upload-watch-badge">{t.advancedOption}</span>
        <p className="upload-watch-desc">{t.uploadWatchDesc}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx,.fit,application/gpx+xml"
        onChange={handleFileChange}
        style={{ display: "none" }}
        data-testid="watch-file-input"
        disabled={isProcessing}
      />

      <div className="upload-watch-actions">
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isProcessing}
          className="btn btn-secondary upload-watch-btn"
        >
          {isProcessing ? t.readingFile : t.uploadWatchBtn}
        </button>
      </div>

      {errorMessage && (
        <div className="upload-watch-error" role="alert">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="upload-watch-success" role="status">
          {successMessage}
        </div>
      )}
    </section>
  );
}
