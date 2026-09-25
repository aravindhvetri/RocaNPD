import * as React from "react";
import { InputTextarea } from "../../common/controls";
import styles from "./NpdApproverRemarks.module.scss";

export interface INpdApproverRemarksProps {
  label?: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

const NpdApproverRemarks: React.FC<INpdApproverRemarksProps> = ({
  label = "Approver Remarks",
  value,
  required = true,
  disabled = false,
  placeholder = "Enter remarks before Rework or Reject...",
  onChange,
}) => {
  return (
    <section className={styles.section} aria-label={label}>
      <InputTextarea
        id="npdApproverRemarks"
        label={label}
        required={required}
        rows={5}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={onChange}
        className={styles.textarea}
      />
    </section>
  );
};

export default NpdApproverRemarks;
