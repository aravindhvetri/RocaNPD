import type { IBaseControlProps } from "../IBaseControlProps";

export type ButtonVariant = "primary" | "secondary" | "danger" | "text";

export interface IButtonProps extends Omit<IBaseControlProps, "label" | "error" | "helperText"> {
  label: string;
  variant?: ButtonVariant;
  icon?: string;
  loading?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}
