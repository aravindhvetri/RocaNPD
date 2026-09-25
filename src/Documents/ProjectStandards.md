# ROCA NPD — Project Standards

> **Document Name:** ProjectStandards  
> **Version:** 1.0  
> **Date:** 10 September 2026  
> **Status:** Mandatory project standards — follow consistently across all modules  
> **Related:** `TechnicalArchitecture.md`, `NPD_TRD.md`, `ROCA_NPD_Project_Master.md`, `TaskList.md`, `Checklist.md`  
> **Wireframe (UI authority):** [https://roca-npd.ai.studio/](https://roca-npd.ai.studio/)

---

## 1. Purpose

This document defines **technical decisions, coding standards, and reusable patterns** for the ROCA NPD project. These are not suggestions — they are **project standards**.

All developers and AI-assisted tools must follow these rules when implementing features, fixing bugs, or reviewing code.

When a new standard is agreed during development, **add it here first**, then implement in code.

**Always use the live wireframe when implementing or reviewing UI, navigation, or permissions:** [https://roca-npd.ai.studio/](https://roca-npd.ai.studio/)

---

## 2. Document Map

| Document | Contains |
|---|---|
| `ProjectStandards.md` | **This file** — coding standards, component strategy, Redux rules, folder structure |
| `TechnicalArchitecture.md` | System architecture, modules, SharePoint schema, workflows |
| `NPD_TRD.md` | TRD stack, list schemas, AI IDE grounding |
| `ROCA_NPD_Project_Master.md` | Functional requirements and **role access checklist (§6)** |
| `TaskList.md` | Implementation tasks to complete |
| `Checklist.md` | Verification items before sign-off |
| **Wireframe** | [https://roca-npd.ai.studio/](https://roca-npd.ai.studio/) — approved UI / navigation / role screens |

---

## 3. Architectural Decisions (ADR Summary)

| ID | Decision | Rationale | Status |
|---|---|---|---|
| ADR-001 | **Component-based UI** — reusable common components, no duplicate UI logic in modules | Maintainability, consistency, faster feature delivery | Adopted |
| ADR-002 | **PrimeReact only** for feature UI — wrap in common components | Single UI library, wireframe alignment, theme control | Adopted |
| ADR-003 | **Redux Toolkit** for application state | Predictable data flow, shared cache, role/module state | Adopted |
| ADR-004 | **PnPjs v4 (`spfi`)** for SharePoint — init in `RocaNpd.tsx` via `setupSP()` | Node 22 / SPFx 1.23 compatibility | Adopted |
| ADR-005 | **Service layer** between Redux and SharePoint — no direct PnP in components | Separation of concerns, testability | Adopted |
| ADR-006 | **Central theme** — `theme.scss` only; use `var(--roca-color-*)` everywhere else | Brand consistency, no hardcoded colors | Adopted |
| ADR-007 | **No `initPnP` in WebPart** — SP context initialized in React root (`RocaNpd.tsx`) | WebPart handles SPFx lifecycle only; React owns SP client | Adopted |
| ADR-008 | **Batch SharePoint writes** on Save/Submit — not per keystroke | Performance, list throttling | Adopted |
| ADR-009 | **Wireframe-first** — [roca-npd.ai.studio](https://roca-npd.ai.studio/) is UI authority | Business-approved layouts | Adopted |

---

## 4. Component-Based Architecture

### 4.1 Principle

Every **reusable UI element** is built **once** as a common component and reused across all modules (NPD, Material Group, Admin, Reports).

**Do not** copy-paste PrimeReact markup, validation, or styling into feature screens.

### 4.2 Component Layers

```text
Layer 1 — PrimeReact (library, never imported directly in feature modules)
Layer 2 — Common Controls (src/webparts/rocaNpd/components/common/controls/)
Layer 3 — Common Composites (StatusBadge, SearchFilterBar, ConfirmDialog, etc.)
Layer 4 — Feature Screens (npd/, materialGroup/, admin/, reports/)
Layer 5 — Layout (layout/AppShell, Header, SideNavigation)
```

### 4.3 Rules

| Rule | Description |
|---|---|
| **R-C01** | Feature modules import common components only — not `primereact/*` directly |
| **R-C02** | If a UI pattern appears in **2+ places**, extract to a common component |
| **R-C03** | Common components must be **generic** — no module-specific business logic inside |
| **R-C04** | Module-specific logic stays in feature screens, hooks, or Redux thunks |
| **R-C05** | Each common control lives in its **own folder** with component + types + optional SCSS |
| **R-C06** | Export controls through `common/controls/index.ts` barrel file |
| **R-C07** | Use TypeScript props interfaces for every common component |
| **R-C08** | Apply theme via SCSS modules using `var(--roca-color-*)` — never hardcode colors |

### 4.4 What Belongs Where

| Belongs in Common Component | Belongs in Feature Screen |
|---|---|
| Label, placeholder, disabled, error display | Field mapping to domain model |
| PrimeReact wrapper styling | Submit / Save / Cancel handlers |
| Generic validation display (required asterisk, error text) | Business validation rules |
| Reusable table columns config pattern | Module-specific columns and filters |
| Dialog open/close UI shell | Approve / Reject / Complete action logic |

---

## 5. PrimeReact Strategy

### 5.1 Rule: PrimeReact Only

- Use **PrimeReact** for all interactive UI in feature screens.
- Do **not** use Fluent UI, raw HTML inputs, or other UI libraries in feature modules.
- Do **not** import from `primereact/*` in feature module files — use common wrappers.

Exception: SPFx WebPart shell (`RocaNpdWebPart.ts`) may use SPFx APIs only — no UI controls.

### 5.2 Common Control Library (Required Wrappers)

Each control below must exist as a **reusable common component** before feature forms are built.

| Control | Folder | PrimeReact Base | Purpose |
|---|---|---|---|
| Input Text | `common/controls/InputText/` | `InputText` | Text fields, search boxes |
| Input Number | `common/controls/InputNumber/` | `InputNumber` | Weight, quantities, numeric fields |
| Input Textarea | `common/controls/InputTextarea/` | `InputTextarea` | Comments, remarks, long text |
| Dropdown | `common/controls/Dropdown/` | `Dropdown` | Single-select lookups |
| MultiSelect | `common/controls/MultiSelect/` | `MultiSelect` | Master selection, brand multi-select |
| ComboBox | `common/controls/ComboBox/` | auto-complete pattern | Searchable lookups (UOM, etc.) |
| Calendar / DatePicker | `common/controls/DatePicker/` | `Calendar` | Date filters, date fields |
| DataTable | `common/controls/DataTable/` | `DataTable` + `Column` | All list views |
| Button | `common/controls/Button/` | `Button` | Primary, secondary, danger actions |
| Dialog | `common/controls/Dialog/` | `Dialog` | Modals, create/edit forms |
| ConfirmDialog | `common/controls/ConfirmDialog/` | `ConfirmDialog` | Approve, Reject, Delete confirmations |
| Toast | `common/controls/Toast/` | `Toast` | Success / error notifications |
| FileUpload | `common/controls/FileUpload/` | `FileUpload` | Import Excel, attachments |
| Checkbox | `common/controls/Checkbox/` | `Checkbox` | Boolean fields |
| Tag / Badge | `common/controls/Tag/` | `Tag` | Status badges (or use `StatusBadge`) |
| Loader | `common/controls/Loader/` | `External/Loader/Loader` | Full-page loading overlay (`LoaderOverlay`) |

### 5.3 Standard Control Folder Structure

```text
common/controls/InputText/
├── InputText.tsx           # Wrapper component
├── IInputTextProps.ts      # Props interface
├── InputText.module.scss   # Optional scoped styles (theme vars only)
└── index.ts                # export { InputText } from './InputText'
```

### 5.4 Standard Control Props Pattern

All form controls share a consistent prop contract:

```typescript
export interface IBaseControlProps {
  id?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;           // Validation error message
  helperText?: string;
  className?: string;
  'data-testid'?: string;
}
```

Example — Input Text extends base:

```typescript
export interface IInputTextProps extends IBaseControlProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}
```

### 5.5 Example Usage in Feature Module (Correct)

```tsx
// ✅ CORRECT — uses common wrapper
import { InputText, Dropdown, Button } from '../common/controls';

<InputText
  label="Material Code"
  required
  maxLength={18}
  value={item.materialCode}
  onChange={(v) => dispatch(updateItemField({ index, field: 'materialCode', value: v }))}
  error={errors.materialCode}
/>
```

```tsx
// ❌ WRONG — direct PrimeReact in feature module
import { InputText } from 'primereact/inputtext';
```

### 5.6 Loader Standard

- Spinner implementation lives in **`External/Loader/Loader/`** (shared asset).
- Feature screens use **`LoaderOverlay`** from `common/controls/Loader/` — portaled to `[data-roca-npd-root]` for full-app coverage.
- Show during list **fetch** (`status === "loading"`) and **mutations** (`status === "saving"`) on master screens; do **not** use PrimeReact DataTable `loading` spinner alongside the page loader.
- Dialog/button-level spinners (save, import, delete confirm) remain on their respective controls.

### 5.7 DataTable Standard

- All list screens use the common `DataTable` wrapper.
- Feature module passes: `columns`, `data`, `loading`, `onRowAction`, `emptyMessage`.
- Pagination, sorting, and filter UI configured via props — not reimplemented per screen.
- Export action uses common `ExportButton` composite.

### 5.8 Form Standard

- Forms compose common controls only.
- Form-level layout uses **PrimeFlex** grid classes (`grid`, `col-12 md:col-6`).
- Section headers match wireframe labels.
- Footer action bar: Cancel (secondary), Save Draft (secondary), Submit (primary) — use common `Button` variants.

### 5.9 Import / Export Standard (Reusable)

Import and Export are **common project capabilities** — not one-off feature logic. Master screens (Lookup Type, Lookup, Plant, Material Master, NPD item grids, etc.) reuse the same services, dialog shell, and Redux flow.

#### 5.8.1 Layering

```text
Feature screen (e.g. LookupTypeMaster)
        ↓ dispatch thunk / call domain export helper
Domain service (e.g. lookupTypeService.ts)
        ↓ orchestration + field mapping
Common services:
  templateService.ts   → fetch/download from NPD_Templates
  importService.ts     → parse/validate spreadsheet rows (generic)
  exportService.ts     → build .xlsx and trigger browser download
SPServices.ts          → SharePoint list/file access only
Common UI:
  common/importExport/ImportDialog → wireframe Import popup (reusable)
```

#### 5.8.2 Configuration (no magic strings)

| Constant | Location | Purpose |
|---|---|---|
| `Config.LibraryNames.NPDTemplates` | `Config.ts` | SharePoint document library for templates |
| `Config.TemplateTypes.*` | `Config.ts` | Choice values for `TemplateType` column (e.g. `"Lookup Type"`) |
| `Config.ImportExport.*` | `Config.ts` | Max file size, accepted extensions, UI labels |
| `Config.FieldLabels.*` | `Config.ts` | Expected Excel header text per master |

#### 5.8.3 Template download (SharePoint)

- Templates live in document library **`NPD_Templates`** (`Config.LibraryNames.NPDTemplates`).
- Each file has **`TemplateType`** (Choice). Fetch by exact choice value from `Config.TemplateTypes`.
- Use **`templateService.fetchTemplateByType()`** and **`templateService.downloadTemplateFile()`** — never hardcode library paths or query PnP from feature components.
- Import popup **right panel** shows the resolved file name and a download icon (wireframe design). If no template exists, show a neutral unavailable message — do not break the dialog.

#### 5.8.4 Import popup UI (`ImportDialog`)

- Reusable component: `common/importExport/ImportDialog/`.
- Match wireframe exactly: centered **Import** title, two-column body (upload left, template right), footer **Cancel** + **Import**.
- Left: dashed drop zone, cloud upload icon, browse/drag text, accepted formats + max size from `Config.ImportExport`.
- **Import** button stays disabled until a file is selected; enabled state uses primary button styling.
- Feature screen passes module-specific titles only (e.g. `"Import Lookup Type Master"`).
- Do **not** duplicate Import popup markup in feature folders.

#### 5.8.4a Import validation popup UI (`ImportValidationDialog`)

- Reusable component: `common/importExport/ImportValidationDialog/`.
- Shown **only after** preview finds duplicate/validation issues — **`ImportDialog` closes first**.
- Match wireframe: centered **Import** title, module subtitle (e.g. `"Import Lookup Master"`), validation table only, footer **Cancel** + **Proceed**.
- Table columns: **S.NO**, optional record name (Lookup uses Lookup Name / Lookup Type Name), **Validation Error** (red error pill with left border). **NPD Item Details import omits the record-name column** — show S.NO and Validation Error only.
- **Proceed** disabled (grey) when no valid rows remain; imports valid rows only when enabled.

#### 5.8.5 Import processing rules

| Rule | Description |
|---|---|
| **R-IE01** | Parse `.xlsx` / `.xls` via `importService.ts` + `xlsx` library |
| **R-IE02** | Validate file type and max size (`Config.ImportExport`) before parse |
| **R-IE03** | Require expected header column from `Config.FieldLabels`. Match Excel headers to form field names with `trim()`, lowercase, and whitespace-insensitive comparison (also compact punctuation so `Product Group (MG2)` matches `Product Group MG2` / `ProductGroupMG2`). Do not mark a column missing when it is present under a spacing/case variant |
| **R-IE04** | Duplicate detection: compare case-insensitively against existing SharePoint records **and** within the uploaded file |
| **R-IE05** | Duplicate feedback: close **`ImportDialog`** and open separate **`ImportValidationDialog`** (S.NO, record name, error pill with red left border). **Proceed** imports valid rows only; disabled when none remain. Do not use duplicate-only Toasts |
| **R-IE06** | Skip duplicates; import only new valid rows (batch insert via `SPServices.batchInsert`) |
| **R-IE07** | After successful import, refresh list data from server (Redux thunk → `fetch*`) |
| **R-IE08** | Import errors (invalid file, missing column, empty data) → error Toast via slice/thunk |
| **R-IE09** | Components dispatch import thunks — do not call `SPServices` or `xlsx` directly from UI |

#### 5.8.6 Export rules

| Rule | Description |
|---|---|
| **R-IE10** | Export uses **`exportService.exportToExcel()`** with column config from domain service |
| **R-IE11** | Export **currently displayed** table data (respect active search/filter on the screen) |
| **R-IE11a** | Export button is **disabled** when the displayed DataTable has zero rows (common across masters and NPD list Export) |
| **R-IE12** | File name pattern: `{MasterName}_Export_{DD-MM-YYYY}.xlsx` via `buildExportFileName()` |
| **R-IE12a** | Excel header row uses theme master-table color (`#5793A0`) with white bold text via `xlsx-js-style` in `exportService.ts` |
| **R-IE13** | Warn via Toast when there are zero rows to export |
| **R-IE14** | Success Toast after download starts |

#### 5.8.7 Redux flow (Import)

```text
User selects file → ImportDialog.onImport(file)
        ↓
Feature dispatches previewImportXxx thunk
        ↓
If validation rows → close ImportDialog, open ImportValidationDialog
        ↓
Proceed → commitImportXxx thunk (valid rows only)
        ↓
Feature dispatches importXxx thunk (no validation issues path)
        ↓
Domain service: parse file → partition duplicates → batchInsert new rows
        ↓
Thunk fulfilled → refresh list + return { toCreate, duplicates, errors }
        ↓
Feature shows Toast warnings for duplicates/errors, success if toCreate.length > 0
```

#### 5.8.8 Reuse checklist for new masters

When adding Import/Export to another master screen:

1. Add `Config.TemplateTypes.{Master}` choice value.
2. Add `Config.FieldLabels` entry for the Excel column header.
3. Add `parseXxxImportFile` + `importXxxFromFile` + `exportXxxToExcel` in domain service.
4. Add `importXxx` thunk; wire toolbar buttons to `ImportDialog` + export helper.
5. Update `TaskList.md` and `Checklist.md`.

### 5.10 Delete Dependency Validation (Reusable)

Before soft-deleting master records, validate downstream usage in the **service layer** via `dependencyValidationService.ts`.

| Rule | Description |
|---|---|
| **R-DV01** | LookupType delete blocked when active `NPD_Lookup` rows reference the type (`LookupTypeId`) |
| **R-DV02** | Lookup delete blocked when configured in dependent lists (see `Config.DeleteDependencies`) |
| **R-DV03** | Dependency rules defined in `Config.ts` — list name, filter field, user-facing `blockedByLabel` |
| **R-DV04** | Blocked deletes throw typed errors from domain services; thunks surface them via Toast |
| **R-DV05** | Do not delete in UI only — always re-check in service before SharePoint write |

Add new dependency rules to `Config.DeleteDependencies` when future modules reference Lookup values (NPD Request, Material Group, etc.).

### 5.11 Cross-Site ROCA Master Data

Some master screens load reference data from a **separate ROCA SharePoint site** (`BrandMaster`, `PlantMaster`, `RoleMaster`, `ApproversMaster`). Plant, Role, and Approver Configuration are **not** administered in this app.

| Rule | Description |
|---|---|
| **R-CS01** | Resolve ROCA site URL via `resolveRocaMasterSiteUrl()` in `rocaSiteUrlResolver.ts` — never hardcode URLs in feature components |
| **R-CS02** | Prefer `appSlice.siteUrl` (set in `initializeApp` via `resolveCurrentSiteUrl`); services fall back to browser location when empty |
| **R-CS03** | Cross-site list reads use `SPServices.getAnotherSPReadItems()` + list names from `Config.RocaMasterListNames` |
| **R-CS04** | Domain-specific orchestration lives in `rocaMasterDataService.ts` |
| **R-CS05** | Comma-separated multiline fields (e.g. Plant codes) use `plantValueUtils.ts` for parse/join |
| **R-CS05a** | DataTable cells with many delimited values use shared `MultiValueCell` / `formatMultiValueCell` — show first **8** values then `...`; set `title` to the full list when truncated |
| **R-CS06** | **No local admin modules** for Plant Master, Role, or Approver Configuration — those lists live on the ROCA site (`Config.RocaMasterListNames`). Do not add nav items, routes, or NPD-site lists for them. Consume via `rocaMasterDataService.ts` / `npdFormDataService.ts` |
| **R-CS07** | ROCA `RoleMaster` reads for Workflow Next Role select **`IsDelete`** and exclude deleted rows (`isDeletedYesFlag`) — same soft-delete pattern as ApproversMaster |

Environment mapping is centralized in `resolveRocaMasterSiteUrl(currentSiteUrl)` (Chandrudemo → `/sites/ROCA`; Rocasanitario → RINMASTERDEV / RBPPLWOW based on current site path).

### 5.12 PrimeReact Theme & Form Control Styling

All PrimeReact wrappers (`Dropdown`, `MultiSelect`, `ComboBox`, etc.) must follow these rules so the CDN bootstrap theme never leaks default blue styling into the app.

| Rule | Description |
|---|---|
| **R-UI01** | **No default PrimeReact blue** — selected rows, checked checkboxes, and primary accents use ROCA theme tokens (`$roca-color-accent`, `$roca-color-bg-selected`, `$roca-color-btn-primary-bg`) |
| **R-UI02** | **No blue focus ring** — remove box-shadow, outline, and blue border on `:focus`, `.p-focus`, and `:focus-within` for dropdowns, multiselects, inputs, and panel items |
| **R-UI03** | **Checked checkbox state** — `.p-checkbox.p-highlight .p-checkbox-box` uses `$roca-color-accent` background/border (not `--primary-color` blue) |
| **R-UI04** | **Option alignment** — multiselect/dropdown items use `display: flex`, `align-items: center`, `gap: 0.5rem`; checkbox `flex: 0 0 1rem` so label text sits immediately beside the checkbox |
| **R-UI05** | **Overlay panels** — use `appendTo={getAppRootElement()}` + shared styles in `_roca-form-controls.scss`; inject post-CDN overrides via `injectRocaPrimeOverrides.ts` |
| **R-UI06** | **Search filter in panels** — compact Poppins (`0.75rem`); padding `0.5rem` left / `1.75rem` right; search icon pinned to the **right** (never leave empty left space for a missing left icon) |
| **R-UI07** | **Trigger arrow** — dropdown/multiselect chevron inside the control border; transparent background on hover/focus |
| **R-UI08** | **Consistency** — new form controls reuse `_roca-form-controls.scss` / `_primereact-overrides.scss`; do not add one-off overlay, font, or selection overrides in feature modules |
| **R-UI09** | **Poppins on overlays** — Toast, Dropdown, MultiSelect, ComboBox, Dialog, DatePicker, Tag, and option items must set `font-family: Poppins` (CDN theme does not inherit from `.appRoot`) |
| **R-UI10** | **Selected option background** — use `$roca-color-option-selected-bg` (theme teal, slightly darker than hover) on `.p-highlight` items; hover uses `$roca-color-option-hover-bg`. Do not use the mint `$roca-color-bg-selected` for option lists |
| **R-UI11** | **Selected navigation item** — `$roca-color-nav-item-selected-bg: #ffffff` with `$roca-color-nav-item-selected-text` (dark teal) so the active menu is immediately visible on the teal nav |

Implementation files:

- `src/webparts/rocaNpd/styles/_roca-form-controls.scss` — shared Dropdown / MultiSelect / ComboBox panel rules
- `src/webparts/rocaNpd/styles/_primereact-overrides.scss` — app-root SCSS overrides
- `src/External/CommonServices/injectRocaPrimeOverrides.ts` — injected CSS after PrimeReact CDN (wins cascade)
- `src/webparts/rocaNpd/styles/theme.module.scss` — CSS variables (`--primary-color`, `--highlight-bg`, `--focus-ring`)

When adding a new PrimeReact wrapper, verify visually: open panel → tick checkbox → focus search → confirm **no blue** anywhere.

### 5.13 Workflow Configuration Standard

Workflow Configuration defines **who approves next and in what order** for each request type. Changes here directly affect runtime approval routing — implement and validate carefully.

| Rule | Description |
|---|---|
| **R-WF01** | SharePoint list `NPD_WorkflowConfig` (`Config.ListNames.WorkflowConfig`); one record per approval **step** |
| **R-WF02** | `Title` = Request Type; `CurrentRole` / `NextRole` = sequential handoff; `IsDeleted` = soft delete |
| **R-WF03** | Request types from `Config.WorkflowRequestTypes` — never hardcode `"NPD Request"` / `"MG Request"` in components |
| **R-WF04** | Default start role from `Config.WorkflowDefaults` (`NpdStartRole` / `MgStartRole` = Initiator) |
| **R-WF05** | **NPD Request:** Next Role options from ROCA `RoleMaster` where `System/Title eq "New Product Development"` (expand `System` lookup); exclude Initiator and roles in `Config.WorkflowNpdExcludedNextRoles` (e.g. Consultant); exclude rows where **`IsDelete` = true** |
| **R-WF06** | **MG Request:** exactly one step; Next Role = `Config.WorkflowDefaults.MgNextRole` (Consultant); Add Step hidden |
| **R-WF07** | Step builder: after selecting Next Role + Add Step, next step Current Role = previous Next Role |
| **R-WF08** | Exclude Initiator, request-type excluded roles, and all already-used roles from Next Role dropdown (no duplicates, no cycles) |
| **R-WF08a** | **Add Step** visible only when the last step has a Next Role selected **and** at least one valid role remains for a new step (`canAddWorkflowStep()`) |
| **R-WF08b** | Every applicable step's **Next Role** is editable; **Current Role** is always derived from the previous step's Next Role (`rebuildFormStepsAfterChange()`) when Next Role changes |
| **R-WF08c** | Remove step allowed **only on the latest step**; removing it re-enables editing on the new last step |
| **R-WF08d** | Form dialog uses consistent control font size (`0.8125rem`) and standard button/icon sizing per master popup pattern |
| **R-WF08e** | **Save blocked** until all available Next Role options are consumed in the chain (`canAddWorkflowStep()` returns false). Incomplete NPD chains show a Toast warning — do not allow Add/Update with only the first step when more roles remain |
| **R-WF09** | Dashboard groups steps by Request Type; display **Approval Chain** as `Initiator → Role → Role` via `buildApprovalChainLabel()` |
| **R-WF10** | Edit: soft-delete existing step IDs, then create new step records (replace chain atomically in service) |
| **R-WF11** | Delete: soft-delete **all** step IDs for the request type |
| **R-WF12** | One active workflow per request type; duplicate blocked with Toast warning |
| **R-WF13** | All validation feedback via **Toast** (`showWarningToast`) — no inline field errors |
| **R-WF14** | Business logic in `workflowConfigurationUtils.ts`, `workflowConfigurationService.ts`, `workflowConfigurationValidation.ts` |
| **R-WF15** | Redux: `workflowConfigurationThunks.ts` + `adminSlice.workflowConfig`; UI under `admin/workflowConfig/` |
| **R-WF16** | Route `/admin/workflow-config`; reuse Master/Toolbar/Table/FormDialog pattern + `LoaderOverlay` |

**Future workflow modules** (NPD Request submit, approval actions, Power Automate) must read ordered steps from `NPD_WorkflowConfig` — do not hardcode Initiator → VH → MIS in feature code.

### 5.14 Typography Standard

| Rule | Description |
|---|---|
| **R-TY01** | App-wide font family: **Poppins** — loaded via `loadApplicationStyles.ts` (Google Fonts CDN) |
| **R-TY02** | Base font size on `[data-roca-npd-root]`: `0.8125rem` (`theme.module.scss`) |
| **R-TY03** | Poppins applies to navigation, headings, DataTables, forms, inputs, dropdowns, buttons, popups, labels, and pagination |
| **R-TY04** | Do not introduce alternate font families in feature modules |

### 5.15 DataTable Standard

All master list screens use the shared **`DataTable`** wrapper with styles from `DataTable/DataTable.module.scss`.

| Rule | Description |
|---|---|
| **R-DT01** | **No grid lines** — `showGridlines={false}`; cell/header borders removed in shared SCSS |
| **R-DT02** | **Sort icons** — small and subtle (`0.5625rem`, muted white on header) |
| **R-DT03** | **Pagination report** — `"Showing X to Y of Z entries"` displays as plain text only (no box/border/background on `.p-paginator-current`) |
| **R-DT04** | Striped rows and hover states use ROCA theme tokens |
| **R-DT05** | Row action icons (edit/delete) reuse `.actionCell`, `.editAction`, `.deleteAction` from `DataTable.module.scss` (start-aligned under "Action" header, compact column `5.5rem` to avoid blank space on right) |
| **R-DT06** | Do not duplicate table/pagination SCSS in feature `*Table.module.scss` files |
| **R-DT07** | Pagination controls use shared **`styles/_datatable-pagination.scss`** — `2.25rem` circular nav arrows (`#f5f7f9` bg), `0.75rem` arrow icons, active page teal circle, inactive pages as plain text (`0.8125rem`), `0.625rem` gap between controls |

### 5.16 Form Dialog Standard

All Add/Edit popups use shared mixins from **`styles/_form-dialog-standard.scss`**.

| Rule | Description |
|---|---|
| **R-FD01** | **Dialog title:** `1.125rem`, weight 600, centered — visually larger than field labels |
| **R-FD02** | **Field labels:** `0.75rem`, weight 500, secondary text color |
| **R-FD03** | **Control values:** `0.8125rem` (inputs, dropdowns, multiselects) |
| **R-FD04** | **Footer buttons:** Cancel = outlined secondary (white bg, gray border); primary action = teal solid fill; min-width `5.5rem`, min-height `2rem`, weight 600, gap `0.625rem`; `margin: 0 !important` and aligned padding (`1.25rem` horizontal) so buttons are flush with form input fields on the right edge |
| **R-FD05** | Footer has top border separator; use `@include roca-form-dialog-shell`, `roca-form-dialog-footer`, `roca-form-dialog-field` |
| **R-FD06** | Feature dialogs import shared SCSS — do not redefine title/label/footer sizing per module |
| **R-FD07** | **Cannot Delete** (`DeleteBlockedDialog`) stays compact — tight header/content/footer padding via `.roca-delete-blocked-dialog` overrides in module SCSS + `injectRocaPrimeOverrides` / `_primereact-overrides` (must beat shared dialog padding); message and Close centered |

### 5.19 NPD Request Form (Initiator)

| Rule | Description |
|---|---|
| **R-NPD01** | Route `/npd/new`; UI under `components/npd/newRequest/` — no accordion; **General Information** panel above **Item Details** panel |
| **R-NPD02** | Section panels use teal header (`$roca-color-master-table-header`) via shared `NpdFormSectionPanel`; Item Details uses shared `DataTable` |
| **R-NPD03** | Brand options from ROCA `ApproversMaster` — filter System=`Config.NpdApproverSystems.NewProductDevelopment`, Role=`Config.Roles.Initiator`, Users email = `app.userEmail`, **`IsDelete` = false** (select `IsDelete` and exclude via `isDeletedApproverRow`); expand System, Role, Brand, Users lookups. Brand options are seeded in `initializeApp` from resolved access so they are ready when the NPD Form opens |
| **R-NPD04** | Material Type options from `Config.NpdMaterialTypes` — never hardcode in components |
| **R-NPD05** | Plant/Source enabled when Material Type is selected — **Finished Products:** ROCA `PlantMaster` (`PlantType`=Factory, active, `PlantCode`); **Traded Products:** `Config.NpdTradedPlantSources` (Imported, Domestic) |
| **R-NPD05a** | `ApproversMaster` reads use client-side filtering after expand (System, Role, Users email, **IsDelete**) — avoid fragile OData filters on lookup/person fields |
| **R-NPD05b** | `requireRocaMasterSiteUrl()` maps using SPFx `siteUrl` + page URL haystack (not `window.origin` alone) |
| **R-NPD06** | Cross-site fetch via `npdFormDataService.ts` + `resolveRocaMasterSiteUrl`; Redux in `npdFormSlice` / `npdFormThunks`. Prefetch Item Details lookup options in `initializeApp` (`fetchNpdLookupOptions`) so MultiSelect options are available on first NPD Form open |
| **R-NPD07** | Components ≤ 200 lines; split General Info, Item Details, section shell |
| **R-NPD08** | **Save Draft** writes General Information and Item Details to `NPD_Request` + `NPD_ItemDetails`. Status = `Config.RequestStatus.Draft` on create; existing Draft / Rework status is preserved on update. `Title` stays empty (`""`) on drafts unless it is already a generated Request ID (Brand is never written to `Title`). Items added to `NPD_ApproverComments` and `NPD_MaterialGroupAuditLogs` also store `Title` as empty (`""`). Request ID stays blank until Submit. Item Details persist with one `SPServices.batchMutate` call (insert/update/delete in a single `$batch`, not per-row PATCH). While saving, the overlay shows the same line-item progress bar as Submit (`{current} / {total} Line Items Added`); the bar starts immediately and animates independently of item count |
| **R-NPD09** | `WorkFlowJSON` is rebuilt on every save from `NPD_WorkflowConfig` (approval sequence) + ROCA `ApproversMaster` (users). Shape: `[{ Role, UserEmail, Status }, ...]`. **Initiator Status is always `""`** (Initiator does not approve). Approvers stay `""` on Draft; Submit sets the first approver role to `Pending`. Vertical Head is brand-scoped; MIS Coordinator includes all assigned emails; Initiator is the logged-in user |
| **R-NPD10** | Draft / ReWork (`/npd/draft-rework`) lists the current user's own Draft and Rework rows, with search plus Status and Brand filters. **Edit** opens `/npd/new?id={Id}&mode=edit&from=draft-rework` and hydrates General Information without using `setNpdMaterialType` (that action clears Plant / Source) |
| **R-NPD11** | Item Details MultiSelect options come from `NPD_Lookup` via `fetchActiveLookups()` + `lookupOptionUtils`. Match the field header (and field key) to expanded **`LookupType/Title`** using trim + lowercase, punctuation-insensitive compact keys, and parenthetical-stripped titles (so `Product Group (MG2)` matches `Product Group MG2`). Option label/value is list **`Title`** (UI “Lookup Name”). Never query a `LookupName` column. Item Details DataTable paginates at `Config.NpdItemDetailsPageSize` (7) and shows paginator controls only when there are more than 7 rows |
| **R-NPD12** | MultiSelect empty state (`No available options`) is **12px** on the common `MultiSelect` control and overlay styles — do not restyle per screen |
| **R-NPD13** | Item Details Import reuses `ImportDialog` + `ImportValidationDialog` (same as Lookup). Template from `NPD_Templates` where `TemplateType = Config.TemplateTypes.NpdItemDetails` (`NPDItemDetails`). Max 200 rows per import. Excel columns are mapped to Item Details fields with `trim()` + lowercase + whitespace-insensitive (and punctuation-compact) matching so template headers are not reported missing. Excel lookup values must match configured Lookup options (e.g. UOM `No`/`PC` only). Duplicates use the Lookup duplicate popup; invalid values are errors. NPD validation popup columns are **S.NO** and **Validation Error** only (no Material Code column) |
| **R-NPD14** | **Submit Request** generates Request ID in `NPD_Request.Title` as `NPD-YYYY-###` (`Config.NpdRequestIdFormat`, pad 3). Skip `IsDeleted = true`. No records → `NPD-2026-001`; existing `NPD-2026-005` → `NPD-2026-006`. Status = Pending. `NPD_ItemDetails.RequestGeneralInfoId` is patched to the request ID. While submitting, the overlay shows a line-item progress bar (`{current} / {total} Line Items Added`) |
| **R-NPD15** | Pending Approval (`/npd/pending`) reuses the Draft/ReWork DataTable. **Vertical Head** sees requests whose pending `WorkFlowJSON` role is Vertical Head and whose Brand is in that user's ApproversMaster VH brands. **MIS Coordinator** sees every request whose pending role is MIS Coordinator (any user in that role, not only the email stored in JSON). **Initiator** also sees their own Pending requests. Multi-role users get the union of those rules. **View** always opens `/npd/new?id=&mode=view` read-only (no Approve/Reject/Rework). **Edit** (shown first when allowed) opens `mode=edit` for the acting role: initiator Draft/Rework, or the current pending VH/MIS step. No Delete icon on request tables. View/Edit URLs include `from` so Cancel/Back returns to this list |
| **R-NPD16** | Approve / Reject / Rework are **role-based and user-independent**. The current pending `WorkFlowJSON` role must match an assigned role; Vertical Head is still brand-scoped, MIS Coordinator is not. Multi-role users act as the pending role (VH pending → VH action, MIS pending → MIS action) so one role never overrides another. **View never shows approval actions.** **Edit** for Vertical Head shows Approve / Rework / Reject; **Edit** for MIS Coordinator shows Rework / Reject / Post to SAP (completes the MIS workflow step). **Rework/Reject from the page** use inline Approver Remarks; **Approve** does not require comments. **Vertical Head email** Approve / Re-work / Reject buttons open the standalone **NPDApproverMail** page (`SitePages/NPDApproverMail.aspx?RequestID=&Action=`) — not the main SPA dashboard/hash route. That web part confirms the action, requires comments for Rework/Reject, then calls `applyNpdWorkflowAction` (updates `NPD_Request` Status/`WorkFlowJSON` and writes `NPD_ApproverComments` with the logged-in User and `ActionVia = "Mail"`). Actions from the app write `ActionVia = "System"`. Header stays Pending until the last approver (MIS Coordinator) completes the step. **Only Vertical Head emails include Approve / Re-work / Reject buttons**. **NPDApproverMail displays clean single-line messages with no icon, title header, or extra text**: Successful action → `Your response for this request has been submitted successfully.`; already submitted/completed → `Your response for this request has already been submitted.`; user in `WorkFlowJSON` with status Pending → `No action is required from you for this request at the moment.`; user not in `WorkFlowJSON` → `You are not part of this request workflow.`. **MIS Coordinator can add/edit Item Details while their step is Pending.** Rows added by the MIS Coordinator are stored with `NPD_ItemDetails.Title = "MIS_ADDED"` and are **highlighted (yellow background `#fefce8` + amber left accent `#eab308`)**. That highlight persists when the Initiator views it and when the Vertical Head views it. Initiator-added rows are **never** highlighted. **Audit Log tables** (`NpdAuditLogTable` and `MaterialGroupAuditLogTable`) include an **Action Via** column (System / Mail pill badge) that dynamically displays the actual saved value from the list without hardcoding or falling back to System (empty/blank displays `—`), and the **Action On** column displays date and time (`DD/MM/YYYY hh:mm A`). Email header background is **#774dec** behind the ROCA logo, and all emails strictly send to the **To** recipient without CC. Default SharePoint suite bar header (with settings & profile) is kept visible |
| **R-NPD17** | All Requests (`/npd/all`) uses summary cards (Total, Pending, In Rework/Drafts, Approved), search, Status filter, Brand filter, and **Export** (Excel `.xlsx` via `exportToExcel`). Columns: Request ID, Brand (MG1), Material Type, Plant, Products (line count), Status, Current Approver, Created Date, **Workflow**, Actions. **Pending** status displays as **Pending with VH** / **Pending with MIS Coordinator** (or the current pending role). Current Approver shows the pending workflow person's name. Empty DataTables show a centered **No Requests Found** / **No Records Found** message. **Initiator** and **Vertical Head** see requests for brands mapped to that role in ROCA `ApproversMaster`. **MIS Coordinator** sees all NPD requests. Multi-role visibility is the union (MIS “see all” is a superset, not an override). **Edit** only when the user can act (own Draft/Rework, or current pending VH/MIS step). **View** is always read-only. No Delete on request tables |
| **R-NPD17a** | Status / Brand filter options are **data-driven** from the rows currently in the DataTable (+ NPD_Request Status choice catalog for order). Empty table → All Statuses / All Brands only — never show Draft/Rework/etc. when no matching rows. Data value `In ReWork` / `Rework` → filter label **Rework**. Do not hardcode static status lists for filters |
| **R-NPD17b** | List DataTables fetch with `Orderby: "Modified"`, newest first (`Orderbydecorasc: false`). Client re-sort uses Modified (fallback Created) |
| **R-NPD18** | Approved Requests (`/npd/approved`) lists fully approved requests using the same search, Brand filter, and **Export** (Excel `.xlsx`). The heading sits above the search/filter row. Scope matches R-NPD17. View-only |
| **R-NPD19** | **Cancel/Back** returns to the page that opened the form via `from` (`all` / `pending` / `approved` / `draft-rework`). Do not infer Cancel from Status or `editId`. Missing/invalid `from` (including New Request from the nav) returns to All Requests. Email links use `from=pending`. NPD Form inputs set `autoComplete="off"` (password fields `new-password`) so browser suggestions do not appear while typing |
| **R-NPD20** | NPD Form validation toasts show **one message at a time** (first unfilled/invalid field). After that field is completed, the next toast appears on the following Save Draft / Submit. Do not join all line-item errors into one paragraph |
| **R-NPD20a** | Success toasts use a consistent **“… successfully.”** format (e.g. `created successfully.`, `updated successfully.`, `deleted successfully.`, `imported successfully.`). Do not use phrasing like “was deleted” |
| **R-NPD21** | Request lists have a dedicated **Workflow** column (`pi pi-sitemap`) — not inside Actions — on All / Pending / Approved / Draft-Rework. **Draft** rows hide the Workflow icon. It opens a read-only **Workflow Status** dialog of `WorkFlowJSON` (Role, Name, Workflow Role, Status). Highlight **only the current pending role/person** (VH pending → Vertical Head; after VH acts → MIS Coordinator). Rework highlights Initiator. Draft has no highlight. Empty approver statuses still display as **Pending** until that person acts, but are not highlighted unless that step is the current JSON `Pending`. Highlight is a light row background only (no italic/colored role text). Names resolve from Author Title, then site users, then email local-part. The dialog does not mutate workflow |
| **R-NPD22** | Same NPD request in two browser tabs of the **same login user** uses `BroadcastChannel` + user-scoped sync (`npdRequestTabSync.ts`, initialized in AppShell with the current user email). **Different accounts (e.g. Kali vs Leo) never lock each other.** Opening View or Edit claims the request. Save Draft / Submit / workflow action notify Draft Saved / Submitted. **Duplicate tabs that already have the form open** show Editing Restricted automatically when the tab becomes visible (no click required). List View/Edit is blocked only by a live editing claim from another same-user tab — not by a prior Submitted/Draft-saved after the acting tab left the form. Popup actions: **Go to Dashboard** (`/npd/all`) or **Reload Page**. Do not persist extra SharePoint fields for this lock |

### 5.14 NPD_Lookup data model (mandatory)

`NPD_Lookup` (`Config.ListNames.Lookup`) is the source of dropdown/MultiSelect values across the app. The Admin Lookup screen already implements this model — **reuse it**. Do not invent extra columns.

| UI label | SharePoint field | How to read |
|---|---|---|
| Lookup Name | **`Title`** | `item.Title` — **there is no `LookupName` column** |
| Lookup Type | **`LookupType`** (lookup → `NPD_LookupType`) | `Select: LookupType/Title` + `Expand: LookupType`, then `getLookupTitles(item.LookupType)` (also `LookupTypeId` object / `NPD_LookupType.Title` by Id when expand Title is empty) |
| Lookup Code | **`LookupCode`** | `item.LookupCode` |
| Soft delete | **`IsDeleted`** | `getActiveRecordFilters()` |

| Rule | Description |
|---|---|
| **R-LK01** | Never select, filter, or write a field named `LookupName`. Persist and read the display name as **`Title`**. Domain property `ILookup.LookupName` is mapped from `Title` in `lookupService.mapLookup` only |
| **R-LK02** | Lookup Type value **requires Expand**. Always `Select` `LookupType/Id,LookupType/Title` and `Expand` `LookupType`. Read the type name with `getLookupTitles()` from `LookupType` and `LookupTypeId`. If Title is still empty, resolve `NPD_LookupType.Title` by Id. Do not assume a flat string on `LookupType` |
| **R-LK03** | UI copy uses `Config.FieldLabels.LookupName` / `LookupType` / `LookupCode`. Internal names stay in `Config.FieldNames.Lookup` |
| **R-LK04** | All Lookup dropdown/MultiSelect options must go through `lookupService.fetchActiveLookups()` (or `lookupOptionUtils` built on top of it). Do not add a second PnP query that redefines the schema |
| **R-LK05** | Compare Lookup Type to a field name with `lookupOptionUtils.lookupValuesMatch` / `getLookupMatchKeys` — trim + lowercase, compact alphanumeric, and titles with/without parenthetical codes |
| **R-LK06** | Lookup form validation order matches UI field order: **Lookup Type → Lookup Code → Lookup Name** (then duplicate Name check) |
| **R-LK07** | Lookup Import/Export columns: Lookup Type, Lookup Code, Lookup Name — persist `LookupCode` on import |

### 5.17 Master Toolbar & Reset Filters

| Rule | Description |
|---|---|
| **R-MT01** | Master toolbars use shared **`MasterToolbar.module.scss`** + **`MasterToolbarSearch`** (`common/master/MasterToolbar/`) |
| **R-MT02** | Reset filter icon (`pi-refresh`) sits **immediately next to the Search box** in the toolbar — not inside the DataTable |
| **R-MT03** | Clicking reset clears all active filters/search (`globalFilter`, column filters when added) and restores full dataset |
| **R-MT04** | Reset button uses project theme-color background (`$roca-color-btn-primary-bg` / `#40919d`), white icon, **permanent** style on hover/focus/active/disabled — no color change after click. Shared class `roca-master-reset-button` plus `master-toolbar-reset-button`; height `2rem` on all master toolbars |
| **R-MT05** | Search input, Reset button, and action buttons (`Import`, `Export`, `Add New`) share consistent height (`2rem`) via `_master-toolbar.scss` |
| **R-MT06** | DataTable wrapped in **`MasterTablePanel`** for consistent panel layout (no filter controls inside the table) |
| **R-MT07** | Pagination styling defined in `_datatable-pagination.scss` (also synced in `injectRocaPrimeOverrides.ts`) |
| **R-NAV03** | Side navigation sections use border separator lines between sections; bottom line below Reports (the last section) is removed (`.section:last-child { border-bottom: none; }`) |

### 5.18 User-Facing Label Spelling

| Rule | Description |
|---|---|
| **R-LB01** | User-facing text uses **"Lookup Type"** (two words) — not `LookupType`, `LookUp Type`, or `LookUp` |
| **R-LB02** | Code identifiers (folders, interfaces, list keys) may remain camelCase; UI labels, nav, headings, breadcrumbs, and dialog titles use spaced spelling from `Config.FieldLabels` |

### 5.20 Role & Permission Standard

| Rule | Description |
|---|---|
| **R-SEC01** | Resolve **all** roles for the logged-in user. Admin comes **only** from the SharePoint group `Config.SharePointGroups.Admins` (not ApproversMaster). Other roles come from ROCA `ApproversMaster` (`Role/Title` + `Users` email match + **required** `System/Title`). A user may hold multiple roles — permissions are a **union**, never a single-role override. Admin alone does **not** imply Initiator / VH / MIS / Consultant |
| **R-SEC02** | Role resolution lives in `roleService.ts`; navigation, routes, and actions live in `permissionService.ts`. Store the result in `appSlice` (`assignedRoles`, per-role brand arrays, `assignments` with System) once per session via `initializeApp` |
| **R-SEC03** | Side navigation uses `filterNavigationByRoles(access)`. Matrix (Project Master §6 + Tech Arch §6.2): **Initiator** — full NPD + full MG + Reports. **Vertical Head** — NPD All / Pending / Approved + Reports. **MIS Coordinator** — NPD All / Pending / Approved + Reports. **Consultant** — MG All / Pending / Completed + Reports only (no NPD, no MG New/Draft). **Admin** — NPD All Requests + MG All Requests + Administration + Reports only (no New / Draft / Pending / Approved nav). Multi-role users see the union |
| **R-SEC03a** | ApproversMaster must have a known `System` (`New Product Development` or `New Material Group`). **Consultant** always maps to the Material Group module even when listed under NPD System (common on ROCA site). **Initiator** under either System unlocks **both** NPD and MG navigation (Project Master §6.1); brands prefer the matching System then fall back. VH / MIS require NPD System. Blank System rows are ignored |
| **R-SEC04** | `ProtectedRoute` blocks unauthorized URLs and redirects to `/unauthorized`. Home (`/`) redirects to `getDefaultRoute(access)` |
| **R-SEC05** | Brand scope is mandatory for Initiator and Vertical Head. List/query screens must use `getNpdViewScope()` / `getMgViewScope()` / `canViewRequest()` — users see only requests for brands assigned to them (Initiator also limited to **own** requests where applicable). **Admin sees all** NPD and MG requests on All Requests. MIS Coordinator / Consultant with no brands are treated as globally assigned for their module |
| **R-SEC06** | Workflow actions (Approve, Rework, Reject, Post to SAP, Consultant Complete) are granted **only** by the matching ApproversMaster role + System. Admin-only users cannot perform those actions |
| **R-SEC07** | New NPD Request Brand (MG1) options are the user's `npdInitiatorBrands` from session access — do not show brands from other people's ApproversMaster rows |
| **R-SEC08** | ApproversMaster user match is **email only** (`Users/EMail` or ROCA site-user map by `UsersId`). Never match NPD-site user IDs, display names, WorkflowJSON, or a previously selected role |

---

## 6. Folder Structure Standard

### 6.1 Full Target Structure

```text
src/
├── External/CommonServices/
│   ├── Config.ts                 # List names, constants — no magic strings
│   ├── Interface.ts              # Domain TypeScript interfaces
│   ├── ISPServicesProps.ts
│   ├── SPServices.ts             # Generic SP CRUD (PnP v4)
│   ├── theme.scss                # ONLY file with hardcoded color hex values
│   ├── roleService.ts
│   ├── lookupService.ts
│   ├── npdService.ts
│   ├── materialGroupService.ts
│   ├── adminService.ts
│   ├── sapService.ts
│   ├── templateService.ts
│   ├── importService.ts
│   ├── exportService.ts
│   ├── dependencyValidationService.ts
│   ├── rocaSiteUrlResolver.ts
│   ├── rocaMasterDataService.ts
│   ├── plantValueUtils.ts
│   ├── workflowConfigurationService.ts
│   └── workflowConfigurationUtils.ts
│   └── loadApplicationStyles.ts      # Poppins + PrimeReact CDN
├── store/
│   ├── index.ts
│   ├── hooks.ts                  # useAppDispatch, useAppSelector
│   ├── slices/
│   └── thunks/
└── webparts/rocaNpd/components/
    ├── RocaNpd.tsx               # SP init (setupSP) + Redux Provider + Router
    ├── MainComponent.tsx         # App bootstrap, initializeApp
    ├── layout/                   # App shell, nav, header
    ├── common/
    │   ├── master/               # MasterTablePanel, shared list patterns
    │   ├── controls/             # ⭐ PrimeReact wrappers (one folder per control)
    │   │   ├── InputText/
    │   │   ├── Dropdown/
    │   │   ├── MultiSelect/
    │   │   ├── DataTable/
    │   │   ├── Button/
    │   │   ├── Dialog/
    │   │   ├── DatePicker/
    │   │   └── index.ts          # Barrel export
    │   ├── StatusBadge.tsx       # Composite common components
    │   ├── SearchFilterBar.tsx
    │   ├── EmptyState.tsx
    │   ├── LoaderOverlay.tsx
    │   ├── ExportButton.tsx
    │   └── importExport/
    │       └── ImportDialog/       # Reusable Import popup (wireframe)
    ├── npd/                       # Feature — NPD module screens only
    ├── materialGroup/             # Feature — Material Group screens
    ├── admin/                     # Feature — Admin master screens
    ├── reports/                   # Feature — Reports
    ├── routes/
    └── hooks/                     # Shared custom hooks (optional)
```

### 6.2 Naming Conventions

| Item | Convention | Example |
|---|---|---|
| React component file | PascalCase | `NpdNewRequestForm.tsx` |
| Common control folder | PascalCase | `common/controls/Dropdown/` |
| SCSS module | PascalCase.module.scss | `InputText.module.scss` |
| Service file | camelCase + Service | `npdService.ts` |
| Redux slice | camelCase + Slice | `npdSlice.ts` |
| Thunk file | camelCase + Thunks | `npdThunks.ts` |
| Interface | I + PascalCase | `INPDRequest` |
| Config constants | PascalCase namespace | `Config.ListNames.NPDRequest` |
| CSS theme variables | `--roca-color-*` | `var(--roca-color-primary)` |

---

## 7. Redux Standards

### 7.1 Principle

**Redux Toolkit** is the single source of truth for **application and server-side data state**. Components read from Redux; they dispatch actions/thunks to mutate state or persist data.

### 7.2 What Goes in Redux

| Store in Redux | Do NOT Store in Redux |
|---|---|
| Current user, role, mapped brands | `WebPartContext`, `SPFI` instance |
| Lookup cache (by type) | PrimeReact internal UI state |
| List view data, filters, pagination | Dialog animation state |
| Current request + items (form draft) | Individual keystroke timing |
| Loading / error flags per module | Component hover/focus (use local state) |
| Toast notification queue | Route definitions |
| UI: sidebar collapsed, active nav | |

Form drafts: hold in Redux slice `formDraft` until Save Draft / Submit, then clear or refresh from server.

### 7.3 Data Flow (Mandatory Pattern)

```text
┌─────────────┐    dispatch     ┌──────────────┐    call     ┌─────────────┐
│  Component  │ ──────────────► │ Async Thunk  │ ──────────► │   Service   │
│ (common or  │                 │ (store/      │             │ (npdService,│
│  feature)   │                 │  thunks/)    │             │  SPServices)│
└──────▲──────┘                 └──────┬───────┘             └──────┬──────┘
       │                               │                            │
       │ useAppSelector                │ fulfilled / rejected       │ PnP v4
       │                               ▼                            ▼
       │                        ┌──────────────┐             ┌─────────────┐
       └────────────────────────│ Redux Slice  │             │ SharePoint  │
                                │ (reducer)    │             │ Lists       │
                                └──────────────┘             └─────────────┘
```

**Rules:**

| Rule | Description |
|---|---|
| **R-R01** | Components never call `SPServices` or PnP directly |
| **R-R02** | Thunks call domain services; services call `SPServices` |
| **R-R03** | Slices contain reducers only — async logic in thunks |
| **R-R04** | Use `useAppDispatch` and `useAppSelector` — not raw `useDispatch` |
| **R-R05** | Loading state: set `pending` in thunk lifecycle, clear on fulfilled/rejected |
| **R-R06** | Errors: capture in slice, display via Toast — do not swallow silently |
| **R-R07** | After successful Save/Submit, refresh list data from server |
| **R-R08** | Lookup data: fetch once per type, cache in `lookupSlice`, invalidate on admin CRUD |

### 7.4 Slice Ownership

| Slice | Owns |
|---|---|
| `appSlice` | User, role, brands, global loader, toast |
| `lookupSlice` | Cached lookups by type, brand extensions, plants |
| `npdSlice` | NPD lists, filters, current request, form draft |
| `materialGroupSlice` | MG lists, current request, form draft |
| `adminSlice` | Master list data per admin screen |
| `uiSlice` | Sidebar, nav, confirm dialog visibility |

### 7.5 Example Flow — Save NPD Draft

```text
1. User clicks "Save Draft" on NpdNewRequestForm
2. Component dispatches saveNpdDraft thunk with form data from npdSlice.formDraft
3. npdService.saveDraft() validates, then calls SPServices batch write
4. Thunk fulfilled → npdSlice updates status, appSlice shows success toast
5. Component navigates or stays based on UX rule
```

---

## 8. SharePoint / Service Layer Standards

### 8.1 SP Initialization

```text
RocaNpdWebPart.ts     → passes WebPartContext only (no SP init)
RocaNpd.tsx           → spfi().using(SPFx(context)) + setupSP(sp)
SPServices.ts         → uses singleton _sp via getSP()
Domain services       → call SPServices methods
```

**Never** call `initPnP()` — this function does not exist in this project. SP setup is **`setupSP()`** in `RocaNpd.tsx`.

### 8.2 Service Rules

| Rule | Description |
|---|---|
| **R-S01** | `SPServices.ts` stays generic — list CRUD, batch, files |
| **R-S02** | Domain logic in `*Service.ts` (validation, mapping, orchestration) |
| **R-S03** | List names from `Config.ts` only |
| **R-S04** | Field mapping uses interfaces from `Interface.ts` |
| **R-S05** | Dates formatted via `SPServices.GetDateFormat()` |
| **R-S06** | Request IDs via `SPServices.GenerateFormatId()` |

---

## 9. Styling Standards

| Rule | Description |
|---|---|
| **R-ST01** | All color hex values live **only** in `External/CommonServices/theme.scss` (SCSS tokens) |
| **R-ST02** | Every `*.module.scss` must `@import` `External/CommonServices/_theme.scss` and use `$roca-color-*` tokens (SPFx compiles these at build time — do not rely on `var()` alone) |
| **R-ST03** | App root uses `webparts/rocaNpd/styles/theme.module.scss` → `className={themeStyles.appRoot}` in `MainComponent.tsx` (emits CSS variables for PrimeReact `:global` overrides) |
| **R-ST04** | PrimeReact / PrimeIcons / PrimeFlex CSS loaded via `loadApplicationStyles()` + `SPComponentLoader` — never `import` from `node_modules` (SPFx webpack breaks on font `url()`) |
| **R-ST05** | Layout spacing uses PrimeFlex utilities where possible |
| **R-ST06** | Status badges use `--roca-color-status-*` variables |

---

## 10. TypeScript Standards

- Strict typing — no `any` unless unavoidable (document why).
- All list items typed via `Interface.ts`.
- All component props have dedicated interfaces (`I*Props.ts`).
- All service function parameters use interfaces from `ISPServicesProps.ts` or domain interfaces.
- Avoid magic strings — use `Config.ts` constants.

---

## 11. Module Implementation Checklist

Before marking any feature screen complete, verify:

- [ ] Uses common controls from `common/controls/` — no direct PrimeReact imports
- [ ] Uses theme CSS variables — no hardcoded colors
- [ ] Data loaded and saved via Redux thunks → services → SPServices
- [ ] Loading and empty states implemented
- [ ] Error handling with toast notifications
- [ ] Role-based action buttons shown/hidden correctly
- [ ] UI matches wireframe layout and labels
- [ ] Validation uses common error prop on controls
- [ ] TaskList and Checklist updated

---

## 12. Adding New Standards

When a new technical decision is made during development:

1. Add an row to **Section 3 (ADR Summary)**.
2. Add detailed rules to the relevant section in this document.
3. Add tasks to `TaskList.md` if implementation is required.
4. Add verification items to `Checklist.md`.
5. Reference from `TechnicalArchitecture.md` if architecture-level impact.

---

## 13. Quick Reference — Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Reuse `common/controls/InputText` in every form | Create inline `<input>` or direct PrimeReact per form |
| Dispatch Redux thunk to save data | Call `SPServices.SPAddItem` from a component |
| Initialize SP in `RocaNpd.tsx` | Call `initPnP()` in WebPart |
| Use `var(--roca-color-primary)` | Hardcode `#1d4e56` in components |
| Extract repeated UI to common component | Copy-paste form field markup across modules |
| Batch save on Submit | Write to SharePoint on every field change |
| Read role from `appSlice` | Hardcode role checks per screen |

---

*End of ProjectStandards.*
