import { NAV_SECTIONS } from "./navigationConfig";

export const Config = {
  AppTitle: "NPD REQUESTS — New Product Development",
  HeaderTitle: "ADVERTISEMENT & PROMOTION",

  Roles: {
    Initiator: "Initiator",
    VerticalHead: "Vertical Head",
    MisCoordinator: "MIS Coordinator",
    Consultant: "Consultant",
    Admin: "Admin",
  } as const,

  Routes: {
    Home: "/",
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
    Unauthorized: "/unauthorized",
  },

  Navigation: NAV_SECTIONS,
};

export type UserRole = (typeof Config.Roles)[keyof typeof Config.Roles];
