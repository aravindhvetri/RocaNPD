import * as React from "react";
import type { INpdTabRestriction } from "../../../../../External/CommonServices/npdRequestTabSync";
import {
  clearForeignNpdTabLock,
  formatNpdTabClock,
  getForeignNpdTabLock,
  getNpdTabId,
  NPD_TAB_HEARTBEAT_MS,
  NPD_TAB_QUERY_WAIT_MS,
  publishNpdTabSync,
  setLocalNpdTabClaim,
  subscribeNpdTabLocks,
} from "../../../../../External/CommonServices/npdRequestTabSync";

export function useNpdRequestTabLock(options: {
  requestId: number;
  requestTitle: string;
  isOpen: boolean;
}): {
  restriction: INpdTabRestriction | null;
  notifyDraftSaved: (requestId?: number, requestTitle?: string) => void;
  notifySubmitted: (requestId?: number, requestTitle?: string) => void;
  consumeIfRestricted: () => boolean;
} {
  const { requestId, requestTitle, isOpen } = options;
  const tabId = React.useMemo(() => getNpdTabId(), []);
  const holdingRef = React.useRef(false);
  const skipReleaseRef = React.useRef(false);
  const pendingRestrictionRef = React.useRef<INpdTabRestriction | null>(null);
  const requestIdRef = React.useRef(requestId);
  const titleRef = React.useRef(requestTitle);
  requestIdRef.current = requestId;
  titleRef.current = requestTitle;
  const [restriction, setRestriction] = React.useState<INpdTabRestriction | null>(
    null,
  );

  const publish = React.useCallback(
    (
      type:
        | "query"
        | "claim"
        | "heartbeat"
        | "release"
        | "draft-saved"
        | "submitted",
      kind?: INpdTabRestriction["kind"],
      overrideId?: number,
      overrideTitle?: string,
    ) => {
      const id = overrideId ?? requestIdRef.current;
      if (!id) {
        return;
      }
      publishNpdTabSync({
        type,
        requestId: id,
        tabId,
        requestTitle: overrideTitle ?? titleRef.current,
        at: formatNpdTabClock(),
        kind,
      });
    },
    [tabId],
  );

  const presentRestriction = React.useCallback(
    (foreign: INpdTabRestriction | null): void => {
      if (!foreign) {
        pendingRestrictionRef.current = null;
        setRestriction((current) =>
          current && current.kind === "editing" ? null : current,
        );
        return;
      }

      // Action locks (draft/submit) and editing conflicts: show as soon as this
      // tab is visible — no click required. If hidden, queue until focus/visibility.
      if (isTabVisible()) {
        pendingRestrictionRef.current = null;
        setRestriction(foreign);
        return;
      }

      pendingRestrictionRef.current = foreign;
    },
    [],
  );

  const flushPendingRestriction = React.useCallback((): void => {
    if (!isTabVisible()) {
      return;
    }

    const pending = pendingRestrictionRef.current;
    const foreign =
      pending ?? getForeignNpdTabLock(requestIdRef.current);

    if (!foreign) {
      return;
    }

    // Draft saved / submitted from another tab always wins over a local edit claim.
    if (
      holdingRef.current &&
      (foreign.kind === "draft-saved" || foreign.kind === "submitted")
    ) {
      holdingRef.current = false;
      setLocalNpdTabClaim(null);
      skipReleaseRef.current = true;
      publish("release");
    } else if (holdingRef.current && foreign.kind === "editing") {
      // Still holding a live edit — only yield if the other tab wins.
      return;
    }

    pendingRestrictionRef.current = null;
    setRestriction(foreign);
  }, [publish]);

  React.useEffect(() => {
    return subscribeNpdTabLocks(() => {
      const foreign = getForeignNpdTabLock(requestIdRef.current);
      if (!foreign) {
        presentRestriction(null);
        return;
      }

      if (holdingRef.current && foreign.kind === "editing") {
        if (foreign.tabId < tabId) {
          holdingRef.current = false;
          setLocalNpdTabClaim(null);
          publish("release");
          presentRestriction(foreign);
        }
        return;
      }

      if (
        holdingRef.current &&
        (foreign.kind === "draft-saved" || foreign.kind === "submitted")
      ) {
        holdingRef.current = false;
        setLocalNpdTabClaim(null);
        skipReleaseRef.current = true;
        publish("release");
      }

      presentRestriction(foreign);
    });
  }, [presentRestriction, publish, tabId]);

  React.useEffect(() => {
    skipReleaseRef.current = false;
    if (!requestId) {
      holdingRef.current = false;
      pendingRestrictionRef.current = null;
      setRestriction(null);
      return;
    }

    publish("query");
    const timer = window.setTimeout(() => {
      if (skipReleaseRef.current) {
        return;
      }
      const foreign = getForeignNpdTabLock(requestId);
      // Fresh open: only a live editing claim blocks. Stale submitted/draft-saved
      // left in storage after the acting tab navigated away must not block View.
      if (foreign && foreign.kind === "editing") {
        holdingRef.current = false;
        presentRestriction(foreign);
        return;
      }
      if (!isOpen) {
        return;
      }
      holdingRef.current = true;
      pendingRestrictionRef.current = null;
      setRestriction(null);
      setLocalNpdTabClaim({
        requestId,
        requestTitle: titleRef.current,
        kind: "editing",
        at: formatNpdTabClock(),
        tabId,
      });
      publish("claim", "editing");
    }, NPD_TAB_QUERY_WAIT_MS);

    return () => {
      window.clearTimeout(timer);
      if (holdingRef.current && !skipReleaseRef.current) {
        holdingRef.current = false;
        setLocalNpdTabClaim(null);
        publish("release");
      }
    };
  }, [isOpen, presentRestriction, publish, requestId, tabId]);

  React.useEffect(() => {
    if (!requestId || !isOpen) {
      return undefined;
    }

    const beat = window.setInterval(() => {
      if (holdingRef.current && !skipReleaseRef.current) {
        publish("heartbeat", "editing");
      }
    }, NPD_TAB_HEARTBEAT_MS);

    const onUnload = (): void => {
      if (holdingRef.current && !skipReleaseRef.current) {
        holdingRef.current = false;
        setLocalNpdTabClaim(null);
        publish("release");
      }
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      window.clearInterval(beat);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [isOpen, publish, requestId]);

  React.useEffect(() => {
    const onVisible = (): void => {
      if (document.visibilityState === "visible") {
        flushPendingRestriction();
      }
    };
    const onFocus = (): void => {
      flushPendingRestriction();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const removeTopFocus = addSameOriginTopListener("focus", onFocus);
    const removeTopVisibility = addSameOriginTopListener(
      "visibilitychange",
      onVisible,
    );

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      removeTopFocus();
      removeTopVisibility();
    };
  }, [flushPendingRestriction]);

  const notifyDraftSaved = React.useCallback(
    (savedId?: number, savedTitle?: string) => {
      skipReleaseRef.current = true;
      holdingRef.current = false;
      setLocalNpdTabClaim(null);
      publish("draft-saved", "draft-saved", savedId, savedTitle);
      clearForeignNpdTabLock(savedId ?? requestIdRef.current, tabId);
    },
    [publish, tabId],
  );

  const notifySubmitted = React.useCallback(
    (savedId?: number, savedTitle?: string) => {
      skipReleaseRef.current = true;
      holdingRef.current = false;
      setLocalNpdTabClaim(null);
      publish("submitted", "submitted", savedId, savedTitle);
      clearForeignNpdTabLock(savedId ?? requestIdRef.current, tabId);
    },
    [publish, tabId],
  );

  const consumeIfRestricted = React.useCallback((): boolean => {
    if (holdingRef.current) {
      return false;
    }
    const foreign =
      pendingRestrictionRef.current ??
      restriction ??
      getForeignNpdTabLock(requestIdRef.current);
    if (!foreign) {
      return false;
    }
    pendingRestrictionRef.current = null;
    setRestriction(foreign);
    return true;
  }, [restriction]);

  return { restriction, notifyDraftSaved, notifySubmitted, consumeIfRestricted };
}

function isTabVisible(): boolean {
  return document.visibilityState === "visible";
}

function addSameOriginTopListener(
  type: string,
  handler: () => void,
  capture = false,
): () => void {
  try {
    const topWindow = window.top;
    if (!topWindow || topWindow === window) {
      return () => undefined;
    }
    topWindow.addEventListener(type, handler, capture);
    return () => topWindow.removeEventListener(type, handler, capture);
  } catch {
    return () => undefined;
  }
}
