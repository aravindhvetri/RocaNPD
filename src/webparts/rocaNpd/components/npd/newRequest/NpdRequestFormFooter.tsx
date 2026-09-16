import * as React from "react";
import { Button } from "../../common/controls";
import styles from "./NpdRequestFormFooter.module.scss";

export interface INpdRequestFormFooterProps {
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}

const NpdRequestFormFooter: React.FC<INpdRequestFormFooterProps> = ({
  onCancel,
  onSaveDraft,
  onSubmit,
}) => (
  <div className={styles.footer}>
    <Button
      label="Cancel / Back"
      variant="secondary"
      className={styles.cancelButton}
      onClick={onCancel}
    />
    <div className={styles.primaryActions}>
      <Button
        label="Save Draft"
        variant="secondary"
        icon="pi pi-save"
        className={styles.saveButton}
        onClick={onSaveDraft}
      />
      <Button
        label="SUBMIT REQUEST"
        icon="pi pi-send"
        className={styles.submitButton}
        onClick={onSubmit}
      />
    </div>
  </div>
);

export default NpdRequestFormFooter;
