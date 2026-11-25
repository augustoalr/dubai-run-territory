import {
  getSupabase,
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { buildSampleAdminData } from "./mock-admin";
import type {
  AdminActionPayload,
  AdminActionResult,
  AdminActionType,
  AdminAuditLogItem,
  AdminLoadResult,
  AdminReportItem,
  AdminReportStatus,
  AdminRepository,
  AdminRepositoryDeps,
  AdminRunItem,
} from "./types";

const ADMIN_REVIEW_PATH = "/functions/v1/admin-review";

export class HybridAdminRepository implements AdminRepository {
  private readonly deps: AdminRepositoryDeps;

  constructor(deps: Partial<AdminRepositoryDeps> = {}) {
    this.deps = {
      getSupabase: deps.getSupabase ?? getSupabase,
      isSupabaseConfigured: deps.isSupabaseConfigured ?? isSupabaseConfigured,
      fetcher: deps.fetcher ?? fetch,
    };
  }

  private async resolveAccessToken(explicitToken?: string | null): Promise<string | null> {
    if (explicitToken !== undefined) {
      return explicitToken && explicitToken.trim().length > 0 ? explicitToken : null;
    }

    const supabase = this.deps.getSupabase();
    if (!supabase) return null;

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      return token && token.trim().length > 0 ? token : null;
    } catch {
      return null;
    }
  }

  private buildHeaders(accessToken: string): Record<string, string> {
    return {
      apikey: getSupabaseAnonKey(),
      Authorization: `Bearer ${accessToken}`,
    };
  }

  async getQueue(accessToken?: string | null): Promise<AdminLoadResult> {
    if (!this.deps.isSupabaseConfigured()) {
      return buildSampleAdminData();
    }

    const token = await this.resolveAccessToken(accessToken);
    if (!token) {
      return buildUnauthenticatedResult();
    }

    try {
      const endpoint = `${getSupabaseUrl()}${ADMIN_REVIEW_PATH}`;
      const response = await this.deps.fetcher(endpoint, {
        method: "GET",
        headers: this.buildHeaders(token),
      });

      if (response.status === 401) {
        return buildUnauthenticatedResult();
      }
      if (response.status === 403) {
        return buildForbiddenResult();
      }
      if (!response.ok) {
        return buildErrorResult();
      }

      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!payload || typeof payload !== "object") {
        return buildErrorResult();
      }

      return {
        status: "ready",
        isSampleData: false,
        error: null,
        runsReview: parseRunsList(payload.runsReview),
        reports: parseReportsList(payload.reports),
        auditLogs: parseAuditLogsList(payload.auditLogs),
      };
    } catch {
      return buildErrorResult();
    }
  }

  async submitAction(payload: AdminActionPayload): Promise<AdminActionResult> {
    const trimmedReason = payload.reason.trim();
    if (trimmedReason.length < 3 || trimmedReason.length > 500) {
      return { ok: false, status: 400, code: "invalid_reason" };
    }

    if (!this.deps.isSupabaseConfigured()) {
      return { ok: true, action: payload.action, targetId: payload.targetId };
    }

    const token = await this.resolveAccessToken(payload.accessToken);
    if (!token) {
      return { ok: false, status: 401, code: "unauthorized" };
    }

    try {
      const endpoint = `${getSupabaseUrl()}${ADMIN_REVIEW_PATH}`;
      const response = await this.deps.fetcher(endpoint, {
        method: "POST",
        headers: {
          ...this.buildHeaders(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: payload.action,
          targetId: payload.targetId,
          reason: trimmedReason,
        }),
      });

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok) {
        const errorCode =
          body && typeof body.error === "string" && body.error.length > 0
            ? body.error
            : `http_${response.status}`;
        return {
          ok: false,
          status: response.status,
          code: errorCode,
        };
      }

      return {
        ok: true,
        action: payload.action,
        targetId: payload.targetId,
      };
    } catch {
      return { ok: false, status: 0, code: "network_error" };
    }
  }
}

export const adminRepository: AdminRepository = new HybridAdminRepository();

function buildUnauthenticatedResult(): AdminLoadResult {
  return {
    status: "unauthenticated",
    isSampleData: false,
    error: null,
    runsReview: [],
    reports: [],
    auditLogs: [],
  };
}

function buildForbiddenResult(): AdminLoadResult {
  return {
    status: "forbidden",
    isSampleData: false,
    error: null,
    runsReview: [],
    reports: [],
    auditLogs: [],
  };
}

function buildErrorResult(): AdminLoadResult {
  return {
    status: "error",
    isSampleData: false,
    error: "network_error",
    runsReview: [],
    reports: [],
    auditLogs: [],
  };
}

function parseCoordinates(raw: unknown): [number, number][] {
  if (!Array.isArray(raw)) return [];
  const coords: [number, number][] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const lon = item[0];
    const lat = item[1];
    if (
      typeof lon === "number" &&
      typeof lat === "number" &&
      Number.isFinite(lon) &&
      Number.isFinite(lat)
    ) {
      coords.push([lon, lat]);
    }
  }
  return coords;
}

function parseFlags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseRunItem(raw: unknown): AdminRunItem | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.userId !== "string") return null;

  return {
    id: row.id,
    userId: row.userId,
    runnerAlias: typeof row.runnerAlias === "string" ? row.runnerAlias : null,
    zoneId: typeof row.zoneId === "string" ? row.zoneId : "",
    seasonId: typeof row.seasonId === "string" ? row.seasonId : null,
    format: typeof row.format === "string" ? row.format : "gpx",
    source: typeof row.source === "string" ? row.source : "upload",
    sport: typeof row.sport === "string" ? row.sport : null,
    startedAt: typeof row.startedAt === "string" ? row.startedAt : null,
    endedAt: typeof row.endedAt === "string" ? row.endedAt : null,
    distanceInZoneM:
      typeof row.distanceInZoneM === "number" && Number.isFinite(row.distanceInZoneM)
        ? row.distanceInZoneM
        : null,
    status: typeof row.status === "string" ? row.status : "review",
    rejectCode: typeof row.rejectCode === "string" ? row.rejectCode : null,
    flags: parseFlags(row.flags),
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    coordinates: parseCoordinates(row.coordinates),
    trackUnavailable: row.trackUnavailable === true,
  };
}

function parseRunsList(raw: unknown): AdminRunItem[] {
  if (!Array.isArray(raw)) return [];
  const items: AdminRunItem[] = [];
  for (const entry of raw) {
    const parsed = parseRunItem(entry);
    if (parsed) items.push(parsed);
  }
  return items;
}

function isReportStatus(value: unknown): value is AdminReportStatus {
  return value === "open" || value === "reviewing" || value === "resolved" || value === "dismissed";
}

function parseReportsList(raw: unknown): AdminReportItem[] {
  if (!Array.isArray(raw)) return [];
  const items: AdminReportItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.runId !== "string" ||
      typeof row.reporterId !== "string" ||
      typeof row.reason !== "string"
    ) {
      continue;
    }
    items.push({
      id: row.id,
      runId: row.runId,
      reporterId: row.reporterId,
      reporterAlias: typeof row.reporterAlias === "string" ? row.reporterAlias : null,
      reason: row.reason,
      status: isReportStatus(row.status) ? row.status : "open",
      createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
      run: parseRunItem(row.run),
    });
  }
  return items;
}

function isAdminAction(value: unknown): value is AdminActionType {
  return (
    value === "approve_run" ||
    value === "void_run" ||
    value === "dismiss_report" ||
    value === "resolve_report"
  );
}

function parseAuditLogsList(raw: unknown): AdminAuditLogItem[] {
  if (!Array.isArray(raw)) return [];
  const items: AdminAuditLogItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      !isAdminAction(row.action) ||
      typeof row.targetId !== "string" ||
      typeof row.reason !== "string"
    ) {
      continue;
    }
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    items.push({
      id: row.id,
      adminId: typeof row.adminId === "string" ? row.adminId : null,
      adminAlias: typeof row.adminAlias === "string" ? row.adminAlias : null,
      action: row.action,
      targetType: row.targetType === "report" ? "report" : "run",
      targetId: row.targetId,
      reason: row.reason,
      metadata,
      createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    });
  }
  return items;
}
