import * as React from "react";
import type { IControlFieldProps } from "./IControlFieldProps";
import styles from "./ControlField.module.scss";

const ControlField: React.FC<IControlFieldProps> = ({
  id,
  label,
  required,
  error,
  helperText,
  className,
  children,
}) => (
  <div className={`${styles.field} ${className ?? ""}`}>
    {label && (
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
    )}
    <div className={styles.control}>{children}</div>
    {error && <span className={styles.error}>{error}</span>}
    {!error && helperText && <span className={styles.helper}>{helperText}</span>}
  </div>
);

export default ControlField;
