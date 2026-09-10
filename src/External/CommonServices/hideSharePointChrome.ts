const STYLE_ID = "roca-npd-hide-sp-chrome";

/**
 * Hides default SharePoint suite bar, site header, command bar, and app bar
 * so the ROCA NPD web part uses the full page canvas.
 */
export function hideSharePointChrome(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-automationid="AppChrome"] {
      margin: 0px !important;
    }

    #SuiteNavWrapper,
    #O365_MainLink_NavMenu,
    #O365_NavHeader,
    #spSiteHeader,
    #sp-appBar,
    #spCommandBar,
    .ms-compositeHeader,
    [data-automationid="SiteHeader"],
    [data-automation-id="SiteHeader"],
    [data-automationid="pageCommandBar"],
    [data-automation-id="pageCommandBar"],
    [data-automationid="SiteHeaderTitle"],
    [data-automationid="SiteHeaderEditLink"],
    .CanvasZoneToolbar-sticky,
    .commandBarWrapper {
      display: none !important;
    }

    #spPageCanvasContent,
    .CanvasZone,
    .CanvasSection,
    .ControlZone,
    .ControlZone--control,
    [data-automation-id="CanvasZone"],
    [data-automation-id="CanvasSection"] {
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    [data-automation-id="CanvasLayout"] {
      margin: 0 !important;
      padding: 0 !important;
    }

    .CanvasComponent.L1 .ControlZone--control {
      padding: 0 !important;
      margin: 0 !important;
    }

    #workbenchPageContent,
    .CanvasZone:not(.fullWidth) {
      max-width: 100% !important;
    }

    html,
    body {
      height: 100% !important;
      max-height: 100% !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    body {
      position: fixed !important;
      inset: 0 !important;
      width: 100% !important;
    }

    #spPageCanvasContent,
    .spPageCanvasContent,
    .CanvasComponent.L1,
    .ControlZone--control,
    .CanvasZone,
    #workbenchPageContent,
    .SPCanvas-canvas,
    .SPCanvas,
    [data-automation-id="Canvas"],
    [data-automation-id="contentScrollRegion"],
    #contentScrollRegion {
      overflow: hidden !important;
      height: 100dvh !important;
      max-height: 100dvh !important;
    }
  `;

  document.head.appendChild(style);
}

/** Locks the SPFx web part host chain to the viewport so only in-app regions scroll. */
export function lockWebPartViewport(rootElement: HTMLElement): void {
  rootElement.style.height = "100dvh";
  rootElement.style.maxHeight = "100dvh";
  rootElement.style.overflow = "hidden";

  if (document.documentElement) {
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = "100%";
  }

  if (document.body) {
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.inset = "0";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
  }

  let element: HTMLElement | null = rootElement.parentElement;

  for (let depth = 0; depth < 12 && element && element !== document.body; depth += 1) {
    element.style.overflow = "hidden";
    element.style.maxHeight = "100dvh";
    element.style.height = "100%";
    element.style.boxSizing = "border-box";
    element.style.padding = "0";
    element.style.margin = "0";
    element = element.parentElement;
  }
}

/** Restores document scroll when the web part unmounts. */
export function unlockWebPartViewport(): void {
  if (document.body) {
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.inset = "";
    document.body.style.width = "";
    document.body.style.height = "";
    document.body.style.margin = "";
    document.body.style.padding = "";
  }

  if (document.documentElement) {
    document.documentElement.style.overflow = "";
    document.documentElement.style.height = "";
  }
}
