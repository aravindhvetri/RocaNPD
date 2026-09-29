import * as React from "react";
import styles from "./DataTable.module.scss";

const EMPTY_DASH_VALUES = new Set(["—", "-", "–", ""]);

/** Centered em dash for empty DataTable cells (full cell width under the header). */
export function EmptyDash(): React.ReactElement {
  return (
    <div className={styles.emptyDash} aria-hidden="true">
      —
    </div>
  );
}

export function isEmptyDashValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  return EMPTY_DASH_VALUES.has(value.trim());
}

/**
 * Wraps body cell content so a lone dash / empty string is centered.
 * Null/undefined/false are left unchanged (e.g. hidden Workflow on Draft).
 */
export function wrapDataTableCellContent(
  content: React.ReactNode,
): React.ReactNode {
  if (content === null || content === undefined || content === false) {
    return content;
  }

  if (typeof content === "string" && isEmptyDashValue(content)) {
    return <EmptyDash />;
  }

  if (typeof content === "number" || typeof content === "boolean") {
    return content;
  }

  if (React.isValidElement(content)) {
    const children = (content.props as { children?: React.ReactNode }).children;
    if (typeof children === "string" && isEmptyDashValue(children)) {
      return <EmptyDash />;
    }
  }

  return content;
}
