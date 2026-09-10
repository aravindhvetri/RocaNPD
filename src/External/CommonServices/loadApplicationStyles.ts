import { SPComponentLoader } from "@microsoft/sp-loader";
import { hideSharePointChrome, lockWebPartViewport } from "./hideSharePointChrome";

/**
 * PrimeReact / PrimeIcons CSS must be loaded at runtime via SPComponentLoader.
 * Direct `import "primeicons/primeicons.css"` in the WebPart breaks SPFx webpack
 * because font url() references produce unresolved ___CSS_LOADER_URL_REPLACEMENT_* tokens.
 */
const CDN = "https://cdn.jsdelivr.net/npm";

const STYLE_URLS: readonly string[] = [
  `${CDN}/primereact@10.9.7/resources/themes/bootstrap4-light-blue/theme.css`,
  `${CDN}/primeicons@7.0.0/primeicons.css`,
  `${CDN}/primeflex@4.0.0/primeflex.css`,
  "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
];

export function loadApplicationStyles(rootElement?: HTMLElement): void {
  hideSharePointChrome();
  if (rootElement) {
    lockWebPartViewport(rootElement);
  }
  STYLE_URLS.forEach((url) => SPComponentLoader.loadCss(url));
}
