import { ApproverSystems, Config, type UserRole } from "./Config";
import type {
  INavItemConfig,
  INavSectionConfig,
  NavViewRole,
} from "./navigationConfig";
import {
  buildNavHref,
  getNavPermissionKey,
  NAV_SECTIONS,
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
  "reports.view": [Initiator, VerticalHead, MisCoordinator, Consultant, Admin],
};

/**
 * Nav permission key → roles that can see that item type.
 * Role-specific sections further require `section.viewRole` to be assigned.
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
  reports: [Initiator, VerticalHead, MisCoordinator, Consultant, Admin],
};

const ROUTE_ALLOWED_ROLES: Record<string, UserRole[]> = {
  [Config.Routes.NpdNew]: [Initiator, VerticalHead, MisCoordinator, Admin],
  [Config.Routes.NpdAll]: NAV_ITEM_ALLOWED_ROLES["npd-all"],
  [Config.Routes.NpdPending]: NAV_ITEM_ALLOWED_ROLES["npd-pending"],
  [Config.Routes.NpdApproved]: NAV_ITEM_ALLOWED_ROLES["npd-approved"],
  [Config.Routes.NpdDraftRework]: NAV_ITEM_ALLOWED_ROLES["npd-draft"],
  [Config.Routes.MgNew]: [Initiator, Consultant, Admin],
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

export function hasSystemRole(
  access: IResolvedUserAccess,
  role: UserRole,
  system: string,
): boolean {
  const systemKey = system.trim().toLowerCase();
  if (!systemKey) {
    return false;
  }

  const npdKey = ApproverSystems.NewProductDevelopment.toLowerCase();
  const mgKey = ApproverSystems.NewMaterialGroup.toLowerCase();

  // R-SEC03a: Initiator under NPD or MG unlocks both modules' navigation.
  // Assignments from other ApproversMaster systems must not count.
  if (role === Initiator) {
    if (systemKey !== npdKey && systemKey !== mgKey) {
      return false;
    }
    return access.assignments.some((assignment) => {
      if (assignment.role !== Initiator) {
        return false;
      }
      const assignedSystem = (assignment.system ?? "").trim().toLowerCase();
      return assignedSystem === npdKey || assignedSystem === mgKey;
    });
  }

  if (role === Consultant) {
    if (systemKey !== mgKey) {
      return false;
    }
    return access.assignments.some((assignment) => {
      if (assignment.role !== Consultant) {
        return false;
      }
      const assignedSystem = (assignment.system ?? "").trim().toLowerCase();
      return assignedSystem === mgKey;
    });
  }

  return access.assignments.some((assignment) => {
    if (assignment.role !== role) {
      return false;
    }

    const assignedSystem = (assignment.system ?? "").trim().toLowerCase();
    return assignedSystem === systemKey;
  });
}

function navSystemForPermissionKey(permissionKey: string): string | null {
  if (permissionKey.startsWith("npd-") || permissionKey === "reports") {
    return ApproverSystems.NewProductDevelopment;
  }
  if (permissionKey.startsWith("mg-")) {
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
  itemOrRouteKey?: string,
): boolean {
  if (role === Admin) {
    return hasRole(access.assignedRoles, Admin);
  }

  if (itemOrRouteKey === "reports" || itemOrRouteKey === Config.Routes.Reports) {
    if (role === Consultant) {
      return hasSystemRole(
        access,
        Consultant,
        ApproverSystems.NewMaterialGroup,
      );
    }
    if (
      role === Initiator ||
      role === VerticalHead ||
      role === MisCoordinator
    ) {
      return hasSystemRole(
        access,
        role,
        ApproverSystems.NewProductDevelopment,
      );
    }
    return hasRole(access.assignedRoles, role);
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
  itemOrRouteKey?: string,
): boolean {
  return allowed.some((role) =>
    roleGrantsAccess(access, role, system, itemOrRouteKey),
  );
}

export function parseViewAsRole(
  value?: string | null,
): UserRole | undefined {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return undefined;
  }

  const roles: UserRole[] = [
    Initiator,
    VerticalHead,
    MisCoordinator,
    Consultant,
    Admin,
  ];
  return roles.find(
    (role) => role.toLowerCase() === trimmed.toLowerCase(),
  );
}

export function canAccessRoute(
  access: IResolvedUserAccess,
  pathname: string,
): boolean {
  if (
    pathname === Config.Routes.Home ||
    pathname === Config.Routes.Unauthorized
  ) {
    return access.assignedRoles.length > 0;
  }

  const allowed = ROUTE_ALLOWED_ROLES[pathname];
  if (allowed) {
    return hasAllowedAccess(
      access,
      allowed,
      routeSystemForPath(pathname),
      pathname,
    );
  }

  if (pathname.startsWith("/admin/")) {
    return hasRole(access.assignedRoles, Admin);
  }

  return false;
}

export function getDefaultRoute(access: IResolvedUserAccess): string {
  return getDefaultNavTarget(access)?.href ?? Config.Routes.Unauthorized;
}

export function getDefaultNavTarget(
  access: IResolvedUserAccess,
): { href: string; itemId: string } | null {
  if (!access.assignedRoles.length) {
    return null;
  }

  const sections = filterNavigationByRoles(NAV_SECTIONS, access);
  const items = sections
    .filter((section) => section.id !== "analytics")
    .flatMap((section) => section.items);

  // Prefer the first All Requests tab across role sections (NPD then MG order).
  const allRequests = items.find((item) => {
    const key = getNavPermissionKey(item);
    return key === "npd-all" || key === "mg-all";
  });
  if (allRequests) {
    return {
      href: buildNavHref(allRequests.route, allRequests.viewRole),
      itemId: allRequests.id,
    };
  }

  for (const section of sections) {
    if (section.id === "analytics") {
      continue;
    }
    const listItem = section.items.find((item) => !item.isPrimaryAction);
    const item = listItem || section.items[0];
    if (item) {
      return {
        href: buildNavHref(item.route, item.viewRole),
        itemId: item.id,
      };
    }
  }

  const reports = items.find(
    (item) => getNavPermissionKey(item) === "reports",
  );
  if (reports) {
    return { href: reports.route, itemId: reports.id };
  }

  return null;
}

export function canAccessNavItem(
  access: IResolvedUserAccess,
  item: INavItemConfig | string,
): boolean {
  if (typeof item === "string") {
    const allowed = NAV_ITEM_ALLOWED_ROLES[item];
    if (!allowed) {
      return false;
    }
    return hasAllowedAccess(
      access,
      allowed,
      navSystemForPermissionKey(item),
      item,
    );
  }

  const permissionKey = getNavPermissionKey(item);
  const allowed = NAV_ITEM_ALLOWED_ROLES[permissionKey];
  if (!allowed) {
    return false;
  }

  if (permissionKey === "reports") {
    return hasAllowedAccess(
      access,
      allowed,
      navSystemForPermissionKey(permissionKey),
      permissionKey,
    );
  }

  if (!allowed.includes(item.viewRole as UserRole)) {
    return false;
  }

  return roleGrantsAccess(
    access,
    item.viewRole as UserRole,
    navSystemForPermissionKey(permissionKey),
    permissionKey,
  );
}

function canAccessSectionRole(
  access: IResolvedUserAccess,
  section: INavSectionConfig,
): boolean {
  if (section.id === "analytics") {
    return hasAllowedAccess(
      access,
      NAV_ITEM_ALLOWED_ROLES.reports,
      null,
      "reports",
    );
  }

  if (section.viewRole === Admin) {
    return hasRole(access.assignedRoles, Admin);
  }

  if (section.id.includes("-mg") || section.id === "consultant-mg") {
    return hasSystemRole(
      access,
      section.viewRole as UserRole,
      ApproverSystems.NewMaterialGroup,
    );
  }

  return hasSystemRole(
    access,
    section.viewRole as UserRole,
    ApproverSystems.NewProductDevelopment,
  );
}

export function filterNavigationByRoles(
  sections: readonly INavSectionConfig[],
  access: IResolvedUserAccess,
): INavSectionConfig[] {
  return sections
    .map((section) => {
      if (!canAccessSectionRole(access, section)) {
        return { ...section, items: [] as INavItemConfig[] };
      }

      const items = section.items.filter((item) =>
        canAccessNavItem(access, item),
      );
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

/**
 * NPD list scope for a specific nav role context.
 * When `viewRole` is omitted, falls back to the legacy union of all assigned roles.
 */
export function getNpdViewScope(
  access: IResolvedUserAccess,
  viewRole?: UserRole | NavViewRole | null,
): IRequestViewScope {
  const role = parseViewAsRole(viewRole ?? undefined);

  if (role === Admin || role === MisCoordinator) {
    return { includeOwn: true, brandFilter: null };
  }

  if (role === Initiator) {
    const brands = uniqueTitles(access.npdInitiatorBrands);
    return {
      includeOwn: true,
      brandFilter: brands.length ? brands : [],
    };
  }

  if (role === VerticalHead) {
    const brands = uniqueTitles(access.npdVerticalHeadBrands);
    return {
      includeOwn: false,
      brandFilter: brands.length ? brands : [],
    };
  }

  if (
    hasRole(access.assignedRoles, Admin) ||
    hasSystemRole(access, MisCoordinator, ApproverSystems.NewProductDevelopment)
  ) {
    return { includeOwn: true, brandFilter: null };
  }

  const brands = uniqueTitles([
    ...(hasSystemRole(access, Initiator, ApproverSystems.NewProductDevelopment)
      ? access.npdInitiatorBrands
      : []),
    ...(hasSystemRole(
      access,
      VerticalHead,
      ApproverSystems.NewProductDevelopment,
    )
      ? access.npdVerticalHeadBrands
      : []),
  ]);

  if (brands.length) {
    return { includeOwn: false, brandFilter: brands };
  }

  return {
    includeOwn: hasSystemRole(
      access,
      Initiator,
      ApproverSystems.NewProductDevelopment,
    ),
    brandFilter: [],
  };
}

export function getMgViewScope(
  access: IResolvedUserAccess,
  viewRole?: UserRole | NavViewRole | null,
): IRequestViewScope {
  const role = parseViewAsRole(viewRole ?? undefined);

  if (role === Admin) {
    return { includeOwn: true, brandFilter: null };
  }

  if (role === Initiator) {
    const brands = uniqueTitles(access.mgInitiatorBrands);
    return {
      includeOwn: true,
      brandFilter: brands.length ? brands : [],
    };
  }

  if (role === Consultant) {
    if (access.mgConsultantBrands.length === 0) {
      return { includeOwn: false, brandFilter: null };
    }
    return {
      includeOwn: false,
      brandFilter: uniqueTitles(access.mgConsultantBrands),
    };
  }

  if (hasRole(access.assignedRoles, Admin)) {
    return { includeOwn: true, brandFilter: null };
  }

  const includeOwn = hasSystemRole(
    access,
    Initiator,
    ApproverSystems.NewMaterialGroup,
  );
  const isUnscopedConsultant =
    hasSystemRole(access, Consultant, ApproverSystems.NewMaterialGroup) &&
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
  viewRole?: UserRole | NavViewRole | null,
): boolean {
  const scope =
    request.module === "npd"
      ? getNpdViewScope(access, viewRole)
      : getMgViewScope(access, viewRole);

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
      hasSystemRole(
        access,
        VerticalHead,
        ApproverSystems.NewProductDevelopment,
      ) && brandInList(brand, access.npdVerticalHeadBrands)
    );
  }

  if (role.toLowerCase() === MisCoordinator.toLowerCase()) {
    return hasSystemRole(
      access,
      MisCoordinator,
      ApproverSystems.NewProductDevelopment,
    );
  }

  return false;
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
      hasSystemRole(
        access,
        VerticalHead,
        ApproverSystems.NewProductDevelopment,
      ) && brandInList(brand, access.npdVerticalHeadBrands);
    const asMisCoordinator = hasSystemRole(
      access,
      MisCoordinator,
      ApproverSystems.NewProductDevelopment,
    );
    return asVerticalHead || asMisCoordinator;
  }

  if (
    action === "npd.editItemDetailsPending" ||
    action === "npd.configureSap" ||
    action === "npd.postToSap"
  ) {
    return hasSystemRole(
      access,
      MisCoordinator,
      ApproverSystems.NewProductDevelopment,
    );
  }

  if (
    action === "npd.create" ||
    action === "npd.submit" ||
    action === "npd.editDraft"
  ) {
    if (
      !hasSystemRole(access, Initiator, ApproverSystems.NewProductDevelopment)
    ) {
      return false;
    }

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
