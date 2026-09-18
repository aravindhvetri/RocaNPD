import * as React from "react";
import { Config, FieldLabels } from "../../../../../External/CommonServices/Config";
import type { INpdTabRestriction } from "../../../../../External/CommonServices/npdRequestTabSync";
import {
  formatNpdTabLockMessage,
  formatNpdTabRequestLabel,
} from "../../../../../External/CommonServices/npdRequestTabSync";
import { Button, Dialog } from "../../common/controls";
import styles from "./NpdEditingRestrictedDialog.module.scss";

export interface INpdEditingRestrictedDialogProps {
  restriction: INpdTabRestriction | null;
  onGoToDashboard: () => void;
  onReload: () => void;
}

const NpdEditingRestrictedDialog: React.FC<INpdEditingRestrictedDialogProps> = ({
  restriction,
  onGoToDashboard,
  onReload,
}) => {
  if (!restriction) {
    return null;
  }

  return (
    <Dialog
      visible
      title=""
      width="28rem"
      closable={false}
      className={styles.dialog}
      onHide={onGoToDashboard}
      footer={
        <div className={styles.footer}>
          <Button
            label={FieldLabels.GoToDashboard}
            size="sm"
            onClick={onGoToDashboard}
          />
          <Button
            label={FieldLabels.ReloadPage}
            variant="secondary"
            size="sm"
            onClick={onReload}
          />
        </div>
      }
    >
      <div className={styles.body}>
        <span className={styles.lockWrap} aria-hidden="true">
          <i className="pi pi-lock" />
        </span>
        <h2 className={styles.title}>{FieldLabels.EditingRestricted}</h2>
        <span className={styles.badge}>
          <i className={badgeIcon(restriction.kind)} />
          {badgeLabel(restriction.kind)}
        </span>
        <p className={styles.message}>
          <strong>
            {FieldLabels.RequestId}:{" "}
            {formatNpdTabRequestLabel(
              restriction.requestId,
              restriction.requestTitle,
            )}
          </strong>
          {messageSuffix(restriction)}
        </p>
        <p className={styles.help}>{FieldLabels.EditingRestrictedHelp}</p>
      </div>
    </Dialog>
  );
};

function badgeLabel(kind: INpdTabRestriction["kind"]): string {
  if (kind === "draft-saved") {
    return FieldLabels.DraftSaved;
  }
  if (kind === "submitted") {
    return FieldLabels.Submitted;
  }
  return FieldLabels.Editing;
}

function badgeIcon(kind: INpdTabRestriction["kind"]): string {
  if (kind === "draft-saved") {
    return "pi pi-save";
  }
  if (kind === "submitted") {
    return "pi pi-send";
  }
  return "pi pi-pencil";
}

function messageSuffix(restriction: INpdTabRestriction): string {
  const full = formatNpdTabLockMessage(restriction);
  const label = `${FieldLabels.RequestId}: ${formatNpdTabRequestLabel(
    restriction.requestId,
    restriction.requestTitle,
  )}`;
  return full.startsWith(label) ? full.slice(label.length) : ` ${full}`;
}

export function goToNpdDashboard(navigate: (path: string) => void): void {
  navigate(Config.Routes.NpdAll);
}

export default NpdEditingRestrictedDialog;
