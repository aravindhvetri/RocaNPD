import type { WebPartContext } from "@microsoft/sp-webpart-base";
import { resolveCurrentSiteUrl } from "../../External/CommonServices/rocaSiteUrlResolver";
import { setInitialized, setUserContext } from "../slices/appSlice";
import type { AppDispatch } from "../index";

export const initializeApp =
  (context: WebPartContext) =>
  (dispatch: AppDispatch): void => {
    dispatch(
      setUserContext({
        displayName: context.pageContext.user.displayName,
        email: context.pageContext.user.email,
        siteUrl: resolveCurrentSiteUrl(context.pageContext.web.absoluteUrl),
      }),
    );
    dispatch(setInitialized(true));
  };
