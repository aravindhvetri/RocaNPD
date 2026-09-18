import * as React from "react";
import type { INpdTabRestriction } from "../../../../../External/CommonServices/npdRequestTabSync";
import {
  formatNpdTabClock,
  getForeignNpdTabLock,
  getNpdTabId,
  NPD_TAB_QUERY_WAIT_MS,
  publishNpdTabSync,
  subscribeNpdTabLocks,
} from "../../../../../External/CommonServices/npdRequestTabSync";

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
        const foreign = getForeignNpdTabLock(pendingId);
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

      const existing = getForeignNpdTabLock(requestId);
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
        const foreign = getForeignNpdTabLock(requestId);
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
