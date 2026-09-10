# ROCA NPD — Project Standards

> **Document Name:** ProjectStandards  
> **Version:** 1.0  
> **Date:** 10 September 2026  
> **Status:** Mandatory project standards — follow consistently across all modules  
> **Related:** `TechnicalArchitecture.md`, `NPD_TRD.md`, `TaskList.md`, `Checklist.md`

---

## 1. Purpose

This document defines **technical decisions, coding standards, and reusable patterns** for the ROCA NPD project. These are not suggestions — they are **project standards**.

All developers and AI-assisted tools must follow these rules when implementing features, fixing bugs, or reviewing code.

When a new standard is agreed during development, **add it here first**, then implement in code.

---

## 2. Document Map

| Document | Contains |
|---|---|
| `ProjectStandards.md` | **This file** — coding standards, component strategy, Redux rules, folder structure |
| `TechnicalArchitecture.md` | System architecture, modules, SharePoint schema, workflows |
| `NPD_TRD.md` | TRD stack, list schemas, AI IDE grounding |
| `TaskList.md` | Implementation tasks to complete |
| `Checklist.md` | Verification items before sign-off |

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

### 5.6 DataTable Standard

- All list screens use the common `DataTable` wrapper.
- Feature module passes: `columns`, `data`, `loading`, `onRowAction`, `emptyMessage`.
- Pagination, sorting, and filter UI configured via props — not reimplemented per screen.
- Export action uses common `ExportButton` composite.

### 5.7 Form Standard

- Forms compose common controls only.
- Form-level layout uses **PrimeFlex** grid classes (`grid`, `col-12 md:col-6`).
- Section headers match wireframe labels.
- Footer action bar: Cancel (secondary), Save Draft (secondary), Submit (primary) — use common `Button` variants.

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
│   └── exportService.ts
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
    │   └── ExportButton.tsx
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
