/**
 * Yields until the browser has painted pending React updates (e.g. LoaderOverlay).
 * Needed so small/fast imports do not finish before the loader appears, and so
 * dialog hide + mask cleanup can run under a visible overlay.
 */
export function awaitUiPaint(): Promise<void> {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}
