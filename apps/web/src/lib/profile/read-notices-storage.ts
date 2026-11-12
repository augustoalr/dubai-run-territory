const READ_NOTICES_KEY_PREFIX = "dubai_run_read_steal_notices:";

function storageKeyForUser(userId: string): string {
  return `${READ_NOTICES_KEY_PREFIX}${userId}`;
}

/**
 * Loads the set of steal notice IDs marked as read for a given runner ID.
 * Uses localStorage isolated per user because ownership_events has no read column
 * or UPDATE grant for authenticated clients.
 */
export function loadReadNoticeIds(userId: string): Set<string> {
  if (typeof window === "undefined" || !userId) {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function persistReadNoticeIds(userId: string, ids: Set<string>): Set<string> {
  if (typeof window === "undefined" || !userId) {
    return ids;
  }

  try {
    window.localStorage.setItem(storageKeyForUser(userId), JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage quota or Safari private browsing errors
  }

  return ids;
}

/**
 * Marks a single steal notice ID as read for the given runner and persists it locally.
 */
export function markNoticeRead(userId: string, noticeId: string): Set<string> {
  const next = new Set(loadReadNoticeIds(userId));
  next.add(noticeId);
  return persistReadNoticeIds(userId, next);
}

/**
 * Marks multiple steal notice IDs as read for the given runner and persists them locally.
 */
export function markAllNoticesRead(userId: string, noticeIds: readonly string[]): Set<string> {
  const next = new Set(loadReadNoticeIds(userId));
  for (const id of noticeIds) {
    next.add(id);
  }
  return persistReadNoticeIds(userId, next);
}
