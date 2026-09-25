import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { NAV_SECTIONS } from "../../External/CommonServices/navigationConfig";

const defaultExpanded = NAV_SECTIONS.reduce<Record<string, boolean>>(
  (acc, section) => {
    acc[section.id] = true;
    return acc;
  },
  {},
);

export interface IUiState {
  sidebarCollapsed: boolean;
  expandedSections: Record<string, boolean>;
  activeNavItemId: string;
}

const initialState: IUiState = {
  sidebarCollapsed: false,
  expandedSections: defaultExpanded,
  activeNavItemId: "",
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
  },
});

export const {
  toggleSidebar,
  toggleNavSection,
  setActiveNavItem,
  setExpandedSections,
} = uiSlice.actions;

export default uiSlice.reducer;
