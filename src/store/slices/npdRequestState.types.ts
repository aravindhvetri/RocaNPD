import type {
  INpdRequestGeneralInfoRow,
  INpdRequestListItemRow,
} from "../../External/CommonServices/Interface";

export type NpdRequestListStatus = "idle" | "loading" | "error";

export interface INpdRequestListState {
  draftItems: INpdRequestListItemRow[];
  pendingItems: INpdRequestListItemRow[];
  dashboardItems: INpdRequestListItemRow[];
  status: NpdRequestListStatus;
  error: string | null;
}
