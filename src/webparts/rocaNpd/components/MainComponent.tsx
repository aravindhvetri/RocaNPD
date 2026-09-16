import * as React from "react";
import { HashRouter } from "react-router-dom";
import {
  lockWebPartViewport,
  unlockWebPartViewport,
} from "../../../External/CommonServices/hideSharePointChrome";
import { injectRocaPrimeOverrides } from "../../../External/CommonServices/injectRocaPrimeOverrides";
import themeStyles from "../styles/theme.module.scss";
import { resolveCurrentSiteUrl } from "../../../External/CommonServices/rocaSiteUrlResolver";
import { useAppDispatch } from "../../../store/hooks";
import { setInitialized, setUserContext } from "../../../store/slices/appSlice";
import type { IMainComponentProps } from "./IMainComponentProps";
import AppShell from "./layout/AppShell/AppShell";
import AppRoutes from "./routes/AppRoutes";

const MainComponent: React.FC<IMainComponentProps> = ({ spfxContext }) => {
  const dispatch = useAppDispatch();
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const { pageContext } = spfxContext;

    dispatch(
      setUserContext({
        displayName: pageContext.user.displayName,
        email: pageContext.user.email,
        loginName: pageContext.user.loginName,
        userId: Number(pageContext.legacyPageContext.userId) || 0,
        siteUrl: resolveCurrentSiteUrl(pageContext.web.absoluteUrl),
      }),
    );
    dispatch(setInitialized(true));
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
      <HashRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </HashRouter>
    </div>
  );
};
export default MainComponent;
