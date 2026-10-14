import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { NAV_SECTIONS } from "../../External/CommonServices/navigationConfig";

const defaultExpanded = NAV_SECTIONS.reduce<Record<string, boolean>>(
  (acc, section) => {
    acc[section.id] = true;
    return acc;
  },
  {},
);

export interface IGlobalProcessingState {
  current: number;
  total: number;
  percent: number;
  /** When true, show item progress (Initiator draft/submit or SAP posting). */
  showItemProgress: boolean;
  /**
   * Optional caption label. When set, UI shows `{label}: {current}/{total}`
   * (e.g. `SAP Datas: 10/100`). Otherwise `{current} / {total}`.
   */
  progressLabel?: string;
}

export interface IUiState {
  sidebarCollapsed: boolean;
  expandedSections: Record<string, boolean>;
  activeNavItemId: string;
  /** Survives route changes so Submit can navigate away while work finishes. */
  globalProcessing: IGlobalProcessingState | null;
  flashMessage: { severity: "success" | "error"; detail: string } | null;
}

const initialState: IUiState = {
  sidebarCollapsed: false,
  expandedSections: defaultExpanded,
  activeNavItemId: "",
  globalProcessing: null,
  flashMessage: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    toggleNavSection(state, action: PayloadAction<string>) {
      const sectionId = action.payload;
      state.expandedSections[sectionId] = !state.expandedSections[sectionId];
    },
    setActiveNavItem(state, action: PayloadAction<string>) {
      state.activeNavItemId = action.payload;
    },
    setExpandedSections(state, action: PayloadAction<Record<string, boolean>>) {
      state.expandedSections = action.payload;
    },
    setGlobalProcessing(
      state,
      action: PayloadAction<IGlobalProcessingState>,
    ) {
      state.globalProcessing = action.payload;
    },
    updateGlobalProcessing(
      state,
      action: PayloadAction<Partial<IGlobalProcessingState>>,
    ) {
      if (!state.globalProcessing) {
        return;
      }
      state.globalProcessing = {
        ...state.globalProcessing,
        ...action.payload,
      };
    },
    clearGlobalProcessing(state) {
      state.globalProcessing = null;
    },
    setFlashMessage(
      state,
      action: PayloadAction<{
        severity: "success" | "error";
        detail: string;
      } | null>,
    ) {
      state.flashMessage = action.payload;
    },
    clearFlashMessage(state) {
      state.flashMessage = null;
    },
  },
});

export const {
  toggleSidebar,
  toggleNavSection,
  setActiveNavItem,
  setExpandedSections,
  setGlobalProcessing,
  updateGlobalProcessing,
  clearGlobalProcessing,
  setFlashMessage,
  clearFlashMessage,
} = uiSlice.actions;

export default uiSlice.reducer;
