import type { IBaseControlProps } from "../IBaseControlProps";

export interface IInputNumberProps extends IBaseControlProps {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  minFractionDigits?: number;
  maxFractionDigits?: number;
}
