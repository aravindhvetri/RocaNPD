/**
 * Browser / fetch network connectivity helpers for action error handling.
 * Does not auto-retry or resume failed operations when the connection returns.
 */

export const NETWORK_OFFLINE_MESSAGE =
  "No internet connection. Please check your network and try again.";

/** True when the browser reports an active network connection. */
export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine !== false;
}

/** Throws {@link NETWORK_OFFLINE_MESSAGE} when the browser is offline. */
export function assertBrowserOnline(): void {
  if (!isBrowserOnline()) {
    throw new Error(NETWORK_OFFLINE_MESSAGE);
  }
}

/**
 * Rejects when the browser stays offline while `promise` is still pending.
 * A short grace period allows brief reconnects so an in-flight request that
 * is still succeeding is not interrupted. Reconnecting after this rejects
 * does not resume the operation — the caller must retry manually.
 */
export function raceWithBrowserOffline<T>(
  promise: Promise<T>,
  offlineGraceMs = 1500,
): Promise<T> {
  assertBrowserOnline();

  if (typeof window === "undefined") {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let graceTimerId = 0;

    // Function declarations are hoisted — avoids no-use-before-define with mutual refs.
    function onOffline(): void {
      if (graceTimerId) {
        window.clearTimeout(graceTimerId);
      }
      graceTimerId = window.setTimeout(() => {
        graceTimerId = 0;
        if (!isBrowserOnline()) {
          finish(() => reject(new Error(NETWORK_OFFLINE_MESSAGE)));
        }
      }, offlineGraceMs);
    }

    function onOnline(): void {
      if (graceTimerId) {
        window.clearTimeout(graceTimerId);
        graceTimerId = 0;
      }
    }

    function cleanup(): void {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      if (graceTimerId) {
        window.clearTimeout(graceTimerId);
        graceTimerId = 0;
      }
    }

    function finish(handler: () => void): void {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      handler();
    }

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    promise.then(
      (value) => finish(() => resolve(value)),
      (error) => finish(() => reject(error)),
    );
  });
}

/**
 * True when the error looks like a lost connection / failed fetch,
 * or the browser is already offline.
 */
export function isNetworkError(error: unknown): boolean {
  if (!isBrowserOnline()) {
    return true;
  }

  if (typeof error === "string") {
    return matchesNetworkMessage(error);
  }

  if (error instanceof Error) {
    if (matchesNetworkMessage(error.message) || matchesNetworkMessage(error.name)) {
      return true;
    }
    const withCode = error as Error & { code?: string; status?: number };
    if (
      withCode.code === "NETWORK_ERROR" ||
      withCode.code === "ECONNABORTED" ||
      withCode.code === "ENOTFOUND" ||
      withCode.status === 0
    ) {
      return true;
    }
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = String(record.message ?? record.statusText ?? "");
    if (matchesNetworkMessage(message)) {
      return true;
    }
    if (record.status === 0 || record.code === "NETWORK_ERROR") {
      return true;
    }
  }

  return false;
}

function matchesNetworkMessage(value: string): boolean {
  const text = (value || "").trim().toLowerCase();
  if (!text) {
    return false;
  }
  return (
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("network error") ||
    text.includes("network request failed") ||
    text.includes("load failed") ||
    text.includes("err_internet_disconnected") ||
    text.includes("err_network_changed") ||
    text.includes("err_connection") ||
    text.includes("net::err_") ||
    text.includes("the internet connection appears to be offline") ||
    text.includes("no internet") ||
    text.includes("offline") ||
    text === "networkerror when attempting to fetch resource."
  );
}

/**
 * Maps thrown/rejected values to a user-facing action error.
 * Network failures always use {@link NETWORK_OFFLINE_MESSAGE}.
 */
export function toUserActionErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred.",
): string {
  if (isNetworkError(error)) {
    return NETWORK_OFFLINE_MESSAGE;
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}
