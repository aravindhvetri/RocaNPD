import * as React from "react";

/**
 * Gates list-page LoaderOverlay until the mount/deps-triggered fetch settles.
 *
 * List screens keep prior rows in Redux (`status === "idle"`). Without this gate,
 * the first paint after side-nav navigation shows that stale table, then the
 * effect sets `loading` and the page appears to reload (flicker).
 *
 * Starts pending when `enabled` so the first paint already shows the loader.
 * Uses `useLayoutEffect` so dependency changes (e.g. `?as=`) also hide stale
 * rows before the browser paints.
 *
 * @returns `true` while the current fetch cycle should keep the page loader up
 */
export function useListPageFetch(
  load: () => void | Promise<unknown>,
  deps: React.DependencyList,
  enabled = true,
): boolean {
  const loadRef = React.useRef(load);
  loadRef.current = load;

  const [pending, setPending] = React.useState(enabled);
  const requestIdRef = React.useRef(0);

  React.useLayoutEffect(() => {
    if (!enabled) {
      setPending(false);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setPending(true);

    let cancelled = false;
    void Promise.resolve(loadRef.current()).finally(() => {
      if (!cancelled && requestIdRef.current === requestId) {
        setPending(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // Caller owns the dependency list for when `load` should re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps from caller
  }, [enabled, ...deps]);

  return pending;
}
