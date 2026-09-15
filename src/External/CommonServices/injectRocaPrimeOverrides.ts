const STYLE_ID = "roca-npd-prime-overrides";

/**
 * Injected after PrimeReact CDN theme so ROCA focus/pagination styles win the cascade.
 * Scoped to [data-roca-npd-root] only. Safe to call multiple times (updates in place).
 */
export function injectRocaPrimeOverrides(): void {
  if (typeof document === "undefined") {
    return;
  }

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = `
    [data-roca-npd-root] {
      --primary-color: #2d7089;
      --primary-color-text: #ffffff;
      --highlight-bg: #e6fffa;
      --highlight-text-color: #1a202c;
      --focus-ring: 0 0 0 0 transparent;
    }

    [data-roca-npd-root] .p-button:focus,
    [data-roca-npd-root] .p-button:focus-visible,
    [data-roca-npd-root] .p-button:active,
    [data-roca-npd-root] .p-button.p-focus,
    [data-roca-npd-root] .p-button:enabled:focus,
    [data-roca-npd-root] .p-button:enabled:focus-visible,
    [data-roca-npd-root] .p-button:enabled:active {
      box-shadow: none !important;
      outline: none !important;
    }

    [data-roca-npd-root] .p-link:focus,
    [data-roca-npd-root] .p-link:focus-visible,
    [data-roca-npd-root] .p-link:active {
      box-shadow: none !important;
      outline: none !important;
    }

    [data-roca-npd-root] .p-inputtext:enabled:hover,
    [data-roca-npd-root] .p-inputtext:enabled:focus,
    [data-roca-npd-root] .p-inputtext:enabled:focus-visible,
    [data-roca-npd-root] .p-inputtext:enabled:active {
      border-color: #d1d5db !important;
      box-shadow: none !important;
      outline: none !important;
    }

    [data-roca-npd-root] .p-dropdown:not(.p-disabled).p-focus,
    [data-roca-npd-root] .p-multiselect:not(.p-disabled).p-focus,
    [data-roca-npd-root] .p-autocomplete:not(.p-disabled).p-focus,
    [data-roca-npd-root] .p-dropdown:not(.p-disabled):focus-within,
    [data-roca-npd-root] .p-multiselect:not(.p-disabled):focus-within {
      border-color: #d1d5db !important;
      box-shadow: none !important;
      outline: none !important;
    }

    [data-roca-npd-root] .p-dropdown-trigger,
    [data-roca-npd-root] .p-multiselect-trigger,
    [data-roca-npd-root] .p-autocomplete-dropdown {
      background: transparent !important;
      color: #718096 !important;
      box-shadow: none !important;
    }

    [data-roca-npd-root] .p-dropdown-trigger:enabled:hover,
    [data-roca-npd-root] .p-multiselect-trigger:enabled:hover,
    [data-roca-npd-root] .p-autocomplete-dropdown:enabled:hover,
    [data-roca-npd-root] .p-dropdown-trigger:enabled:focus,
    [data-roca-npd-root] .p-multiselect-trigger:enabled:focus,
    [data-roca-npd-root] .p-autocomplete-dropdown:enabled:focus,
    [data-roca-npd-root] .p-dropdown-trigger.p-focus,
    [data-roca-npd-root] .p-multiselect-trigger.p-focus,
    [data-roca-npd-root] .p-autocomplete-dropdown.p-focus {
      background: transparent !important;
      color: #718096 !important;
      box-shadow: none !important;
      outline: none !important;
    }

    [data-roca-npd-root] .p-checkbox {
      width: 1rem !important;
      height: 1rem !important;
      flex: 0 0 1rem !important;
    }

    [data-roca-npd-root] .p-checkbox .p-checkbox-box {
      width: 1rem !important;
      height: 1rem !important;
      border-radius: 3px !important;
    }

    [data-roca-npd-root] .p-checkbox .p-checkbox-icon {
      font-size: 0.625rem !important;
    }

    [data-roca-npd-root] .p-checkbox.p-highlight .p-checkbox-box,
    [data-roca-npd-root] .p-checkbox .p-checkbox-box.p-highlight,
    [data-roca-npd-root] .p-checkbox-input:checked + .p-checkbox-box {
      background: #40919d !important;
      border-color: #40919d !important;
      color: #ffffff !important;
    }

    [data-roca-npd-root] .p-multiselect-header {
      display: flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
    }

    [data-roca-npd-root] .p-multiselect-header .p-checkbox {
      margin: 0 !important;
    }

    [data-roca-npd-root] .p-multiselect-items .p-multiselect-item {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-start !important;
      gap: 0.5rem !important;
      padding: 0.4375rem 0.75rem !important;
    }

    [data-roca-npd-root] .p-multiselect-items .p-multiselect-item .p-checkbox {
      margin: 0 !important;
      flex: 0 0 1rem !important;
    }

    [data-roca-npd-root] .p-multiselect-items .p-multiselect-item.p-highlight,
    [data-roca-npd-root] .p-dropdown-panel .p-dropdown-item.p-highlight,
    [data-roca-npd-root] .p-autocomplete-panel .p-autocomplete-item.p-highlight {
      background: #e6fffa !important;
      color: #1a202c !important;
    }

    [data-roca-npd-root] .p-multiselect-items .p-multiselect-item:focus,
    [data-roca-npd-root] .p-multiselect-items .p-multiselect-item.p-focus,
    [data-roca-npd-root] .p-dropdown-panel .p-dropdown-item:focus,
    [data-roca-npd-root] .p-dropdown-panel .p-dropdown-item.p-focus {
      box-shadow: none !important;
      outline: none !important;
    }

    [data-roca-npd-root] .p-multiselect-filter-container .p-inputtext,
    [data-roca-npd-root] .p-dropdown-filter-container .p-inputtext {
      font-size: 0.75rem !important;
      padding: 0.3125rem 0.5rem 0.3125rem 1.75rem !important;
      border-color: #e2e8f0 !important;
      box-shadow: none !important;
    }

    [data-roca-npd-root] .p-multiselect-filter-container .p-inputtext:enabled:focus,
    [data-roca-npd-root] .p-dropdown-filter-container .p-inputtext:enabled:focus,
    [data-roca-npd-root] .p-multiselect-filter-container .p-inputtext:enabled:hover,
    [data-roca-npd-root] .p-dropdown-filter-container .p-inputtext:enabled:hover {
      border-color: #d1d5db !important;
      box-shadow: none !important;
      outline: none !important;
    }

    [data-roca-npd-root] .p-paginator {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 0.625rem !important;
      padding: 10px 10px 10px !important;
      border-top: 1px solid #e2e8f070 !important;
      background: #ffffff !important;
      font-family: 'Poppins', sans-serif !important;
      font-size: 0.8125rem !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-current {
      margin-right: auto !important;
      color: #718096 !important;
      font-size: 10px !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-pages {
      display: flex !important;
      align-items: center !important;
      gap: 0.625rem !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-first,
    [data-roca-npd-root] .p-paginator .p-paginator-prev,
    [data-roca-npd-root] .p-paginator .p-paginator-next,
    [data-roca-npd-root] .p-paginator .p-paginator-last {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-width: 2.25rem !important;
      width: 2.25rem !important;
      height: 2.25rem !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-radius: 50% !important;
      background: #f5f7f9 !important;
      color: #2d3748 !important;
      cursor: pointer !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-first .p-paginator-icon,
    [data-roca-npd-root] .p-paginator .p-paginator-prev .p-paginator-icon,
    [data-roca-npd-root] .p-paginator .p-paginator-next .p-paginator-icon,
    [data-roca-npd-root] .p-paginator .p-paginator-last .p-paginator-icon {
      font-size: 0.75rem !important;
      width: 0.75rem !important;
      height: 0.75rem !important;
      color: inherit !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-first.p-disabled,
    [data-roca-npd-root] .p-paginator .p-paginator-prev.p-disabled,
    [data-roca-npd-root] .p-paginator .p-paginator-next.p-disabled,
    [data-roca-npd-root] .p-paginator .p-paginator-last.p-disabled {
      opacity: 0.35 !important;
      background: #f5f7f9 !important;
      color: #718096 !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-page {
      min-width: auto !important;
      width: auto !important;
      height: auto !important;
      min-height: 28px !important;
      margin: 0 !important;
      padding: 0 0.25rem !important;
      border: none !important;
      border-radius: 0 !important;
      background: transparent !important;
      color: #2d3748 !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      line-height: 2.25rem !important;
      cursor: pointer !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-page.p-highlight {
      min-width: 28px !important;
      width: 20px !important;
      height: 20px !important;
      padding: 0 !important;
      border-radius: 50% !important;
      background: #5793a0 !important;
      border-color: #5793a0 !important;
      color: #ffffff !important;
      font-weight: 600 !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-page:not(.p-highlight):hover {
      background: transparent !important;
      color: #2d3748 !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-page.p-highlight:hover {
      background: #5793a0 !important;
      color: #ffffff !important;
    }

    [data-roca-npd-root] .p-paginator .p-paginator-page:focus,
    [data-roca-npd-root] .p-paginator .p-paginator-page:focus-visible,
    [data-roca-npd-root] .p-paginator .p-paginator-first:focus,
    [data-roca-npd-root] .p-paginator .p-paginator-first:focus-visible,
    [data-roca-npd-root] .p-paginator .p-paginator-prev:focus,
    [data-roca-npd-root] .p-paginator .p-paginator-prev:focus-visible,
    [data-roca-npd-root] .p-paginator .p-paginator-next:focus,
    [data-roca-npd-root] .p-paginator .p-paginator-next:focus-visible,
    [data-roca-npd-root] .p-paginator .p-paginator-last:focus,
    [data-roca-npd-root] .p-paginator .p-paginator-last:focus-visible {
      box-shadow: none !important;
      outline: none !important;
    }
  `;
}
