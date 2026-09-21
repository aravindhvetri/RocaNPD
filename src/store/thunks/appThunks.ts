import type { WebPartContext } from "@microsoft/sp-webpart-base";
import { resolveUserAccess } from "../../External/CommonServices/roleService";
import { resolveCurrentSiteUrl } from "../../External/CommonServices/rocaSiteUrlResolver";
import {
  setInitialized,
  setRoleError,
  setRoleStatus,
  setUserAccess,
  setUserContext,
} from "../slices/appSlice";
import { setNpdBrandOptions } from "../slices/npdFormSlice";
import type { AppDispatch } from "../index";
import { fetchNpdLookupOptions } from "./npdFormThunks";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to resolve user roles and permissions.";
}

export const initializeApp =
  (context: WebPartContext) =>
  async (dispatch: AppDispatch): Promise<void> => {
    const { pageContext } = context;
    const siteUrl = resolveCurrentSiteUrl(pageContext.web.absoluteUrl);
    const identity = {
      displayName: pageContext.user.displayName,
      email: pageContext.user.email,
      loginName: pageContext.user.loginName,
      userId: Number(pageContext.legacyPageContext.userId) || 0,
    };

    dispatch(
      setUserContext({
        ...identity,
        siteUrl,
      }),
    );
    dispatch(setRoleStatus("loading"));

    // Prefetch Item Details lookup options as soon as the app starts.
    void dispatch(fetchNpdLookupOptions());

    try {
      const access = await resolveUserAccess(
        {
          email: identity.email,
          loginName: identity.loginName,
          displayName: identity.displayName,
          userId: identity.userId,
        },
        siteUrl,
      );
      dispatch(setUserAccess(access));
      dispatch(
        setNpdBrandOptions(
          access.npdInitiatorBrands.map((title) => ({
            label: title,
            value: title,
          })),
        ),
      );
    } catch (error) {
      dispatch(setRoleError(getErrorMessage(error)));
    } finally {
      dispatch(setInitialized(true));
    }
  };
