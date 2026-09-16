export interface IRouteDefinition {
  path: string;
  title: string;
  description: string;
}

export const ROUTE_DEFINITIONS: IRouteDefinition[] = [
  { path: "/npd/new", title: "New NPD Request", description: "Create a new NPD request with general information and item details." },
  { path: "/npd/all", title: "All Requests", description: "View all NPD requests with search, filters, and export." },
  { path: "/npd/pending", title: "Pending Approval", description: "Review NPD requests awaiting approval or processing." },
  { path: "/npd/approved", title: "Approved Requests", description: "View approved NPD requests." },
  { path: "/npd/draft-rework", title: "Draft / ReWork", description: "Edit draft or rework NPD requests." },
  { path: "/mg/new", title: "New Material Group", description: "Create a new material group request." },
  { path: "/mg/all", title: "All Requests", description: "View all material group requests." },
  { path: "/mg/pending", title: "Pending Request", description: "Review pending material group requests." },
  { path: "/mg/completed", title: "Completed Request", description: "View completed material group requests." },
  { path: "/mg/draft-rework", title: "Draft / ReWork", description: "Edit draft or rework material group requests." },
  { path: "/admin/material-master", title: "Material Master", description: "Administer the material master catalog." },
  { path: "/admin/lookup-type", title: "Lookup Type", description: "Manage lookup type master records." },
  { path: "/admin/lookup", title: "Lookup", description: "Manage lookup master values." },
  { path: "/admin/workflow-config", title: "Workflow Configuration", description: "Configure approval workflow stages." },
  { path: "/admin/brand-extension", title: "Brand Material Extension", description: "Manage brand to plant/warehouse mappings." },
  { path: "/reports", title: "Reports", description: "Analytics and reports dashboard." },
];
