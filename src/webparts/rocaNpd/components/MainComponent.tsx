import * as React from "react";
import { HashRouter } from "react-router-dom";
import {
  lockWebPartViewport,
  unlockWebPartViewport,
} from "../../../External/CommonServices/hideSharePointChrome";
import themeStyles from "../styles/theme.module.scss";
import { initializeApp } from "../../../store/thunks/appThunks";
import { useAppDispatch } from "../../../store/hooks";
import type { IMainComponentProps } from "./IMainComponentProps";
import AppShell from "./layout/AppShell/AppShell";
import AppRoutes from "./routes/AppRoutes";

const MainComponent: React.FC<IMainComponentProps> = ({ spfxContext }) => {
  const dispatch = useAppDispatch();
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    dispatch(initializeApp(spfxContext));
  }, [dispatch, spfxContext]);

  React.useEffect(() => {
    const lockLayout = (): void => {
      if (rootRef.current) {
        lockWebPartViewport(rootRef.current);
      }
    };

    lockLayout();
    window.addEventListener("resize", lockLayout);

    return () => {
      window.removeEventListener("resize", lockLayout);
      unlockWebPartViewport();
    };
  }, []);

  return (
    <div ref={rootRef} className={themeStyles.appRoot} data-roca-npd-root>
      <HashRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </HashRouter>
    </div>
  );
};
export default MainComponent;
