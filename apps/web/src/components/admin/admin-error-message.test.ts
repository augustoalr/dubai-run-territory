import { describe, expect, it } from "vitest";
import { en, es } from "@/i18n/dictionaries";
import {
  resolveAdminErrorMessage,
  resolveFlagLabel,
  resolveRunSourceLabel,
} from "./admin-error-message";

describe("admin-error-message helpers", () => {
  it("maps every admin-review error code to the matching localized message", () => {
    for (const dict of [es, en]) {
      expect(resolveAdminErrorMessage("out_of_window", dict)).toBe(dict.adminErrors.out_of_window);
      expect(resolveAdminErrorMessage("missing_timestamps", dict)).toBe(
        dict.adminErrors.missing_timestamps,
      );
      expect(resolveAdminErrorMessage("no_active_season", dict)).toBe(
        dict.adminErrors.no_active_season,
      );
      expect(resolveAdminErrorMessage("track_unavailable", dict)).toBe(
        dict.adminErrors.track_unavailable,
      );

      // Exact 409 codes returned by supabase/functions/admin-review/index.ts
      expect(resolveAdminErrorMessage("run_not_in_review", dict)).toBe(dict.adminErrors.conflict);
      expect(resolveAdminErrorMessage("run_already_applied", dict)).toBe(dict.adminErrors.conflict);
      expect(resolveAdminErrorMessage("run_already_voided", dict)).toBe(dict.adminErrors.conflict);
      expect(resolveAdminErrorMessage("report_already_closed", dict)).toBe(
        dict.adminErrors.conflict,
      );

      // 404 / 403 / 401
      expect(resolveAdminErrorMessage("run_not_found", dict)).toBe(dict.adminErrors.not_found);
      expect(resolveAdminErrorMessage("report_not_found", dict)).toBe(dict.adminErrors.not_found);
      expect(resolveAdminErrorMessage("forbidden", dict)).toBe(dict.adminErrors.forbidden);
      expect(resolveAdminErrorMessage("unauthorized", dict)).toBe(dict.adminErrors.unauthorized);

      // 400 validation errors
      expect(resolveAdminErrorMessage("invalid_reason", dict)).toBe(dict.adminReasonTooShort);
      expect(resolveAdminErrorMessage("invalid_body", dict)).toBe(dict.adminErrors.invalid_request);
      expect(resolveAdminErrorMessage("invalid_action", dict)).toBe(
        dict.adminErrors.invalid_request,
      );
      expect(resolveAdminErrorMessage("invalid_target_id", dict)).toBe(
        dict.adminErrors.invalid_request,
      );

      // Fallback
      expect(resolveAdminErrorMessage("unexpected_server_code", dict)).toBe(
        dict.adminErrors.generic,
      );
    }
  });

  it("translates known anti-cheat flags and falls back safely for unknown ones", () => {
    for (const dict of [es, en]) {
      expect(resolveFlagLabel("SPIKE", dict)).toBe(dict.adminFlagLabels.SPIKE);
      expect(resolveFlagLabel("JUMP", dict)).toBe(dict.adminFlagLabels.JUMP);
      expect(resolveFlagLabel("GAP", dict)).toBe(dict.adminFlagLabels.GAP);
      expect(resolveFlagLabel("CUSTOM_FLAG", dict)).toBe("CUSTOM_FLAG");
    }
  });

  it("translates known run sources and falls back safely for unknown ones", () => {
    for (const dict of [es, en]) {
      expect(resolveRunSourceLabel("upload", dict)).toBe(dict.adminRunSources.upload);
      expect(resolveRunSourceLabel("garmin", dict)).toBe(dict.adminRunSources.garmin);
      expect(resolveRunSourceLabel("polar", dict)).toBe(dict.adminRunSources.polar);
      expect(resolveRunSourceLabel("browser", dict)).toBe(dict.adminRunSources.browser);
      expect(resolveRunSourceLabel("other_source", dict)).toBe("other_source");
    }
  });
});
