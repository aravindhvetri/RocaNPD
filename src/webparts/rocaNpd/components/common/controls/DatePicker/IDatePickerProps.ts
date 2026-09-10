import type { IBaseControlProps } from "../IBaseControlProps";

export interface IDatePickerProps extends IBaseControlProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  showTime?: boolean;
  dateFormat?: string;
}
