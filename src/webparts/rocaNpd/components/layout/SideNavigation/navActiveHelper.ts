import { Config } from "../../../../../External/CommonServices/Config";
import {
  getNavPermissionKey,
  NAV_SECTIONS,
  type INavItemConfig,
} from "../../../../../External/CommonServices/navigationConfig";
import { parseViewAsRole } from "../../../../../External/CommonServices/permissionService";

const FROM_TO_PERMISSION_KEY: Record<string, string> = {
  all: "npd-all",
  pending: "npd-pending",
  approved: "npd-approved",
  "draft-rework": "npd-draft",
  draft: "npd-draft",
  [Config.Routes.NpdAll.toLowerCase()]: "npd-all",
  [Config.Routes.NpdPending.toLowerCase()]: "npd-pending",
  [Config.Routes.NpdApproved.toLowerCase()]: "npd-approved",
  [Config.Routes.NpdDraftRework.toLowerCase()]: "npd-draft",
};

const MG_FROM_TO_PERMISSION_KEY: Record<string, string> = {
  all: "mg-all",
  pending: "mg-pending",
  completed: "mg-completed",
  "draft-rework": "mg-draft",
  draft: "mg-draft",
  [Config.Routes.MgAll.toLowerCase()]: "mg-all",
  [Config.Routes.MgPending.toLowerCase()]: "mg-pending",
  [Config.Routes.MgCompleted.toLowerCase()]: "mg-completed",
  [Config.Routes.MgDraftRework.toLowerCase()]: "mg-draft",
};

function allNavItems(
  accessibleItems?: readonly INavItemConfig[],
): INavItemConfig[] {
  if (accessibleItems) {
    return [...accessibleItems];
  }
  return NAV_SECTIONS.flatMap((section) => section.items);
}

function findItemByPermissionKey(
  permissionKey: string,
  viewAs?: string,
  accessibleItems?: readonly INavItemConfig[],
): INavItemConfig | undefined {
  const role = parseViewAsRole(viewAs);
  const matches = allNavItems(accessibleItems).filter(
    (item) => getNavPermissionKey(item) === permissionKey,
  );

  if (!matches.length) {
    return undefined;
  }

  if (role) {
    const roleMatch = matches.find((item) => item.viewRole === role);
    if (roleMatch) {
      return roleMatch;
    }
  }

  return matches[0];
}

function findItemByRoute(
  pathname: string,
  viewAs?: string,
  accessibleItems?: readonly INavItemConfig[],
): INavItemConfig | undefined {
  const role = parseViewAsRole(viewAs);
  const matches = allNavItems(accessibleItems).filter(
    (item) => item.route === pathname,
  );

  if (!matches.length) {
    return undefined;
  }

  if (role) {
    const roleMatch = matches.find((item) => item.viewRole === role);
    if (roleMatch) {
      return roleMatch;
    }
  }

  // Primary "new" actions without an explicit from should resolve to that role's new item.
  if (pathname === Config.Routes.NpdNew || pathname === Config.Routes.MgNew) {
    const primary = matches.find((item) => item.isPrimaryAction);
    if (primary) {
      return primary;
    }
  }

  // Stale/invalid `?as=` (e.g. Initiator when user only has Admin): use first accessible match.
  return matches[0];
}

/**
 * Resolves the active navigation item ID based on current pathname and query params.
 * Pass `accessibleItems` (role-filtered nav) so selection only highlights visible items.
 */
export function findActiveNavItemId(
  pathnameOrHref: string,
  search?: string,
  accessibleItems?: readonly INavItemConfig[],
): string | undefined {
  const [rawPath, rawQuery] = (pathnameOrHref || "").split("?");
  const pathname = rawPath || "";
  const params = new URLSearchParams(search || rawQuery || "");
  const from = (params.get(Config.NpdFormQuery.From) ?? "").trim().toLowerCase();
  const viewAs = params.get(Config.NpdFormQuery.ViewAs);

  if (pathname === Config.Routes.NpdNew) {
    const fromKey = FROM_TO_PERMISSION_KEY[from];
    if (fromKey) {
      return findItemByPermissionKey(
        fromKey,
        viewAs ?? undefined,
        accessibleItems,
      )?.id;
    }
    if (params.get("id")) {
      return findItemByPermissionKey(
        "npd-all",
        viewAs ?? undefined,
        accessibleItems,
      )?.id;
    }
  }

  if (pathname === Config.Routes.MgNew) {
    const fromKey = MG_FROM_TO_PERMISSION_KEY[from];
    if (fromKey) {
      return findItemByPermissionKey(
        fromKey,
        viewAs ?? undefined,
        accessibleItems,
      )?.id;
    }
    if (params.get("id")) {
      return findItemByPermissionKey(
        "mg-all",
        viewAs ?? undefined,
        accessibleItems,
      )?.id;
    }
  }

  return findItemByRoute(pathname, viewAs ?? undefined, accessibleItems)?.id;
}

/**
 * Finds the accessible nav item for the current location (including correcting stale `?as=`).
 */
export function findAccessibleNavItem(
  pathname: string,
  search: string | undefined,
  accessibleItems: readonly INavItemConfig[],
): INavItemConfig | undefined {
  const id = findActiveNavItemId(pathname, search, accessibleItems);
  return accessibleItems.find((item) => item.id === id);
}
