import * as React from "react";
import { Button as PrimeButton } from "primereact/button";
import type { IButtonProps, ButtonVariant } from "./IButtonProps";

const variantMap: Record<ButtonVariant, { severity?: "secondary" | "danger"; outlined?: boolean; text?: boolean }> = {
  primary: {},
  secondary: { severity: "secondary", outlined: true },
  danger: { severity: "danger" },
  text: { text: true },
};

const Button: React.FC<IButtonProps> = ({
  label,
  variant = "primary",
  icon,
  loading,
  disabled,
  type = "button",
  className,
  onClick,
  'data-testid': testId,
}) => {
  const primeVariant = variantMap[variant];

  return (
    <PrimeButton
      label={label}
      icon={icon}
      loading={loading}
      disabled={disabled}
      type={type}
      className={className}
      severity={primeVariant.severity}
      outlined={primeVariant.outlined}
      text={primeVariant.text}
      data-testid={testId}
      onClick={onClick}
    />
  );
};

export default Button;
