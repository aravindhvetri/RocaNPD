# ROCA NPD — Checklist

> **Purpose:** Verify that every important item is implemented correctly and works as expected before marking tasks complete.  
> **How to use:** Check off `- [ ]` → `- [x]` when verified. Use alongside `TaskList.md` — completing a task should trigger the related checklist items.  
> **References:** `TechnicalArchitecture.md`, `ProjectStandards.md`, `TaskList.md`, `NPD_TRD.md`, `ROCA_NPD_Project_Master.md`, Wireframe ([roca-npd.ai.studio](https://roca-npd.ai.studio/))

---

## Verification Summary

| Category | Total Items | Verified | Pending |
|---|---:|---:|---:|
| A — Project & Documentation | 16 | 6 | 10 |
| B — Technical Foundation | 49 | 38 | 11 |
| C — SharePoint Data | 24 | 5 | 19 |
| D — Security & Roles | 22 | 12 | 10 |
| E — UI / UX / Theme | 28 | 9 | 19 |
| F — Admin Module | 39 | 24 | 15 |
| G — NPD Module | 44 | 39 | 5 |
| H — Material Group Module | 24 | 0 | 24 |
| I — Workflow & Automation | 20 | 0 | 20 |
| J — SAP Integration | 16 | 0 | 16 |
| K — Material Master | 10 | 0 | 10 |
| L — Reports | 10 | 0 | 10 |
| M — Email Notifications | 8 | 3 | 5 |
| N — Testing | 24 | 0 | 24 |
| O — UAT | 18 | 0 | 18 |
| P — Deployment | 16 | 0 | 16 |
| **TOTAL** | **349** | **132** | **217** |

**Last Updated:** 18 September 2026

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
- [ ] **CHK-A08** SAP integration specification documented and approved
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
- [ ] **CHK-B12** Cross-site web queries work via `Web([sp.web, siteUrl])`
- [ ] **CHK-B13** Batch insert/update/delete operations work correctly

### B.3 Redux

- [ ] **CHK-B14** Redux store configured with all feature slices (app + ui slices done; lookup/npd/mg/admin pending)
- [x] **CHK-B15** Typed hooks (`useAppDispatch`, `useAppSelector`) available
- [x] **CHK-B16** `initializeApp` thunk runs on app mount
- [ ] **CHK-B17** Loading states display during async operations
- [ ] **CHK-B18** Error states captured in slices and shown to user
- [x] **CHK-B19** Toast notifications work for success, error, and warning (common styled Toast)

### B.4 Routing & App Shell

- [x] **CHK-B20** react-router-dom routes configured for all modules (HashRouter + placeholder pages)
- [x] **CHK-B21** Route guards block unauthorized role access (`ProtectedRoute` + `permissionService`)
- [x] **CHK-B22** App shell matches wireframe layout (header, left nav, content)
- [x] **CHK-B23** Navigation items show/hide correctly per role (`filterNavigationByRoles`, union of assigned roles)
- [x] **CHK-B24** Active Login Role indicator removed from side navigation per design requirement
- [x] **CHK-B25** Unauthorized URL redirects to access-denied page (`/unauthorized`)

### B.5 Common Components — Composites

- [ ] **CHK-B26** StatusBadge shows correct colors per status (Draft, Pending, Rework, Approved, Rejected, Completed)
- [ ] **CHK-B27** ConfirmActionDialog appears before Approve / Rework / Reject / Delete
- [ ] **CHK-B28** SearchFilterBar filters list data correctly
- [ ] **CHK-B29** EmptyState displays when no records found
- [ ] **CHK-B30** LoaderOverlay shows during data fetch and save operations
- [x] **CHK-B31** Export generates valid Excel file via `exportService.ts` (Lookup Type Master verified)
- [x] **CHK-B31a** Reusable Import/Export services and `ImportDialog` documented in ProjectStandards Section 5.8

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
- [x] **CHK-B39a** DataTable — no grid lines; subtle sort icons; pagination report text without box
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
- [ ] **CHK-B40** Toast wrapper connected to Redux notification queue
- [x] **CHK-B41** `common/controls/index.ts` barrel export — feature modules import from here only
- [ ] **CHK-B42** No feature module file imports directly from `primereact/*`
- [ ] **CHK-B43** No hardcoded color hex values outside `theme.scss`

### B.7 Redux Data Flow

- [ ] **CHK-B44** Components dispatch thunks — never call SPServices directly
- [ ] **CHK-B45** Thunks call domain services; services call SPServices
- [ ] **CHK-B46** Form drafts held in Redux until Save Draft / Submit (no per-keystroke SP writes)
- [ ] **CHK-B47** Lookup data cached in `lookupSlice` and reused across screens

---

## C — SharePoint Data Structure

### C.1 Lists Exist and Schema Correct

- [ ] **CHK-C01** Lookup Type Master list provisioned with correct fields
- [ ] **CHK-C02** Lookup Master list provisioned with correct fields
- [ ] **CHK-C03** Brand Material Extension Master list provisioned
- [x] **CHK-C04** No local Plant Master list — ROCA `PlantMaster` is the plant data source
- [x] **CHK-C05** No local Role Master list — ROCA `RoleMaster` is the role data source
- [x] **CHK-C06** No local Approver Configuration list — ROCA `ApproversMaster` is the approver data source
- [ ] **CHK-C07** Workflow Configuration Master list provisioned
- [ ] **CHK-C08** Material Master list provisioned
- [ ] **CHK-C09** NPD Request list provisioned
- [ ] **CHK-C10** NPD Item list provisioned with ParentRequest lookup
- [ ] **CHK-C11** Material Group Request list provisioned
- [ ] **CHK-C12** Material Group Request Item list provisioned

### C.2 Seed Data & Relationships

- [ ] **CHK-C13** Lookup Type Master seeded (Brand, Material Type, Plant/Source, MG2–MG5, etc.)
- [ ] **CHK-C14** Lookup Master seeded with initial values (brands, types, plants)
- [ ] **CHK-C15** Lookup Type → Lookup Master relationship works in queries
- [x] **CHK-C16** Brand Material Extension plants sourced from ROCA `PlantMaster` (no NPD-site Plant Master list)
- [x] **CHK-C17** Workflow Next Role from ROCA `RoleMaster`; routing from ROCA `ApproversMaster` (no local Role/Approver lists)
- [ ] **CHK-C18** NPD Request → NPD Item 1:N relationship works
- [ ] **CHK-C19** Material Group Request → Item 1:N relationship works
- [ ] **CHK-C20** Internal field names documented in `Config.ts`

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

- [ ] **CHK-D07** Initiator sees only own NPD requests
- [ ] **CHK-D08** Initiator sees only own Material Group requests
- [x] **CHK-D09** Initiator cannot Approve, Rework, or Reject (`hasPermission` / action matrix)
- [x] **CHK-D10** Initiator cannot edit Pending or Approved requests (View is read-only; Edit only for own Draft/Rework)
- [x] **CHK-D11** Initiator can edit and resubmit Draft / Rework requests

### D.2 Access Control — Vertical Head

- [ ] **CHK-D12** Vertical Head sees only brand-scoped NPD requests
- [x] **CHK-D13** Vertical Head can Approve, Rework, Reject on pending requests (Edit on current VH step; View is read-only)
- [x] **CHK-D14** Vertical Head cannot access Material Group, New NPD Request, Draft/ReWork, or Reports — side nav is All / Pending / Approved only
- [x] **CHK-D15** Vertical Head cannot perform MIS Coordinator actions

### D.3 Access Control — MIS Coordinator

- [ ] **CHK-D16** MIS Coordinator sees requests approved by VH and assigned to self
- [ ] **CHK-D17** MIS Coordinator can edit Item Details and Other Details
- [ ] **CHK-D18** MIS Coordinator can Post to SAP, Rework, Reject
- [x] **CHK-D19** MIS Coordinator cannot access Material Group module

### D.4 Access Control — Consultant

- [ ] **CHK-D20** Consultant sees assigned Material Group pending requests
- [ ] **CHK-D21** Consultant can Complete, Rework, Reject Material Group requests
- [x] **CHK-D22** Consultant cannot access NPD module

### D.5 Access Control — Admin

- [ ] **CHK-D23** Admin sees all NPD and Material Group requests
- [x] **CHK-D24** Admin has full Administration module access
- [x] **CHK-D25** Admin cannot perform workflow actions (approve/post) unless by design

---

## E — UI / UX / Theme

### E.1 Theme & Styling

- [x] **CHK-E01** `theme.scss` exists in `External/CommonServices/`
- [x] **CHK-E02** Theme imported globally in `RocaNpdWebPart.ts`
- [x] **CHK-E03** Application root uses `theme.module.scss` `appRoot` class for CSS variables
- [x] **CHK-E04** No hardcoded hex/rgb colors in component SCSS or TS (only in `theme.scss`) — verified for layout components
- [ ] **CHK-E05** All status badges use `--roca-color-status-*` variables
- [ ] **CHK-E06** Primary buttons use `--roca-color-btn-primary-*` (teal brand color)
- [ ] **CHK-E07** Dialog headers use `--roca-color-header-bg` (matches wireframe modal)
- [x] **CHK-E08** PrimeReact components styled consistently inside `.roca-npd-app` (overlays via `_roca-form-controls.scss` + `injectRocaPrimeOverrides.ts`)

### E.2 Wireframe Alignment

- [x] **CHK-E09** Left navigation matches NavSelectDesign.png (icon tones, hover, selected bar, pill actions)
- [x] **CHK-E09a** Administration nav excludes Plant Master, Role, and Approver Configuration (ROCA-sourced; no local modules)
- [x] **CHK-E06** Primary/accent colors match wireframe (#40919D accent, #162C34 sidebar, semantic nav icons)
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

- [ ] **CHK-E17** Loading spinner/skeleton shown during data operations
- [x] **CHK-E18** Empty state shown when lists have no records
- [ ] **CHK-E19** Success toast shown after Save, Submit, Approve, Complete, etc.
- [ ] **CHK-E20** Error toast shown on validation failure or SP errors
- [x] **CHK-E21** Cancel / Back returns to the source list (`from` query: All, Pending, Approved, Draft/Rework); New Request without `from` goes to All Requests — confirm dialog pending
- [ ] **CHK-E22** Read-only screens cannot be edited (form controls disabled)
- [ ] **CHK-E23** Editable screens show only permitted actions for current role
- [x] **CHK-E24** Horizontal scroll works on wide Item Details grid (shared surface scrollbar)
- [x] **CHK-E25** Total Item Lines counter updates correctly on NPD form
- [ ] **CHK-E26** Dynamic pending/completed counters update on list views

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

### F.2 Lookup Master

- [x] **CHK-F05** List displays lookups with Lookup Type, Lookup Code, then Lookup Name columns
- [x] **CHK-F06** Add Lookup popup: Lookup Type, Lookup Code, then Lookup Name field order
- [x] **CHK-F07** Edit lookup works
- [x] **CHK-F08** Soft delete lookup works when no dependency exists
- [x] **CHK-F09** Lookup correctly linked to Lookup Type Master (`NPD_Lookup.LookupType`)
- [x] **CHK-F09a** Import uses `NPD_Templates` where `TemplateType = "Lookup"`
- [x] **CHK-F09b** Import duplicates shown in Import popup validation table with record name + error pill
- [x] **CHK-F09c** Export downloads Excel for filtered grid data
- [x] **CHK-F09d** Lookup Type delete dependency check runs before delete confirm dialog
- [x] **CHK-F09e** Lookup delete blocked when referenced in Brand Material Extension (Toast)

### F.3 Plant / Role / Approver — ROCA site (no local admin screens)

- [x] **CHK-F10** Plant Master not in side nav or routes; plants loaded from ROCA `PlantMaster`
- [x] **CHK-F16** Role not in side nav or routes; NPD roles loaded from ROCA `RoleMaster`
- [x] **CHK-F19** Approver Configuration not in side nav or routes; approvers/brands loaded from ROCA `ApproversMaster`

### F.6 Brand Material Extension

- [x] **CHK-F24** Brand → Plant mapping displays correctly in grid
- [x] **CHK-F25** Brand options sourced from ROCA `Brandmaster`; Plant from ROCA `PlantMaster`
- [x] **CHK-F26** Add / Edit / Delete works with common popup and Toast validation
- [x] **CHK-F26a** Plant stored as comma-separated values; MultiSelect repopulates on edit
- [x] **CHK-F26b** ROCA site URL resolved via `resolveRocaMasterSiteUrl()` (not hardcoded in UI)
- [x] **CHK-F26c** Duplicate Brand blocked with warning Toast

### F.7 Workflow Configuration

- [x] **CHK-F27** Workflow stages display as grouped Approval Chain (e.g. Initiator → VH → MIS)
- [x] **CHK-F28** Configure Workflow modal saves correctly (NPD multi-step + MG Consultant step)
- [x] **CHK-F28a** NPD Next Role from ROCA RoleMaster (`System/Title eq "New Product Development"`); Initiator, Consultant, and used roles excluded
- [x] **CHK-F28b** Edit replaces existing steps; Delete soft-deletes all steps for request type
- [x] **CHK-F28c** Duplicate request type blocked; validation via Toast only
- [x] **CHK-F28d** Add Step hidden when no valid Next Role options remain for a new step
- [x] **CHK-F28e** All applicable steps have editable Next Role; changing Next Role cascades Current Role to following step
- [x] **CHK-F28f** Form dialog font size and button/icon sizing consistent with master popup standards

### F.8 Material Master

- [ ] **CHK-F29** Material Master list with search and filters works
- [ ] **CHK-F30** Download Template produces valid file
- [ ] **CHK-F31** Import bulk records works with validation
- [ ] **CHK-F32** Export catalog produces valid file
- [ ] **CHK-F33** Add Record manually works
- [ ] **CHK-F34** Creation Date From/To filters work
- [ ] **CHK-F35** Initiator filter works
- [ ] **CHK-F36** Auto-populated records from completed NPD appear correctly

---

## G — NPD Module

### G.1 Initiator — List Views

- [x] **CHK-G01** All Requests shows role-scoped requests with columns Request ID, Brand (MG1), Material Type, Plant, Products, Status, Current Approver, Created Date, Workflow, Actions
- [x] **CHK-G02** Summary cards show correct counts (Total, Pending, Rework, Approved)
- [x] **CHK-G03** Pending Approval shows own requests in pipeline (view-only for Initiator; Edit only if the user can act as the pending VH/MIS role)
- [x] **CHK-G04** Approved Requests shows fully approved requests in the user's scope (view-only)
- [x] **CHK-G05** Draft / ReWork shows editable own requests
- [x] **CHK-G06** Search by Request ID, Plant, Brand, Code, Material works ('Search here' on Pending/Draft; 'Search by Request ID, Plant, Brand, Code, or Material...' on All/Approved)
- [x] **CHK-G06a** DataTable layout consistently aligned across all NPD components (Request ID, Brand, Material Type, Plant, Products, Status, Current Approver, Created Date, Workflow, Actions) with unified column widths and alignment
- [x] **CHK-G07** Status and Brand filters work
- [x] **CHK-G08** Export downloads Excel (.xlsx) for currently displayed All / Approved request rows
- [x] **CHK-G08a** Dedicated Workflow column opens a read-only Workflow Status dialog from `WorkFlowJSON`; Draft rows hide the icon; only the current pending role is highlighted; empty approver status shows Pending
- [x] **CHK-G08b** Same request opened in two tabs: View/Edit/Save Draft/Submit/workflow action in one tab locks the other with Editing Restricted on the next navigation/interaction (BroadcastChannel); Go to Dashboard / Reload Page

### G.2 Initiator — New NPD Request Form

- [x] **CHK-G09** Brand (MG1) dropdown populated from ROCA `ApproversMaster` — System=`New Product Development`, Role=`Initiator`, Users matched by `EMail` (+ `UsersId` site-user map fallback)
- [x] **CHK-G10** Material Type dropdown populated from `Config.NpdMaterialTypes` (Finished Products, Traded Products)
- [x] **CHK-G11** Plant/Source disabled until Material Type selected (Finished or Traded Products)
- [x] **CHK-G12a** Plant/Source (Finished Products) from ROCA `PlantMaster` — `PlantType`=Factory, active plants, options=`PlantCode`
- [x] **CHK-G12b** Plant/Source (Traded Products) shows `Imported` and `Domestic` from `Config.NpdTradedPlantSources`
- [x] **CHK-G12c** ROCA cross-site URL resolves from SPFx context site URL (works on localhost workbench + deployed tenants)
- [ ] **CHK-G12** Plant/Source filtered by Brand Material Extension for selected Brand
- [x] **CHK-G13** Roca Global Code column shown for Roca, Laufen, Armani brands (UI)
- [x] **CHK-G14** Roca Global Code column hidden for other brands
- [x] **CHK-G15** Item Details grid displays all required BRD columns; MultiSelect options from Lookup list by Lookup Type (`trim` + lowercase, compact / parenthetical-stripped title match); DataTable paginates at 7 rows when there are more than 7 items
- [x] **CHK-G16** Actions column: Add plus icon on latest row only (adds empty line); Delete works on each row — Clear row pending
- [x] **CHK-G17** + Add Another Item Line works with small inline plus icon next to label
- [x] **CHK-G18** Import items from Excel works — Excel headers match Item Details fields with trim + lowercase + whitespace-insensitive mapping; all valid rows (up to 200) import into the grid
- [x] **CHK-G19** Save Draft saves header + items without submitting
- [x] **CHK-G20** Submit Request validates and routes to Vertical Head
- [x] **CHK-G21** Draft Request ID remains blank until submitted
- [x] **CHK-G22** Request ID generated as `NPD-YYYY-###` on submit

### G.3 Initiator — Validation

- [x] **CHK-G23** Submit blocked when Brand, Material Type, or Plant/Source missing — validation Toast
- [x] **CHK-G24** Material Code max 18 characters enforced — validation Toast on Submit
- [x] **CHK-G25** Material Description max 40 characters enforced — validation Toast on Submit
- [x] **CHK-G26** All mandatory item fields validated on submit — validation Toast (no inline errors)
- [x] **CHK-G27** Roca Global Code validated when applicable — validation Toast on Submit
- [x] **CHK-G28** At least one item row required on submit — validation Toast on Submit

### G.4 Vertical Head

- [x] **CHK-G29** All Requests scoped to mapped brand(s) only
- [ ] **CHK-G30** Pending Approval shows assigned requests with counter
- [x] **CHK-G31** Request detail is read-only (header + items)
- [x] **CHK-G32** Approve routes to MIS Coordinator and updates status
- [x] **CHK-G33** Rework routes to Initiator with comments
- [x] **CHK-G34** Reject permanently closes request
- [x] **CHK-G35** Approved Requests supports search, brand filter, Export (Excel)

### G.5 MIS Coordinator

- [x] **CHK-G36** Pending Approval shows VH-approved requests for any user in the MIS Coordinator role
- [ ] **CHK-G37** Item Details editable (edit rows, add line items)
- [ ] **CHK-G38** Other Details section displays all SAP fields
- [ ] **CHK-G39** Storage Location auto-populated from ROCA `PlantMaster`
- [ ] **CHK-G40** MRP Group and MRP Controller auto-populated from ROCA `PlantMaster`
- [ ] **CHK-G41** Material Extension auto-populated from Brand Material Extension (editable)
- [ ] **CHK-G42** Finished Products → Plant Code = Plant/Source, Valuation Class = 6000
- [ ] **CHK-G43** Traded + Domestic → Plant Code = CCWH, Valuation Class = 5000
- [ ] **CHK-G44** Traded + Imported → Plant Code = CCWH, Valuation Class = 5100
- [ ] **CHK-G45** Class Type always set to 001
- [ ] **CHK-G46** Post to SAP succeeds → status Completed, Material Master updated
- [ ] **CHK-G47** Post to SAP failure → error shown, status NOT changed to Completed
- [ ] **CHK-G48** Rework routes to Initiator; Reject permanently closes

---

## H — Material Group Module

### H.1 Initiator

- [ ] **CHK-H01** All Requests table shows Request ID, Configured Masters, Entries, Initiator, Date, Status
- [ ] **CHK-H02** New Request — Select Masters multi-select works (10 master types)
- [ ] **CHK-H03** Select All / Clear All works for masters
- [ ] **CHK-H04** Master Details — Code optional, Description mandatory per row
- [ ] **CHK-H05** Add Row / Delete Row per master group works
- [ ] **CHK-H06** Save as Draft works without submitting
- [ ] **CHK-H07** Submit to Consultant routes request correctly
- [ ] **CHK-H08** Pending and Completed views are read-only for Initiator
- [ ] **CHK-H09** Draft / Rework editable and resubmittable
- [ ] **CHK-H10** At least one master required validation on submit
- [ ] **CHK-H11** Description mandatory validation per row

### H.2 Consultant

- [ ] **CHK-H12** All Requests shows dynamic total count
- [ ] **CHK-H13** Pending Request — Edit action opens Review & Edit screen
- [ ] **CHK-H14** Completed Request — View only
- [ ] **CHK-H15** Configured master badges displayed read-only
- [ ] **CHK-H16** Code mandatory for Consultant on Complete
- [ ] **CHK-H17** Description editable and mandatory
- [ ] **CHK-H18** Consultant Remarks field saves correctly
- [ ] **CHK-H19** Complete → status Completed, Lookup Master updated with codes
- [ ] **CHK-H20** Send Back for ReWork → routes to Initiator
- [ ] **CHK-H21** Reject → permanently closed
- [ ] **CHK-H22** Cancel discards unsaved changes

### H.3 Material Group — Validation

- [ ] **CHK-H23** Rejected Material Group request cannot be resubmitted
- [ ] **CHK-H24** Consultant cannot Complete without mandatory Code on all rows

---

## I — Workflow & Automation

- [ ] **CHK-I01** NPD Draft → Submit → Pending → VH queue works end-to-end
- [ ] **CHK-I02** VH Approve → MIS queue works
- [ ] **CHK-I03** VH Rework → Initiator edit → resubmit → back in workflow
- [ ] **CHK-I04** VH Reject → permanently closed, no resubmit
- [ ] **CHK-I05** MIS Rework → Initiator edit → resubmit works
- [ ] **CHK-I06** MIS Reject → permanently closed
- [ ] **CHK-I07** MIS Post to SAP → Completed works
- [ ] **CHK-I08** MG Draft → Submit → Consultant queue works
- [ ] **CHK-I09** Consultant Complete → Completed works
- [ ] **CHK-I10** Consultant Rework → Initiator resubmit works
- [ ] **CHK-I11** Consultant Reject → permanently closed
- [ ] **CHK-I12** Request ID generated correctly on first submit (not on draft)
- [ ] **CHK-I13** Current approver field updated at each workflow stage
- [ ] **CHK-I14** Rework comments visible to Initiator on reworked requests
- [ ] **CHK-I15** Rejection comments recorded and visible
- [ ] **CHK-I16** Power Automate flows fire on correct triggers (if used)
- [ ] **CHK-I17** Workflow Configuration Master drives stage sequence
- [ ] **CHK-I18** ROCA `ApproversMaster` drives user routing
- [ ] **CHK-I19** Status transitions are valid (no invalid state jumps)
- [ ] **CHK-I20** Concurrent approval attempts handled safely

---

## J — SAP Integration

- [ ] **CHK-J01** SAP interface/API connectivity verified in dev environment
- [ ] **CHK-J02** SAP payload includes all required NPD header fields
- [ ] **CHK-J03** SAP payload includes all required NPD item fields
- [ ] **CHK-J04** SAP payload includes all Other Details fields
- [ ] **CHK-J05** Plant Code validated before post
- [ ] **CHK-J06** Storage Location validated before post
- [ ] **CHK-J07** Valuation Class validated before post
- [ ] **CHK-J08** Material Extension validated before post
- [ ] **CHK-J09** SAP success response stored on request record
- [ ] **CHK-J10** SAP failure response stored and displayed to MIS Coordinator
- [ ] **CHK-J11** Status not updated to Completed on SAP failure
- [ ] **CHK-J12** SAP posting tested end-to-end in UAT
- [ ] **CHK-J13** SAP connectivity verified in production
- [ ] **CHK-J14** SAP posting audit trail available (who posted, when, response)
- [ ] **CHK-J15** Retry behavior defined and tested for transient SAP failures
- [ ] **CHK-J16** SAP configuration documented for operations team

---

## K — Material Master Integration

- [ ] **CHK-K01** Completed NPD triggers Material Master record creation
- [ ] **CHK-K02** All required fields mapped from NPD Item to Material Master
- [ ] **CHK-K03** Duplicate material codes handled (no silent overwrite)
- [ ] **CHK-K04** Material Master creation failure logged and does not break NPD status
- [ ] **CHK-K05** Admin Material Master list shows auto-populated records
- [ ] **CHK-K06** Auto-populated record data matches submitted NPD item data
- [ ] **CHK-K07** Material Master searchable by newly populated records
- [ ] **CHK-K08** Manual Add Record still works alongside auto-population
- [ ] **CHK-K09** Import does not conflict with auto-populated records
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
- [ ] **CHK-M04** Notification sent on Post to SAP / Completed
- [ ] **CHK-M05** Notification sent on Material Group Submit / Complete / Rework
- [x] **CHK-M06** Email includes Request ID and key request details
- [ ] **CHK-M07** Email recipients match ROCA `ApproversMaster` routing
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
| Phase 7 — MIS Coordinator | CHK-G36–G48, CHK-J01–J16 | [ ] | |
| Phase 8 — MG Initiator | CHK-H01–H11 | [ ] | |
| Phase 9 — MG Consultant | CHK-H12–H24 | [ ] | |
| Phase 10 — Workflow | CHK-I01–I20 | [ ] | |
| Phase 11 — SAP | CHK-J01–J16 | [ ] | |
| Phase 12 — Material Master | CHK-K01–K10 | [ ] | |
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

---

## Working Rules

1. **Task → Checklist:** When a TaskList item is marked complete, verify the related Checklist items before considering it done.
2. **Checklist → Task:** If a Checklist item fails, do not mark the related TaskList item complete until fixed.
3. **Phase gate:** Do not sign off a phase until all related CHK items pass.
4. **Update counts:** Update the Verification Summary table after each session.
5. **Blockers:** Mark blocked sections (BLK-001) as N/A until unblocked — do not check off prematurely.

---

*End of Checklist.*
