import * as React from "react";
import type { INpdTabRestriction } from "../../../../../External/CommonServices/npdRequestTabSync";
import {
  formatNpdTabClock,
  getForeignEditingLock,
  getNpdTabId,
  NPD_TAB_QUERY_WAIT_MS,
  publishNpdTabSync,
  subscribeNpdTabLocks,
} from "../../../../../External/CommonServices/npdRequestTabSync";

/**
 * List-row guard: only blocks View/Edit when another same-user tab holds a live
 * editing claim. Draft-saved / submitted must not block a later View click.
 */
export function useNpdRequestTabGuard(): {
  restriction: INpdTabRestriction | null;
  guardAction: (
    requestId: number,
    requestTitle: string,
    proceed: () => void,
  ) => void;
  goToDashboard: () => void;
  reload: () => void;
} {
  const tabId = React.useMemo(() => getNpdTabId(), []);
  const [restriction, setRestriction] = React.useState<INpdTabRestriction | null>(
    null,
  );
  const pendingIdRef = React.useRef(0);

  React.useEffect(
    () =>
      subscribeNpdTabLocks(() => {
        const pendingId = pendingIdRef.current;
        if (!pendingId) {
          return;
        }
        const foreign = getForeignEditingLock(pendingId);
        if (foreign) {
          pendingIdRef.current = 0;
          setRestriction(foreign);
        }
      }),
    [],
  );

  const guardAction = React.useCallback(
    (requestId: number, requestTitle: string, proceed: () => void) => {
      if (!requestId) {
        proceed();
        return;
      }

      const existing = getForeignEditingLock(requestId);
      if (existing) {
        setRestriction(existing);
        return;
      }

      pendingIdRef.current = requestId;
      publishNpdTabSync({
        type: "query",
        requestId,
        tabId,
        requestTitle,
        at: formatNpdTabClock(),
      });

      window.setTimeout(() => {
        const foreign = getForeignEditingLock(requestId);
        if (foreign) {
          pendingIdRef.current = 0;
          setRestriction(foreign);
          return;
        }
        if (pendingIdRef.current === requestId) {
          pendingIdRef.current = 0;
          proceed();
        }
      }, NPD_TAB_QUERY_WAIT_MS);
    },
    [tabId],
  );

  const goToDashboard = React.useCallback(() => {
    setRestriction(null);
  }, []);

  const reload = React.useCallback(() => {
    window.location.reload();
  }, []);

  return {
    restriction,
    guardAction,
    goToDashboard,
    reload,
  };
}
