import * as React from "react";
import { HashRouter } from "react-router-dom";
import {
  lockWebPartViewport,
  unlockWebPartViewport,
} from "../../../External/CommonServices/hideSharePointChrome";
import { injectRocaPrimeOverrides } from "../../../External/CommonServices/injectRocaPrimeOverrides";
import themeStyles from "../styles/theme.module.scss";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { initializeApp } from "../../../store/thunks/appThunks";
import type { IMainComponentProps } from "./IMainComponentProps";
import { LoaderOverlay } from "./common/controls";
import AppShell from "./layout/AppShell/AppShell";
import AppRoutes from "./routes/AppRoutes";

const MainComponent: React.FC<IMainComponentProps> = ({ spfxContext }) => {
  const dispatch = useAppDispatch();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const initialized = useAppSelector((state) => state.app.initialized);
  const roleStatus = useAppSelector((state) => state.app.roleStatus);
  const isResolvingAccess = !initialized || roleStatus === "loading";

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

  return (
    <div ref={rootRef} className={themeStyles.appRoot} data-roca-npd-root>
      <LoaderOverlay visible={isResolvingAccess} label="Loading..." />
      <HashRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </HashRouter>
    </div>
  );
};
export default MainComponent;
