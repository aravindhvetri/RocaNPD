import { configureStore } from "@reduxjs/toolkit";
import adminReducer from "./slices/adminSlice";
import appReducer from "./slices/appSlice";
import materialGroupReducer from "./slices/materialGroupSlice";
import npdFormReducer from "./slices/npdFormSlice";
import npdRequestReducer from "./slices/npdRequestSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    app: appReducer,
    ui: uiReducer,
    admin: adminReducer,
    npdForm: npdFormReducer,
    npdRequest: npdRequestReducer,
    materialGroup: materialGroupReducer,
  },
});

export type { RootState } from "./rootState";
export type AppDispatch = typeof store.dispatch;
