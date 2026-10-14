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

function EllipsisText({ text }: { text: string }): React.ReactElement {
  const title = text.trim();
  return (
    <span className={styles.ellipsisText} title={title || undefined}>
      {text}
    </span>
  );
}

function isDomElementType(type: unknown): type is string {
  return typeof type === "string";
}

/**
 * Wraps body cell content so a lone dash / empty string is centered.
 * Plain text gets a `title` so ellipsis-truncated cells show full value on hover.
 * Null/undefined/false are left unchanged (e.g. hidden Workflow on Draft).
 */
export function wrapDataTableCellContent(
  content: React.ReactNode,
): React.ReactNode {
  if (content === null || content === undefined || content === false) {
    return content;
  }

  if (typeof content === "string") {
    if (isEmptyDashValue(content)) {
      return <EmptyDash />;
    }
    return <EllipsisText text={content} />;
  }

  if (typeof content === "number") {
    return <EllipsisText text={String(content)} />;
  }

  if (typeof content === "boolean") {
    return content;
  }

  if (React.isValidElement(content)) {
    const props = content.props as {
      children?: React.ReactNode;
      title?: unknown;
    };
    const children = props.children;

    if (typeof children === "string" && isEmptyDashValue(children)) {
      return <EmptyDash />;
    }

    // Native hosts (span/button/a): ensure title when the only child is text.
    if (
      isDomElementType(content.type) &&
      props.title == null &&
      typeof children === "string" &&
      children.trim()
    ) {
      return React.cloneElement(content, {
        title: children.trim(),
      } as never);
    }
  }

  return content;
}
