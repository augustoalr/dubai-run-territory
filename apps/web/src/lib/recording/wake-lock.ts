/**
 * Wrapper for the Screen Wake Lock API to prevent the device display
 * from dimming or locking during a run.
 */
export class WakeLockService {
  private sentinel: WakeLockSentinel | null = null;
  private desiredState = false;

  public isSupported(): boolean {
    return typeof window !== "undefined" && "wakeLock" in navigator;
  }

  public isLocked(): boolean {
    return this.sentinel !== null && !this.sentinel.released;
  }

  public async acquire(): Promise<boolean> {
    this.desiredState = true;
    if (!this.isSupported()) {
      return false;
    }

    try {
      if (this.sentinel && !this.sentinel.released) {
        return true;
      }

      this.sentinel = await navigator.wakeLock.request("screen");
      this.sentinel.addEventListener("release", () => {
        this.sentinel = null;
      });
      return true;
    } catch {
      this.sentinel = null;
      return false;
    }
  }

  public async release(): Promise<void> {
    this.desiredState = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        // Ignore release errors
      } finally {
        this.sentinel = null;
      }
    }
  }

  /**
   * Re-acquires the lock when the page returns to visibility, if recording is active.
   */
  public async handleVisibilityChange(): Promise<void> {
    if (this.desiredState && document.visibilityState === "visible") {
      await this.acquire();
    }
  }
}

export const wakeLockService = new WakeLockService();
