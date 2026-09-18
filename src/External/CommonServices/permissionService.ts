import { ApproverSystems, Config, type UserRole } from "./Config";
import type {
  INavItemConfig,
  INavSectionConfig,
} from "./navigationConfig";
import type {
  IRequestAccessInput,
  IRequestViewScope,
  IResolvedUserAccess,
} from "./Interface";
import { normalizeEmail } from "./personFieldUtils";

const {
  Initiator,
  VerticalHead,
  MisCoordinator,
  Consultant,
  Admin,
} = Config.Roles;

export type PermissionAction =
  | "npd.create"
  | "npd.submit"
  | "npd.editDraft"
  | "npd.approve"
  | "npd.rework"
  | "npd.reject"
  | "npd.editItemDetailsPending"
  | "npd.configureSap"
  | "npd.postToSap"
  | "mg.create"
  | "mg.submit"
  | "mg.editDraft"
  | "mg.complete"
  | "mg.rework"
  | "mg.reject"
  | "admin.manageMasters"
  | "reports.view";

const ACTION_ROLES: Record<PermissionAction, UserRole[]> = {
  "npd.create": [Initiator],
  "npd.submit": [Initiator],
  "npd.editDraft": [Initiator],
  "npd.approve": [VerticalHead, MisCoordinator],
  "npd.rework": [VerticalHead, MisCoordinator],
  "npd.reject": [VerticalHead, MisCoordinator],
  "npd.editItemDetailsPending": [MisCoordinator],
  "npd.configureSap": [MisCoordinator],
  "npd.postToSap": [MisCoordinator],
  "mg.create": [Initiator],
  "mg.submit": [Initiator],
  "mg.editDraft": [Initiator],
  "mg.complete": [Consultant],
  "mg.rework": [Consultant],
  "mg.reject": [Consultant],
  "admin.manageMasters": [Admin],
  "reports.view": [Initiator, MisCoordinator, Consultant, Admin],
};

/**
 * Nav item id → roles that can see it.
 * Visibility is the union of ApproversMaster roles for the matching System.
 * Vertical Head: All / Pending / Approved only.
 * MIS Coordinator: those NPD lists plus Reports.
 * New Request, Draft/ReWork, and Material Group require Initiator (or Consultant) for that system.
 */
export const NAV_ITEM_ALLOWED_ROLES: Record<string, UserRole[]> = {
  "npd-new": [Initiator],
  "npd-all": [Initiator, VerticalHead, MisCoordinator, Admin],
  "npd-pending": [Initiator, VerticalHead, MisCoordinator],
  "npd-approved": [Initiator, VerticalHead, MisCoordinator],
  "npd-draft": [Initiator],
  "mg-new": [Initiator],
  "mg-all": [Initiator, Consultant, Admin],
  "mg-pending": [Initiator, Consultant],
  "mg-completed": [Initiator, Consultant],
  "mg-draft": [Initiator],
  "admin-material": [Admin],
  "admin-lookup-type": [Admin],
  "admin-lookup": [Admin],
  "admin-workflow": [Admin],
  "admin-brand": [Admin],
  reports: [Initiator, MisCoordinator, Consultant, Admin],
};

const ROUTE_ALLOWED_ROLES: Record<string, UserRole[]> = {
  [Config.Routes.NpdNew]: [Initiator, VerticalHead, MisCoordinator],
  [Config.Routes.NpdAll]: NAV_ITEM_ALLOWED_ROLES["npd-all"],
  [Config.Routes.NpdPending]: NAV_ITEM_ALLOWED_ROLES["npd-pending"],
  [Config.Routes.NpdApproved]: NAV_ITEM_ALLOWED_ROLES["npd-approved"],
  [Config.Routes.NpdDraftRework]: NAV_ITEM_ALLOWED_ROLES["npd-draft"],
  [Config.Routes.MgNew]: NAV_ITEM_ALLOWED_ROLES["mg-new"],
  [Config.Routes.MgAll]: NAV_ITEM_ALLOWED_ROLES["mg-all"],
  [Config.Routes.MgPending]: NAV_ITEM_ALLOWED_ROLES["mg-pending"],
  [Config.Routes.MgCompleted]: NAV_ITEM_ALLOWED_ROLES["mg-completed"],
  [Config.Routes.MgDraftRework]: NAV_ITEM_ALLOWED_ROLES["mg-draft"],
  [Config.Routes.AdminMaterialMaster]: NAV_ITEM_ALLOWED_ROLES["admin-material"],
  [Config.Routes.AdminLookupType]: NAV_ITEM_ALLOWED_ROLES["admin-lookup-type"],
  [Config.Routes.AdminLookup]: NAV_ITEM_ALLOWED_ROLES["admin-lookup"],
  [Config.Routes.AdminWorkflowConfig]: NAV_ITEM_ALLOWED_ROLES["admin-workflow"],
  [Config.Routes.AdminBrandExtension]: NAV_ITEM_ALLOWED_ROLES["admin-brand"],
  [Config.Routes.Reports]: NAV_ITEM_ALLOWED_ROLES.reports,
  [Config.Routes.Unauthorized]: [
    Initiator,
    VerticalHead,
    MisCoordinator,
    Consultant,
    Admin,
  ],
};

const DEFAULT_ROUTE_PRIORITY: string[] = [
  Config.Routes.NpdAll,
  Config.Routes.NpdPending,
  Config.Routes.MgAll,
  Config.Routes.MgPending,
  Config.Routes.Reports,
  Config.Routes.AdminLookupType,
];

export function hasRole(
  assignedRoles: readonly string[],
  role: UserRole,
): boolean {
  return assignedRoles.includes(role);
}

export function hasAnyRole(
  assignedRoles: readonly string[],
  roles: readonly UserRole[],
): boolean {
  return roles.some((role) => assignedRoles.includes(role));
}

export function hasPermission(
  assignedRoles: readonly string[],
  action: PermissionAction,
): boolean {
  return hasAnyRole(assignedRoles, ACTION_ROLES[action]);
}

/**
 * True when ApproversMaster assigned this role for the given System.
 * Blank System on a matching row still counts (legacy expand). Admin is not
 * an ApproversMaster role — use hasRole(assignedRoles, Admin) for that.
 */
export function hasSystemRole(
  access: IResolvedUserAccess,
  role: UserRole,
  system: string,
): boolean {
  const systemKey = system.trim().toLowerCase();
  return access.assignments.some((assignment) => {
    if (assignment.role !== role) {
      return false;
    }

    const assignedSystem = (assignment.system ?? "").trim().toLowerCase();
    return !assignedSystem || assignedSystem === systemKey;
  });
}

function navSystemForItem(itemId: string): string | null {
  if (itemId.startsWith("npd-") || itemId === "reports") {
    return ApproverSystems.NewProductDevelopment;
  }

  if (itemId.startsWith("mg-")) {
    return ApproverSystems.NewMaterialGroup;
  }

  return null;
}

function routeSystemForPath(pathname: string): string | null {
  if (pathname.startsWith("/npd/") || pathname === Config.Routes.Reports) {
    return ApproverSystems.NewProductDevelopment;
  }

  if (pathname.startsWith("/mg/")) {
    return ApproverSystems.NewMaterialGroup;
  }

  return null;
}

function roleGrantsAccess(
  access: IResolvedUserAccess,
  role: UserRole,
  system: string | null,
): boolean {
  if (role === Admin) {
    return hasRole(access.assignedRoles, Admin);
  }

  if (system) {
    return hasSystemRole(access, role, system);
  }

  return hasRole(access.assignedRoles, role);
}

function hasAllowedAccess(
  access: IResolvedUserAccess,
  allowed: readonly UserRole[],
  system: string | null,
): boolean {
  return allowed.some((role) => roleGrantsAccess(access, role, system));
}

export function canAccessRoute(
  access: IResolvedUserAccess,
  pathname: string,
): boolean {
  if (pathname === Config.Routes.Home || pathname === Config.Routes.Unauthorized) {
    return access.assignedRoles.length > 0;
  }

  const allowed = ROUTE_ALLOWED_ROLES[pathname];
  if (allowed) {
    return hasAllowedAccess(access, allowed, routeSystemForPath(pathname));
  }

  if (pathname.startsWith("/admin/")) {
    return hasRole(access.assignedRoles, Admin);
  }

  return false;
}

export function getDefaultRoute(access: IResolvedUserAccess): string {
  if (!access.assignedRoles.length) {
    return Config.Routes.Unauthorized;
  }

  const match = DEFAULT_ROUTE_PRIORITY.find((route) =>
    canAccessRoute(access, route),
  );
  return match ?? Config.Routes.Unauthorized;
}

export function canAccessNavItem(
  access: IResolvedUserAccess,
  itemId: string,
): boolean {
  const allowed = NAV_ITEM_ALLOWED_ROLES[itemId];
  if (!allowed) {
    return false;
  }

  return hasAllowedAccess(access, allowed, navSystemForItem(itemId));
}

export function filterNavigationByRoles(
  sections: readonly INavSectionConfig[],
  access: IResolvedUserAccess,
): INavSectionConfig[] {
  return sections
    .map((section) => {
      const items = section.items.filter((item: INavItemConfig) =>
        canAccessNavItem(access, item.id),
      );
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

export function getNpdViewScope(access: IResolvedUserAccess): IRequestViewScope {
  if (
    hasRole(access.assignedRoles, Admin) ||
    hasRole(access.assignedRoles, MisCoordinator)
  ) {
    return { includeOwn: true, brandFilter: null };
  }

  const brands = uniqueTitles([
    ...(hasRole(access.assignedRoles, Initiator)
      ? access.npdInitiatorBrands
      : []),
    ...(hasRole(access.assignedRoles, VerticalHead)
      ? access.npdVerticalHeadBrands
      : []),
  ]);

  if (brands.length) {
    return { includeOwn: false, brandFilter: brands };
  }

  return {
    includeOwn: hasRole(access.assignedRoles, Initiator),
    brandFilter: [],
  };
}

export function getMgViewScope(access: IResolvedUserAccess): IRequestViewScope {
  if (hasRole(access.assignedRoles, Admin)) {
    return { includeOwn: true, brandFilter: null };
  }

  const includeOwn = hasRole(access.assignedRoles, Initiator);
  const isUnscopedConsultant =
    hasRole(access.assignedRoles, Consultant) &&
    access.mgConsultantBrands.length === 0;

  if (isUnscopedConsultant) {
    return { includeOwn, brandFilter: null };
  }

  const brands = uniqueTitles([
    ...access.mgInitiatorBrands,
    ...access.mgConsultantBrands,
  ]);

  return {
    includeOwn,
    brandFilter: includeOwn && !brands.length ? [] : brands,
  };
}

export function canViewRequest(
  access: IResolvedUserAccess,
  request: IRequestAccessInput,
  currentUserEmail: string,
): boolean {
  const scope =
    request.module === "npd" ? getNpdViewScope(access) : getMgViewScope(access);

  if (scope.brandFilter === null) {
    return true;
  }

  if (
    scope.includeOwn &&
    emailsMatch(request.createdByEmail, currentUserEmail)
  ) {
    return true;
  }

  const brand = (request.brand ?? "").trim();
  return Boolean(brand) && (scope.brandFilter ?? []).includes(brand);
}

export function canActOnPendingNpdStep(
  access: IResolvedUserAccess,
  brand: string | undefined,
  pendingRole: string,
): boolean {
  const role = pendingRole.trim();
  if (!role) {
    return false;
  }

  if (role.toLowerCase() === VerticalHead.toLowerCase()) {
    return (
      hasRole(access.assignedRoles, VerticalHead) &&
      brandInList(brand, access.npdVerticalHeadBrands)
    );
  }

  if (role.toLowerCase() === MisCoordinator.toLowerCase()) {
    return hasRole(access.assignedRoles, MisCoordinator);
  }

  return hasPermission(access.assignedRoles, "npd.approve");
}

export function canActOnNpdBrand(
  access: IResolvedUserAccess,
  action: PermissionAction,
  brand?: string,
): boolean {
  if (!hasPermission(access.assignedRoles, action)) {
    return false;
  }

  if (
    action === "npd.approve" ||
    action === "npd.rework" ||
    action === "npd.reject"
  ) {
    const asVerticalHead =
      hasRole(access.assignedRoles, VerticalHead) &&
      brandInList(brand, access.npdVerticalHeadBrands);
    const asMisCoordinator = hasRole(access.assignedRoles, MisCoordinator);
    return asVerticalHead || asMisCoordinator;
  }

  if (
    action === "npd.editItemDetailsPending" ||
    action === "npd.configureSap" ||
    action === "npd.postToSap"
  ) {
    if (!hasRole(access.assignedRoles, MisCoordinator)) {
      return false;
    }

    return true;
  }

  if (action === "npd.create" || action === "npd.submit" || action === "npd.editDraft") {
    return (
      access.npdInitiatorBrands.length === 0 ||
      brandInList(brand, access.npdInitiatorBrands)
    );
  }

  return true;
}

function uniqueTitles(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function emailsMatch(left?: string, right?: string): boolean {
  const normalizedLeft = normalizeEmail(left ?? "");
  const normalizedRight = normalizeEmail(right ?? "");
  return Boolean(normalizedLeft && normalizedLeft === normalizedRight);
}

function brandInList(brand: string | undefined, brands: string[]): boolean {
  const title = (brand ?? "").trim();
  return Boolean(title) && brands.includes(title);
}
