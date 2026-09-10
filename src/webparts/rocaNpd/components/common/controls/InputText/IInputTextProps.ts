import type { IBaseControlProps } from "../IBaseControlProps";

export interface IInputTextProps extends IBaseControlProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: "text" | "search" | "password";
}
