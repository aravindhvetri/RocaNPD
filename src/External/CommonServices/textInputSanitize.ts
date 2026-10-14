import { Config } from "./Config";

/** Block spaces (and other whitespace) at the start of any typed value. */
export function stripLeadingSpaces(value: string): string {
  return String(value ?? "").replace(/^\s+/, "");
}

/**
 * Letters, numbers, and spaces only. Shared rule for Lookup, Lookup Type,
 * NPD Item Details text fields, MG master Code/Description, etc.
 * Remarks / free-text comments are excluded — they may contain punctuation.
 */
export function sanitizeAlphanumericTextInput(value: string): string {
  return stripLeadingSpaces(
    String(value ?? "").replace(
      Config.TextInputRules.DisallowedCharactersGlobal,
      "",
    ),
  );
}

/**
 * Digits only — for text fields backed by Single Line of Text that must
 * accept numeric values only (e.g. Min. Qty/Box Qty). Keeps string type.
 */
export function sanitizeDigitsOnlyTextInput(value: string): string {
  return stripLeadingSpaces(
    String(value ?? "").replace(Config.TextInputRules.NonDigitsGlobal, ""),
  );
}

export function containsSpecialCharacters(value: string): boolean {
  return Config.TextInputRules.DisallowedCharacters.test(String(value ?? ""));
}

export function specialCharactersNotAllowedMessage(fieldLabel: string): string {
  return `${fieldLabel} ${Config.TextInputRules.SpecialCharactersNotAllowedSuffix}`;
}

/** Prevent typing/pasting a leading space into native filter inputs (Prime Dropdown/MultiSelect). */
export function leadingSpaceInputGuards(): {
  onKeyDown: (event: {
    key: string;
    preventDefault: () => void;
    currentTarget: {
      selectionStart: number | null;
      selectionEnd: number | null;
    };
  }) => void;
  onPaste: (event: {
    preventDefault: () => void;
    clipboardData: { getData: (type: string) => string };
    currentTarget: {
      selectionStart: number | null;
      selectionEnd: number | null;
      setRangeText: (
        replacement: string,
        start: number,
        end: number,
        selectionMode?: "select" | "start" | "end" | "preserve",
      ) => void;
      dispatchEvent: (event: Event) => boolean;
    };
  }) => void;
} {
  return {
    onKeyDown: (event) => {
      if (event.key !== " ") {
        return;
      }
      const start = event.currentTarget.selectionStart ?? 0;
      if (start === 0) {
        event.preventDefault();
      }
    },
    onPaste: (event) => {
      const start = event.currentTarget.selectionStart ?? 0;
      const end = event.currentTarget.selectionEnd ?? start;
      const pasted = event.clipboardData.getData("text");
      if (start !== 0 || !/^\s/.test(pasted)) {
        return;
      }
      event.preventDefault();
      const cleaned = stripLeadingSpaces(pasted);
      event.currentTarget.setRangeText(cleaned, start, end, "end");
      event.currentTarget.dispatchEvent(new Event("input", { bubbles: true }));
    },
  };
}
