"use client";

import { useCallback, useEffect, useState } from "react";
import { localRunStorage, type StoredRun } from "@/lib/recording/indexeddb-storage";
import type { ThemeMode } from "@/lib/territory/cell-paint";
import { EmptyRunsView } from "./EmptyRunsView";
import { RunCardItem } from "./RunCardItem";
import { RunDetailModal } from "./RunDetailModal";
import { RunsHeader } from "./RunsHeader";
import { UploadWatchFileCard } from "./UploadWatchFileCard";

export function RunsPageContainer() {
  const [runs, setRuns] = useState<StoredRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<StoredRun | null>(null);

  const [theme] = useState<ThemeMode>(() => {
    if (typeof document === "undefined") return "dark";
    return (document.documentElement.getAttribute("data-theme") as ThemeMode) || "dark";
  });

  useEffect(() => {
    let isMounted = true;

    void localRunStorage
      .getAllRuns()
      .then((stored) => {
        if (!isMounted) return;
        const sorted = [...stored].sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        );
        setRuns(sorted);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setRuns([]);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteRun = useCallback(async (id: string) => {
    await localRunStorage.deleteRun(id);
    setRuns((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleRunImported = useCallback((imported: StoredRun) => {
    setRuns((prev) => [imported, ...prev.filter((r) => r.id !== imported.id)]);
    setSelectedRun(imported);
  }, []);

  return (
    <div className="runs-viewport">
      <div className="runs-content-container">
        <RunsHeader />

        <main className="runs-main">
          {isLoading ? (
            <div className="runs-loading glass" role="status">
              <div className="runs-spinner" aria-hidden="true" />
              <span>Cargando tus carreras...</span>
            </div>
          ) : runs.length === 0 ? (
            <EmptyRunsView />
          ) : (
            <div className="runs-list" role="list">
              {runs.map((run) => (
                <RunCardItem key={run.id} run={run} onClick={() => setSelectedRun(run)} />
              ))}
            </div>
          )}

          <UploadWatchFileCard onRunImported={handleRunImported} />
        </main>

        <RunDetailModal
          run={selectedRun}
          theme={theme}
          onClose={() => setSelectedRun(null)}
          onDelete={handleDeleteRun}
        />
      </div>
    </div>
  );
}
