import * as React from "react";
import { HashRouter } from "react-router-dom";
import { Toast as PrimeToast } from "primereact/toast";
import {
  lockWebPartViewport,
  unlockWebPartViewport,
} from "../../../External/CommonServices/hideSharePointChrome";
import { injectRocaPrimeOverrides } from "../../../External/CommonServices/injectRocaPrimeOverrides";
import themeStyles from "../styles/theme.module.scss";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  clearFlashMessage,
} from "../../../store/slices/uiSlice";
import { initializeApp } from "../../../store/thunks/appThunks";
import type { IMainComponentProps } from "./IMainComponentProps";
import { LoaderOverlay, Toast, showErrorToast, showSuccessToast } from "./common/controls";
import AppShell from "./layout/AppShell/AppShell";
import AppRoutes from "./routes/AppRoutes";

/**
 * Handle Outlook SafeLinks stripping hash fragments from email Login links.
 * When `npdRoute` query parameter is present (NPD or Material Group emails),
 * restore it as the hash route before HashRouter mounts.
 * Keeps `id` / `mode` out of the SharePoint SitePages query string.
 */
(function handleNpdEmailRedirect(): void {
  if (typeof window === "undefined") {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const npdRoute = params.get("npdRoute");
  if (!npdRoute) {
    return;
  }
  const route = npdRoute.startsWith("/") ? npdRoute : `/${npdRoute}`;
  // Drop query params so SharePoint does not treat `id` as a SitePages item lookup.
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}#${route}`,
  );
})();

const MainComponent: React.FC<IMainComponentProps> = ({ spfxContext }) => {
  const dispatch = useAppDispatch();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const toastRef = React.useRef<PrimeToast>(null);
  const initialized = useAppSelector((state) => state.app.initialized);
  const roleStatus = useAppSelector((state) => state.app.roleStatus);
  const globalProcessing = useAppSelector((state) => state.ui.globalProcessing);
  const flashMessage = useAppSelector((state) => state.ui.flashMessage);
  const isResolvingAccess = !initialized || roleStatus === "loading";
  const showItemProgress = Boolean(globalProcessing?.showItemProgress);

  React.useEffect(() => {
    dispatch(initializeApp(spfxContext)).catch(() => undefined);
  }, [dispatch, spfxContext]);

  React.useEffect(() => {
    const lockLayout = (): void => {
      if (rootRef.current) {
        lockWebPartViewport(rootRef.current);
      }
    };

    lockLayout();
    injectRocaPrimeOverrides();
    window.addEventListener("resize", lockLayout);

    return () => {
      window.removeEventListener("resize", lockLayout);
      unlockWebPartViewport();
    };
  }, []);

  React.useEffect(() => {
    if (!flashMessage) {
      return;
    }
    if (flashMessage.severity === "success") {
      showSuccessToast(toastRef, flashMessage.detail);
    } else {
      showErrorToast(toastRef, flashMessage.detail);
    }
    dispatch(clearFlashMessage());
  }, [dispatch, flashMessage]);

  return (
    <div ref={rootRef} className={themeStyles.appRoot} data-roca-npd-root>
      <Toast ref={toastRef} />
      <LoaderOverlay
        visible={isResolvingAccess || Boolean(globalProcessing)}
        label="Processing"
        progressCurrent={
          showItemProgress ? globalProcessing?.current : undefined
        }
        progressTotal={showItemProgress ? globalProcessing?.total : undefined}
        progressPercent={
          showItemProgress ? globalProcessing?.percent : undefined
        }
        progressCaption={
          showItemProgress && globalProcessing
            ? `${globalProcessing.current} / ${globalProcessing.total}`
            : undefined
        }
      />
      <HashRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </HashRouter>
    </div>
  );
};
export default MainComponent;
