# ROCA NPD — TechnicalArchitecture

> **Document Name:** TechnicalArchitecture  
> **Version:** 1.0  
> **Date:** 10 September 2026  
> **Status:** Primary technical reference for development  
> **Audience:** Developers, architects, QA, UAT, AI-assisted IDE workflows

---

## 1. Purpose of This Document

This **TechnicalArchitecture** document is the **single source of truth for technical design and implementation** of the ROCA New Product Development (NPD) & New Material Group Management System.

It consolidates and extends:

| Source Document | Role |
|---|---|
| `NPD_TRD.md` | Technical Requirements Document — stack, lists, wireframe IA, AI IDE conventions |
| `ROCA_NPD_Project_Master.md` | Functional requirements, workflows, roles, validation, testing, deployment |
| Wireframe — [https://roca-npd.ai.studio/](https://roca-npd.ai.studio/) | UI/UX reference for all screens, layouts, tables, forms, and actions |
| `src/Documents/Wireframe/` | Captured wireframe screenshots for screen-by-screen development |
| `src/Documents/ProjectStandards.md` | **Mandatory coding standards** — component strategy, PrimeReact wrappers, Redux rules |
| Existing codebase (`src/`) | Current SPFx foundation, PnP v4 setup, PrimeReact styles |

**Rule:** All development must follow this document unless an approved Change Request updates it.

---

## 2. Executive Summary

### 2.1 What We Are Building

A **SharePoint Framework (SPFx) client-side web part** branded **"NPD REQUESTS — New Product Development"** that provides:

- NPD request creation, multi-stage approval, SAP posting, and Material Master population
- New Material Group request creation and Consultant completion
- Administration of master data (Lookups, Plants, Roles, Approvers, Brand Extensions, Material Master)
- Role-based navigation, actions, and Analytics & Reports
- Rework and permanent rejection handling at applicable workflow stages

### 2.2 Architecture at a Glance

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     SharePoint Online (Data + Security)                  │
│  Lists: NPD Request, NPD Item, Material Group Request, Lookup Masters…  │
│  Power Automate: routing, notifications, SAP triggers (where applicable) │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ PnPjs v4 (spfi + SPFx)
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    SPFx Web Part (RocaNpdWebPart)                        │
│  PrimeReact theme + PrimeIcons + PrimeFlex + Poppins font                │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                      RocaNpd.tsx (Root React + SP init)                  │
│  spfi().using(SPFx(context)) → setupSP() → Redux Provider → Router       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐   ┌──────────▼─────────┐   ┌────────▼────────┐
│  App Shell     │   │  Feature Modules    │   │  Common Layer   │
│  Header/Nav    │   │  NPD / MG / Admin   │   │  Components     │
│  Role Switch   │   │  Reports            │   │  Hooks/Utils    │
└───────┬────────┘   └──────────┬─────────┘   └────────┬────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Redux Toolkit Store  │
                    │   (global + feature)   │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Service Layer        │
                    │   SPServices, SAP, etc.│
                    └───────────────────────┘
```

### 2.3 Core Principles

1. **Wireframe-first UI** — match [roca-npd.ai.studio](https://roca-npd.ai.studio/) for layout, labels, columns, and actions.
2. **Component-based UI** — every reusable control is built once under `common/controls/` and reused across all modules; no duplicate PrimeReact implementations in feature screens. See **`ProjectStandards.md`**.
3. **PrimeReact via common wrappers** — feature modules import common controls only; never import `primereact/*` directly in `npd/`, `materialGroup/`, `admin/`, or `reports/`.
4. **SharePoint-native data** — no custom REST API layer; all persistence via SharePoint lists through PnPjs.
5. **Redux for application state** — server data cached and orchestrated in Redux; components dispatch thunks → services → SharePoint; form drafts held client-side until Save/Submit.
6. **Role-enforced security** — UI hiding is not security; SharePoint permissions + server-side validation enforce access.
7. **Central theme** — all colors defined in `theme.scss`; components use `var(--roca-color-*)` only.
8. **AIIDE-driven delivery** — spec-first, phase-gated, document-updated development using AI-assisted IDEs (Cursor).

---

## 3. AIIDE Methodology

### 3.1 Definition

**AIIDE** = **AI-Integrated Development Environment** methodology.

This project uses AI-assisted development (Cursor and similar tools) with **structured, document-driven handoffs** instead of ad-hoc prompting. The TRD (`NPD_TRD.md`) explicitly states it is *"Grounding context for AI-assisted IDEs"*.

AIIDE for ROCA NPD means:

| Principle | Application in This Project |
|---|---|
| **Spec-first** | Functional truth in `ROCA_NPD_Project_Master.md`; technical truth in this `TechnicalArchitecture.md`; UI truth in wireframe |
| **Single source of truth** | No duplicate/conflicting specs; update documents before code when design changes |
| **Typed contracts** | TypeScript interfaces for all list items, Redux state, props, and service payloads |
| **Centralized constants** | List names, field internal names, lookup type keys in `Config.ts` — no magic strings |
| **Phase-gated delivery** | Build in phases (Foundation → Admin → NPD → Approvals → Material Group → Automation → Reports) |
| **Human review gates** | Each phase completes with checklist verification against wireframe + master doc |
| **File-based AI handoff** | Each AI session reads TechnicalArchitecture + relevant module section; outputs update code + docs |
| **Zero drift** | When code diverges from TechnicalArchitecture, either fix code or update TechnicalArchitecture via CR |

### 3.2 AIIDE Development Pipeline

```text
1. READ     → TechnicalArchitecture.md + NPD_TRD.md + wireframe screen
2. PLAN     → Identify slice, components, Redux changes, list operations
3. IMPLEMENT→ Follow project conventions (PrimeReact-only UI, PnP v4, Redux Toolkit)
4. VALIDATE → Role rules, validation rules, status transitions, wireframe match
5. UPDATE   → Mark progress in ROCA_NPD_Project_Master.md checklists
6. HANDOFF  → Commit with module-scoped message; document open items
```

### 3.3 Document Hierarchy (Intent Tree)

```text
ROCA_NPD_Project_Master.md     ← WHAT (business requirements)
        ↓
TechnicalArchitecture.md       ← HOW (technical design) ← YOU ARE HERE
        ↓
NPD_TRD.md                       ← Data schema + stack + AI conventions
        ↓
Wireframe (roca-npd.ai.studio)   ← LOOK (visual reference)
        ↓
Source code (src/)               ← BUILD (implementation)
```

### 3.4 AIIDE Rules for Contributors and AI Agents

1. Always read **TechnicalArchitecture** before implementing a module.
2. Use **PrimeReact only** for UI — do not mix Fluent UI controls in feature screens (Fluent may remain for SPFx shell compatibility only if required).
3. Use **PnPjs v4** (`spfi().using(SPFx(context))`) — never `@pnp/sp/presets/all` or `sp.setup`.
4. Use **Redux Toolkit** for shared state — do not introduce alternate global state libraries.
5. Batch list writes on Submit/Save Draft — avoid per-keystroke SharePoint writes.
6. Implement **cascading dropdowns** as controlled selects re-querying Lookup Master / Brand Material Extension on parent change.
7. Enforce **role-based routes** — unauthorized URLs redirect or show access-denied state.
8. Match **status badge colors** from business status table (Section 8).
9. Record blockers (e.g. email templates pending from ROCA) — do not invent content.
10. Update this document when architecture decisions change.

---

## 4. Wireframe Reference

### 4.1 Wireframe URL

**Primary UI reference:** [https://roca-npd.ai.studio/](https://roca-npd.ai.studio/)

This is a Google AI Studio single-page application prototype. Screens are navigated via **left navigation** and a **role switcher** — not unique URLs.

**Local screenshots:** `src/Documents/Wireframe/`

### 4.2 Application Shell (All Roles)

| Element | Description |
|---|---|
| Header | App title "NPD Request Tracker", user context |
| Left Navigation | Collapsible sections: NPD Request, New Material Group, Administration, Analytics & Reports |
| Active Login Role | Bottom-left role indicator (Initiator, Vertical Head, MIS Coordinator, Consultant, Admin) |
| Content Area | Page header, search/filters, DataTable or form |
| Status Badges | Draft (neutral), Pending (amber), Rework (light yellow), Approved (green), Rejected (red), Completed (green) |

### 4.3 Navigation Information Architecture

#### NPD Request (role-dependent visibility/actions)

| Screen | Initiator | Vertical Head | MIS Coordinator | Admin |
|---|---|---|---|---|
| New NPD Request | Create/Edit | — | — | View all |
| All Requests | Own | Brand-scoped | Assigned + self-posted | All |
| Pending Approval | View-only (own) | Approve/Rework/Reject | Edit + SAP actions | View all |
| Approved Requests | View-only (own) | View + Export | View (self-posted) | View all |
| Draft / ReWork | Edit + Resubmit | — | — | View all |

#### New Material Group

| Screen | Initiator | Consultant | Admin |
|---|---|---|---|
| New Request | Create | — | View all |
| All Requests | Own | All (Edit pending / View completed) | All |
| Pending Request | View-only (own) | Edit | View all |
| Completed Request | View-only | View-only | View all |
| Draft / ReWork | Edit + Resubmit | — | View all |

#### Administration (Admin only)

- Material Master
- Lookup Type Master
- Lookup Master
- Plant Master
- Role Master
- Approver Configuration Master
- Workflow Configuration
- Brand Material Extension Master

#### Analytics & Reports (all roles — scoped data)

- Reports dashboard with role-based visibility

### 4.4 Key Screens to Implement

#### 4.4.1 Initiator — New NPD Request Form

**General Information**

- Brand (MG1) — required dropdown
- Material Type — required dropdown
- Plant / Source — required; **disabled until Material Type selected**; filtered by Brand Material Extension
- Roca Global Code — **conditional**: visible and mandatory when Brand = Roca, Laufen, or Armani

**Item Details Grid**

- Columns: Material Code (max 18), Material Description (max 40), MG2–MG5, Color, Range, Sub Category, Material Group, Ext. Material Group, Product Segment, Tax Classification, Class Number (PCS Name), HSN Code, Weight, UOM, Min. Qty/Box Qty (optional)
- Actions: + Add, Import, Delete row, Copy row, Clear row, + Add Another Item Line
- Footer: Cancel/Back, Save Draft, Submit Request

#### 4.4.2 NPD List / Dashboard Views

- Summary cards: Total Requests, Pending Approvals, In ReWork/Drafts, Approved Products
- DataTable with search, Status filter, Brand filter, Export CSV
- Row actions: View, Edit (Draft/Rework only), Delete (where applicable)

#### 4.4.3 Vertical Head — Request Detail

- Read-only General Information and Item Details
- Actions: Approve, Rework (with comments), Reject (with comments)
- Confirmation dialogs before destructive actions

#### 4.4.4 MIS Coordinator — Request Detail

- Read-only General Information header
- **Editable** Item Details (edit rows, add line items)
- **Other Details** section: Plant Code, Storage Location, Profit Center, MRP Group, MRP Controller, Valuation Class, Class Type, Material Extension, SAP Posting Comments
- Auto-population from Plant Master and Brand Material Extension Master
- Conditional SAP logic (Section 8.3)
- Actions: Post to SAP, Rework, Reject

#### 4.4.5 Initiator — New Material Group Request

- **Select Masters**: multi-select of 10 lookup types (MG2 through Product Segment — excludes Brand, Material Type, Plant/Source)
- Select All / Clear All
- **Master Details**: per selected master — Code (optional), Description (required), Add Row, Delete Row
- Footer: Cancel, Save as Draft, Submit to Consultant

#### 4.4.6 Consultant — Review & Edit

- Header: Request ID, Initiator, Submission Date
- Read-only configured master badges
- Editable Code (mandatory for Consultant) and Description per master group
- Consultant Remarks / SAP Configuration Note
- Actions: Complete Request, Send Back for ReWork, Reject, Cancel

#### 4.4.7 Admin Master Screens

Each master follows list + create/edit form pattern:

- Search, filters, Export/Import where applicable
- Add Record / New / Create actions
- Validation on required fields and uniqueness (e.g. Plant Code)

---

## 5. Business Modules and Functional Scope

### 5.1 Module Map

| Module ID | Module Name | Primary Roles | SharePoint Lists |
|---|---|---|---|
| MOD-01 | Application Foundation | All | — |
| MOD-02 | Security & Role Management | All | Role Master, Approver Configuration |
| MOD-03 | Lookup Administration | Admin | Lookup Type Master, Lookup Master |
| MOD-04 | Plant & Brand Extension | Admin | Plant Master, Brand Material Extension |
| MOD-05 | Material Master | Admin | Material Master |
| MOD-06 | NPD — Initiator | Initiator | NPD Request, NPD Item |
| MOD-07 | NPD — Vertical Head | Vertical Head | NPD Request, NPD Item |
| MOD-08 | NPD — MIS Coordinator | MIS Coordinator | NPD Request, NPD Item, Plant Master |
| MOD-09 | Material Group — Initiator | Initiator | Material Group Request, MG Item |
| MOD-10 | Material Group — Consultant | Consultant | Material Group Request, MG Item |
| MOD-11 | Workflow Automation | System | All request lists |
| MOD-12 | SAP Integration | MIS Coordinator | NPD Request |
| MOD-13 | Analytics & Reports | All (scoped) | All lists (read) |
| MOD-14 | Email Notifications | System | Pending ROCA content |

### 5.2 Out of Scope (Unless CR Approved)

- Custom backend API server replacing SharePoint lists
- Mobile-native application
- Email template content (pending ROCA team input — BLK-001)

---

## 6. User Roles and Access Control

### 6.1 Roles

| Role | Description |
|---|---|
| **Initiator** | Creates and manages own NPD and Material Group requests |
| **Vertical Head** | Brand-scoped NPD approval (Approve / Rework / Reject) |
| **MIS Coordinator** | Post-VH NPD processing, SAP configuration, Post to SAP |
| **Consultant** | Material Group code finalization and completion |
| **Admin** | Full master data administration; view all requests |

### 6.2 Navigation Access Matrix

| Navigation Section | Initiator | Vertical Head | MIS Coordinator | Consultant | Admin |
|---|---|---|---|---|---|
| NPD Request | ✅ | ✅ | ✅ | ❌ | ✅ (view all) |
| New Material Group | ✅ | ❌ | ❌ | ✅ | ✅ (view all) |
| Administration | ❌ | ❌ | ❌ | ❌ | ✅ |
| Analytics & Reports | ✅ | ✅ | ✅ | ✅ | ✅ |

### 6.3 Action Access Matrix (NPD)

| Action | Initiator | Vertical Head | MIS Coordinator |
|---|---|---|---|
| Create / Save Draft | ✅ (own) | ❌ | ❌ |
| Submit | ✅ (own) | ❌ | ❌ |
| View Pending | ✅ (own, read-only) | ✅ (brand) | ✅ (assigned) |
| Approve | ❌ | ✅ | ❌ |
| Rework | ❌ | ✅ | ✅ |
| Reject | ❌ | ✅ | ✅ |
| Edit Item Details | ✅ (Draft/Rework) | ❌ | ✅ (pending) |
| Configure SAP Other Details | ❌ | ❌ | ✅ |
| Post to SAP | ❌ | ❌ | ✅ |

### 6.4 Role Resolution Architecture

```text
App Load
   ↓
sp.web.currentUser() + Employee ID from profile/list
   ↓
Check Admin SharePoint group membership → Admin role
   ↓
Else: resolve from Approver Configuration Master by Employee ID
   ↓
Map to role: Initiator | Vertical Head | MIS Coordinator | Consultant
   ↓
Store in Redux appSlice.userRole + appSlice.mappedBrands
   ↓
Filter navigation, routes, and data queries by role
```

**Implementation requirements:**

1. Centralize in `roleService.ts` + Redux `appSlice`
2. Cache role resolution per session
3. Enforce SharePoint list item-level permissions (not UI-only)
4. Prevent unauthorized URL access via route guards
5. Brand multi-select scope for Initiator and Vertical Head from Approver Configuration

---

## 7. Workflow Architecture

### 7.1 NPD Workflow

> **Dynamic routing:** Active approval stages are loaded from `NPD_WorkflowConfig` (see §12.5.1). The sequence below is the default/reference flow — actual routing follows the configured Approval Chain per request type.

```text
Initiator: Create → Save Draft (optional) → Submit
        ↓
Vertical Head: Approve | Rework → Initiator | Reject → Closed
        ↓ (on Approve)
MIS Coordinator: Edit Items + Other Details → Post to SAP | Rework | Reject
        ↓ (on Post to SAP success)
Status = Completed → Auto-populate Material Master
```

### 7.2 New Material Group Workflow

> **Dynamic routing:** MG approval steps are configured in `NPD_WorkflowConfig` (typically Initiator → Consultant). See §12.5.1.

```text
Initiator: Create → Save Draft (optional) → Submit to Consultant
        ↓
Consultant: Complete | Send Back for ReWork → Initiator | Reject → Closed
        ↓ (on Complete)
Status = Completed → New lookup values available in Lookup Master
```

### 7.3 Status Model

| Status | Meaning | Badge Color | Editable By | Resubmit Allowed |
|---|---|---|---|---|
| Draft | Saved, not submitted | Neutral | Initiator | Yes |
| Pending | In approval pipeline | Amber | None (view-only for Initiator) | No |
| Approved | Approved by Vertical Head | Green | MIS only (items/SAP) | No |
| Rework | Returned for modification | Light Yellow | Initiator | Yes |
| Rejected | Permanently closed | Red | None | **No** |
| Completed | Fully processed | Green | None | No |

### 7.4 Request ID Generation

| Entity | Format | Example | Rule |
|---|---|---|---|
| NPD Request | `NPD-YYYY-####` | NPD-2026-0042 | Sequential per year; blank while Draft |
| Material Group Request | TBD (align with functional spec) | MG-2026-0001 | Generated on Submit |

Use `SPServices.GenerateFormatId(prefix, lastId, padLength)` for consistent formatting.

### 7.5 Power Automate Integration Points

| Trigger | Flow Action |
|---|---|
| NPD Submitted | Assign Vertical Head, set Pending, notify |
| VH Approved | Route to MIS Coordinator |
| VH Rework / MIS Rework | Route to Initiator, set Rework |
| VH Reject / MIS Reject | Set Rejected, close |
| MIS Post to SAP | Call SAP, on success → Completed, update Material Master |
| MG Submitted | Route to Consultant |
| Consultant Complete | Set Completed, update Lookup Master |
| Consultant Rework/Reject | Route or close |

---

## 8. SAP Integration Architecture

### 8.1 MIS Coordinator — Other Details Fields

| Field | Source |
|---|---|
| Plant Code | Conditional logic (Section 8.3) |
| Storage Location | Auto from Plant Master |
| Profit Center | Manual / business rule |
| MRP Group | Auto from Plant Master |
| MRP Controller | Auto from Plant Master |
| Valuation Class | Conditional logic |
| Class Type | Always `001` |
| Material Extension | Auto from Brand Material Extension Master (editable) |
| SAP Posting Comments | Manual entry |

### 8.2 Conditional Plant / Valuation Logic

| Material Type | Product Source | Plant Code | Valuation Class |
|---|---|---|---|
| Finished Products | Any | Same as Plant/Source | 6000 |
| Traded Products | Domestic | CCWH | 5000 |
| Traded Products | Imported | CCWH | 5100 |

### 8.3 SAP Posting Flow

```text
MIS Coordinator clicks "Post to SAP"
        ↓
Validate all SAP mandatory fields
        ↓
Build SAP payload from NPD Request + Items + Other Details
        ↓
Call SAP interface (API / middleware — confirm with ROCA)
        ↓
Success → Status = Completed, write SAP response, populate Material Master
Failure → Show error, do NOT update status to Completed
```

### 8.4 Material Master Auto-Population

On NPD Completed:

- Map NPD Item fields → Material Master columns
- Handle duplicate detection
- Log failures for admin review

---

## 9. Technology Stack

### 9.1 Stack Summary (from TRD + package.json)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Node.js | 22.14.x | SPFx build and tooling |
| **Framework** | SharePoint Framework (SPFx) | 1.23.2 | SharePoint web part hosting |
| **Build Tool** | Heft | 1.2.17 | SPFx build pipeline |
| **Language** | TypeScript | ~5.8 | Strict typing across app |
| **UI Library** | React | 17.0.1 | Component rendering |
| **UI Components** | PrimeReact | ^10.9.7 | DataTable, Dropdown, Dialog, Toast, etc. |
| **Layout/CSS** | PrimeFlex | ^4.0.0 | Flex/grid utility classes |
| **Icons** | PrimeIcons | ^7.0.0 | Icon set |
| **State Management** | Redux Toolkit | ^2.5.1 | Global application state |
| **React-Redux** | react-redux | ^8.1.3 | React bindings for Redux |
| **Routing** | react-router-dom | ^6.30.3 | Client-side module routing |
| **SharePoint Data** | PnPjs (`@pnp/sp`) | ^4.12.0 | List CRUD, batch, files, users |
| **Date Handling** | moment | ^2.30.1 | Date formatting for SharePoint |
| **Excel Import/Export** | xlsx, xlsx-js-style | ^0.18.5 / ^1.2.0 | Template download, import, CSV/Excel export |
| **SPFx Core** | @microsoft/sp-* | 1.23.2 | WebPart, context, property pane |
| **Legacy UI (SPFx)** | @fluentui/react | ^8.106.4 | Available; **do not use in feature UI** |
| **Testing** | Jest (via Heft) | — | Unit tests |
| **Linting** | ESLint | 9.37.0 | Code quality |

### 9.2 External Integrations

| System | Integration Method | Owner Module |
|---|---|---|
| SharePoint Online Lists | PnPjs v4 via `spfi` | All modules |
| SAP | API / middleware (TBD) | MIS Coordinator |
| Power Automate | SharePoint triggers | Workflow automation |
| Microsoft Graph | Optional (Azure users/groups) | Admin / role resolution |
| Email (Outlook) | Power Automate | Notifications (pending content) |

### 9.3 Development Tools

| Tool | Purpose |
|---|---|
| Cursor / VS Code | AI-assisted IDE development |
| Git | Source control |
| SPFx Workbench / SharePoint tenant | Local and integrated testing |
| Browser DevTools | Debugging |
| SharePoint List Schema | Data storage design |

### 9.4 PrimeReact Component Mapping

| Wireframe Element | PrimeReact Component |
|---|---|
| Data tables | `DataTable`, `Column` |
| Dropdowns / lookups | `Dropdown` |
| Multi-select masters | `MultiSelect` |
| Forms | Custom layout + `InputText`, `InputNumber`, `Calendar` |
| Dialogs / confirmations | `Dialog`, `ConfirmDialog` |
| Toasts / notifications | `Toast` |
| Loading | `ProgressSpinner`, `Skeleton` |
| Buttons | `Button` |
| Status badges | Custom badge component or `Tag` |
| Search | `InputText` with filter |
| File import | `FileUpload` |
| Sidebar navigation | Custom nav + PrimeFlex layout |

### 9.5 UI Styling Configuration

Loaded in `RocaNpdWebPart.ts` `onInit()` via **`loadApplicationStyles()`** (`External/CommonServices/loadApplicationStyles.ts`):

```typescript
// MainComponent.tsx
import themeStyles from '../../../External/CommonServices/theme.module.scss';

<div className={themeStyles.appRoot}>...</div>
```

```typescript
// RocaNpdWebPart.ts onInit
loadApplicationStyles(); // PrimeReact theme, PrimeIcons, PrimeFlex, Poppins font
```

**Important:** Do **not** `import` PrimeReact / PrimeIcons CSS from `node_modules` in the WebPart. Font `url()` references break SPFx webpack (`___CSS_LOADER_URL_REPLACEMENT_*` error). Use `SPComponentLoader.loadCss()` instead.

**Theme files:**
- `External/CommonServices/theme.scss` — SCSS color tokens only (hex values live here)
- `External/CommonServices/_theme.scss` — import helper for all `*.module.scss` files
- `webparts/rocaNpd/styles/theme.module.scss` — app root `.appRoot` + PrimeReact `:global` overrides

**SPFx SCSS rule:** Every component `*.module.scss` must `@import` `_theme.scss` and use `$roca-color-*` tokens directly. CSS `var(--roca-color-*)` alone is not reliable in SPFx CSS Modules without compiled fallbacks.

**Wireframe sidebar:** dark teal background (`#122A2F`), white text, teal accent icons (`#40919D`), active item with teal rounded border.

**Rule:** Do not load alternate UI frameworks on feature screens.

---

## 10. SPFx Architecture

### 10.1 Web Part Entry Point

**File:** `src/webparts/rocaNpd/RocaNpdWebPart.ts`

Responsibilities:

- Load global PrimeReact CSS and Poppins font
- Instantiate React tree with `WebPartContext`
- Pass props: `context`, `userDisplayName`, `hasTeamsContext`, theme flags
- Handle SPFx lifecycle (`onInit`, `onDispose`, `onThemeChanged`)

### 10.2 Root React Component

**File:** `src/webparts/rocaNpd/components/RocaNpd.tsx`

Responsibilities:

- Initialize PnP: `spfi().using(SPFx(context))`
- Call `setupSP(sp)` for SPServices singleton
- Wrap app with Redux `<Provider store={store}>`
- Wrap with `<BrowserRouter>` for react-router-dom
- Render `MainComponent` with `spfxContext` and `sp` props

### 10.3 Context Propagation

```text
RocaNpdWebPart.context (WebPartContext)
        ↓
IRocaNpdProps.context
        ↓
RocaNpd → MainComponent (spfxContext, sp)
        ↓
App Shell + Feature Components via props or Redux
        ↓
Services: SPServices uses setupSP singleton
          Thunks receive spfxContext when Graph needed
```

### 10.4 SPFx Configuration Files

| File | Purpose |
|---|---|
| `config/package-solution.json` | Solution package definition |
| `config/serve.json` | Local serve configuration |
| `config/config.json` | Bundle entries |
| `config/typescript.json` | TypeScript / static assets |
| `src/webparts/rocaNpd/RocaNpdWebPart.manifest.json` | Web part manifest |

---

## 11. Project Structure

### 11.1 Current Structure

```text
D:\RocaNPD\
├── config/                          # SPFx / Heft configuration
├── src/
│   ├── css-modules.d.ts             # CSS import declarations
│   ├── Documents/
│   │   ├── TechnicalArchitecture.md # THIS DOCUMENT
│   │   ├── NPD_TRD.md               # Technical requirements
│   │   ├── ROCA_NPD_Project_Master.md
│   │   └── Wireframe/               # UI screenshots
│   ├── External/
│   │   └── CommonServices/
│   │       ├── Config.ts            # List names, constants, groups
│   │       ├── Interface.ts         # Domain TypeScript interfaces
│   │       ├── ISPServicesProps.ts  # Service parameter interfaces
│   │       └── SPServices.ts        # SharePoint CRUD service layer
│   └── webparts/
│       └── rocaNpd/
│           ├── RocaNpdWebPart.ts
│           ├── components/
│           │   ├── RocaNpd.tsx       # Root: SP init + Provider
│           │   ├── MainComponent.tsx # App shell entry
│           │   ├── IRocaNpdProps.ts
│           │   └── IMainComponentProps.ts
│           └── loc/                   # Localization strings
├── package.json
└── tsconfig.json
```

### 11.2 Target Structure (To Be Built)

```text
src/
├── External/
│   └── CommonServices/
│       ├── Config.ts
│       ├── Interface.ts
│       ├── ISPServicesProps.ts
│       ├── SPServices.ts
│       ├── roleService.ts           # Role resolution
│       ├── lookupService.ts         # Cached lookup queries
│       ├── npdService.ts              # NPD-specific operations
│       ├── materialGroupService.ts
│       ├── adminService.ts
│       ├── sapService.ts              # SAP posting adapter
│       └── exportService.ts           # CSV/Excel export helpers
├── store/
│   ├── index.ts                       # configureStore
│   ├── hooks.ts                       # useAppDispatch, useAppSelector
│   ├── slices/
│   │   ├── appSlice.ts                # User, role, loader, toast
│   │   ├── lookupSlice.ts             # Master lookup cache
│   │   ├── npdSlice.ts                # NPD lists + current form
│   │   ├── materialGroupSlice.ts
│   │   ├── adminSlice.ts
│   │   └── uiSlice.ts                 # Dialogs, nav state
│   └── thunks/
│       ├── appThunks.ts
│       ├── npdThunks.ts
│       ├── materialGroupThunks.ts
│       └── adminThunks.ts
└── webparts/rocaNpd/components/
    ├── RocaNpd.tsx
    ├── MainComponent.tsx
    ├── layout/
    │   ├── AppShell.tsx
    │   ├── Header.tsx
    │   ├── SideNavigation.tsx
    │   ├── PageHeader.tsx
    │   └── RoleIndicator.tsx
    ├── common/
    │   ├── controls/                  # PrimeReact wrappers — one folder per control
    │   │   ├── InputText/
    │   │   ├── InputNumber/
    │   │   ├── InputTextarea/
    │   │   ├── Dropdown/
    │   │   ├── MultiSelect/
    │   │   ├── ComboBox/
    │   │   ├── DatePicker/
    │   │   ├── DataTable/
    │   │   ├── Button/
    │   │   ├── Dialog/
    │   │   ├── ConfirmDialog/
    │   │   ├── Toast/
    │   │   ├── FileUpload/
    │   │   ├── Checkbox/
    │   │   ├── Tag/
    │   │   └── index.ts               # Barrel export for all controls
    │   ├── StatusBadge.tsx
    │   ├── ConfirmActionDialog.tsx
    │   ├── EmptyState.tsx
    │   ├── LoaderOverlay.tsx
    │   ├── SearchFilterBar.tsx
    │   └── ExportButton.tsx
    ├── npd/
    │   ├── NpdAllRequests.tsx
    │   ├── NpdNewRequestForm.tsx
    │   ├── NpdItemDetailsGrid.tsx
    │   ├── NpdPendingApproval.tsx
    │   ├── NpdApprovedRequests.tsx
    │   ├── NpdDraftRework.tsx
    │   ├── NpdVerticalHeadDetail.tsx
    │   └── NpdMisCoordinatorDetail.tsx
    ├── materialGroup/
    │   ├── MgAllRequests.tsx
    │   ├── MgNewRequestForm.tsx
    │   ├── MgPendingRequest.tsx
    │   ├── MgCompletedRequest.tsx
    │   ├── MgDraftRework.tsx
    │   └── MgConsultantReview.tsx
    ├── admin/
    │   ├── MaterialMasterList.tsx
    │   ├── LookupTypeMaster.tsx
    │   ├── LookupMaster.tsx
    │   ├── PlantMaster.tsx
    │   ├── RoleMaster.tsx
    │   ├── ApproverConfiguration.tsx
    │   ├── WorkflowConfiguration.tsx
    │   └── BrandMaterialExtension.tsx
    ├── reports/
    │   └── ReportsDashboard.tsx
    └── routes/
        └── AppRoutes.tsx
```

---

## 12. SharePoint Data Architecture

### 12.1 List Inventory

| List Name | Type | Description |
|---|---|---|
| Lookup Type Master | Master | Categories for all dropdowns |
| Lookup Master | Master | Lookup values scoped by type |
| Brand Material Extension Master | Master | Brand → Plant/Warehouse mapping |
| Plant Master | Master | Plant codes, storage, MRP defaults |
| Role Master | Master | Application role names |
| Approver Configuration Master | Master | User ↔ Role ↔ Brand mapping |
| Workflow Configuration Master | Master | Approval stage sequence |
| Material Master | Master | Completed material catalog |
| NPD Request | Transaction | NPD header records |
| NPD Item | Transaction | NPD line items (child) |
| Material Group Request | Transaction | Material group header |
| Material Group Request Item | Transaction | Material group entries (child) |
| NPD_Templates | Document Library | Import Excel templates (`TemplateType` choice) |

### 12.2 Entity Relationships

```text
Lookup Type Master ──1:N──► Lookup Master
Lookup Master (Brand) ──1:N──► Brand Material Extension Master
Plant Master ──sources──► Brand Material Extension (plant codes)
Role Master ──used by──► Approver Configuration, Workflow Configuration
NPD Request ──1:N──► NPD Item
Material Group Request ──1:N──► Material Group Request Item
NPD Request (Completed) ──► Material Master (auto-populate)
Material Group Request (Completed) ──► Lookup Master (new values)
```

### 12.3 Lookup Type Master

| Field | Type | Notes |
|---|---|---|
| Title (Lookup Type Name) | Text | e.g. Brand, Material Type, Product Group (MG2) |

**Seeded types:** Brand, Material Type, Plant/Source, Product Group (MG2), Product Category (MG3), Product Type (MG4), Product Source (MG5), Color (MGP1A), Product Range (MGP2A), Product Sub Category (MGP3A), Material Group, Ext Material Group, Product Segment, Tax Classification, UOM, Class Number

### 12.4 Lookup Master

| Field | Type | Notes |
|---|---|---|
| Lookup Code | Text | e.g. BR-01 |
| Lookup Name | Text | e.g. Parryware |
| Lookup Type Name | Lookup → Lookup Type Master | Scoping field |

**Pattern:** Filter `Lookup Master` by `LookupType/Title` to populate every dropdown dynamically.

### 12.5 Brand Material Extension Master

**SharePoint list:** `NPD_BrandMaterialExtensionMaster` (`Config.ListNames.BrandMaterialExtension`)

| Internal Name | UI Label | Type | Notes |
|---|---|---|---|
| `Title` | Brand | Text | Unique per active record; ComboBox sourced from ROCA `Brandmaster` |
| `Plant` | Plant | Multiline text | Comma-separated plant codes; MultiSelect sourced from ROCA `PlantMaster` |
| `IsDeleted` | — | Boolean | Soft delete |

**UI route:** `/admin/brand-extension` → `BrandMaterialExtensionMaster`

**Services:** `brandMaterialExtensionService.ts` (CRUD), `rocaMasterDataService.ts` (cross-site options), `plantValueUtils.ts` (parse/join Plant values)

**Drives:** Plant/Source dropdown on NPD form — enabled after Material Type selected, filtered by selected Brand's extension list.

### 12.5.1 Workflow Configuration Master

**SharePoint list:** `NPD_WorkflowConfig` (`Config.ListNames.WorkflowConfig`)

| Internal Name | UI Label | Type | Notes |
|---|---|---|---|
| `Title` | Request Type | Text | `NPD Request` or `MG Request` from `Config.WorkflowRequestTypes` |
| `CurrentRole` | Current Role | Text | Handoff source role for this step |
| `NextRole` | Next Role | Text | Approver role receiving the request next |
| `IsDeleted` | — | Boolean | Soft delete |

**Storage model:** One SharePoint item per approval step. Multiple items share the same `Title` (Request Type). Example NPD chain (2 steps):

```text
Title=NPD Request, CurrentRole=Initiator,      NextRole=Vertical Head
Title=NPD Request, CurrentRole=Vertical Head,  NextRole=MIS Coordinator
```

**Display:** Group by Request Type; render **Approval Chain** = ordered roles joined with ` → ` (e.g. `Initiator → Vertical Head → MIS Coordinator`).

**Ordering logic:** `orderWorkflowSteps()` walks from `Config.WorkflowDefaults.NpdStartRole` / `MgStartRole`, matching `CurrentRole` → `NextRole` links sequentially.

**NPD Request rules:**

- Start role: Initiator (read-only Current Role on step 1)
- Next Role options: ROCA `RoleMaster` where `System/Title eq NPD` (expand `System` lookup); Initiator and `Config.WorkflowNpdExcludedNextRoles` (e.g. Consultant) excluded
- Multi-step chains supported; used roles excluded from subsequent Next Role dropdowns
- **Add Step** shown only when valid roles remain (`canAddWorkflowStep()`)
- Only the **last step's Next Role** is editable; earlier steps lock once the next step is added

**MG Request rules:**

- Start role: Initiator
- Single step only; Next Role = `Config.WorkflowDefaults.MgNextRole` (Consultant)

**UI route:** `/admin/workflow-config` → `WorkflowConfigurationMaster`

**Services:** `workflowConfigurationService.ts` (CRUD), `workflowConfigurationUtils.ts` (chain ordering/grouping), `rocaMasterDataService.fetchRocaNpdRoleOptions()` (cross-site roles)

**Drives:** Runtime approval routing for NPD and Material Group requests — future modules must load active steps from this list rather than hardcoding stage sequences.

### 12.6 NPD Request (Header)

| Field | Type | Required | Notes |
|---|---|---|---|
| Request ID | Text | Auto | NPD-YYYY-####; blank for Draft |
| Title / Project Name | Text | | |
| Brand (MG1) | Lookup | ✅ | Lookup Master (Brand) |
| Material Type | Lookup | ✅ | Lookup Master |
| Plant / Source | Lookup | ✅ | Cascading dependent dropdown |
| Roca Global Code | Text | Conditional | Required for Roca, Laufen, Armani |
| Status | Choice | ✅ | Draft, Pending, Approved, Rework, Rejected, Completed |
| Current Approver | Person/Text | | Workflow routing |
| Created Date | DateTime | Auto | |
| Created By | Person | Auto | |
| Approved Date | DateTime | | |
| Rework Comments | Note | | |
| Rejection Comments | Note | | |
| SAP Posting Comments | Note | | MIS entry |
| Plant Code | Text | | MIS SAP section |
| Storage Location | Text | | MIS — auto from Plant Master |
| Profit Center | Text | | MIS |
| MRP Group | Text | | MIS — auto from Plant Master |
| MRP Controller | Text | | MIS — auto from Plant Master |
| Valuation Class | Text | | MIS — conditional |
| Class Type | Text | | MIS — default 001 |
| Material Extension | Text | | MIS — auto from Brand Extension |

### 12.7 NPD Item (Child)

| Field | Type | Required | Notes |
|---|---|---|---|
| ParentRequest | Lookup → NPD Request | ✅ | Linking field |
| Material Code | Text (max 18) | ✅ | |
| Material Description | Text (max 40) | ✅ | |
| Product Group (MG2) | Lookup | ✅ | |
| Product Category (MG3) | Lookup | ✅ | |
| Product Type (MG4) | Lookup | ✅ | |
| Product Source (MG5) | Lookup | ✅ | |
| Color (MGP1A) | Lookup | ✅ | |
| Product Range (MGP2A) | Lookup | ✅ | |
| Product Sub Category (MGP3A) | Lookup | ✅ | |
| Material Group | Lookup | ✅ | |
| Ext. Material Group | Lookup | ✅ | |
| Product Segment | Lookup | ✅ | |
| Tax Classification | Lookup | ✅ | |
| Class Number (PCS Name) | Lookup | Optional | |
| HSN Code | Text | ✅ | |
| Weight (Kg) | Number | ✅ | |
| UOM | Lookup | ✅ | |
| Min Qty / Box Qty | Number | Optional | |

### 12.8 Material Group Request (Header)

| Field | Type | Notes |
|---|---|---|
| Request ID | Text | Auto on submit |
| Status | Choice | Draft, Pending, Rework, Rejected, Completed |
| Requested Masters | Multi-value lookup | Selected Lookup Types |
| Created By | Person | |
| Created Date | DateTime | |
| Consultant Remarks | Note | |

### 12.9 Material Group Request Item (Child)

| Field | Type | Notes |
|---|---|---|
| ParentRequest | Lookup | |
| Master Type | Lookup/Text | Which lookup type this row belongs to |
| Code | Text | Optional for Initiator; mandatory for Consultant |
| Description | Text | Mandatory |

### 12.10 Plant Master

| Field | Type | Required |
|---|---|---|
| Plant Type | Choice/Text | ✅ |
| Plant Code | Text | ✅ (unique) |
| Location | Text | ✅ |
| State | Text | ✅ |
| Storage Location | Text | |
| MRP Group | Text | |
| MRP Controller | Text | |
| Status | Choice | Active/Inactive |

### 12.11 Approver Configuration Master

| Field | Type | Required | Notes |
|---|---|---|---|
| Approver Role | Lookup/Choice | ✅ | Initiator, Vertical Head, MIS Coordinator, Consultant |
| User Name | Text | ✅ | |
| Employee ID | Text | ✅ | |
| Brand | Multi-select | Conditional | Required for Initiator & Vertical Head; hidden for MIS & Consultant |

### 12.12 Config.ts Convention

All list internal names and field internal names must be defined in `Config.ts`:

```typescript
export namespace Config {
  export const ListNames = {
    LookupTypeMaster: 'Lookup Type Master',
    LookupMaster: 'Lookup Master',
    NPDRequest: 'NPD Request',
    NPDItem: 'NPD Item',
    // ...
  };

  export const LookupTypes = {
    Brand: 'Brand',
    MaterialType: 'Material Type',
    PlantSource: 'Plant / Source',
    // ...
  };

  export const Status = {
    Draft: 'Draft',
    Pending: 'Pending',
    Approved: 'Approved',
    Rework: 'Rework',
    Rejected: 'Rejected',
    Completed: 'Completed',
  };

  export const Roles = {
    Initiator: 'Initiator',
    VerticalHead: 'Vertical Head',
    MISCoordinator: 'MIS Coordinator',
    Consultant: 'Consultant',
    Admin: 'Admin',
  };

  export const Pagination = {
    DefaultPageSize: 10,
    MaxTopCount: 5000,
  };
}
```

---

## 13. Redux Architecture

### 13.1 Why Redux

| Concern | Redux Solution |
|---|---|
| Role + user context shared across all modules | `appSlice` |
| Lookup dropdown data reused on many forms | `lookupSlice` with cache |
| NPD list filters, pagination, selected request | `npdSlice` |
| Multi-row form state before Save/Submit | Feature slice + local component state |
| Loading and error flags | Slice `status` fields + `uiSlice` |
| Toast notifications | `appSlice.notifications` |

### 13.2 Store Configuration

**File:** `src/store/index.ts`

```typescript
import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import lookupReducer from './slices/lookupSlice';
import npdReducer from './slices/npdSlice';
import materialGroupReducer from './slices/materialGroupSlice';
import adminReducer from './slices/adminSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    lookup: lookupReducer,
    npd: npdReducer,
    materialGroup: materialGroupReducer,
    admin: adminReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable SPFI/WebPartContext in meta if passed
        ignoredActions: ['app/initialize/pending'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 13.3 Typed Hooks

**File:** `src/store/hooks.ts`

```typescript
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### 13.4 Slice Definitions

#### 13.4.1 appSlice — Application Core

```typescript
interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  currentUser: {
    displayName: string;
    email: string;
    loginName: string;
    employeeId: string;
  } | null;
  userRole: 'Initiator' | 'Vertical Head' | 'MIS Coordinator' | 'Consultant' | 'Admin' | null;
  mappedBrands: string[];           // From Approver Configuration
  error: string | null;
  toast: { severity: 'success' | 'info' | 'warn' | 'error'; summary: string; detail: string } | null;
}
```

**Async thunks:**

- `initializeApp` — resolve user, role, brands on app load
- `showToast` / `clearToast` — notification management

#### 13.4.2 lookupSlice — Master Lookup Cache

```typescript
interface LookupState {
  lookupTypes: ILookupType[];
  lookupsByType: Record<string, ILookup[]>;  // keyed by Lookup Type Name
  brandExtensions: IBrandMaterialExtension[];
  plantMaster: IPlantMaster[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  lastFetched: Record<string, number>;       // cache timestamp per type
}
```

**Async thunks:**

- `fetchLookupTypes`
- `fetchLookupsByType(lookupTypeName)`
- `fetchBrandExtensions`
- `fetchPlantMaster`
- `invalidateLookupCache(lookupTypeName)` — after admin CRUD

#### 13.4.3 npdSlice — NPD Module State

```typescript
interface NpdState {
  listView: {
    items: INPDRequest[];
    filters: { search: string; status: string; brand: string };
    pagination: { page: number; pageSize: number; total: number };
    summaryCounts: { total: number; pending: number; rework: number; approved: number };
  };
  currentRequest: INPDRequest | null;
  currentItems: INPDItem[];
  formDraft: {
    header: Partial<INPDRequest>;
    items: INPDItem[];
    isDirty: boolean;
  };
  detailMode: 'view' | 'edit' | 'approve' | 'mis-edit' | null;
  status: 'idle' | 'loading' | 'saving' | 'submitting' | 'failed';
  error: string | null;
}
```

**Async thunks:**

- `fetchNpdRequests(viewType, roleScope)`
- `fetchNpdRequestById(id)`
- `saveNpdDraft({ header, items })`
- `submitNpdRequest({ header, items })`
- `verticalHeadAction({ id, action, comments })`
- `misCoordinatorAction({ id, action, header, items, sapDetails, comments })`
- `deleteNpdDraft(id)`

#### 13.4.4 materialGroupSlice — Material Group Module

```typescript
interface MaterialGroupState {
  listView: { items: IMaterialGroupRequest[]; filters: object; pagination: object };
  currentRequest: IMaterialGroupRequest | null;
  currentItems: IMaterialGroupRequestItem[];
  formDraft: {
    selectedMasters: string[];
    items: IMaterialGroupRequestItem[];
    isDirty: boolean;
  };
  detailMode: 'view' | 'edit' | 'consultant-edit' | null;
  status: 'idle' | 'loading' | 'saving' | 'submitting' | 'failed';
  error: string | null;
}
```

**Async thunks:**

- `fetchMaterialGroupRequests(viewType)`
- `saveMaterialGroupDraft`
- `submitMaterialGroupRequest`
- `consultantAction({ id, action, items, remarks })`

#### 13.4.5 adminSlice — Administration Masters

```typescript
interface AdminState {
  activeMaster: string | null;
  materialMaster: { items: IMaterialMaster[]; filters: object };
  lookupTypes: { items: ILookupType[] };
  lookups: { items: ILookup[]; selectedType: string | null };
  plants: { items: IPlantMaster[] };
  roles: { items: IRoleMaster[] };
  approverConfig: { items: IApproverConfig[] };
  brandExtensions: { items: IBrandMaterialExtension[] };
  workflowConfig: { stages: string[] };
  status: 'idle' | 'loading' | 'saving' | 'failed';
}
```

#### 13.4.6 uiSlice — UI Transient State

```typescript
interface UiState {
  sidebarCollapsed: boolean;
  activeNavSection: string;
  activeNavItem: string;
  confirmDialog: {
    visible: boolean;
    action: string;
    message: string;
    onConfirm: string;    // action type key, not function (serializable)
    payload: object;
  } | null;
  fullPageLoader: boolean;
}
```

### 13.5 Redux Data Flow

```text
User Action (UI event)
        ↓
Component dispatches async thunk OR synchronous action
        ↓
Thunk calls Service Layer (npdService → SPServices)
        ↓
SPServices executes PnPjs list operation
        ↓
Thunk fulfilled → slice reducers update state
        ↓
useAppSelector in components → re-render
        ↓
Toast/loader via appSlice/uiSlice
```

### 13.6 State Ownership Rules

| State Type | Where to Store |
|---|---|
| Server data (lists, items) | Redux feature slice |
| Lookup cache | Redux lookupSlice |
| Current user / role | Redux appSlice |
| Multi-step form draft (NPD, MG) | Redux formDraft until Save; local useState for field-level if preferred |
| Dialog open/close | Redux uiSlice or local state |
| DataTable sort/pagination UI | Redux listView or local state |
| SPFI / WebPartContext | React props from RocaNpd — **never in Redux** |

### 13.7 Redux Provider Integration

Update `RocaNpd.tsx`:

```typescript
import { Provider } from 'react-redux';
import { store } from '../../../store';

public render(): React.ReactElement<IRocaNpdProps> {
  return (
    <Provider store={store}>
      <MainComponent spfxContext={this.props.context} sp={this._sp} />
    </Provider>
  );
}
```

Initialize app in `MainComponent` `useEffect`:

```typescript
useEffect(() => {
  dispatch(initializeApp({ spfxContext, sp }));
}, []);
```

---

## 14. Service Layer Architecture

### 14.1 SPServices (Implemented)

**File:** `src/External/CommonServices/SPServices.ts`

Central SharePoint CRUD layer using PnPjs v4:

| Function | Purpose |
|---|---|
| `setupSP(sp)` | Initialize singleton SPFI instance |
| `SPReadItems` | Filtered list query |
| `SPReadItemUsingId` | Single item by ID |
| `SPAddItem` / `SPUpdateItem` / `SPDeleteItem` | CRUD |
| `batchInsert` / `batchUpdate` / `batchDelete` | Batch operations |
| `SPAddAttachments` / `SPGetAttachments` / `SPDeleteAttachments` | Attachments |
| `getAnotherSPReadItems` | Cross-site queries via `Web([sp.web, siteUrl])` |
| `getDocLibFiles` / `addDocLibFiles` | Document library file ops |
| `getSPGroupMember` | SharePoint group members |
| `GetAzureUsers` / `GetAzureUsersGroups` | Graph via context |
| `GenerateFormatId` | Request ID formatting |
| `GetDateFormat` | SharePoint date formatting |

**Initialization pattern (already in RocaNpd.tsx):**

```typescript
this._sp = spfi().using(SPFx(props.context));
setupSP(this._sp);
```

### 14.2 Domain Services (To Implement)

| Service | File | Responsibility |
|---|---|---|
| roleService | `roleService.ts` | Resolve role, brands, permissions |
| lookupService | `lookupService.ts` | Lookup queries with caching helpers |
| npdService | `npdService.ts` | NPD header + items CRUD, submit, actions |
| materialGroupService | `materialGroupService.ts` | MG header + items CRUD, consultant actions |
| adminService | `adminService.ts` | All master list CRUD, import/export |
| sapService | `sapService.ts` | SAP payload build + post + response handling |
| exportService | `exportService.ts` | CSV/Excel generation via xlsx |

### 14.3 Service Layer Rules

1. **Components and thunks never call PnP directly** — always go through services.
2. **SPServices remains generic** — domain-specific logic in domain services.
3. **Batch writes** for multi-row saves (NPD Items, MG Items).
4. **Error normalization** — services throw typed errors; thunks catch and set slice error state.
5. **No business logic in SPServices** — only data access.

---

## 15. Routing Architecture

### 15.1 Route Map

**Base path:** `/` (within web part — use HashRouter or MemoryRouter if needed for SPFx)

| Route | Component | Roles |
|---|---|---|
| `/` | Redirect to role default | All |
| `/npd/new` | NpdNewRequestForm | Initiator |
| `/npd/all` | NpdAllRequests | All (scoped) |
| `/npd/pending` | NpdPendingApproval | All (scoped) |
| `/npd/approved` | NpdApprovedRequests | All (scoped) |
| `/npd/draft-rework` | NpdDraftRework | Initiator |
| `/npd/:id/view` | NpdDetailView | All (scoped) |
| `/npd/:id/approve` | NpdVerticalHeadDetail | Vertical Head |
| `/npd/:id/mis` | NpdMisCoordinatorDetail | MIS Coordinator |
| `/mg/new` | MgNewRequestForm | Initiator |
| `/mg/all` | MgAllRequests | Initiator, Consultant, Admin |
| `/mg/pending` | MgPendingRequest | Initiator, Consultant |
| `/mg/completed` | MgCompletedRequest | All (scoped) |
| `/mg/draft-rework` | MgDraftRework | Initiator |
| `/mg/:id/consultant` | MgConsultantReview | Consultant |
| `/admin/material-master` | MaterialMasterList | Admin |
| `/admin/lookup-type` | LookupTypeMaster | Admin |
| `/admin/lookup` | LookupMaster | Admin |
| `/admin/plant` | PlantMaster | Admin |
| `/admin/role` | RoleMaster | Admin |
| `/admin/approver-config` | ApproverConfiguration | Admin |
| `/admin/workflow-config` | WorkflowConfiguration | Admin |
| `/admin/brand-extension` | BrandMaterialExtension | Admin |
| `/reports` | ReportsDashboard | All (scoped) |
| `/unauthorized` | AccessDenied | All |

### 15.2 Route Guard

```typescript
const ProtectedRoute = ({ allowedRoles, children }) => {
  const userRole = useAppSelector(state => state.app.userRole);
  if (!allowedRoles.includes(userRole)) return <Navigate to="/unauthorized" />;
  return children;
};
```

---

## 16. Component Architecture

### 16.1 Layered Component Model

| Layer | Responsibility | Examples |
|---|---|---|
| **Layout** | Shell, nav, page structure | AppShell, SideNavigation, Header |
| **Feature** | Business screens | NpdNewRequestForm, MgConsultantReview |
| **Common** | Reusable UI | StatusBadge, ConfirmActionDialog, SearchFilterBar |
| **PrimeReact** | Base UI primitives | DataTable, Dropdown, Dialog |

### 16.2 Common Components (MOD-01)

| Component | Purpose |
|---|---|
| `AppShell` | Layout wrapper with nav + content area |
| `SideNavigation` | Role-filtered left nav matching wireframe |
| `PageHeader` | Screen title, breadcrumbs, action buttons |
| `StatusBadge` | Consistent status colors |
| `SearchFilterBar` | Search input + filter dropdowns |
| `ConfirmActionDialog` | Approve/Rework/Reject/Delete confirmations |
| `EmptyState` | No records message |
| `LoaderOverlay` | Full-page and inline loading |
| `ExportButton` | CSV/Excel export trigger |
| `ItemDetailsGrid` | Reusable editable grid for NPD items |
| `ToastNotification` | Global toast via PrimeReact Toast + Redux |

### 16.3 Form Patterns

**Cascading dropdown pattern (NPD General Information):**

```text
Brand selected → load brand extensions
Material Type selected → enable Plant/Source
Plant/Source options = intersection(lookup values, brand extension codes)
Brand = Roca|Laufen|Armani → show Roca Global Code (required)
```

**Multi-row grid pattern (NPD Items, MG Master Details):**

```text
Client-side row array in Redux formDraft or local state
        ↓
Validate all rows on Save Draft / Submit
        ↓
Batch write: update header + batch insert/update/delete items
        ↓
Refresh list view from SharePoint
```

---

## 17. Data Flow Diagrams

### 17.1 Application Initialization

```text
WebPart onInit → Load CSS/fonts
        ↓
RocaNpd constructor → spfi + setupSP
        ↓
MainComponent mount → dispatch initializeApp
        ↓
roleService.resolveRole(spfxContext)
        ↓
appSlice: set userRole, mappedBrands, currentUser
        ↓
dispatch fetchLookupTypes + commonly used lookups
        ↓
Render AppShell with role-filtered navigation
```

### 17.2 NPD Submit Flow

```text
Initiator fills form (Redux formDraft + local grid state)
        ↓
Click Submit → validate all required fields + items
        ↓
dispatch submitNpdRequest
        ↓
npdService: SPAddItem/SPUpdateItem header + batchInsert items
        ↓
Power Automate trigger (or service sets Pending + approver)
        ↓
Success → toast, navigate to All Requests, refresh list
```

### 17.3 MIS Post to SAP Flow

```text
MIS opens pending request → dispatch fetchNpdRequestById
        ↓
Edit items + Other Details in form
        ↓
Click Post to SAP → ConfirmActionDialog
        ↓
dispatch misCoordinatorAction({ action: 'postToSap', ... })
        ↓
sapService.buildPayload → call SAP → handle response
        ↓
Success → update status Completed, populate Material Master
        ↓
Refresh Approved/All Requests
```

---

## 18. Security Architecture

### 18.1 Defense in Depth

| Layer | Mechanism |
|---|---|
| SharePoint | List/item permissions per role group |
| SPFx | User context via `WebPartContext` — authenticated user |
| Application | Role resolution + route guards |
| UI | Hide/disable unauthorized actions |
| Service | Validate role + ownership before write operations |

### 18.2 Security Rules

1. Initiator can only read/write **own** requests (unless Admin).
2. Vertical Head sees only **mapped brand** requests.
3. MIS Coordinator sees **assigned** requests post-VH approval.
4. Consultant sees **assigned** Material Group requests.
5. Admin has read-all; write on master lists only.
6. Rejected requests **cannot** be resubmitted.
7. Pending requests are **read-only** for Initiator.
8. Approval actions blocked for unauthorized roles at service layer.

---

## 19. Validation Architecture

### 19.1 NPD Validation Rules

| Field / Rule | Validation |
|---|---|
| Brand, Material Type, Plant/Source | Required on submit |
| Roca Global Code | Required when Brand ∈ {Roca, Laufen, Armani} |
| Material Code | Required, max 18 chars |
| Material Description | Required, max 40 chars |
| All other item fields marked * | Required on submit |
| Min Qty / Box Qty | Optional |
| At least one item row | Required on submit |
| Plant/Source | Disabled until Material Type selected |

### 19.2 Material Group Validation Rules

| Rule | Validation |
|---|---|
| Master selection | At least one master required |
| Description | Required per row |
| Code (Initiator) | Optional |
| Code (Consultant) | Required on Complete |

### 19.3 Validation Implementation

- Client-side: form validation before dispatching thunks
- Service-side: re-validate in domain services before SharePoint write
- Display: PrimeReact invalid state + inline error messages + toast on submit failure

---

## 20. Error Handling and Notifications

### 20.1 Error Categories

| Category | Handling |
|---|---|
| Network / SharePoint error | Toast error + slice error state + retry option |
| Validation error | Inline field errors, block submit |
| Authorization error | Redirect to /unauthorized |
| SAP posting failure | Show SAP message, keep current status |
| Unexpected error | Log to console, generic user message |

### 20.2 Toast Notification Pattern

```text
Thunk rejected → appSlice.showToast({ severity: 'error', ... })
Thunk fulfilled (save/submit/action) → showToast({ severity: 'success', ... })
```

Use PrimeReact `Toast` component in `AppShell`, controlled by Redux `app.toast`.

---

## 21. Import / Export Architecture

Import and Export are **first-class reusable capabilities** documented in **`ProjectStandards.md` Section 5.8**. All master screens should follow the same pattern introduced on Lookup Type Master.

### 21.1 Libraries and Packages

| Capability | Library | Notes |
|---|---|---|
| Excel read (import) | `xlsx` | Parse `.xlsx` / `.xls` in browser |
| Excel write (export) | `xlsx` | Generate `.xlsx` download |
| Styled Excel (future) | `xlsx-js-style` | Use only when wireframe requires cell styling |

### 21.2 SharePoint Template Library

| Item | Value |
|---|---|
| Document library | `NPD_Templates` → `Config.LibraryNames.NPDTemplates` |
| Metadata column | `TemplateType` (Choice) |
| Lookup Type template | `TemplateType = "Lookup Type"` → `Config.TemplateTypes.LookupType` |
| Service | `templateService.ts` — `fetchTemplateByType`, `downloadTemplateFile` |
| File download | `SPServices.SPDownloadFileBlob` (PnP `getBlob()`) |

Query pattern: filter library **list items** where `TemplateType eq '{choice}'`, expand `File`, take most recently modified.

### 21.3 Common Services

| Service | Responsibility |
|---|---|
| `templateService.ts` | Resolve and download templates from `NPD_Templates` |
| `importService.ts` | File validation, sheet parse, header match, duplicate partition |
| `exportService.ts` | Column-driven Excel export + browser download |
| `{domain}Service.ts` | Map rows to SharePoint fields; `bulkCreate*`; `export*ToExcel`; `import*FromFile` |

### 21.4 Common UI

| Component | Path | Purpose |
|---|---|---|
| `ImportDialog` | `common/importExport/ImportDialog/` | Wireframe Import popup — upload zone + template panel + Cancel/Import |

Feature modules pass titles and wire callbacks; they do **not** reimplement the popup layout.

### 21.5 Duplicate Handling (Import)

1. Read values from the column matching `Config.FieldLabels.*`.
2. Compare **case-insensitively** against existing active SharePoint records.
3. Detect duplicates **within the same file** (second occurrence flagged).
4. Emit Toast warning per duplicate: `"<Name>" already exists.`
5. Insert only non-duplicate rows via `SPServices.batchInsert`.
6. Refresh grid from server after insert.

### 21.6 Export Behavior

1. Export rows **currently visible** on the master screen (after search/filter).
2. Column headers match `Config.FieldLabels` / wireframe.
3. Trigger download via `exportService.exportToExcel`.
4. Toast success / empty-state warning.

### 21.7 Module Rollout

| Module | Import | Export | TemplateType choice |
|---|---|---|---|
| Lookup Type Master | ✅ Implemented | ✅ Implemented | `Lookup Type` |
| Lookup Master | ✅ Implemented | ✅ Implemented | `Lookup` |
| Plant Master | Planned | Planned | TBD |
| Material Master | Planned | Planned | TBD |
| NPD Item grid | Planned | N/A | TBD |

See **`ProjectStandards.md` Section 5.8** for implementation checklist when adding to a new master.

### 21.8 Cross-Site ROCA Master Data

Some admin screens load reference data from a **separate ROCA SharePoint site** (not the NPD app site).

| Component | Path | Role |
|---|---|---|
| URL resolver | `rocaSiteUrlResolver.ts` | `resolveCurrentSiteUrl()` + `resolveRocaMasterSiteUrl()` — environment mapping |
| Data service | `rocaMasterDataService.ts` | `fetchRocaBrandOptions`, `fetchRocaPlantOptions` |
| SP read | `SPServices.getAnotherSPReadItems()` | Cross-site list queries |
| Config | `Config.RocaMasterListNames` | `Brandmaster`, `PlantMaster` |
| App context | `appSlice.siteUrl` | Set in `initializeApp` from web part context |

**Environment mapping:**

| Origin | Current site path contains | ROCA master site |
|---|---|---|
| `chandrudemo.sharepoint.com` | — | `/sites/Roca` |
| `rocasanitario.sharepoint.com` | `rinanpdev` | `/sites/RINMASTERDEV` |
| `rocasanitario.sharepoint.com` | `rinanp` | `/sites/RBPPLWOW` |

**Plant Master filter:** `IsDeleted eq false` via `getActiveRecordFilters()`. Options use **`PlantCode`** only (not `Title`).

**Plant storage:** Selected MultiSelect values joined with `", "` (`joinCommaSeparatedPlants`); edit loads via `parseCommaSeparatedPlants`.

See **`ProjectStandards.md` Section 5.10** for rules (R-CS01–R-CS05).

---

## 22. Testing Strategy

### 22.1 Test Levels

| Level | Scope | Tool |
|---|---|---|
| Unit | Services, reducers, selectors, validators | Jest |
| Component | Common components, form validation | Jest + React Testing Library |
| Integration | Thunk → service → mock SP | Jest with mocked PnP |
| Workflow | End-to-end role flows | Manual / UAT |
| Security | Role bypass attempts | Manual + UAT |

### 22.2 Critical Test Scenarios

- NPD happy path: Initiator → VH Approve → MIS Post to SAP → Material Master
- NPD Rework at VH and MIS stages
- NPD Reject (permanent close)
- Material Group happy path: Initiator → Consultant Complete
- Material Group Rework and Reject
- Role navigation visibility
- Cascading dropdown behavior
- Conditional Roca Global Code
- SAP conditional Plant/Valuation logic
- Unauthorized action blocking

---

## 23. Deployment Architecture

### 23.1 Environments

| Environment | Purpose |
|---|---|
| Local Workbench | Component development |
| SharePoint Dev Tenant | Integrated testing |
| UAT Site | Business validation |
| Production | Live deployment |

### 23.2 Deployment Checklist Reference

See `ROCA_NPD_Project_Master.md` Sections 23–30 for:

- Pre-deployment validation
- List/library provisioning
- Master data loading
- Power Automate flow enablement
- Permission assignment
- SAP connectivity verification
- Post-deployment smoke tests

### 23.3 Build Commands

```bash
npm install
npm start          # heft start --clean (local)
npm run build      # production package
npm run clean      # clean output
```

---

## 24. Development Phases (Aligned with AIIDE)

| Phase | Deliverables | Reference |
|---|---|---|
| **Phase 1 — Foundation** | SPFx setup ✅, PrimeReact styles ✅, SP init ✅, Redux store, AppShell, routing, role service, common components | Section 10–11 |
| **Phase 2 — Administration** | All master list screens + CRUD | Section 12, wireframe admin |
| **Phase 3 — NPD Initiator** | New Request form, All/Pending/Approved/Draft views | Section 4.4, 7.1 |
| **Phase 4 — Vertical Head** | Approval screens + actions | Section 6.3, 7.1 |
| **Phase 5 — MIS Coordinator** | SAP details, Post to SAP, editable items | Section 8 |
| **Phase 6 — Material Group** | Initiator + Consultant flows | Section 7.2 |
| **Phase 7 — Automation** | Power Automate, SAP, Material Master population, email | Section 7.5, 8 |
| **Phase 8 — Reports** | Analytics dashboard | Section 5.1 MOD-13 |
| **Phase 9 — Testing & UAT** | All test scenarios | Section 22 |
| **Phase 10 — Deployment** | Production release | Section 23 |

---

## 25. TypeScript Interface Conventions

All domain types in `src/External/CommonServices/Interface.ts`:

```typescript
export interface ILookupType {
  Id: number;
  Title: string;               // Lookup Type Name
}

export interface ILookup {
  Id: number;
  LookupCode: string;
  LookupName: string;
  LookupTypeName: string;      // Lookup Type Master Title
}

export interface INPDRequest {
  Id?: number;
  RequestId?: string;
  Title?: string;
  Brand: string;
  MaterialType: string;
  PlantSource: string;
  RocaGlobalCode?: string;
  Status: string;
  CreatedDate?: string;
  CreatedBy?: string;
  // MIS SAP fields...
}

export interface INPDItem {
  Id?: number;
  ParentRequestId: number;
  MaterialCode: string;
  MaterialDescription: string;
  // all MG fields...
}

export interface IMaterialGroupRequest { /* ... */ }
export interface IMaterialGroupRequestItem { /* ... */ }
export interface IPlantMaster { /* ... */ }
export interface IApproverConfig { /* ... */ }
export interface IBrandMaterialExtension { /* ... */ }
export interface IMaterialMaster { /* ... */ }
```

---

## 26. Open Items and Dependencies

| ID | Item | Impact | Status |
|---|---|---|---|
| BLK-001 | Email notification content from ROCA | Phase 7 automation | Open |
| OPEN-001 | Exact SharePoint internal field names | List provisioning | To confirm |
| OPEN-002 | SAP interface specification | MIS Post to SAP | To confirm |
| OPEN-003 | Workflow Configuration — global vs per-brand | Routing logic | To confirm |
| OPEN-004 | Material Group Request ID format | ID generation | To confirm |
| OPEN-005 | Material Master field schema | Admin module | Wireframe TBD |
| OPEN-006 | Power Automate vs in-app workflow routing | Architecture choice | To confirm |

---

## 27. Document Maintenance

### 27.1 When to Update TechnicalArchitecture

- New module or screen added
- SharePoint list schema change
- Redux slice structure change
- New integration (SAP, Graph, Power Automate)
- Technology version upgrade
- Architecture decision (ADR-level)

### 27.2 When to Update ProjectStandards

- New reusable component pattern agreed
- New PrimeReact wrapper added to the control library
- Redux data-flow rule change
- Coding convention or folder structure change
- New ADR (Architectural Decision Record)

### 27.3 Change Process

1. Raise Change Request in `ROCA_NPD_Project_Master.md` Section 28
2. Update **`ProjectStandards.md`** if coding standards or component strategy affected
3. Update this TechnicalArchitecture document
4. Update `NPD_TRD.md` if data schema affected
5. Update `TaskList.md` and `Checklist.md` with new tasks / verification items
6. Implement code changes
7. Update wireframe screenshots if UI changed

---

## 28. Quick Reference — Key Files

| File | Purpose |
|---|---|
| `src/webparts/rocaNpd/RocaNpdWebPart.ts` | SPFx entry, PrimeReact CSS |
| `src/webparts/rocaNpd/components/RocaNpd.tsx` | SP init, Redux Provider |
| `src/webparts/rocaNpd/components/MainComponent.tsx` | App bootstrap |
| `src/External/CommonServices/SPServices.ts` | SharePoint data access |
| `src/External/CommonServices/Config.ts` | Constants and list names |
| `src/External/CommonServices/Interface.ts` | Domain TypeScript types |
| `src/store/index.ts` | Redux store (to create) |
| `src/Documents/TechnicalArchitecture.md` | **This document** |
| `src/Documents/ProjectStandards.md` | **Mandatory coding standards and component strategy** |
| `src/Documents/NPD_TRD.md` | TRD + schema reference |
| `src/Documents/ROCA_NPD_Project_Master.md` | Business requirements |

---

## 29. Project Standards Reference

Detailed coding standards, reusable component guidelines, PrimeReact wrapper strategy, Redux data flow, folder structure, and ADR summary are maintained in:

**`src/Documents/ProjectStandards.md`**

All developers and AI-assisted tools must follow **both** this TechnicalArchitecture **and** ProjectStandards during implementation.

Key standards at a glance:

| Area | Standard |
|---|---|
| UI architecture | Component-based — one common wrapper per PrimeReact control |
| PrimeReact usage | Only via `common/controls/` — not in feature modules |
| State management | Redux Toolkit — Component → Thunk → Service → SharePoint → Slice |
| Styling | `theme.scss` + `var(--roca-color-*)` — no hardcoded colors |
| SP initialization | `setupSP()` in `RocaNpd.tsx` — not in WebPart |

---

## 30. Summary

The ROCA NPD application is a **SPFx + React + PrimeReact + Redux Toolkit + PnPjs v4** solution backed by **SharePoint Online lists**, implementing **NPD and Material Group workflows** across **five roles**, with **SAP integration** at the MIS Coordinator stage and **master data administration** for Admins.

Development follows the **AIIDE (AI-Integrated Development Environment) methodology**: wireframe and documents drive implementation; AI-assisted tools build against this **TechnicalArchitecture** and **`ProjectStandards.md`** as primary references; reusable common components wrap PrimeReact; Redux manages application state; services encapsulate all SharePoint and SAP operations.

**Always follow TechnicalArchitecture and ProjectStandards during development.**

---

*End of TechnicalArchitecture document.*
