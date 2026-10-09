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
import { clearMaterialGroupBusyState } from "../../../store/slices/materialGroupSlice";
import { clearNpdFormBusyState } from "../../../store/slices/npdFormSlice";
import { clearFlashMessage } from "../../../store/slices/uiSlice";
import { initializeApp } from "../../../store/thunks/appThunks";
import { finishUiProcessing } from "../../../store/uiProcessing";
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
  const npdSaveStatus = useAppSelector((state) => state.npdForm.saveStatus);
  const mgSaveStatus = useAppSelector((state) => state.materialGroup.saveStatus);
  const mgSubmitStatus = useAppSelector(
    (state) => state.materialGroup.submitStatus,
  );
  const mgConsultantStatus = useAppSelector(
    (state) => state.materialGroup.consultantActionStatus,
  );
  const flashMessage = useAppSelector((state) => state.ui.flashMessage);
  const isResolvingAccess = !initialized || roleStatus === "loading";
  const showItemProgress = Boolean(globalProcessing?.showItemProgress);
  const hasBusyAction =
    Boolean(globalProcessing) ||
    npdSaveStatus === "saving" ||
    npdSaveStatus === "submitting" ||
    mgSaveStatus === "saving" ||
    mgSubmitStatus === "submitting" ||
    mgConsultantStatus === "saving";

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

  // Stop stuck loaders when connectivity stays down mid-action. Does not auto-resume.
  React.useEffect(() => {
    if (!hasBusyAction) {
      return;
    }

    let graceTimerId = 0;

    const clearBusyUi = (): void => {
      finishUiProcessing(dispatch, false);
      dispatch(clearNpdFormBusyState());
      dispatch(clearMaterialGroupBusyState());
    };

    const onOffline = (): void => {
      if (graceTimerId) {
        window.clearTimeout(graceTimerId);
      }
      // Brief reconnects should not interrupt an in-flight successful request.
      graceTimerId = window.setTimeout(() => {
        graceTimerId = 0;
        if (navigator.onLine === false) {
          clearBusyUi();
        }
      }, 1500);
    };

    const onOnline = (): void => {
      if (graceTimerId) {
        window.clearTimeout(graceTimerId);
        graceTimerId = 0;
      }
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      if (graceTimerId) {
        window.clearTimeout(graceTimerId);
      }
    };
  }, [dispatch, hasBusyAction]);

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
            ? globalProcessing.progressLabel
              ? `${globalProcessing.progressLabel}: ${globalProcessing.current}/${globalProcessing.total}`
              : `${globalProcessing.current} / ${globalProcessing.total}`
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
