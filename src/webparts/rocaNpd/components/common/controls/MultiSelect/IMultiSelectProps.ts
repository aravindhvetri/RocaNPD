import type { IBaseControlProps } from "../IBaseControlProps";
import type { IDropdownOption } from "../Dropdown/IDropdownProps";

export interface IMultiSelectProps extends IBaseControlProps {
  value: (string | number)[];
  options: IDropdownOption[];
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  filter?: boolean;
  display?: "comma" | "chip";
  selectAll?: boolean;
  emptyMessage?: string;
}
