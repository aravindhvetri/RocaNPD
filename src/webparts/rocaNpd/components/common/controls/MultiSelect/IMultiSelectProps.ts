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
  /** When 1, behaves as searchable single-select (dropdown): one value, all options stay enabled. */
  selectionLimit?: number;
  emptyMessage?: string;
  /** Extra class on the portaled overlay panel (e.g. Item Details-only filter chrome). */
  panelClassName?: string;
}
