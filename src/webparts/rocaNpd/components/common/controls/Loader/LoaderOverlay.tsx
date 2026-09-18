import * as React from "react";
import { createPortal } from "react-dom";
import { Loader } from "../../../../../../External/Loader/Loader";
import { getAppRootElement } from "../../appRootTarget";
import type { ILoaderOverlayProps } from "./ILoaderOverlayProps";

/**
 * Full-page loader overlay portaled to the app root.
 * Use while list data or save/delete operations are in progress.
 */
const LoaderOverlay: React.FC<ILoaderOverlayProps> = ({
  visible,
  label = "Loading...",
  progressCurrent,
  progressTotal,
  progressPercent,
  progressCaption,
}) => {
  if (!visible) {
    return null;
  }

  const loader = (
    <Loader
      label={label}
      fullScreen
      progressCurrent={progressCurrent}
      progressTotal={progressTotal}
      progressPercent={progressPercent}
      progressCaption={progressCaption}
    />
  );
  const appRoot = getAppRootElement();

  return appRoot ? createPortal(loader, appRoot) : loader;
};

export default LoaderOverlay;
