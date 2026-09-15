import type { IBaseControlProps } from "../IBaseControlProps";

export type ButtonVariant = "primary" | "secondary" | "danger" | "text";
export type ButtonSize = "xs" | "sm" | "md";

export interface IButtonProps extends Omit<IBaseControlProps, "label" | "error" | "helperText"> {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconOnly?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  title?: string;
  "aria-label"?: string;
  onClick?: () => void;
}
