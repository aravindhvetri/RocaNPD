import * as React from "react";
import { InputTextarea } from "../../common/controls";
import styles from "./MaterialGroupApproverRemarks.module.scss";

export interface IMaterialGroupApproverRemarksProps {
  label: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

const MaterialGroupApproverRemarks: React.FC<
  IMaterialGroupApproverRemarksProps
> = ({
  label,
  value,
  required = true,
  disabled = false,
  placeholder = "Enter remarks or SAP configuration note before completing...",
  onChange,
}) => {
  return (
    <section className={styles.section} aria-label={label}>
      <InputTextarea
        id="mgApproverRemarks"
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

export default MaterialGroupApproverRemarks;
