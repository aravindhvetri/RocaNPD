# ROCA NPD — Checklist

> **Purpose:** Verify that every important item is implemented correctly and works as expected before marking tasks complete.  
> **How to use:** Check off `- [ ]` → `- [x]` when verified. Use alongside `TaskList.md` — completing a task should trigger the related checklist items.  
> **References:** `TechnicalArchitecture.md`, `ProjectStandards.md`, `TaskList.md`, `NPD_TRD.md`, `ROCA_NPD_Project_Master.md`, Wireframe ([roca-npd.ai.studio](https://roca-npd.ai.studio/))

---

## Verification Summary

| Category | Total Items | Verified | Pending |
|---|---:|---:|---:|
| A — Project & Documentation | 16 | 6 | 10 |
| B — Technical Foundation | 73 | 62 | 11 |
| C — SharePoint Data | 26 | 15 | 11 |
| D — Security & Roles | 31 | 30 | 1 |
| E — UI / UX / Theme | 41 | 35 | 6 |
| F — Admin Module | 73 | 70 | 3 |
| G — NPD Module | 95 | 94 | 1 |
| H — Material Group Module | 41 | 41 | 0 |
| I — Workflow & Automation | 20 | 18 | 2 |
| J — SAP Integration | 19 | 10 | 9 |
| K — Material Master | 11 | 8 | 3 |
| L — Reports | 10 | 0 | 10 |
| M — Email Notifications | 8 | 6 | 2 |
| N — Testing | 26 | 0 | 26 |
| O — UAT | 18 | 0 | 18 |
| P — Deployment | 22 | 0 | 22 |
| **TOTAL** | **530** | **395** | **135** |

**Last Updated:** 09 October 2026

---

## A — Project & Documentation

- [x] **CHK-A01** `TechnicalArchitecture.md` exists and is the primary technical reference
- [x] **CHK-A02** `NPD_TRD.md` reviewed and aligned with implementation
- [x] **CHK-A15** `ProjectStandards.md` exists and documents component strategy, PrimeReact wrappers, Redux rules
- [ ] **CHK-A16** All contributors acknowledge ProjectStandards as mandatory project standards
- [ ] **CHK-A03** `ROCA_NPD_Project_Master.md` functional requirements confirmed with business
- [x] **CHK-A04** `TaskList.md` created with all implementation tasks
- [x] **CHK-A05** `Checklist.md` created with all verification items
- [ ] **CHK-A06** Wireframe screenshots captured for all screens (`src/Documents/Wireframe/`)
- [ ] **CHK-A07** SharePoint list schemas documented and approved
- [x] **CHK-A08** SAP integration specification documented and approved
- [ ] **CHK-A09** Email notification content received from ROCA (BLK-001)
- [ ] **CHK-A10** Development, UAT, and production environments identified
- [ ] **CHK-A11** All open items (OPEN-001–OPEN-006) resolved or accepted
- [ ] **CHK-A12** Change Request process agreed for scope changes
- [ ] **CHK-A13** Defect tracking process agreed (BUG-xxx in Master doc)
- [ ] **CHK-A14** AIIDE methodology understood by all contributors

---

## B — Technical Foundation

### B.1 SPFx & Build

- [x] **CHK-B01** SPFx 1.23.2 project builds with `npm run build` without errors
- [ ] **CHK-B02** `npm start` runs local workbench without errors
- [ ] **CHK-B03** Node.js 22.x used consistently across team environments
- [ ] **CHK-B04** TypeScript strict mode enabled and passing
- [ ] **CHK-B05** ESLint passes with no blocking errors
- [ ] **CHK-B06** SPFx package deploys to App Catalog successfully

### B.2 SharePoint Connectivity

- [x] **CHK-B07** `spfi().using(SPFx(context))` initialized in `RocaNpd.tsx`
- [x] **CHK-B08** `setupSP()` called before any SPServices usage
- [x] **CHK-B09** `WebPartContext` passed from WebPart → RocaNpd → MainComponent
- [x] **CHK-B10** `SPFI` instance passed to child components as `sp` prop
- [x] **CHK-B11** SPServices uses PnP v4 API (no `@pnp/sp/presets/all`)
- [x] **CHK-B12** Cross-site web queries work via `Web([sp.web, siteUrl])`
- [x] **CHK-B13** Batch insert/update/delete operations work correctly

### B.3 Redux

- [x] **CHK-B14** Redux store configured with all feature slices (app, ui, admin, npdForm, npdRequest, materialGroup, materialMaster)
- [x] **CHK-B15** Typed hooks (`useAppDispatch`, `useAppSelector`) available
- [x] **CHK-B16** `initializeApp` thunk runs on app mount
- [x] **CHK-B17** Loading states display during async operations
- [x] **CHK-B18** Error states captured in slices and shown to user
- [x] **CHK-B19** Toast notifications work for success, error, and warning (common styled Toast)

### B.4 Routing & App Shell

- [x] **CHK-B20** react-router-dom routes configured for all modules (HashRouter + placeholder pages)
- [x] **CHK-B21** Route guards block unauthorized role access (`ProtectedRoute` + `permissionService`)
- [x] **CHK-B22** App shell matches wireframe layout (header, left nav, content)
- [x] **CHK-B23** Navigation items show/hide correctly per role (`filterNavigationByRoles`, union of assigned roles)
- [x] **CHK-B23a** Multi-role users see separate role-grouped nav sections (Initiator / VH / MIS / Consultant / Admin) with `?as=` context
- [x] **CHK-B23b** After Approve/Submit/Save Draft success toast clear, `?as=` is preserved so the same role section stays selected (e.g. VH Pending, not Initiator Pending)
- [x] **CHK-B23c** Side-nav between list modules does not flash stale DataTable then reload — `useListPageFetch` gates LoaderOverlay until mount fetch settles
- [x] **CHK-B24** Active Login Role indicator removed from side navigation per design requirement
- [x] **CHK-B25** Unauthorized URL redirects to access-denied page (`/unauthorized`)

### B.5 Common Components — Composites

- [ ] **CHK-B26** StatusBadge shows correct colors per status (Draft, Pending, Rework, Approved, Rejected, Completed)
- [ ] **CHK-B27** ConfirmActionDialog appears before Approve / Rework / Reject / Delete
- [ ] **CHK-B28** SearchFilterBar filters list data correctly
- [ ] **CHK-B29** EmptyState displays when no records found
- [x] **CHK-B30** LoaderOverlay shows during data fetch and save operations
- [x] **CHK-B31** Export generates valid Excel file via `exportService.ts` (Lookup Type Master verified)
- [x] **CHK-B31a** Reusable Import/Export services and `ImportDialog` documented in ProjectStandards Section 5.8
- [x] **CHK-B31b** Shared import header gate: `validateRequiredImportHeaders` / `ImportDialog.expectedHeaders` rejects mismatched columns on select/drop for all Import modules
- [x] **CHK-B31c** Missing-column Import Toast uses short shared message (download template)
- [x] **CHK-B31d** Shared Excel import value validation: digits/numeric cells (e.g. Weight, Min. Qty) reject mixed values like `ab09` with “Only numbers are allowed”; alphanumeric fields reject special characters with row + field in the validation popup; values are never silently stripped or partially extracted (`importService`)
- [x] **CHK-B31e** Import template download uses the `NPD_Templates` Library file as-is (header background/formatting preserved); no local rewrite that drops styles
- [x] **CHK-B31f** `ImportValidationDialog` shows **S.NO** and **Validation Error** only (no record-name / field-name column) for Lookup, Lookup Type, and Item Details imports

### B.6 Common Controls — PrimeReact Wrappers

Per **`ProjectStandards.md`** — verify each control before feature module development.

- [x] **CHK-B32** `common/controls/` folder structure exists with one folder per control
- [x] **CHK-B33** `IBaseControlProps` shared by all form controls (label, required, error, disabled)
- [x] **CHK-B34** InputText / InputNumber / InputTextarea wrappers implemented with ControlField
- [x] **CHK-B35** Dropdown / MultiSelect / ComboBox wrappers support lookup options and disabled state
- [x] **CHK-B36** DatePicker wrapper implemented (SharePoint date formatting in services — pending usage)
- [x] **CHK-B37** Button wrapper supports primary / secondary / danger / text variants
- [x] **CHK-B38** Dialog and ConfirmDialog wrappers handle open/close and footer actions
- [x] **CHK-B39** DataTable wrapper supports pagination, sorting, loading, and empty state
- [x] **CHK-B39m** DataTable paginator hidden when row count ≤ page size (all modules via shared wrapper)
- [x] **CHK-B39n** List search space-insensitive + lowercase (`searchTextUtils` / DataTable `contains` override) across all modules
- [x] **CHK-B39a** DataTable — no grid lines; subtle sort icons; pagination report text without box
- [x] **CHK-B39o** DataTable Status column is not sortable (no sort icon) on NPD and Material Group request lists; other columns keep sorting
- [x] **CHK-B39p** DataTable empty values shown as centered em dash (`EmptyDash` / `wrapDataTableCellContent`) across all tables
- [x] **CHK-B39b** `MasterTablePanel` reset-filters icon on all master screens
- [x] **CHK-B39c** Poppins font family applied app-wide
- [x] **CHK-B39c2** Poppins applied to Toast, Dropdown, MultiSelect, ComboBox, Dialog overlays (post-CDN inject)
- [x] **CHK-B39d** Form dialog title/label hierarchy and footer button styling via `_form-dialog-standard.scss`
- [x] **CHK-B39e** User-facing **Lookup Type** spelling consistent in nav, headings, and dialogs
- [x] **CHK-B39f** Dropdown/MultiSelect search filter has compact left padding (icon on the right)
- [x] **CHK-B39g** Selected option background uses `$roca-color-option-selected-bg` (theme teal, not mint)
- [x] **CHK-B39h** Selected navigation item uses white background + dark teal text
- [x] **CHK-B39i** Master reset button has visible white background + border on all master toolbars
- [x] **CHK-B39j** Export filename uses `{Name}_Export_{DD-MM-YYYY}` with themed Excel header row
- [x] **CHK-B39k** Master toolbar controls (Search/Import/Export/Add New) use compact shared height
- [x] **CHK-B39l** Form dialog footer buttons use taller min-height via `_form-dialog-standard.scss`
- [x] **CHK-B40** Toast wrapper connected to Redux notification queue (`ui.flashMessage`)
- [x] **CHK-B41** `common/controls/index.ts` barrel export — feature modules import from here only
- [ ] **CHK-B42** No feature module file imports directly from `primereact/*`
- [ ] **CHK-B43** No hardcoded color hex values outside `theme.scss`

### B.7 Redux Data Flow

- [x] **CHK-B44** Components dispatch thunks — never call SPServices directly
- [x] **CHK-B45** Thunks call domain services; services call SPServices
- [x] **CHK-B46** Form drafts held in Redux until Save Draft / Submit (no per-keystroke SP writes)
- [x] **CHK-B47** Lookup data cached via `lookupService` / Redux (admin + npdForm) and reused across screens

---

## C — SharePoint Data Structure

### C.1 Lists Exist and Schema Correct

- [x] **CHK-C01** Lookup Type Master list provisioned with correct fields
- [x] **CHK-C02** Lookup Master list provisioned with correct fields
- [x] **CHK-C03** Brand Material Extension Master list provisioned
- [x] **CHK-C04** No local Plant Master list — ROCA `PlantMaster` is the plant data source
- [x] **CHK-C05** No local Role Master list — ROCA `RoleMaster` is the role data source
- [x] **CHK-C06** No local Approver Configuration list — ROCA `ApproversMaster` is the approver data source
- [x] **CHK-C07** Workflow Configuration Master list provisioned
- [x] **CHK-C08** Material Master list provisioned (`NPD_MaterialMaster`)
- [x] **CHK-C09** NPD Request list provisioned
- [x] **CHK-C10** NPD Item list provisioned with ParentRequest lookup (`RequestGeneralInfoId`)
- [x] **CHK-C11** Material Group Request list provisioned
- [ ] **CHK-C12** Material Group Request Item list provisioned — N/A: masters stored as JSON on request header

### C.2 Seed Data & Relationships

- [ ] **CHK-C13** Lookup Type Master seeded (Brand, Material Type, Plant/Source, MG2–MG5, etc.)
- [ ] **CHK-C14** Lookup Master seeded with initial values (brands, types, plants)
- [ ] **CHK-C15** Lookup Type → Lookup Master relationship works in queries
- [x] **CHK-C16** Brand Material Extension plants sourced from ROCA `PlantMaster` (no NPD-site Plant Master list)
- [x] **CHK-C17** Workflow Next Role from ROCA `RoleMaster`; routing from ROCA `ApproversMaster` (no local Role/Approver lists)
- [x] **CHK-C18** NPD Request → NPD Item 1:N relationship works
- [ ] **CHK-C19** Material Group Request → Item 1:N relationship works — N/A: JSON on header
- [x] **CHK-C20** Internal field names documented in `Config.ts`

### C.3 Permissions

- [ ] **CHK-C21** Initiator SharePoint group permissions configured
- [ ] **CHK-C22** Vertical Head group permissions configured
- [ ] **CHK-C23** MIS Coordinator group permissions configured
- [ ] **CHK-C24** Consultant group permissions configured
- [ ] **CHK-C25** Admin group permissions configured
- [ ] **CHK-C26** Item-level security enforced (not UI-only)

---

## D — Security & Roles

### D.1 Role Resolution

- [x] **CHK-D01** Logged-in user identified correctly via `currentUser`
- [ ] **CHK-D02** Employee ID retrieved correctly
- [x] **CHK-D03** Admin role assigned when user is in Admin SharePoint group (`Admins`)
- [x] **CHK-D04** Non-admin roles resolved from ROCA `ApproversMaster` (multi-role union with Admin)
- [x] **CHK-D05** Brand mapping loaded for Initiator and Vertical Head
- [x] **CHK-D06** Role cached for session (no repeated SP calls on every navigation)

### D.2 Access Control — Initiator

- [x] **CHK-D07** Initiator NPD lists (All, Pending, Approved, Draft/Rework) show only that user's requests (`NPD_Request.Initiator`, else Author) for their configured brands — other brands and other Initiators on the same brand are hidden
- [x] **CHK-D07a** Save Draft and Submit write the logged-in user to `NPD_Request.Initiator`; MG Draft/Submit already writes `NPD_MaterialGroupRequests.Initiator`, and Initiator MG lists match that person only
- [x] **CHK-D08** Initiator sees only own Material Group requests (Initiator MG section)
- [x] **CHK-D09** Initiator cannot Approve, Rework, or Reject (`hasPermission` / action matrix)
- [x] **CHK-D10** Initiator cannot edit Pending or Approved requests (View is read-only; Edit only for own Draft/Rework)
- [x] **CHK-D11** Initiator can edit and resubmit Draft / Rework requests

### D.2 Access Control — Vertical Head

- [x] **CHK-D12** Vertical Head sees every NPD request for mapped brand(s) only (not limited to the creator); other brands are hidden on All, Pending, and Approved
- [x] **CHK-D13** Vertical Head can Approve, Rework, Reject on pending requests (Edit on current VH step; View is read-only)
- [x] **CHK-D14** Vertical Head cannot access Material Group, New NPD Request, Draft/ReWork, or Reports — side nav is All / Pending / Approved only
- [x] **CHK-D15** Vertical Head cannot perform MIS Coordinator actions

### D.3 Access Control — MIS Coordinator

- [x] **CHK-D16** MIS Coordinator sees requests approved by VH and assigned to self
- [x] **CHK-D17** MIS Coordinator can edit Item Details and Other Details
- [x] **CHK-D18** MIS Coordinator can Post to SAP, Rework, Reject
- [x] **CHK-D19** MIS Coordinator cannot access Material Group module

### D.4 Access Control — Consultant

- [x] **CHK-D20** Consultant sees assigned Material Group pending requests
- [x] **CHK-D21** Consultant can Complete, Rework, Reject Material Group requests
- [x] **CHK-D22** Consultant cannot access NPD module

### D.5 Access Control — Admin

- [x] **CHK-D23** Admin sees all NPD and Material Group requests (Admin nav sections, no brand restriction)
- [x] **CHK-D23a** Multi-role Admin+Initiator keeps separate Initiator (brand-scoped) and Admin (unscoped) NPD / MG sections
- [x] **CHK-D23b** Admin All Requests (NPD + MG) excludes Draft records; summary card label is "In Rework" (not "In Rework / Drafts")
- [x] **CHK-D23c** NPD Drafts appear only on Initiator All Requests / Draft-Rework — hidden from Admin, Vertical Head, and MIS Coordinator All Requests; MG Drafts appear only for Initiator (hidden from Admin and Consultant All / Pending / Completed)
- [x] **CHK-D24** Admin has full Administration module access
- [x] **CHK-D25** Admin cannot perform workflow actions (approve/post) unless by design
- [x] **CHK-D26** On every login, Pending and Rework NPD requests refresh Vertical Head (matched by Brand), MIS Coordinator, and Consultant in `WorkFlowJSON` from ApproversMaster (`System = New Product Development`). Unchanged users are not written. Draft, Approved, Rejected, and Completed requests are not updated. Action buttons follow the current approver (a replaced Vertical Head no longer sees Approve / Rework / Reject; Resubmit notifies the current Vertical Head)
- [x] **CHK-D27** New NPD Request / New Material Group always opens a blank create form — prior View/Edit Redux state is cleared when the New button is used (including without Cancel)

---

## E — UI / UX / Theme

### E.1 Theme & Styling

- [x] **CHK-E01** `theme.scss` exists in `External/CommonServices/`
- [x] **CHK-E02** Theme imported globally in `RocaNpdWebPart.ts`
- [x] **CHK-E03** Application root uses `theme.module.scss` `appRoot` class for CSS variables
- [x] **CHK-E04** No hardcoded hex/rgb colors in component SCSS or TS (only in `theme.scss`) — verified for layout components
- [x] **CHK-E05** All status badges use `--roca-color-status-*` variables — N/A until dedicated StatusBadge; status text uses shared formatters today
- [x] **CHK-E06** Primary buttons use `--roca-color-btn-primary-*` (teal brand color)
- [x] **CHK-E07** Dialog headers use `--roca-color-header-bg` (matches wireframe modal)
- [x] **CHK-E08** PrimeReact components styled consistently inside `.roca-npd-app` (overlays via `_roca-form-controls.scss` + `injectRocaPrimeOverrides.ts`)

### E.2 Wireframe Alignment

- [x] **CHK-E09** Left navigation matches NavSelectDesign.png (icon tones, hover, selected bar, pill actions)
- [x] **CHK-E09a** Administration nav excludes Plant Master, Role, and Approver Configuration (ROCA-sourced; no local modules)
- [x] **CHK-E09b** Role group banners separate Initiator / VH / MIS / Consultant / Admin blocks in expanded side nav
- [x] **CHK-E09c** Primary/accent colors match wireframe (#40919D accent, #162C34 sidebar, semantic nav icons)
- [x] **CHK-E17b** Nav hover = subtle translucent bg; selected = **white** bg + dark teal text + colored left bar; icons keep semantic colors
- [x] **CHK-E17c** Sidebar shrink/expand toggle matches shrink.png; content area adjusts; primary actions hover + selected only on click
- [x] **CHK-E17d** Side navigation bottom border below Reports section removed (`.section:last-child { border-bottom: none; }`); other section separators preserved
- [x] **CHK-E17e** Master toolbar Search input and Reset button match dashboard action button height (`2rem`); Reset button has permanent theme background with white icon
- [x] **CHK-E17f** DataTables Actions column compact width (`5.5rem`), left-aligned under "Action" header with `0.5rem` button gap, no excess right whitespace
- [x] **CHK-E17g** Form dialog footer buttons aligned flush with input fields (PrimeReact button default right margins removed, content/footer horizontal padding aligned)
- [x] **CHK-E17a** Static header matches `headerSample` wireframe with ROCA Group logo from assets
- [ ] **CHK-E10** Page headings match wireframe / requirement document
- [ ] **CHK-E11** Table columns match wireframe for each list view
- [ ] **CHK-E12** Form fields and layout match New NPD Request wireframe
- [ ] **CHK-E13** Material Group form matches wireframe (Select Masters + Master Details)
- [ ] **CHK-E14** Admin master screens match wireframe list + form pattern
- [ ] **CHK-E15** Confirmation dialogs match wireframe action pattern
- [x] **CHK-E16** Summary cards on NPD All Requests dashboard match wireframe

### E.3 UX Behavior

- [x] **CHK-E17** Loading spinner/skeleton shown during data operations
- [x] **CHK-E18** Empty state shown when lists have no records
- [x] **CHK-E19** Success toast shown after Save, Submit, Approve, Complete, etc. — consistent “… successfully.” format (created / updated / deleted / imported)
- [x] **CHK-E20** Error toast shown on validation failure or SP errors
- [x] **CHK-E21** Cancel / Back returns to the source list (`from` query: All, Pending, Approved, Draft/Rework); New Request without `from` goes to All Requests — confirm dialog pending
- [x] **CHK-E22** Read-only screens cannot be edited (form controls disabled)
- [x] **CHK-E23** Editable screens show only permitted actions for current role
- [x] **CHK-E24** Horizontal scroll works on wide Item Details grid (shared surface scrollbar)
- [x] **CHK-E25** Total Item Lines counter updates correctly on NPD form
- [x] **CHK-E26** Dynamic pending/completed counters update on list views
- [x] **CHK-E27** `DeleteBlockedDialog` (“Cannot Delete”) is compact — reduced padding, centered message and Close button (overrides injected dialog padding via `.roca-delete-blocked-dialog`)
- [x] **CHK-E28** Export disabled when displayed DataTable has no rows (Lookup Type, Lookup, Brand Material Extension, NPD All/Approved)
- [x] **CHK-E29** Master/list DataTables ordered by `Modified` descending (newest modified first)
- [x] **CHK-E30** Status filter options derived from table data (+ Status field choices); empty table does not show Draft/Rework placeholders; In ReWork → **Rework**
---

## F — Admin Module

### F.1 Lookup Type Master

- [x] **CHK-F01** List displays all active lookup types (`IsDeleted` excluded)
- [x] **CHK-F02** Create new lookup type works (Add Lookup Type popup, SharePoint `NPD_LookupType`)
- [x] **CHK-F03** Edit lookup type works (Edit Lookup Type popup)
- [x] **CHK-F04** Required-field and duplicate validation via warning Toast (no inline errors)
- [x] **CHK-F04a** Soft delete via `IsDeleted` — deleted records hidden from grid
- [x] **CHK-F04b** Search filters lookup types in DataTable
- [x] **CHK-F04c** Import popup matches wireframe (upload zone, template panel, Cancel/Import)
- [x] **CHK-F04f** Import downloads template from `NPD_Templates` where `TemplateType = "Lookup Type"`
- [x] **CHK-F04g** Import duplicates shown in Import popup validation table (not duplicate-only Toasts); Proceed imports valid rows only
- [x] **CHK-F04h** Import inserts only new records; list refreshes after success
- [x] **CHK-F04i** Export downloads Excel for currently displayed (filtered) lookup types
- [x] **CHK-F04d** Bottom pagination with entry count matches new design
- [x] **CHK-F04e** Delete confirmation uses common `DeleteConfirmDialog` design
- [x] **CHK-F04j** Lookup Type delete blocked when used by Lookup records (`DeleteBlockedDialog`, not delete confirm + Toast)
- [x] **CHK-F04k** Case-insensitive duplicate Lookup Type Title (UI + service; e.g. Resin / RESIN)
- [x] **CHK-F04l** Add/Edit Lookup Type dialog closes immediately on save; page loader until complete
- [x] **CHK-F04m** Export shows page loader while Excel download runs
- [x] **CHK-F04n** Import rejects file on browse/drop when required Excel headers do not match FieldLabels (Lookup Type Name); Toast; file not accepted

### F.2 Lookup Master

- [x] **CHK-F05** List displays lookups with Lookup Type, Lookup Code, then Lookup Name columns
- [x] **CHK-F06** Add Lookup popup: Lookup Type, Lookup Code, then Lookup Name field order
- [x] **CHK-F06a** Lookup form validation order matches UI: Lookup Type → Lookup Code → Lookup Name
- [x] **CHK-F07** Edit lookup works
- [x] **CHK-F08** Soft delete lookup works when no dependency exists
- [x] **CHK-F09** Lookup correctly linked to Lookup Type Master (`NPD_Lookup.LookupType`)
- [x] **CHK-F09a** Import uses `NPD_Templates` where `TemplateType = "Lookup"` (columns include Lookup Code)
- [x] **CHK-F09b** Import duplicates shown in Import popup validation table with record name + error pill
- [x] **CHK-F09c** Export downloads Excel for filtered grid data including Lookup Code
- [x] **CHK-F09d** Lookup Type delete dependency check runs before delete confirm dialog
- [x] **CHK-F09e** Lookup delete blocked when referenced in Brand Material Extension (Toast)
- [x] **CHK-F09f** Case-insensitive duplicate Lookup Name and Lookup Code under the same Lookup Type (UI + service)
- [x] **CHK-F09g** Add/Edit Lookup dialog closes immediately on save; page loader until complete
- [x] **CHK-F09h** Lookup Export shows page loader while Excel download runs
- [x] **CHK-F09i** Add New button keeps the same background on click/focus (no color flash)
- [x] **CHK-F09j** Import rejects file on browse/drop when required Excel headers do not match FieldLabels (Lookup Type, Lookup Code, Lookup Name); Toast; file not accepted
- [x] **CHK-F09k** Lookup / Lookup Type Add/Edit: special characters blocked while typing (letters, numbers, spaces only)
- [x] **CHK-F09l** Lookup / Lookup Type Excel import rejects special characters (validation popup with row + field); Lookup template download preserves Library header formatting

### F.3 Plant / Role / Approver — ROCA site (no local admin screens)

- [x] **CHK-F10** Plant Master not in side nav or routes; plants loaded from ROCA `PlantMaster`
- [x] **CHK-F16** Role not in side nav or routes; NPD roles loaded from ROCA `RoleMaster`
- [x] **CHK-F19** Approver Configuration not in side nav or routes; approvers/brands loaded from ROCA `ApproversMaster`
- [x] **CHK-F19a** ApproversMaster reads select `IsDelete` and exclude rows where `IsDelete` is true (`isDeletedApproverRow`)

### F.6 Brand Material Extension

- [x] **CHK-F24** Brand → Plant mapping displays correctly in grid
- [x] **CHK-F25** Brand options sourced from ROCA `Brandmaster`; Plant from ROCA `PlantMaster`
- [x] **CHK-F26** Add / Edit / Delete works with common popup and Toast validation
- [x] **CHK-F26a** Plant stored as comma-separated values; MultiSelect repopulates on edit
- [x] **CHK-F26b** ROCA site URL resolved via `resolveRocaMasterSiteUrl()` (not hardcoded in UI)
- [x] **CHK-F26c** Duplicate Brand blocked with warning Toast
- [x] **CHK-F26c1** Multi-tab: Brand Material Extension create/update re-fetches SharePoint before persist (`assertBrandMaterialExtensionNotDuplicate`)
- [x] **CHK-F26d** Export only (Excel) on Brand Material Extension toolbar; disabled when no rows
### F.7 Workflow Configuration

- [x] **CHK-F27** Workflow stages display as grouped Approval Chain (e.g. Initiator → VH → MIS)
- [x] **CHK-F28** Configure Workflow modal saves correctly (NPD multi-step + MG Consultant step)
- [x] **CHK-F28a** NPD Next Role from ROCA RoleMaster (`System/Title eq "New Product Development"`); Initiator, Consultant, and used roles excluded; **`IsDelete = false` only**
- [x] **CHK-F26e** Brand Material Extension Plant column shows first 8 values then `...` with full list in `title` hover (`MultiValueCell`)
- [x] **CHK-E31** Multi-value DataTable cells use shared `MultiValueCell` (limit 8 + ellipsis + title tooltip)- [x] **CHK-F28b** Edit replaces existing steps; Delete soft-deletes all steps for request type
- [x] **CHK-F28c** Duplicate request type blocked; validation via Toast only
- [x] **CHK-F28c1** Multi-tab: Workflow save re-fetches SharePoint before persist; Add dialog re-fetches before offering Request Types
- [x] **CHK-F28d** Add Step hidden when no valid Next Role options remain for a new step
- [x] **CHK-F28e** All applicable steps have editable Next Role; changing Next Role cascades Current Role to following step
- [x] **CHK-F28f** Form dialog font size and button/icon sizing consistent with master popup standards
- [x] **CHK-F28g** Save blocked until all available Next Role options are selected (incomplete NPD chain → Toast warning)
- [x] **CHK-F04o** Multi-tab: Lookup Type create/update/import and Lookup create/update/import re-fetch SharePoint before persist (not Redux-only)
### F.8 Material Master

> **Phase A (done):** Admin read-only Material Master list from `NPD_MaterialMaster`. Tabs Existing (`ItemType=Old`, hide empty columns) / New (`ItemType=New`, all columns). Search, date From/To, Initiator filter, Export. Paged fetch (50/batch); UI 50/page. **Also done:** auto-populate New rows on MIS Post to SAP. **Still deferred:** template, import, manual add/edit.

- [x] **CHK-F29a** Material Master requirements reviewed (MD docs + list/Figma screenshots); Phase A scope confirmed before implementation
- [x] **CHK-F29** Material Master list with Existing / New tabs, search, date filters, Initiator filter, and Export works
- [x] **CHK-F29b** Paged fetch retrieves full list (>25k capable); UI shows 50 rows per page with pagination
- [x] **CHK-F29c** Existing tab hides columns with no values across Old rows; New tab shows all catalog columns
- [x] **CHK-F29d** Initiator resolved from `NPDRequest` → `NPD_Request`; filter options unique and data-driven
- [x] **CHK-F29e** Created Date and Created By columns display correctly
- [ ] **CHK-F30** Download Template produces valid file *(deferred — not Phase A)*
- [ ] **CHK-F31** Import bulk records works with validation *(deferred — not Phase A)*
- [x] **CHK-F32** Export catalog / filtered rows produces valid Excel
- [ ] **CHK-F33** Add Record manually works *(deferred — not Phase A)*
- [x] **CHK-F34** Creation Date From/To filters work
- [x] **CHK-F35** Initiator filter works
- [x] **CHK-F36** Auto-populated records from completed NPD appear correctly under Material Master New tab (ItemType=New after Post to SAP)
- [x] **CHK-F36a** Material Master fetch filters by `ItemType` Old/New so future Item Details submit rows can appear under New without schema redesign

---

## G — NPD Module

### G.1 Initiator — List Views

- [x] **CHK-G01** All Requests shows role-scoped requests with columns Request ID, Brand (MG1), Material Type, Plant, Products, Status, Current Approver, Created Date, Workflow, Actions
- [x] **CHK-G02** Summary cards show correct counts (Total, Pending, Rework, Approved)
- [x] **CHK-G03** Pending Approval shows own requests in pipeline (view-only for Initiator; Edit only if the user can act as the pending VH/MIS role)
- [x] **CHK-G04** Approved Requests shows fully approved requests in the user's scope (view-only)
- [x] **CHK-G04a** Vertical Head Approved Requests also lists Pending requests where VH WorkFlowJSON step is Approved (status shows Pending with MIS Coordinator until Post to SAP)
- [x] **CHK-G05** Draft / ReWork shows editable own requests
- [x] **CHK-G06** Search by Request ID, Plant, Brand, Material Type, Status, Current Approver, and related fields works ('Search here' on Pending/Draft; 'Search by Request ID, Plant, Brand, Code, or Material...' on All/Approved)
- [x] **CHK-G06b** NPD list global search includes Current Approver (`buildNpdListSearchHaystack`) on All / Approved / Draft / Pending
- [x] **CHK-G06a** DataTable layout consistently aligned across all NPD components (Request ID, Brand, Material Type, Plant, Products, Status, Current Approver, Created Date, Workflow, Actions) with unified column widths and alignment
- [x] **CHK-G07** Status and Brand filters work
- [x] **CHK-G08** Export downloads Excel (.xlsx) for currently displayed All / Approved request rows
- [x] **CHK-G08a** Dedicated Workflow column opens a read-only Workflow Status dialog from `WorkFlowJSON`; Draft rows hide the icon; only the current pending role is highlighted; empty approver status shows Pending
- [x] **CHK-G08b** Same request in two tabs of the same user: View/Edit/Save Draft/Submit/workflow in one tab locks the other; popup appears on tab focus/visibility (no click); different login users do not lock each other; single-tab View after action does not show false Editing Restricted

### G.2 Initiator — New NPD Request Form

- [x] **CHK-G09** Brand (MG1) dropdown populated from ROCA `ApproversMaster` — System=`New Product Development`, Role=`Initiator`, Users matched by `EMail` (+ `UsersId` site-user map fallback); options seeded on app init so available on first NPD Form open
- [x] **CHK-G10** Material Type dropdown populated from `Config.NpdMaterialTypes` (Finished Products, Traded Products)
- [x] **CHK-G11** Plant/Source disabled until Material Type selected (Finished or Traded Products)
- [x] **CHK-G12a** Plant/Source (Finished Products) from ROCA `PlantMaster` — `PlantType`=Factory, active plants, options=`PlantCode`
- [x] **CHK-G12b** Plant/Source (Traded Products) shows `Imported` and `Domestic` from `Config.NpdTradedPlantSources`
- [x] **CHK-G12c** ROCA cross-site URL resolves from SPFx context site URL (works on localhost workbench + deployed tenants)
- [ ] **CHK-G12** Plant/Source filtered by Brand Material Extension for selected Brand
- [x] **CHK-G13** Roca Global Code column shown for Roca, Laufen, Armani brands (UI)
- [x] **CHK-G14** Roca Global Code column hidden for other brands
- [x] **CHK-G15** Item Details grid displays all required BRD columns; MultiSelect options from Lookup list by Lookup Type (`trim` + lowercase, compact / parenthetical-stripped title match); DataTable paginates at 7 rows when there are more than 7 items; lookup options prefetched on app init so available on first NPD Form open
- [x] **CHK-G15a** Item Details selection fields allow only one option (`selectionLimit={1}`); panel is searchable dropdown-style (no checkboxes, search kept, closes after pick); **other options stay enabled** so the user can change the selection
- [x] **CHK-G15b** Item Details Tab focus keeps horizontal scroll inside the table wrapper only (does not shift form page layout)
- [x] **CHK-G16** Actions column: Add plus icon on latest row only (adds empty line); Delete works on each row — Clear row pending
- [x] **CHK-G16a** Item Details: Delete icon hidden when only one row remains; shown on **all** rows once a second row exists (Actions column remounts on mode change); lone Add button is centered
- [x] **CHK-G16c** Item Details header Bulk Delete (red trash, same chrome as Add/Import) shows only when there are **more than 2** rows; hidden for 1 or 2 rows; clears all lines and leaves one empty row
- [x] **CHK-G16b** NPD Item Details text fields block special characters via shared `textInputSanitize` / `Config.TextInputRules`
- [x] **CHK-G16d** Min. Qty/Box Qty stays InputText (SP Single Line of Text) but accepts digits only (`textFilter: "digits"` / `sanitizeDigitsOnlyTextInput`)
- [x] **CHK-G16e** InputText / InputTextarea / search / MultiSelect filter / ComboBox strip leading spaces (`stripLeadingSpaces`) — first character cannot be a space
- [x] **CHK-G16f** After VH/MIS Rework, Initiator Save Draft sets Status=`Draft` (keeps Request ID); Resubmit only moves to Pending / next approver
- [x] **CHK-G16g** HSN Code accepts alphanumeric text up to 8 characters (`maxLength: 8`)
- [x] **CHK-G37e** MIS Profit Center shows required asterisk (`*`) next to the label
- [x] **CHK-G37f** After MIS Rework / Reject / Post, Other Details always show `NPD_Request` values (cleared Material Extension stays empty — not re-filled from Brand Material Extension)
- [x] **CHK-G17** + Add Another Item Line works with small inline plus icon next to label
- [x] **CHK-G18** Import items from Excel works — required FieldLabels validated on select/drop (`expectedHeaders`); Excel headers match Item Details fields with trim + lowercase + whitespace-insensitive mapping; all valid rows (up to 200) import into the grid
- [x] **CHK-G18a** Item Details Excel import: Weight / Min. Qty/Box Qty reject invalid numeric values (e.g. `ab09`) without extracting digits; text fields reject special characters; validation popup names the row and field
- [x] **CHK-G19** Save Draft saves header + items without submitting
- [x] **CHK-G20** Submit Request validates and routes to Vertical Head
- [x] **CHK-G20a** Initiator footer shows SUBMIT REQUEST for new/draft; RESUBMIT when request status is Rework
- [x] **CHK-G21** Draft Request ID remains blank until submitted
- [x] **CHK-G21a** Title left empty on new items in NPD_Request (Drafts do not store Brand in Title), NPD_ApproverComments, and NPD_MaterialGroupAuditLogs; existing Request ID generation logic preserved on submit
- [x] **CHK-G22** Request ID generated as `NPD-YYYY-###` on submit

### G.3 Initiator — Validation

- [x] **CHK-G23** Submit blocked when Brand, Material Type, or Plant/Source missing — validation Toast
- [x] **CHK-G24** Material Code max 18 characters enforced — validation Toast on Submit
- [x] **CHK-G25** Material Description max 40 characters enforced — validation Toast on Submit
- [x] **CHK-G26** All mandatory item fields validated on submit — validation Toast (no inline errors)
- [x] **CHK-G26c** Submit validates **every** Item Details grid row (blank added lines are not skipped); each required field on each line must be filled before Submit / Approve
- [x] **CHK-G26f** MIS Coordinator Post to SAP / Approve uses the same Item Details row validation (`validateNpdItemDetailsRows`) — every added line’s required fields must be filled
- [x] **CHK-G26g** MIS Coordinator Rework / Reject / Post to SAP all run `validateMisCoordinatorAction` first (Item Details every row + mandatory Profit Center) — empty newly added rows block all three actions
- [x] **CHK-G26d** Item Details Roca Global Code, Material Code, and Material Description are unique within the request — Save Draft / Submit blocked with “already exists”; Excel import shows duplicates in the validation popup and does not proceed
- [x] **CHK-G26e** Item Details S.No continues sequentially across pagination (Prime absolute `rowIndex` + 1; do not add `first`)
- [x] **CHK-G26h** Initiator Submit blocked when Material Code / Description already exists in Material Master (toast); MIS Post to SAP uses the same rule
- [x] **CHK-G26i** Processing loader shown while Material Master duplicate validation runs; after pass, Submit line-item progress bar (`n / total`) appears as usual (Pending page does not cover it with a second overlay)
- [x] **CHK-G26j** Draft / Rework shows Item Details already saved in `NPD_ItemDetails` and the remaining rows from the JSON backup. Opening the form does not insert them. Resubmit inserts only the missing rows and does not create duplicates
- [x] **CHK-G27** Roca Global Code validated when applicable — validation Toast on Submit
- [x] **CHK-G28** At least one item row required on submit — validation Toast on Submit

### G.4 Vertical Head

- [x] **CHK-G29** All Requests scoped to mapped brand(s) only
- [x] **CHK-G30** Pending Approval shows assigned requests with counter
- [x] **CHK-G31** Request detail is read-only (header + items)
- [x] **CHK-G32** Approve routes to MIS Coordinator and updates status
- [x] **CHK-G33** Rework routes to Initiator with comments
- [x] **CHK-G34** Reject permanently closes request
- [x] **CHK-G35** Approved Requests supports search, brand filter, Export (Excel)
- [x] **CHK-G35a** VH email Approve/Reject/Rework opens NPDApproverMail (`RequestID` + `Action`); updates `NPD_Request` + `NPD_ApproverComments`
- [x] **CHK-G35b** NPDApproverMail condition-based single-line messages with no icon/header: success → "Your response for this request has been submitted successfully."; already submitted → "Your response for this request has already been submitted."; pending in WorkFlowJSON → "No action is required from you for this request at the moment."; not in WorkFlowJSON → "You are not part of this request workflow."
- [x] **CHK-G35e** NPDApproverMail: user not in WorkFlowJSON always shows "You are not part of this request workflow." (checked before already-submitted / no-action messages)
- [x] **CHK-G35d** NPDApproverMail success toast uses success severity (green tick), not warn/approve styling
- [x] **CHK-G26a** Item Details MultiSelect selected values stay inside the field with ellipsis when overflowing
- [x] **CHK-G26b** Item Details MultiSelect overlay panel matches each input width/left edge on first paint (no large-then-shrink); long option labels ellipsize (tooltip shows full text); Item Details panel filter slightly wider with smaller search/close icons

### G.5 MIS Coordinator

- [x] **CHK-G36** Pending Approval shows VH-approved requests for any user in the MIS Coordinator role
- [x] **CHK-G37** Item Details editable (edit rows, add line items)
- [x] **CHK-G37c** MIS Post to SAP / Approve blocked until every Item Details row has required fields filled (same rule as Initiator Submit)
- [x] **CHK-G37d** MIS Profit Center is mandatory — empty value blocks Rework, Reject, and Post to SAP (error toast; also enforced in workflow thunk)
- [x] **CHK-G37a** Newly added Item Details rows by MIS Coordinator highlighted in yellow (`#fefce8`) with amber border (`#eab308`); persists across views for Initiator and Vertical Head; Initiator-added rows are never highlighted
- [x] **CHK-G37b** NPD Item Details keep original add order (SharePoint Id ascending); MIS-added rows stay at the end — not latest-first (MG lists keep latest-first)
- [x] **CHK-G38** Other Details section displays all SAP fields
- [x] **CHK-G38a** Other Details visible only in MIS Coordinator module (`?as=`) before Approved; dual-role VH+MIS must not see it in VH module; after Approved/Post to SAP visible in all modules (Initiator, VH, MIS)
- [x] **CHK-G39** Storage Location auto-populated from ROCA `PlantMaster`
- [x] **CHK-G40** MRP Group and MRP Controller auto-populated from ROCA `PlantMaster`
- [x] **CHK-G41** Material Extension auto-populated from Brand Material Extension (editable)
- [x] **CHK-G42** Finished Products → Plant Code = Plant/Source, Valuation Class = 6000
- [x] **CHK-G43** Traded + Domestic → Plant Code = CCWH, Valuation Class = 5000
- [x] **CHK-G44** Traded + Imported → Plant Code = CCWH, Valuation Class = 5100
- [x] **CHK-G45** Class Type always set to 001
- [x] **CHK-G46** Post to SAP succeeds → status Completed, Material Master updated
- [x] **CHK-G47** Post to SAP failure → error shown, status NOT changed to Completed
- [x] **CHK-G48** Rework routes to Initiator; Reject permanently closes
- [x] **CHK-G49** Approver Remarks inline (no popup) for VH / MIS; Audit Log from `NPD_ApproverComments`
- [x] **CHK-G49a** Audit Log ordered chronologically by Action On (Initiated → Rework → Resubmit); UI-only Pending rows from WorkflowJSON for waiting approvers (not stored in lists)
- [x] **CHK-G50** MIS Rework/Reject updates `NPD_Request` and writes Approver Comments; loader does not show Item-added message
- [x] **CHK-G51** Profit Center dropdown matches Lookup Type pattern (label + arrow only)
- [x] **CHK-G52** Initiator has no Remarks/Comments box on NPD form (submit uses system audit comments)
- [x] **CHK-G53** Last approver Approve / Post to SAP sends Approved email to Initiator when no next pending step remains
- [x] **CHK-G54** NPD All Requests Export shows page loader while download runs

---

## H — Material Group Module

### H.1 Initiator

- [x] **CHK-H01** All Requests table shows Request ID, Configured Masters, Entries, Initiator/Approver, Date, Status
- [x] **CHK-H02** New Request — Select Masters multi-select works (10 master types)
- [x] **CHK-H03** Select All / Clear All works for masters
- [x] **CHK-H04** Master Details — Code optional, Description mandatory per row
- [x] **CHK-H05** Add Row / Delete Row per master group works
- [x] **CHK-H06** Save as Draft works without submitting (data saved to `NPD_MaterialGroupRequests` with Draft status)
- [x] **CHK-H07** Submit to Consultant routes request correctly (Request ID generated on submit)
- [x] **CHK-H08** Pending and Completed views are read-only for Initiator
- [x] **CHK-H09** Draft / Rework editable and resubmittable
- [x] **CHK-H10** At least one master required validation on submit
- [x] **CHK-H11** Description mandatory validation per row
- [x] **CHK-H11a** Material Group Description must be unique within the request and against `NPD_Lookup` Title (LookupName) — same uniqueness family as Lookup Code; Submit / Complete blocked with “already exists”
- [x] **CHK-H11b** Material Group Code optional for Initiator but must be unique across the request (and vs `NPD_Lookup` LookupCode) on Submit — empty Code allowed; duplicate non-empty Codes blocked
- [x] **CHK-H11c** Consultant Complete / Rework / Reject require Code on all rows and block duplicate Code/Description (not Complete-only)
- [x] **CHK-H11d** MG Code + Description Lookup uniqueness uses **one** `fetchActiveLookups` call; Code-only duplicate shows Code message; both duplicates show one combined validation message
- [x] **CHK-H12** Success toasts after MG/NPD Submit (and Draft / Consultant actions) show via app-level flash so navigation does not unmount them
- [x] **CHK-H12** Consultant Outlook email Login links use SafeLinks-safe `npdRoute` on `SitePages/RocaNPD.aspx` (same pattern as VH/MIS) — hash `id`/`mode` no longer breaks SitePages
- [x] **CHK-H25** Select Masters cards show no hover/cursor effect in View or Consultant-read-only mode

### H.2 Consultant

- [x] **CHK-H12** All Requests shows dynamic total count
- [x] **CHK-H13** Pending Request — Edit action opens Review & Edit screen (no Access Denied for Consultant on `/mg/new`)
- [x] **CHK-H14** Completed Request — View only
- [x] **CHK-H15** Configured master badges displayed read-only (ellipsis with tooltip for multiple values)
- [x] **CHK-H16** Code mandatory for Consultant on Complete
- [x] **CHK-H17** Description editable and mandatory
- [x] **CHK-H18** Consultant Remarks field saves correctly
- [x] **CHK-H19** Complete → status Completed, Lookup Master updated with codes
- [x] **CHK-H20** Send Back for ReWork → routes to Initiator
- [x] **CHK-H21** Reject → permanently closed
- [x] **CHK-H22** Cancel discards unsaved changes
- [x] **CHK-H30** Last configured MG approver Complete sends completion email to Initiator
- [x] **CHK-H31** Initiator has no Remarks box on Material Group form (Consultant remarks only)

### H.3 Material Group — Validation

- [x] **CHK-H23** Rejected Material Group request cannot be resubmitted
- [x] **CHK-H24** Consultant cannot Complete without mandatory Code on all rows
- [x] **CHK-H32** MG form errors (e.g. duplicate Lookup Code on Complete) show a single toast — not duplicated via both unwrap `.catch` and `mgState.error` effect
- [x] **CHK-H32a** Consultant Complete validates + syncs Lookup Master **before** Status change; on validation/duplicate failure or Cancel, request stays Pending and no workflow completion runs
- [x] **CHK-H33** Material Group Audit Log ordered chronologically by Action On then Id (Initiated → Rework → Resubmit → …), same as NPD; Pending Consultant placeholder at bottom while Pending

### H.4 Material Group — Role-based Access & Navigation

- [x] **CHK-H26** DataTable shows Current Approver column for Initiator; Initiator column for Consultant/Admin
- [x] **CHK-H27** Default landing page is always All Requests for the module the user has access to (no Access Denied on initial load)
- [x] **CHK-H28** `NavRouteSync` redirects to correct default route after roles resolve; clears hardcoded `activeNavItemId`
- [x] **CHK-H29** Side nav does NOT show “New Material Group” item for Consultant-only users
- [x] **CHK-H30** GUID generated once per logical request; all list items for that request share the same GUID

---

## I — Workflow & Automation

- [x] **CHK-I01** NPD Draft → Submit → Pending → VH queue works end-to-end
- [x] **CHK-I02** VH Approve → MIS queue works
- [x] **CHK-I03** VH Rework → Initiator edit → resubmit → back in workflow
- [x] **CHK-I04** VH Reject → permanently closed, no resubmit
- [x] **CHK-I05** MIS Rework → Initiator edit → resubmit works
- [x] **CHK-I06** MIS Reject → permanently closed
- [x] **CHK-I07** MIS Post to SAP → Completed works
- [x] **CHK-I08** MG Draft → Submit → Consultant queue works
- [x] **CHK-I09** Consultant Complete → Completed works
- [x] **CHK-I10** Consultant Rework → Initiator resubmit works
- [x] **CHK-I11** Consultant Reject → permanently closed
- [x] **CHK-I12** Request ID generated correctly on first submit (not on draft)
- [x] **CHK-I13** Current approver field updated at each workflow stage
- [x] **CHK-I14** Rework comments visible to Initiator on reworked requests
- [x] **CHK-I15** Rejection comments recorded and visible
- [ ] **CHK-I16** Power Automate flows fire on correct triggers (if used) — N/A while in-app routing is used
- [x] **CHK-I17** Workflow Configuration Master drives stage sequence
- [x] **CHK-I18** ROCA `ApproversMaster` drives user routing
- [x] **CHK-I19** Status transitions are valid (no invalid state jumps)
- [ ] **CHK-I20** Concurrent approval attempts handled safely

---

## J — SAP Integration

- [ ] **CHK-J01** SAP interface/API connectivity verified in dev environment
- [x] **CHK-J02** SAP payload includes General Information Material Type, Plant, and Brand (MG1)
- [x] **CHK-J03** SAP payload includes Item Details fields from the technical document (code, description, groups, weight, HSN, class, UOM, tax)
- [x] **CHK-J04** SAP payload includes Other Details Storage Location, Class Type, Material Extension, Profit Center, MRP Group, MRP Controller, and Valuation Class
- [ ] **CHK-J05** Plant Code validated before post
- [ ] **CHK-J06** Storage Location validated before post
- [ ] **CHK-J07** Valuation Class validated before post
- [ ] **CHK-J08** Material Extension validated before post
- [ ] **CHK-J09** SAP success response stored on request record
- [x] **CHK-J10** SAP failure message is shown to the MIS Coordinator and that line is not written to Material Master
- [x] **CHK-J11** Status not updated to Approved / Completed when any SAP call fails
- [ ] **CHK-J12** SAP posting tested end-to-end in UAT
- [ ] **CHK-J13** SAP connectivity verified in production
- [ ] **CHK-J14** SAP posting audit trail available (who posted, when, response)
- [x] **CHK-J15** Retry sends only Item Details with `SAP=false`; `SAP=true` lines are not posted again
- [x] **CHK-J16** Development SAP API URL is in `Config.SapMaterialMasterApi`; Production URL is blank until the client provides it
- [x] **CHK-J17** Each Item Details line is a separate API call; body is a one-element TY_DATA array
- [x] **CHK-J18** `NPD_ItemDetails.SAP` is set true only after `status=True`; duplicates and other `status=False` responses leave it false
- [x] **CHK-J19** Post to SAP network drop stops the batch, clears the loader, and stays on the form. Restoring the network does not post the remaining lines. The next Post to SAP processes only `SAP=false` rows and does not post `SAP=true` rows again

---

## K — Material Master Integration

- [x] **CHK-K01** Final MIS Post to SAP inserts Item Details into `NPD_MaterialMaster` as ItemType=New with NPDRequest lookup
- [x] **CHK-K02** Required Material Master fields mapped from NPD Item Details + Brand / Material Type
- [x] **CHK-K02a** Material Master *Code columns store `NPD_Lookup.LookupCode` for every lookup-based value (display value stays in the name column)
- [x] **CHK-K03** Duplicate Material Code / Description blocked on Initiator Submit and MIS Post to SAP (no silent overwrite)
- [x] **CHK-K04** Material Master creation failure logged and does not break NPD status
- [x] **CHK-K05** Admin Material Master list shows auto-populated records (New tab / ItemType=New)
- [x] **CHK-K06** Auto-populated record data matches submitted NPD item data
- [x] **CHK-K07** Material Master searchable by newly populated records
- [ ] **CHK-K08** Manual Add Record still works alongside auto-population *(not in Phase A)*
- [ ] **CHK-K09** Import does not conflict with auto-populated records *(not in Phase A)*
- [ ] **CHK-K10** Material Master integration tested in UAT with real NPD completion

---

## L — Reports

- [ ] **CHK-L01** Reports navigation accessible to all five roles
- [ ] **CHK-L02** Initiator reports show own data only
- [ ] **CHK-L03** Vertical Head reports scoped to mapped brand(s)
- [ ] **CHK-L04** MIS Coordinator reports scoped to assigned/posted requests
- [ ] **CHK-L05** Consultant reports scoped to Material Group data
- [ ] **CHK-L06** Admin reports show all data
- [ ] **CHK-L07** Request counts by status are accurate
- [ ] **CHK-L08** Report filters and search work correctly
- [ ] **CHK-L09** Report Export produces valid file
- [ ] **CHK-L10** Report data matches underlying SharePoint list data

---

## M — Email Notifications (Blocked — BLK-001)

- [ ] **CHK-M01** Email content received and approved by ROCA
- [x] **CHK-M02** Notification sent on NPD Submit
- [x] **CHK-M03** Notification sent on Approve / Rework / Reject (VH and MIS)
- [x] **CHK-M04** Notification sent on Post to SAP / Completed
- [x] **CHK-M05** Notification sent on Material Group Submit / Complete / Rework
- [x] **CHK-M06** Email includes Request ID and key request details
- [x] **CHK-M07** Email recipients match ROCA `ApproversMaster` routing
- [ ] **CHK-M08** Notifications tested in UAT before production enablement

---

## N — Testing

### N.1 Functional Testing

- [ ] **CHK-N01** Login and role identification tested for all five roles
- [ ] **CHK-N02** Navigation tested per role
- [ ] **CHK-N03** Create, Edit, View, Delete tested where applicable
- [ ] **CHK-N04** Search and filter tested on all list views
- [ ] **CHK-N05** Export tested on all export-enabled screens
- [ ] **CHK-N06** Save Draft tested for NPD and Material Group
- [ ] **CHK-N07** Submit tested for NPD and Material Group
- [ ] **CHK-N08** Approve, Rework, Reject tested at VH and MIS stages
- [ ] **CHK-N09** Complete, Rework, Reject tested at Consultant stage
- [ ] **CHK-N10** Post to SAP tested with success and failure scenarios

### N.2 Negative Testing

- [ ] **CHK-N11** Submit without mandatory Brand blocked
- [ ] **CHK-N12** Submit without Material Type blocked
- [ ] **CHK-N13** Submit without Plant/Source blocked
- [ ] **CHK-N14** Submit without mandatory item fields blocked
- [ ] **CHK-N15** Material Code > 18 chars blocked
- [ ] **CHK-N16** Material Description > 40 chars blocked
- [ ] **CHK-N17** Initiator approval action blocked
- [ ] **CHK-N18** Initiator edit of Pending request blocked
- [ ] **CHK-N19** Rejected request resubmission blocked
- [ ] **CHK-N20** Unauthorized URL access blocked
- [ ] **CHK-N21** Consultant Complete without Code blocked
- [ ] **CHK-N22** Material Group submit without master selection blocked

### N.3 Regression Testing

- [ ] **CHK-N23** Existing master data unaffected by new deployments
- [ ] **CHK-N24** Existing in-flight requests unaffected by code updates
- [ ] **CHK-N25** Role permissions unchanged after updates
- [ ] **CHK-N26** All workflow paths re-tested after each release candidate

---

## O — UAT

- [ ] **CHK-O01** UAT environment prepared with seed data
- [ ] **CHK-O02** UAT test accounts created for all five roles
- [ ] **CHK-O03** UAT — Admin master data scenarios passed
- [ ] **CHK-O04** UAT — Initiator NPD happy path passed
- [ ] **CHK-O05** UAT — Initiator NPD rework path passed
- [ ] **CHK-O06** UAT — Vertical Head approve/rework/reject passed
- [ ] **CHK-O07** UAT — MIS SAP posting passed
- [ ] **CHK-O08** UAT — Material Master update after NPD completion passed
- [ ] **CHK-O09** UAT — Initiator Material Group happy path passed
- [ ] **CHK-O10** UAT — Consultant complete/rework/reject passed
- [ ] **CHK-O11** UAT — Reports and export passed
- [ ] **CHK-O12** UAT defects logged in defect tracker (BUG-xxx)
- [ ] **CHK-O13** All critical UAT defects resolved
- [ ] **CHK-O14** All high UAT defects resolved or accepted
- [ ] **CHK-O15** Business stakeholder UAT sign-off obtained
- [ ] **CHK-O16** UAT sign-off date and approver recorded
- [ ] **CHK-O17** UAT test evidence archived
- [ ] **CHK-O18** Known limitations documented and accepted

---

## P — Deployment

### P.1 Pre-Deployment

- [ ] **CHK-P01** All TaskList development tasks complete (or explicitly deferred)
- [ ] **CHK-P02** All Checklist items verified (or explicitly accepted)
- [ ] **CHK-P03** UAT sign-off obtained
- [ ] **CHK-P04** Production SharePoint lists provisioned
- [ ] **CHK-P05** Production master data loaded and verified
- [ ] **CHK-P06** Production permissions assigned and verified
- [ ] **CHK-P07** SAP production connectivity verified
- [ ] **CHK-P08** Power Automate flows reviewed and ready

### P.2 Deployment

- [ ] **CHK-P09** SPFx package deployed to production App Catalog
- [ ] **CHK-P10** Web part added to production SharePoint page
- [ ] **CHK-P11** Power Automate flows enabled in production
- [ ] **CHK-P12** Email notifications enabled (when BLK-001 resolved)

### P.3 Post-Deployment Smoke Tests

- [ ] **CHK-P13** Login smoke test — all roles can access app
- [ ] **CHK-P14** Role-based navigation smoke test
- [ ] **CHK-P15** NPD create and submit smoke test
- [ ] **CHK-P16** NPD approval workflow smoke test
- [ ] **CHK-P17** SAP posting smoke test
- [ ] **CHK-P18** Material Master auto-population smoke test
- [ ] **CHK-P19** Material Group create and complete smoke test
- [ ] **CHK-P20** Reports smoke test
- [ ] **CHK-P21** Production sign-off obtained
- [ ] **CHK-P22** Support handover completed

---

## Phase Sign-Off Gates

Use this table to sign off each phase only when all related checklist items are verified.

| Phase | Gate — All Related CHK Items Must Pass | Signed Off | Date |
|---|---|---|---|
| Phase 1 — Foundation | CHK-B01–B31, CHK-E01–E08 | [ ] | |
| Phase 2 — SharePoint Data | CHK-C01–C26 | [ ] | |
| Phase 3 — Security | CHK-D01–D25 | [ ] | |
| Phase 4 — Admin | CHK-F01–F36 | [ ] | |
| Phase 5 — NPD Initiator | CHK-G01–G28, CHK-E09–E16 | [ ] | |
| Phase 6 — Vertical Head | CHK-G29–G35 | [ ] | |
| Phase 7 — MIS Coordinator | CHK-G36–G51, CHK-J01–J18 | [ ] | |
| Phase 8 — MG Initiator | CHK-H01–H11 | [ ] | |
| Phase 9 — MG Consultant | CHK-H12–H24 | [ ] | |
| Phase 10 — Workflow | CHK-I01–I20 | [ ] | |
| Phase 11 — SAP | CHK-J01–J18 | [ ] | |
| Phase 12 — Material Master | CHK-K01–K10, CHK-K02a | [ ] | |
| Phase 13 — Reports | CHK-L01–L10 | [ ] | |
| Phase 14 — Email | CHK-M01–M08 | [ ] | |
| Phase 15 — Testing | CHK-N01–N26 | [ ] | |
| Phase 16 — UAT | CHK-O01–O18 | [ ] | |
| Phase 17 — Deployment | CHK-P01–P22 | [ ] | |

---

## Defect Log (Quick Reference)

| Defect ID | Checklist Item | Description | Severity | Status |
|---|---|---|---|---|
| | | | | |

---

## Change Log

| Date | Change | Items Affected |
|---|---|---|
| 10 Sep 2026 | Initial Checklist created | All |
| 10 Sep 2026 | Marked foundation items verified (SP init, theme, docs) | CHK-A01–A05, CHK-B07–B11, CHK-E01–E03 |
| 15 Sep 2026 | Overlay/nav UI consistency: filter padding, Poppins overlays, option selected teal, white selected nav | CHK-B39c2, CHK-B39f–h, CHK-E08, CHK-E17b |
| 16 Sep 2026 | Removed Plant Master, Role, Approver Config from nav — consume ROCA site lists | CHK-C04–C06, CHK-C16–C17, CHK-E09a, CHK-F10/F16/F19 |
| 16 Sep 2026 | Master UX: reset/export/import/toolbar/dialog buttons; workflow step edit + RoleMaster filter | CHK-B39i–l, CHK-F04g, CHK-F09b, CHK-F28a/e |
| 18 Sep 2026 | Workflow Status dialog on request list Actions; current Pending step highlighted from WorkFlowJSON | CHK-G08a |
| 18 Sep 2026 | Workflow Status highlights logged-in user/role; Pending default; BroadcastChannel Editing Restricted popup | CHK-G08a, CHK-G08b |
| 18 Sep 2026 | Centered DataTable empty states; Pending status shows current role (Pending with VH / MIS Coordinator); Current Approver column; Item Details cell memoization | CHK-E18, CHK-G01, CHK-G06a |
| 21 Sep 2026 | Compact Cannot Delete dialog; Lookup validation Code→Name; ApproversMaster IsDelete filter; Workflow full-chain save validation; success toast “… successfully.”; Brand + Item Details options prefetch on app init | CHK-E19/E20/E27, CHK-F06a/F09a/c/F19a/F28g, CHK-G09/G15/G15a |
| 21 Sep 2026 | Tighter Cannot Delete spacing; BME Export; Export disabled when empty; OrderBy Modified; data-driven Status filters | CHK-E27–E30, CHK-F26d |
| 21 Sep 2026 | RoleMaster IsDelete filter; MultiValueCell (8 values + ellipsis + title) for multi-value columns | CHK-F28a, CHK-F26e, CHK-E31 |
| 22 Sep 2026 | MIS Other Details UI + auto-populate + persist on action; scrollable form with fixed footer; Brand visible when options empty for MIS | CHK-D17, CHK-G37–G45, CHK-G48 |
| 22 Sep 2026 | Inline Approver Remarks + Audit Log; Rework/Reject persist request + comments; Profit Center dropdown clean; no Item-added on workflow | CHK-G49–G51 |
| 23 Sep 2026 | VH email actions open NPDApproverMail web part with RequestID/Action; confirm + persist Status/comments | CHK-G35a |
| 24 Sep 2026 | NPD Item Details: highlight only MIS Coordinator-added rows; persist for Initiator & VH views | CHK-G37a |
| 24 Sep 2026 | NPDApproverMail: condition-based single-line messages with no icon/title | CHK-G35b |
| 24 Sep 2026 | Empty Title for spAddItem on NPD_Request (Drafts), NPD_ApproverComments, NPD_MaterialGroupAuditLogs | CHK-G21a |
| 24 Sep 2026 | Keep SharePoint suite bar; Action Via column; Action On DD/MM/YYYY hh:mm A; email To only; header #774dec | CHK-G35c |
| 25 Sep 2026 | Export loader; dialog closes before save; case-insensitive Lookup duplicates; no Initiator Remarks; last-approver completion email to Initiator (NPD + MG) | CHK-F04k–m, CHK-F09f–i, CHK-G52–G54, CHK-H30–H31 |
| 25 Sep 2026 | Role-grouped side navigation with `?as=` scoped lists (Initiator brand-scoped vs Admin all-data; separate VH/MIS/Consultant sections) | CHK-B23a, CHK-D07–D08, CHK-D23/D23a, CHK-E09b |
| 26 Sep 2026 | ApproversMaster System scoping: only New Product Development / New Material Group grant roles; blank and other systems (e.g. Transit Breakage) ignored for nav | CHK-D04, CHK-B23, R-SEC03a |
| 26 Sep 2026 | MG Consultant Complete / Save / Submit: single error toast (removed duplicate unwrap `.catch` + slice error effect) | CHK-H32, CHK-E20 |
| 26 Sep 2026 | MG Consultant Complete: validate + sync Lookup Master before Status change so failed validation keeps request Pending | CHK-H19, CHK-H32a |
| 26 Sep 2026 | NPD Audit Log: chronological order; UI-only Pending from WorkflowJSON for VH/MIS until ApproverComments replace them | CHK-G49a |
| 26 Sep 2026 | Resubmit label on Rework; MultiSelect ellipsis; ApproverMail success toast uses success severity | CHK-G20a, CHK-G26a, CHK-G35d |
| 26 Sep 2026 | Audit Log Pending placeholders also on Rework (empty MIS still Pending); hide All Statuses on NPD Pending/Approved | CHK-G49a, CHK-G30a |
| 27 Sep 2026 | Admin All Requests (NPD + MG) exclude Draft; Admin card label In Rework only | CHK-D23b, T-0480a |
| 27 Sep 2026 | NPDApproverMail: not-in-WorkFlowJSON message takes priority over already-submitted | CHK-G35e |
| 27 Sep 2026 | VH Approved Requests includes Pending-with-MIS after VH Approve; status unchanged until Post to SAP | CHK-G04a, T-0603a |
| 27 Sep 2026 | Preserve `?as=` after toast-state clear; NavRouteSync does not invent Initiator when `?as=` missing | CHK-B23b |
| 27 Sep 2026 | Other Details gated by MIS module `?as=` until Approved; NPD Item Details chronological Id order | CHK-G38a, CHK-G37b |
| 27 Sep 2026 | Item Details MultiSelect overlay aligned to each input; option labels ellipsize | CHK-G26b |
| 28 Sep 2026 | Material Group Audit Log chronological order (same as NPD: Initiated → Rework → Resubmit) | CHK-H33 |
| 28 Sep 2026 | Side-nav list flicker fixed — `useListPageFetch` gates loader until mount fetch settles (admin / NPD / MG lists) | CHK-B23c |
| 28 Sep 2026 | Import Excel headers must match module FieldLabels; shared early reject on browse/drop via `ImportDialog.expectedHeaders` | CHK-B31b, CHK-F04n, CHK-F09j, CHK-G18 |
| 28 Sep 2026 | Short Import missing-columns Toast; template download strips Excel data validations | CHK-B31c |
| 28 Sep 2026 | Lookup/Lookup Type block special characters; DataTable paginator only when rows exceed page size | CHK-F09k, CHK-B39m |
| 28 Sep 2026 | List search ignores spaces + case (`aariaravind` matches `Aari Aravind`) | CHK-B39n |
| 28 Sep 2026 | Multi-tab duplicate guards: Workflow / BME / Lookup Type / Lookup re-fetch SharePoint before create/update/import | CHK-F04o, CHK-F26c1, CHK-F28c1 |
| 28 Sep 2026 | Submit / Approve validates every Item Details row — blank added lines no longer skipped | CHK-G26c |
| 28 Sep 2026 | Item Details single-select MultiSelect: no checkboxes, search kept, dropdown-like close-on-pick | CHK-G15a |
| 28 Sep 2026 | Initiator lists: own `Initiator` person and configured brands only; VH brand-only; MIS/Admin all (NPD + MG) | CHK-D07, CHK-D07a, CHK-D12 |
| 29 Sep 2026 | Item Details unique Code/Description; Drafts Initiator-only; S.No sequential across pages | CHK-G26d, CHK-G26e, CHK-D23c |
| 29 Sep 2026 | Item Details header bulk Delete (red) clears all lines when rows exist | CHK-G16c |
| 29 Sep 2026 | MIS Item Details validation on Post/Approve; Status column not sortable; Current Approver in list search; centered empty dashes | CHK-G26f, CHK-G37c, CHK-B39o, CHK-B39p, CHK-G06b |
| 29 Sep 2026 | MIS Rework/Reject/Post require Item Details + Profit Center; MG Description unique vs NPD_Lookup Title | CHK-G26g, CHK-G37d, CHK-H11a |
| 01 Oct 2026 | Min. Qty/Box Qty digits-only InputText (SP Single Line of Text unchanged) | CHK-G16d |
| 01 Oct 2026 | No leading spaces on text inputs; Rework→Draft save→Resubmit; Profit Center required * | CHK-G16e, CHK-G16f, CHK-G37e |
| 01 Oct 2026 | Other Details after MIS action respect NPD_Request (no Brand Extension overwrite of cleared fields) | CHK-G37f |
| 01 Oct 2026 | Consultant MG Outlook email links SafeLinks-safe via npdRoute (fix SitePages id error) | CHK-H12 |
| 01 Oct 2026 | MG Initiator Submit: Code/Description uniqueness across request (empty Code OK) | CHK-H11b |
| 01 Oct 2026 | Consultant MG actions require Code + block duplicates (not Complete-only) | CHK-H11c |
| 01 Oct 2026 | Success toasts survive navigate via ui.flashMessage (MainComponent Toast) | CHK-H12 |
| 01 Oct 2026 | Login syncs ApproversMaster into Pending/Rework NPD WorkFlowJSON (VH by brand; MIS and Consultant without brand) | CHK-D26 |
| 01 Oct 2026 | New NPD / New MG always resets form when opened after View (no Cancel required) | CHK-D27 |
| 01 Oct 2026 | Material Master Phase A requirements reviewed; checklist scoped to read-only list (no code yet) | CHK-F29a |
| 01 Oct 2026 | Material Master Phase A live: Existing/New tabs, paged catalog fetch, filters, export | CHK-F29–F29e, CHK-F32, CHK-F34, CHK-F35, CHK-F36a |
| 02 Oct 2026 | Material Master duplicate check on Submit / Post to SAP; New rows inserted on final Post to SAP | CHK-G26h, CHK-K01–K03 |
| 02 Oct 2026 | Processing loader during MM validation; Submit item progress bar restored (Pending overlay fix) | CHK-G26i |
| 03 Oct 2026 | Post to SAP sends each Item Details line to createZMatMast; Material Master and approval wait for SAP success; retries skip SAP=true | CHK-J02–J04, CHK-J10, CHK-J11, CHK-J15–J18 |
| 05 Oct 2026 | Material Master New rows store LookupCode in *Code columns for all lookup-based fields | CHK-K02a |
| 05 Oct 2026 | Audit Log Pending for MIS after VH action: match completed comments by Role only (same person can be VH then MIS) | CHK-G49a |
| 06 Oct 2026 | Sync Checklist to implemented work: foundation B/C/D/E, Post to SAP G46/G47, workflow I01–I19, MM K04–K07, emails M04/M05/M07, HSN G16g, H11c, F36 New tab; SAP A08; Phase A note uses NPD_MaterialMaster | CHK-B12–B14, B17–B18, B30, B40, B44–B47, C01–C11, C18, C20, D16–D21, E17, E22–E23, E26, F36, G16g, G30, G46–G47, H11c, I01–I15, I17–I19, K04–K07, M04–M05, M07 |
| 07 Oct 2026 | Excel import rejects invalid numeric/special-char cells (no silent extract); Library template download preserves formatting | CHK-B31d, CHK-B31e, CHK-F09l, CHK-G18a |
| 07 Oct 2026 | Item Details Bulk Delete only when &gt;2 rows; MG Code+Description one Lookup fetch + combined message; Import validation S.NO + Error only | CHK-G16c, CHK-H11d, CHK-B31f |
| 09 Oct 2026 | Draft / Rework shows unsaved JSON backup rows without inserting them; Resubmit inserts only the missing rows. Post to SAP stops on network loss, stays on the form, and retries only SAP=false lines | CHK-G26j, CHK-J19 |

---

## Working Rules

1. **Task → Checklist:** When a TaskList item is marked complete, verify the related Checklist items before considering it done.
2. **Checklist → Task:** If a Checklist item fails, do not mark the related TaskList item complete until fixed.
3. **Phase gate:** Do not sign off a phase until all related CHK items pass.
4. **Update counts:** Update the Verification Summary table after each session.
5. **Blockers:** Mark blocked sections (BLK-001) as N/A until unblocked — do not check off prematurely.

---

*End of Checklist.*
