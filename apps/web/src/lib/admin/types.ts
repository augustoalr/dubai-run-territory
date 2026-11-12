import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminActionType = "approve_run" | "void_run" | "dismiss_report" | "resolve_report";

export type AdminReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface AdminRunItem {
  id: string;
  userId: string;
  runnerAlias: string | null;
  zoneId: string;
  seasonId: string | null;
  format: string;
  source: string;
  sport: string | null;
  startedAt: string | null;
  endedAt: string | null;
  distanceInZoneM: number | null;
  status: string;
  rejectCode: string | null;
  flags: string[];
  createdAt: string;
  coordinates: [number, number][];
  trackUnavailable: boolean;
}

export interface AdminReportItem {
  id: string;
  runId: string;
  reporterId: string;
  reporterAlias: string | null;
  reason: string;
  status: AdminReportStatus;
  createdAt: string;
  run: AdminRunItem | null;
}

export interface AdminAuditLogItem {
  id: string;
  adminId: string | null;
  adminAlias: string | null;
  action: AdminActionType;
  targetType: "run" | "report";
  targetId: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type AdminLoadResult =
  | {
      status: "sample";
      isSampleData: true;
      error: null;
      runsReview: AdminRunItem[];
      reports: AdminReportItem[];
      auditLogs: AdminAuditLogItem[];
    }
  | {
      status: "unauthenticated";
      isSampleData: false;
      error: null;
      runsReview: [];
      reports: [];
      auditLogs: [];
    }
  | {
      status: "forbidden";
      isSampleData: false;
      error: null;
      runsReview: [];
      reports: [];
      auditLogs: [];
    }
  | {
      status: "ready";
      isSampleData: false;
      error: null;
      runsReview: AdminRunItem[];
      reports: AdminReportItem[];
      auditLogs: AdminAuditLogItem[];
    }
  | {
      status: "error";
      isSampleData: false;
      error: "network_error";
      runsReview: [];
      reports: [];
      auditLogs: [];
    };

export type AdminActionResult =
  | { ok: true; action: AdminActionType; targetId: string }
  | { ok: false; status: number; code: string };

export interface AdminActionPayload {
  action: AdminActionType;
  targetId: string;
  reason: string;
  accessToken?: string | null;
}

export interface AdminRepositoryDeps {
  getSupabase: () => SupabaseClient | null;
  isSupabaseConfigured: () => boolean;
  fetcher: typeof fetch;
}

export interface AdminRepository {
  getQueue(accessToken?: string | null): Promise<AdminLoadResult>;
  submitAction(payload: AdminActionPayload): Promise<AdminActionResult>;
}
