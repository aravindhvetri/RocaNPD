import { configureStore } from "@reduxjs/toolkit";
import adminReducer from "./slices/adminSlice";
import appReducer from "./slices/appSlice";
import npdFormReducer from "./slices/npdFormSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    app: appReducer,
    ui: uiReducer,
    admin: adminReducer,
    npdForm: npdFormReducer,
  },
});

export type { RootState } from "./rootState";
export type AppDispatch = typeof store.dispatch;
