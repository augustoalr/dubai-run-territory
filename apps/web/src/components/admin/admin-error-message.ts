import type { Dictionary } from "@/i18n/dictionaries";

export function resolveAdminErrorMessage(code: string, t: Dictionary): string {
  switch (code) {
    case "out_of_window":
      return t.adminErrors.out_of_window;
    case "missing_timestamps":
      return t.adminErrors.missing_timestamps;
    case "no_active_season":
      return t.adminErrors.no_active_season;
    case "track_unavailable":
      return t.adminErrors.track_unavailable;
    case "run_not_in_review":
    case "run_already_voided":
    case "report_already_closed":
      return t.adminErrors.conflict;
    case "run_not_found":
    case "report_not_found":
      return t.adminErrors.not_found;
    case "forbidden":
      return t.adminErrors.forbidden;
    case "unauthorized":
      return t.adminErrors.unauthorized;
    case "invalid_reason":
      return t.adminReasonTooShort;
    case "invalid_body":
    case "invalid_action":
    case "invalid_target_id":
      return t.adminErrors.invalid_request;
    default:
      return t.adminErrors.generic;
  }
}

export function resolveFlagLabel(flag: string, t: Dictionary): string {
  switch (flag) {
    case "SPIKE":
      return t.adminFlagLabels.SPIKE;
    case "JUMP":
      return t.adminFlagLabels.JUMP;
    case "GAP":
      return t.adminFlagLabels.GAP;
    default:
      return flag;
  }
}

export function resolveRunSourceLabel(source: string, t: Dictionary): string {
  switch (source) {
    case "upload":
      return t.adminRunSources.upload;
    case "garmin":
      return t.adminRunSources.garmin;
    case "polar":
      return t.adminRunSources.polar;
    case "browser":
      return t.adminRunSources.browser;
    default:
      return source;
  }
}
