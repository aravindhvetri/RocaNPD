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

export interface INavItemConfig {
  id: string;
  label: string;
  route: string;
  icon: string;
  iconTone?: NavIconTone;
  selectedBarTone?: NavSelectedBarTone;
  isPrimaryAction?: boolean;
}

export interface INavSectionConfig {
  id: string;
  label: string;
  icon: string;
  sectionIconTone?: NavSectionIconTone;
  items: INavItemConfig[];
}

/** Role-filtered side navigation — see Project Master §6 / R-SEC03. */
export const NAV_SECTIONS: INavSectionConfig[] = [
  {
    id: "npd-request",
    label: "NPD Request",
    icon: "pi pi-file",
    sectionIconTone: "default",
    items: [
      {
        id: "npd-new",
        label: "New NPD Request",
        route: "/npd/new",
        icon: "pi pi-plus",
        selectedBarTone: "gold",
        isPrimaryAction: true,
      },
      {
        id: "npd-all",
        label: "All Requests",
        route: "/npd/all",
        icon: "pi pi-file",
        iconTone: "default",
        selectedBarTone: "sky",
      },
      {
        id: "npd-pending",
        label: "Pending Approval",
        route: "/npd/pending",
        icon: "pi pi-clock",
        iconTone: "pending",
        selectedBarTone: "amber",
      },
      {
        id: "npd-approved",
        label: "Approved Requests",
        route: "/npd/approved",
        icon: "pi pi-check-circle",
        iconTone: "approved",
        selectedBarTone: "mint",
      },
      {
        id: "npd-draft",
        label: "Draft / ReWork",
        route: "/npd/draft-rework",
        icon: "pi pi-exclamation-triangle",
        iconTone: "draft",
        selectedBarTone: "coral",
      },
    ],
  },
  {
    id: "material-group",
    label: "New Material Group",
    icon: "pi pi-sliders-h",
    sectionIconTone: "accent",
    items: [
      {
        id: "mg-new",
        label: "New Material Group",
        route: "/mg/new",
        icon: "pi pi-plus",
        selectedBarTone: "teal",
        isPrimaryAction: true,
      },
      {
        id: "mg-all",
        label: "All Requests",
        route: "/mg/all",
        icon: "pi pi-file",
        iconTone: "default",
        selectedBarTone: "violet",
      },
      {
        id: "mg-pending",
        label: "Pending Request",
        route: "/mg/pending",
        icon: "pi pi-clock",
        iconTone: "pending",
        selectedBarTone: "amber",
      },
      {
        id: "mg-completed",
        label: "Completed Request",
        route: "/mg/completed",
        icon: "pi pi-check-circle",
        iconTone: "approved",
        selectedBarTone: "lime",
      },
      {
        id: "mg-draft",
        label: "Draft / ReWork",
        route: "/mg/draft-rework",
        icon: "pi pi-exclamation-triangle",
        iconTone: "draft",
        selectedBarTone: "peach",
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: "pi pi-cog",
    sectionIconTone: "default",
    items: [
      { id: "admin-material", label: "Material Master", route: "/admin/material-master", icon: "pi pi-database", selectedBarTone: "sky" },
      { id: "admin-lookup-type", label: "Lookup Type", route: "/admin/lookup-type", icon: "pi pi-list", selectedBarTone: "mint" },
      { id: "admin-lookup", label: "Lookup", route: "/admin/lookup", icon: "pi pi-list", selectedBarTone: "teal" },
      { id: "admin-workflow", label: "Workflow Configuration", route: "/admin/workflow-config", icon: "pi pi-sitemap", selectedBarTone: "coral" },
      { id: "admin-brand", label: "Brand Material Extension", route: "/admin/brand-extension", icon: "pi pi-link", selectedBarTone: "gold" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics & Reports",
    icon: "pi pi-chart-bar",
    sectionIconTone: "muted",
    items: [
      { id: "reports", label: "Reports", route: "/reports", icon: "pi pi-chart-line", selectedBarTone: "sky" },
    ],
  },
];
