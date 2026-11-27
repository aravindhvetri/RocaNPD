import type { WebPartContext } from "@microsoft/sp-webpart-base";
import { Config } from "../../External/CommonServices/Config";
import { getAllNpdInitiatorBrandOptionsFromCache } from "../../External/CommonServices/npdFormDataService";
import { syncNpdPendingReworkApprovers } from "../../External/CommonServices/npdApproverSyncService";
import { hasRole } from "../../External/CommonServices/permissionService";
import { resolveUserAccess } from "../../External/CommonServices/roleService";
import {
  getCachedRocaSiteUserEmailMap,
  rocaSiteUserEmailMapToRecord,
} from "../../External/CommonServices/rocaSiteUserEmailCache";
import {
  requireRocaMasterSiteUrl,
  resolveCurrentSiteUrl,
} from "../../External/CommonServices/rocaSiteUrlResolver";
import {
  setInitialized,
  setRocaSiteUserEmailById,
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

    try {
      // Before roles, lists, or any approval action: align Pending/Rework
      // WorkFlowJSON with the current ApproversMaster users.
      await syncNpdPendingReworkApprovers(siteUrl);

      // Load Item Details MultiSelect options alongside role resolution, and
      // finish before initialized so the form does not open on an empty cache.
      const lookupOptionsPromise = dispatch(fetchNpdLookupOptions());

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
      // Initiator: brands from login access. MIS (no Initiator brands): same
      // ApproversMaster Initiator brand list from the cache already filled above.
      const initiatorBrandOptions = access.npdInitiatorBrands.map((title) => ({
        label: title,
        value: title,
      }));
      const misBrandOptions =
        initiatorBrandOptions.length === 0 &&
        hasRole(access.assignedRoles, Config.Roles.MisCoordinator)
          ? getAllNpdInitiatorBrandOptionsFromCache(siteUrl)
          : [];
      dispatch(
        setNpdBrandOptions(
          initiatorBrandOptions.length > 0
            ? initiatorBrandOptions
            : misBrandOptions,
        ),
      );
      // Persist siteUsers Id→Email once for the session (filled during role / sync).
      try {
        const rocaSiteUrl = requireRocaMasterSiteUrl(siteUrl);
        const emailMap = getCachedRocaSiteUserEmailMap(rocaSiteUrl);
        if (emailMap?.size) {
          dispatch(
            setRocaSiteUserEmailById(rocaSiteUserEmailMapToRecord(emailMap)),
          );
        }
      } catch {
        // Cache may be empty if ApproversMaster matching skipped siteUsers.
      }
      await lookupOptionsPromise;
    } catch (error) {
      dispatch(setRoleError(getErrorMessage(error)));
    } finally {
      dispatch(setInitialized(true));
    }
  };
