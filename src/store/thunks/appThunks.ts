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
import type { AppDispatch } from "../index";

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
    } catch (error) {
      dispatch(setRoleError(getErrorMessage(error)));
    } finally {
      dispatch(setInitialized(true));
    }
  };
