import { Config, FieldLabels } from "./Config";
import { isNpdRequestIdTitle } from "./npdRequestIdService";

export type NpdTabLockKind = "editing" | "draft-saved" | "submitted";

export type NpdTabSyncType =
  | "query"
  | "claim"
  | "heartbeat"
  | "release"
  | "draft-saved"
  | "submitted"
  | "lock-held";

export interface INpdTabSyncMessage {
  type: NpdTabSyncType;
  requestId: number;
  tabId: string;
  requestTitle?: string;
  at?: string;
  kind?: NpdTabLockKind;
}

export interface INpdTabRestriction {
  requestId: number;
  requestTitle: string;
  kind: NpdTabLockKind;
  at: string;
  tabId: string;
}

const CHANNEL_NAME = "roca-npd-request-tab-sync";
const STORAGE_KEY = "roca-npd-request-tab-sync";
const QUERY_WAIT_MS = 450;
const HEARTBEAT_MS = 2000;
const LOCK_STALE_MS = 5000;
const STORAGE_POLL_MS = 200;

type TabLockListener = () => void;
type TabSyncEnvelope = INpdTabSyncMessage & { nonce?: number };

const foreignLocks = new Map<number, INpdTabRestriction & { lastSeen: number }>();
const listeners = new Set<TabLockListener>();
let channel: BroadcastChannel | null = null;
let storageBound = false;
let pollTimer = 0;
let lastNonce = 0;
let runtimeTabId = "";
let localClaim: INpdTabRestriction | null = null;

export const NPD_TAB_QUERY_WAIT_MS = QUERY_WAIT_MS;
export const NPD_TAB_HEARTBEAT_MS = HEARTBEAT_MS;

export function getNpdTabId(): string {
  if (!runtimeTabId) {
    runtimeTabId = `tab-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }
  return runtimeTabId;
}

export function formatNpdTabClock(date: Date = new Date()): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatNpdTabRequestLabel(
  requestId: number,
  requestTitle?: string,
): string {
  const title = (requestTitle ?? "").trim();
  return isNpdRequestIdTitle(title) ? title : String(requestId);
}

export function formatNpdTabLockMessage(
  restriction: Pick<INpdTabRestriction, "kind" | "requestId" | "requestTitle" | "at">,
): string {
  const label = formatNpdTabRequestLabel(
    restriction.requestId,
    restriction.requestTitle,
  );
  const prefix = `${FieldLabels.RequestId}: ${label}`;
  if (restriction.kind === "draft-saved") {
    return `${prefix} was saved as draft in another tab at ${restriction.at}.`;
  }
  if (restriction.kind === "submitted") {
    return `${prefix} was updated in another tab at ${restriction.at}.`;
  }
  return `${prefix} is being edited in another tab.`;
}

export function getForeignNpdTabLock(
  requestId: number,
): INpdTabRestriction | null {
  expireStaleLocks();
  const lock = foreignLocks.get(requestId);
  return lock ? toRestriction(lock) : null;
}

export function initNpdTabSync(): void {
  ensureChannel();
}

export function subscribeNpdTabLocks(listener: TabLockListener): () => void {
  ensureChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLocalNpdTabClaim(claim: INpdTabRestriction | null): void {
  localClaim = claim;
}

export function publishNpdTabSync(message: INpdTabSyncMessage): void {
  ensureChannel();
  const envelope: TabSyncEnvelope = {
    ...message,
    nonce: Date.now() * 1000 + Math.floor(Math.random() * 1000),
  };
  lastNonce = envelope.nonce ?? 0;
  try {
    channel?.postMessage(envelope);
  } catch {
    channel = null;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    return;
  }
}

export function recordForeignNpdTabLock(
  restriction: INpdTabRestriction,
): void {
  foreignLocks.set(restriction.requestId, {
    ...restriction,
    lastSeen: Date.now(),
  });
  notifyListeners();
}

export function clearForeignNpdTabLock(requestId: number, tabId?: string): void {
  const current = foreignLocks.get(requestId);
  if (!current || (tabId && current.tabId !== tabId)) {
    return;
  }
  foreignLocks.delete(requestId);
  notifyListeners();
}

function ensureChannel(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!channel && typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener("message", (event: MessageEvent<TabSyncEnvelope>) => {
        ingestEnvelope(event.data);
      });
    } catch {
      channel = null;
    }
  }

  if (!storageBound) {
    storageBound = true;
    window.addEventListener("storage", onStorage);
    try {
      if (window.top && window.top !== window) {
        window.top.addEventListener("storage", onStorage);
      }
    } catch {
      // Isolated iframe cannot access window.top.
    }
  }

  if (!pollTimer) {
    pollTimer = window.setInterval(pollStorage, STORAGE_POLL_MS);
  }
}

function onStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY || !event.newValue) {
    return;
  }
  consumeStorageValue(event.newValue);
}

function pollStorage(): void {
  try {
    consumeStorageValue(localStorage.getItem(STORAGE_KEY));
  } catch {
    return;
  }
}

function consumeStorageValue(raw: string | null): void {
  if (!raw) {
    return;
  }

  try {
    ingestEnvelope(JSON.parse(raw) as TabSyncEnvelope);
  } catch {
    return;
  }
}

function ingestEnvelope(parsed: TabSyncEnvelope | null): void {
  if (!parsed) {
    return;
  }
  if (parsed.nonce && parsed.nonce === lastNonce) {
    return;
  }
  if (parsed.nonce) {
    lastNonce = parsed.nonce;
  }
  handleIncoming(parsed);
}

function handleIncoming(message: INpdTabSyncMessage | null): void {
  if (!message || message.requestId <= 0 || message.tabId === getNpdTabId()) {
    return;
  }

  if (
    message.type === "claim" ||
    message.type === "heartbeat" ||
    message.type === "lock-held" ||
    message.type === "draft-saved" ||
    message.type === "submitted"
  ) {
    recordForeignNpdTabLock({
      requestId: message.requestId,
      requestTitle: message.requestTitle ?? "",
      kind:
        message.kind ??
        (message.type === "draft-saved"
          ? "draft-saved"
          : message.type === "submitted"
            ? "submitted"
            : "editing"),
      at: message.at ?? formatNpdTabClock(),
      tabId: message.tabId,
    });
    return;
  }

  if (message.type === "query") {
    if (
      localClaim &&
      localClaim.requestId === message.requestId &&
      localClaim.tabId === getNpdTabId()
    ) {
      publishNpdTabSync({
        type: "lock-held",
        requestId: localClaim.requestId,
        tabId: localClaim.tabId,
        requestTitle: localClaim.requestTitle,
        at: localClaim.at,
        kind: localClaim.kind,
      });
    }
    return;
  }

  if (message.type === "release") {
    const current = foreignLocks.get(message.requestId);
    if (current && current.kind !== "editing") {
      return;
    }
    clearForeignNpdTabLock(message.requestId, message.tabId);
  }
}

function expireStaleLocks(): void {
  const now = Date.now();
  let changed = false;
  foreignLocks.forEach((lock, requestId) => {
    if (lock.kind !== "editing") {
      return;
    }
    if (now - lock.lastSeen > LOCK_STALE_MS) {
      foreignLocks.delete(requestId);
      changed = true;
    }
  });
  if (changed) {
    notifyListeners();
  }
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

function toRestriction(
  lock: INpdTabRestriction & { lastSeen: number },
): INpdTabRestriction {
  return {
    requestId: lock.requestId,
    requestTitle: lock.requestTitle,
    kind: lock.kind,
    at: lock.at,
    tabId: lock.tabId,
  };
}

export function npdTabDashboardRoute(): string {
  return Config.Routes.NpdAll;
}
