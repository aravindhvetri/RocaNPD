import type { WebPartContext } from "@microsoft/sp-webpart-base";
import { setInitialized, setUserContext } from "../slices/appSlice";
import type { AppDispatch } from "../index";

export const initializeApp =
  (context: WebPartContext) =>
  (dispatch: AppDispatch): void => {
    dispatch(
      setUserContext({
        displayName: context.pageContext.user.displayName,
        email: context.pageContext.user.email,
      }),
    );
    dispatch(setInitialized(true));
  };
