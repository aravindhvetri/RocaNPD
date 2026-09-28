export type NavIconTone = "default" | "pending" | "approved" | "draft";
export type NavSectionIconTone = "default" | "accent" | "muted";
export type NavSelectedBarTone =
  | "gold"
  | "amber"
  | "lime"
  | "mint"
  | "sky"
  | "coral"
  | "violet"
  | "peach"
  | "teal";

/** Mirrors Config.Roles without importing Config (avoids circular deps). */
export type NavViewRole =
  | "Initiator"
  | "Vertical Head"
  | "MIS Coordinator"
  | "Consultant"
  | "Admin";

export interface INavItemConfig {
  /** Unique id used for active highlighting (includes role context). */
  id: string;
  /**
   * Permission / route key shared across roles (e.g. `npd-all`).
   * Defaults to `id` when omitted.
   */
  permissionKey?: string;
  label: string;
  /** Pathname only (no query). View role is applied via `?as=`. */
  route: string;
  icon: string;
  iconTone?: NavIconTone;
  selectedBarTone?: NavSelectedBarTone;
  isPrimaryAction?: boolean;
  /** Role this item belongs to — drives data scoping when selected. */
  viewRole: NavViewRole;
}

export interface INavSectionConfig {
  id: string;
  /** Collapsible section title (e.g. "NPD Requests"). */
  label: string;
  /** Role banner shown above consecutive sections for the same role. */
  roleGroup: string;
  icon: string;
  sectionIconTone?: NavSectionIconTone;
  viewRole: NavViewRole;
  items: INavItemConfig[];
}

const Initiator: NavViewRole = "Initiator";
const VerticalHead: NavViewRole = "Vertical Head";
const MisCoordinator: NavViewRole = "MIS Coordinator";
const Consultant: NavViewRole = "Consultant";
const Admin: NavViewRole = "Admin";

const Routes = {
  NpdNew: "/npd/new",
  NpdAll: "/npd/all",
  NpdPending: "/npd/pending",
  NpdApproved: "/npd/approved",
  NpdDraftRework: "/npd/draft-rework",
  MgNew: "/mg/new",
  MgAll: "/mg/all",
  MgPending: "/mg/pending",
  MgCompleted: "/mg/completed",
  MgDraftRework: "/mg/draft-rework",
  Reports: "/reports",
  AdminMaterialMaster: "/admin/material-master",
  AdminLookupType: "/admin/lookup-type",
  AdminLookup: "/admin/lookup",
  AdminWorkflowConfig: "/admin/workflow-config",
  AdminBrandExtension: "/admin/brand-extension",
} as const;

function npdItems(
  viewRole: NavViewRole,
  options: {
    includeNew?: boolean;
    includeDraft?: boolean;
    includePending?: boolean;
    includeApproved?: boolean;
    includeAll?: boolean;
  },
): INavItemConfig[] {
  const prefix = viewRoleSlug(viewRole);
  const items: INavItemConfig[] = [];

  if (options.includeNew) {
    items.push({
      id: `${prefix}-npd-new`,
      permissionKey: "npd-new",
      label: "New NPD Request",
      route: Routes.NpdNew,
      icon: "pi pi-plus",
      selectedBarTone: "gold",
      isPrimaryAction: true,
      viewRole,
    });
  }
  if (options.includeAll !== false) {
    items.push({
      id: `${prefix}-npd-all`,
      permissionKey: "npd-all",
      label: "All Requests",
      route: Routes.NpdAll,
      icon: "pi pi-file",
      iconTone: "default",
      selectedBarTone: "sky",
      viewRole,
    });
  }
  if (options.includePending) {
    items.push({
      id: `${prefix}-npd-pending`,
      permissionKey: "npd-pending",
      label: "Pending Approval",
      route: Routes.NpdPending,
      icon: "pi pi-clock",
      iconTone: "pending",
      selectedBarTone: "amber",
      viewRole,
    });
  }
  if (options.includeApproved) {
    items.push({
      id: `${prefix}-npd-approved`,
      permissionKey: "npd-approved",
      label: "Approved Requests",
      route: Routes.NpdApproved,
      icon: "pi pi-check-circle",
      iconTone: "approved",
      selectedBarTone: "mint",
      viewRole,
    });
  }
  if (options.includeDraft) {
    items.push({
      id: `${prefix}-npd-draft`,
      permissionKey: "npd-draft",
      label: "Draft / Rework",
      route: Routes.NpdDraftRework,
      icon: "pi pi-exclamation-triangle",
      iconTone: "draft",
      selectedBarTone: "coral",
      viewRole,
    });
  }

  return items;
}

function mgItems(
  viewRole: NavViewRole,
  options: {
    includeNew?: boolean;
    includeDraft?: boolean;
    includePending?: boolean;
    includeCompleted?: boolean;
    includeAll?: boolean;
  },
): INavItemConfig[] {
  const prefix = viewRoleSlug(viewRole);
  const items: INavItemConfig[] = [];

  if (options.includeNew) {
    items.push({
      id: `${prefix}-mg-new`,
      permissionKey: "mg-new",
      label: "New Material Group",
      route: Routes.MgNew,
      icon: "pi pi-plus",
      selectedBarTone: "teal",
      isPrimaryAction: true,
      viewRole,
    });
  }
  if (options.includeAll !== false) {
    items.push({
      id: `${prefix}-mg-all`,
      permissionKey: "mg-all",
      label: "All Requests",
      route: Routes.MgAll,
      icon: "pi pi-file",
      iconTone: "default",
      selectedBarTone: "violet",
      viewRole,
    });
  }
  if (options.includePending) {
    items.push({
      id: `${prefix}-mg-pending`,
      permissionKey: "mg-pending",
      label: "Pending Request",
      route: Routes.MgPending,
      icon: "pi pi-clock",
      iconTone: "pending",
      selectedBarTone: "amber",
      viewRole,
    });
  }
  if (options.includeCompleted) {
    items.push({
      id: `${prefix}-mg-completed`,
      permissionKey: "mg-completed",
      label: "Completed Request",
      route: Routes.MgCompleted,
      icon: "pi pi-check-circle",
      iconTone: "approved",
      selectedBarTone: "lime",
      viewRole,
    });
  }
  if (options.includeDraft) {
    items.push({
      id: `${prefix}-mg-draft`,
      permissionKey: "mg-draft",
      label: "Draft / Rework",
      route: Routes.MgDraftRework,
      icon: "pi pi-exclamation-triangle",
      iconTone: "draft",
      selectedBarTone: "peach",
      viewRole,
    });
  }

  return items;
}

export function viewRoleSlug(role: string): string {
  return role
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Role-grouped side navigation.
 * Each assigned role gets its own NPD / MG / Admin sections so multi-role users
 * (e.g. Admin + Initiator) see separate headings and role-scoped data.
 */
export const NAV_SECTIONS: INavSectionConfig[] = [
  {
    id: "initiator-npd",
    roleGroup: Initiator,
    label: "NPD Requests",
    icon: "pi pi-file",
    sectionIconTone: "default",
    viewRole: Initiator,
    items: npdItems(Initiator, {
      includeNew: true,
      includeAll: true,
      includePending: true,
      includeApproved: true,
      includeDraft: true,
    }),
  },
  {
    id: "initiator-mg",
    roleGroup: Initiator,
    label: "New Material Group",
    icon: "pi pi-sliders-h",
    sectionIconTone: "accent",
    viewRole: Initiator,
    items: mgItems(Initiator, {
      includeNew: true,
      includeAll: true,
      includePending: true,
      includeCompleted: true,
      includeDraft: true,
    }),
  },
  {
    id: "vh-npd",
    roleGroup: VerticalHead,
    label: "NPD Requests",
    icon: "pi pi-file",
    sectionIconTone: "default",
    viewRole: VerticalHead,
    items: npdItems(VerticalHead, {
      includeAll: true,
      includePending: true,
      includeApproved: true,
    }),
  },
  {
    id: "mis-npd",
    roleGroup: MisCoordinator,
    label: "NPD Requests",
    icon: "pi pi-file",
    sectionIconTone: "default",
    viewRole: MisCoordinator,
    items: npdItems(MisCoordinator, {
      includeAll: true,
      includePending: true,
      includeApproved: true,
    }),
  },
  {
    id: "consultant-mg",
    roleGroup: Consultant,
    label: "New Material Group",
    icon: "pi pi-sliders-h",
    sectionIconTone: "accent",
    viewRole: Consultant,
    items: mgItems(Consultant, {
      includeAll: true,
      includePending: true,
      includeCompleted: true,
    }),
  },
  {
    id: "admin-npd",
    roleGroup: Admin,
    label: "NPD Requests",
    icon: "pi pi-file",
    sectionIconTone: "default",
    viewRole: Admin,
    items: npdItems(Admin, { includeAll: true }),
  },
  {
    id: "admin-mg",
    roleGroup: Admin,
    label: "New Material Group",
    icon: "pi pi-sliders-h",
    sectionIconTone: "accent",
    viewRole: Admin,
    items: mgItems(Admin, { includeAll: true }),
  },
  {
    id: "administration",
    roleGroup: Admin,
    label: "Administration",
    icon: "pi pi-cog",
    sectionIconTone: "default",
    viewRole: Admin,
    items: [
      {
        id: "admin-material",
        permissionKey: "admin-material",
        label: "Material Master",
        route: Routes.AdminMaterialMaster,
        icon: "pi pi-database",
        selectedBarTone: "sky",
        viewRole: Admin,
      },
      {
        id: "admin-lookup-type",
        permissionKey: "admin-lookup-type",
        label: "Lookup Type",
        route: Routes.AdminLookupType,
        icon: "pi pi-list",
        selectedBarTone: "mint",
        viewRole: Admin,
      },
      {
        id: "admin-lookup",
        permissionKey: "admin-lookup",
        label: "Lookup",
        route: Routes.AdminLookup,
        icon: "pi pi-list",
        selectedBarTone: "teal",
        viewRole: Admin,
      },
      {
        id: "admin-workflow",
        permissionKey: "admin-workflow",
        label: "Workflow Configuration",
        route: Routes.AdminWorkflowConfig,
        icon: "pi pi-sitemap",
        selectedBarTone: "coral",
        viewRole: Admin,
      },
      {
        id: "admin-brand",
        permissionKey: "admin-brand",
        label: "Brand Material Extension",
        route: Routes.AdminBrandExtension,
        icon: "pi pi-link",
        selectedBarTone: "gold",
        viewRole: Admin,
      },
    ],
  },
  {
    id: "analytics",
    roleGroup: "Analytics",
    label: "Analytics & Reports",
    icon: "pi pi-chart-bar",
    sectionIconTone: "muted",
    viewRole: Initiator,
    items: [
      {
        id: "reports",
        permissionKey: "reports",
        label: "Reports",
        route: Routes.Reports,
        icon: "pi pi-chart-line",
        selectedBarTone: "sky",
        viewRole: Initiator,
      },
    ],
  },
];

/** Builds `/path?as=Role` for role-scoped navigation targets. */
export function buildNavHref(route: string, viewRole?: string | null): string {
  const path = (route || "").split("?")[0];
  const role = (viewRole || "").trim();
  if (!path) {
    return route;
  }
  if (!role || path.startsWith("/admin/") || path === Routes.Reports) {
    return path;
  }
  return `${path}?as=${encodeURIComponent(role)}`;
}

export function getNavPermissionKey(item: INavItemConfig): string {
  return item.permissionKey || item.id;
}
