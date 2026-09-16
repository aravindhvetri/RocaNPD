# Project Context — NPD Requests (New Product Development) App

> Grounding context for AI-assisted IDEs (Cursor, Copilot Workspace, etc.).
> Built from actual application screens. Keep this updated as the source of truth for schema/architecture.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Framework | SharePoint Framework (SPFx) — latest |
| Data Access | PnPjs — latest |
| UI Library | PrimeReact — latest |
| UI Framework | React — latest |
| Backend | SharePoint Online Lists (no custom API layer) |
| Language | TypeScript (strict recommended) |

App branding: **"NPD REQUESTS — New Product Development"**, single SPFx solution.

---

## 2. Navigation / Information Architecture

**NPD Request** (visible to all roles)
- New NPD Request
- All Requests
- Pending Approval
- Approved Requests
- Draft / ReWork

**New Material Group** (visible to all roles)
- New Material Group
- All Requests
- Pending Request
- Completed Request
- Draft / ReWork

**Administration** (Admin role only)
- Material Master
- Lookup Type
- Lookup
- Workflow Configuration
- Brand Material Extension

Plant Master, Role, and Approver Configuration are **not** in this nav — they are read from the ROCA site.

**Analytics & Reports** (Admin role only)
- Reports

A bottom-left "Active Login Role" indicator shows the resolved role (e.g. `Admin`, `Initiator`) for the current session — nav sections above are shown/hidden based on this.

---

## 3. SharePoint Lists

### 3.1 Lookup Type Master
Master categories that every dropdown/lookup in the app is scoped by.

| Field | Type | Notes |
|---|---|---|
| Lookup Type Name (Title) | Text | e.g. "Class Number" |

**Seeded values observed:** Brand, Material Type, Plant / Source, Product Group (MG2), Product Category (MG3), Product Type (MG4), Product Source (MG5), Color (MGP1A), Product Range (MGP2A), Product Sub Category (MGP3A), Material Group, Ext Material Group, Product Segment.

---

### 3.2 Lookup Master
Individual lookup values, each scoped to one Lookup Type.

| Field | Type | Notes |
|---|---|---|
| Lookup Code | Text | e.g. `BR-01` |
| Lookup Name | Text | e.g. `Parryware` |
| Lookup Type Name | Lookup → Lookup Type Master | Dropdown on create form |

**Examples observed:**
| Code | Name | Type |
|---|---|---|
| BR-01 | Parryware | Brand |
| BR-02 | Johnson Pedder | Brand |
| MT-01 | Finished Products | Material Type |
| MT-02 | Traded Products | Material Type |
| PS-01 | Imported | Plant / Source |
| PS-02 | Domestic | Plant / Source |
| CPND | CPND | Plant / Source |
| MG2-01 | Armani Fittings | Product Group (MG2) |
| MG2-02 | CPVC | Product Group (MG2) |

> Pattern: filter `Lookup Master` by `LookupType/Title` to populate every dropdown in the app dynamically, rather than separate hardcoded lists per field.

---

### 3.3 Brand Material Extension Master
Maps each Brand to the Plant/Warehouse codes valid for it.

| Field | Type | Notes |
|---|---|---|
| Brand | Text (matches a Lookup value where LookupType = Brand) | e.g. `Parryware` |
| Material Extension (Plant / Warehouse Codes) | Text, comma-separated | e.g. `CPND, CRPT, CDEW` |

**Examples:** Parryware → CPND, CRPT, CDEW · Johnson Pedder · PIPES & FITTING · Laufen · Roca · JOHNSON SUISSE.

**Drives:** the dependent "Plant / Source" dropdown on the NPD Request form (enabled only after Material Type is selected, filtered by the selected Brand's extension list).

---

### 3.4 Workflow Configuration Master
Defines the approval stage sequence.

| Field | Type | Notes |
|---|---|---|
| Workflow Flow | Ordered list of Role stages | Currently: **Initiator → Vertical Head → MIS Coordinator** |

Edited via a single "Configure Workflow" modal (not a per-row create form) — likely one active flow record (or one per request type — to confirm).

---

### 3.5 Material Master
*(Nav item present; screen not yet captured — fields TBD.)*

### 3.6 Plant Master
**No NPD admin screen.** Plant codes are read from ROCA `PlantMaster` (Brand Material Extension MultiSelect; Finished Products Plant/Source).

### 3.7 Role
**No NPD admin screen.** Role names are read from ROCA `RoleMaster` (Workflow Configuration Next Role).

### 3.8 Approver Configuration
**No NPD admin screen.** User ↔ Role ↔ Brand mapping is read from ROCA `ApproversMaster` (Brand MG1, role resolution, routing).

---

### 3.9 NPD Request (Header list)
General Information section on the create form:

| Field | Type | Notes |
|---|---|---|
| Request ID | Text (auto) | Format `NPD-YYYY-####`, e.g. `NPD-2026-0042` |
| Title / Project Name | Text | |
| Brand (MG1) | Lookup → Lookup Master (type=Brand) | Required |
| Material Type | Lookup → Lookup Master (type=Material Type) | Required |
| Plant / Source | Lookup, dependent dropdown | Required; enabled after Material Type selected, options filtered via Brand Material Extension |
| Status | Choice | Observed values: `Draft`, `Pending`, `Approved`, `In ReWork` |
| Created Date | Date | |
| Created By | Person | |

---

### 3.10 NPD Item (Child list — "Item Details" grid)
One row per material line, linked to an NPD Request.

| Field | Type | Required? |
|---|---|---|
| ParentRequest | Lookup → NPD Request | (linking field) |
| Material Code | Text, max 18 chars | ✅ |
| Material Description | Text, max 40 chars | ✅ |
| Product Group (MG2) | Lookup (type=Product Group MG2) | ✅ |
| Product Category (MG3) | Lookup (type=Product Category MG3) | ✅ |
| Product Type (MG4) | Lookup (type=Product Type MG4) | ✅ |
| Product Source (MG5) | Lookup (type=Product Source MG5) | ✅ |
| Color (MGP1A) | Lookup (type=Color MGP1A) | ✅ |
| Product Range (MGP2A) | Lookup (type=Product Range MGP2A) | ✅ |
| Product Sub Category (MGP3A) | Lookup (type=Product Sub Category MGP3A) | ✅ |
| Material Group | Lookup (type=Material Group) | ✅ |
| Ext. Material Group | Lookup (type=Ext Material Group) | ✅ |
| Product Segment | Lookup (type=Product Segment) | ✅ |
| Tax Classification | Lookup | ✅ |
| Class Number (PCS Name) | Lookup | Optional (not flagged mandatory) |
| HSN Code | Text | ✅ |
| Weight (Kg) | Number | ✅ |
| UOM | Lookup (search/select) | ✅ |
| Min Qty / Box Qty | Number | Optional |

Grid behavior: `+ Add` / `+ Add Another Item Line`, bulk `Import`, per-row `Delete` / `Copy`, running **Total Items** counter, horizontal scroll for the wide grid.
Form actions: `Cancel / Back`, `Save Draft`, `Submit Request`.

**Relationship:** 1 (NPD Request) → many (NPD Item). Item count on the "All Requests" list is the count of related NPD Item rows ("Products" column shows e.g. `2 lines`, `1 line`).

---

### 3.11 Material Group Request (Initiator Material Group) — Header + Child
Lets an Initiator request new lookup values (codes) under one or more Lookup Types; routed to a **Consultant** for verification and SAP codification.

**Header fields:**
| Field | Type | Notes |
|---|---|---|
| Request ID | Text (auto) | |
| Status | Choice | Draft, Pending/Submitted, Completed, In ReWork |
| Requested Masters | Multi-select of Lookup Type Master | Observed selectable set (10): Product Group (MG2), Product Category (MG3), Product Type (MG4), Product Source (MG5), Color (MGP1A), Product Range (MGP2A), Product Sub Category (MGP3A), Material Group, Ext. Material Group, Product Segment — **notably excludes Brand, Material Type, Plant/Source** |
| Created By | Person | |
| Created Date | Date | |

**Child rows (one group per selected Master Type):**
| Field | Type | Notes |
|---|---|---|
| ParentRequest | Lookup → Material Group Request | |
| Master Type | Which selected Lookup Type this row is for | |
| Code | Text, free text | Optional for Initiator — Consultant finalizes/confirms |
| Description | Text, free text | Mandatory |

Form: `Select All` / `Clear All` masters, per-master `+ Add Row` (multiple entries per master, entry count shown), `Cancel`, `Save as Draft`, `Submit to Consultant`.

---

## 4. Dashboard Views

**NPD Request → All Requests:**
- Summary cards: Total NPD Requests, Pending Approvals, In ReWork / Drafts, Approved Products.
- Table: Request ID, Title / Project Name, Brand (MG1), Material Type, Plant / Source, Products (line count badge), Status (colored badge: Pending / Approved / In ReWork / Draft), Created Date, Actions (View / Edit / Delete — Edit only shown for Draft/ReWork items).
- Search (by Request ID, Title, Brand, Code, or Material), Status filter, Brand filter, `Export CSV`.

---

## 5. Roles & Access Control

- **Admin role** → Administration section (Material Master, Lookup Type, Lookup, Workflow Configuration, Brand Material Extension) + Analytics & Reports. Plant Master, Role, and Approver Configuration are **not** in this app — data is read from the ROCA site.
- **Initiator role** → only NPD Request and New Material Group sections; no Administration or Reports.
- Additional workflow roles referenced (Vertical Head, MIS Coordinator, Consultant) act as **approval-stage actors**, not necessarily nav roles — resolved via ROCA `ApproversMaster` / `RoleMaster`.

**Admin detection pattern:**
1. Get current user via `sp.web.currentUser` (PnPjs).
2. Check membership in the designated Admin SharePoint group.
3. Member → Admin role/nav. Non-member → Initiator (default) role/nav.
4. Centralize in one service/hook (e.g. `useUserRole()`) provided via React Context at app-shell level; cache per session. Enforce real security via SharePoint list permissions, not just UI hiding.

---

## 6. Relationships Overview

```
Lookup Type Master ──1:N──► Lookup Master
Lookup Master (Brand) ──1:N──► Brand Material Extension
ROCA PlantMaster ──drives──► Brand Material Extension plants + Finished Products Plant/Source
ROCA RoleMaster ──used by──► Workflow Configuration
ROCA ApproversMaster ──used by──► Brand (MG1), role resolution, routing
NPD Request ──1:N──► NPD Item
Material Group Request ──1:N──► Material Group Request Item (per selected Lookup Type)
```

---

## 7. Open Items / To Confirm
- [x] Plant Master, Role, and Approver Configuration are **ROCA site** lists — no NPD admin screens or local lists
- [ ] Exact SharePoint internal field names vs. display labels used above
- [ ] Whether Workflow Configuration is one global flow or configurable per Brand / request type
- [ ] How Vertical Head / MIS Coordinator / Consultant map to real approver users (per Brand? global?)
- [ ] Full Status choice sets for NPD Request and Material Group Request (Draft, Pending, Approved, In ReWork, Submitted, Completed, Rejected?)
- [ ] Request ID generation logic (`NPD-YYYY-####` — sequential per year? per brand?)
- [ ] Whether "Min Qty/Box Qty" is one combined field or two separate fields
- [ ] Consultant's edit/finalize flow for Code on Material Group Request items

---

## 8. Conventions for AI IDE Assistance

> **Full standards:** See **`src/Documents/ProjectStandards.md`** — mandatory for all development.

### 8.1 Architecture & Components
- Follow a **component-based approach**: every reusable UI element is a common component under `common/controls/`, not reimplemented per module.
- Use **PrimeReact only** for feature UI — wrap each control (InputText, Dropdown, MultiSelect, ComboBox, DataTable, Button, Dialog, DatePicker, etc.) in its own reusable common component folder.
- Feature modules (`npd/`, `materialGroup/`, `admin/`, `reports/`) import from `common/controls/` — **never** import `primereact/*` directly.
- Use **Redux Toolkit** for application state: Component → dispatch thunk → domain service → `SPServices` → SharePoint → slice update → re-render.

### 8.2 Data & Services
- Use **PnPjs v4** (`spfi` + `setupSP()`) for all list operations — initialized in `RocaNpd.tsx`, not the WebPart.
- Centralize list names / internal field names in **`Config.ts`** (not scattered magic strings).
- Type all list items with TypeScript interfaces in **`Interface.ts`** matching section 3 above (e.g. `ILookupType`, `ILookup`, `IBrandMaterialExtension`, `INPDRequest`, `INPDItem`, `IMaterialGroupRequest`, `IMaterialGroupRequestItem`).
- Components must **not** call `SPServices` or PnP directly — use Redux thunks and domain services.

### 8.3 UI Patterns
- Dependent dropdowns (Material Type → Plant/Source) should be implemented as controlled cascading selects using common `Dropdown` / `ComboBox` wrappers, re-querying Lookup Master / Brand Material Extension on parent change.
- Item-detail grids (NPD Item, Material Group Request rows) should support add/remove rows client-side before a single batched save on Submit/Save Draft — avoid per-keystroke list writes.
- All colors via **`theme.scss`** CSS variables (`var(--roca-color-*)`) — no hardcoded hex in components.

### 8.4 Document Hierarchy
| Document | Role |
|---|---|
| `ProjectStandards.md` | Coding standards, component strategy, Redux rules |
| `TechnicalArchitecture.md` | System architecture, modules, SharePoint schema |
| `NPD_TRD.md` | This document — TRD + AI IDE grounding |
