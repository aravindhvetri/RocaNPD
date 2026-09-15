/** PrimeReact overlays append here so theme styles from `.appRoot` apply. */
export const getAppRootElement = (): HTMLElement | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }

  return document.querySelector("[data-roca-npd-root]") as HTMLElement | null
    ?? undefined;
};
