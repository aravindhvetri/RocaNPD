import * as React from "react";
import { Button as PrimeButton } from "primereact/button";
import type { IButtonProps, ButtonVariant } from "./IButtonProps";
import styles from "./Button.module.scss";

const variantMap: Record<
  ButtonVariant,
  { severity?: "secondary" | "danger"; outlined?: boolean; text?: boolean }
> = {
  primary: {},
  secondary: { severity: "secondary", outlined: true },
  danger: { severity: "danger" },
  text: { text: true },
};

const Button: React.FC<IButtonProps> = ({
  label,
  variant = "primary",
  size = "md",
  icon,
  iconOnly = false,
  loading,
  disabled,
  type = "button",
  className,
  title,
  "aria-label": ariaLabel,
  onClick,
  "data-testid": testId,
}) => {
  const primeVariant = variantMap[variant];
  const sizeClass =
    size === "xs"
      ? styles.sizeXs
      : size === "sm"
        ? styles.sizeSm
        : styles.sizeMd;
  const mergedClassName = [
    sizeClass,
    iconOnly ? styles.iconOnly : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <PrimeButton
      label={iconOnly ? undefined : label}
      icon={icon}
      loading={loading}
      disabled={disabled}
      type={type}
      className={mergedClassName}
      severity={primeVariant.severity}
      outlined={primeVariant.outlined}
      text={primeVariant.text}
      data-testid={testId}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
    />
  );
};

export default Button;
