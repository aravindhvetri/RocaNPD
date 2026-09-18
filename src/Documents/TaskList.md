# ROCA NPD — Task List

> **Purpose:** Track every implementation task required to complete the project.  
> **How to use:** Check off `- [ ]` → `- [x]` as each task is completed. Update the progress summary after each session.  
> **References:** `TechnicalArchitecture.md`, `ProjectStandards.md`, `NPD_TRD.md`, `ROCA_NPD_Project_Master.md`, Wireframe ([roca-npd.ai.studio](https://roca-npd.ai.studio/))

---

## Progress Summary

| Phase | Total Tasks | Completed | Status |
|---|---:|---:|---|
| Phase 0 — Project Preparation | 13 | 1 | In Progress |
| Phase 1 — Application Foundation | 71 | 47 | In Progress |
| Phase 2 — SharePoint Data Structure | 22 | 4 | In Progress |
| Phase 3 — Security & Role Management | 14 | 13 | In Progress |
| Phase 4 — Admin Module | 54 | 24 | In Progress |
| Phase 5 — NPD Initiator Module | 34 | 28 | In Progress |
| Phase 6 — NPD Vertical Head Module | 16 | 12 | In Progress |
| Phase 7 — NPD MIS Coordinator Module | 22 | 6 | In Progress |
| Phase 8 — Material Group Initiator Module | 20 | 0 | Not Started |
| Phase 9 — Material Group Consultant Module | 14 | 0 | Not Started |
| Phase 10 — Workflow Automation | 18 | 7 | In Progress |
| Phase 11 — SAP Integration | 12 | 0 | Not Started |
| Phase 12 — Material Master Integration | 8 | 0 | Not Started |
| Phase 13 — Analytics & Reports | 10 | 0 | Not Started |
| Phase 14 — Email Notifications | 8 | 2 | In Progress |
| Phase 15 — Testing | 16 | 0 | Not Started |
| Phase 16 — UAT | 12 | 0 | Not Started |
| Phase 17 — Deployment | 13 | 0 | Not Started |
| **TOTAL** | **376** | **137** | **In Progress** |

**Last Updated:** 18 September 2026

---

## Phase 0 — Project Preparation

- [ ] **T-0001** Read and confirm Functional Requirement Document (`ROCA_NPD_Project_Master.md`)
- [ ] **T-0002** Confirm project scope and all modules (NPD, Material Group, Admin, Reports)
- [ ] **T-0003** Confirm five user roles (Initiator, Vertical Head, MIS Coordinator, Consultant, Admin)
- [ ] **T-0004** Confirm NPD workflow (Initiator → VH → MIS → SAP → Completed)
- [ ] **T-0005** Confirm New Material Group workflow (Initiator → Consultant → Completed)
- [ ] **T-0006** Confirm rework and rejection rules (permanent close on reject)
- [ ] **T-0007** Confirm status values (Draft, Pending, Approved, Rework, Rejected, Completed)
- [ ] **T-0008** Confirm dependencies (SAP, master data, approver configuration)
- [ ] **T-0009** Identify and document open requirements (SAP spec, field names, email content)
- [ ] **T-0010** Finalize SharePoint site / list / library provisioning approach
- [ ] **T-0011** Confirm SAP integration approach with ROCA team
- [ ] **T-0012** Finalize development, UAT, and production environments
- [x] **T-0013** Create and publish `ProjectStandards.md` (component strategy, PrimeReact wrappers, Redux rules)

---

## Phase 1 — Application Foundation

### 1.1 Project Setup

- [x] **T-0101** Create SPFx project (Node 22, SPFx 1.23.2)
- [x] **T-0102** Configure TypeScript (~5.8)
- [x] **T-0103** Configure React 17
- [x] **T-0104** Install and configure PrimeReact, PrimeIcons, PrimeFlex
- [x] **T-0105** Install and configure PnPjs v4 (`@pnp/sp`)
- [x] **T-0106** Install Redux Toolkit and react-redux
- [x] **T-0107** Install react-router-dom, moment, xlsx libraries
- [ ] **T-0108** Configure environment-specific settings (dev / UAT / prod URLs in Config)
- [ ] **T-0109** Verify `npm start` and `npm run build` succeed without errors

### 1.2 SPFx & SharePoint Connectivity

- [x] **T-0110** Implement `RocaNpdWebPart.ts` with context prop passing
- [x] **T-0111** Implement `RocaNpd.tsx` as root component with `spfi().using(SPFx(context))`
- [x] **T-0112** Implement `setupSP()` in `SPServices.ts` (PnP v4 migration)
- [x] **T-0113** Pass `spfxContext` and `sp` props to child components
- [x] **T-0114** Add Redux `<Provider>` in `RocaNpd.tsx`
- [ ] **T-0115** Configure `store/index.ts` with all feature slices (app + ui + admin lookupType done; remaining feature slices pending)
- [x] **T-0116** Create typed hooks (`useAppDispatch`, `useAppSelector`)

### 1.3 Styling & Theme

- [x] **T-0120** Load PrimeReact theme, PrimeIcons, PrimeFlex in WebPart
- [x] **T-0121** Create common theme file `External/CommonServices/theme.scss`
- [x] **T-0122** Define all theme color CSS variables on `.roca-npd-app`
- [ ] **T-0123** Verify PrimeReact components inherit ROCA theme inside app wrapper
- [x] **T-0124** Document theme usage rules for all future components (see `ProjectStandards.md` Section 9)
- [x] **T-0125** Overlay/nav UI consistency — filter left padding, Poppins on overlays, `$roca-color-option-selected-bg`, white selected nav item (R-UI06 / R-UI09–R-UI11)

### 1.4 Routing & App Shell

- [x] **T-0130** Implement `AppRoutes.tsx` with module routes (placeholder screens; Plant/Role/Approver Config routes omitted — ROCA data)
- [x] **T-0131** Implement route guards by role (`ProtectedRoute` + `permissionService.canAccessRoute`)
- [x] **T-0132** Implement `AppShell.tsx` layout wrapper
- [x] **T-0133** Implement `Header.tsx` (static `headerSample` wireframe + ROCA logo)
- [x] **T-0134** Implement `SideNavigation.tsx` — Plant Master, Role, and Approver Configuration removed (ROCA-sourced; no local modules)
- [ ] **T-0135** Implement `PageHeader.tsx` (screen title, breadcrumbs, actions)
- [x] **T-0136** `RoleIndicator.tsx` implemented (removed from side navigation / AppShell per design requirement)
- [x] **T-0137** Wire navigation to react-router-dom routes (HashRouter)
- [x] **T-0138** Implement unauthorized / access-denied page

### 1.5 Common Components — Composites

- [ ] **T-0140** Implement `StatusBadge.tsx` (Draft, Pending, Rework, Approved, Rejected, Completed)
- [ ] **T-0141** Implement `ConfirmActionDialog.tsx` (Approve, Rework, Reject, Delete)
- [ ] **T-0142** Implement `SearchFilterBar.tsx` (search + filter dropdowns)
- [ ] **T-0143** Implement `EmptyState.tsx`
- [ ] **T-0144** Implement `LoaderOverlay.tsx` (full-page and inline)
- [ ] **T-0145** Implement `ExportButton.tsx` (CSV / Excel trigger) — `exportService.ts` + screen-level export done for Lookup Type

### 1.5.1 Common Controls — PrimeReact Wrappers (`common/controls/`)

Per **`ProjectStandards.md` Section 5** — one folder per control; feature modules must not import `primereact/*` directly.

- [x] **T-0149** Create `IBaseControlProps.ts` and `common/controls/` folder structure
- [x] **T-0157** Implement `InputText`, `InputNumber`, `InputTextarea` wrappers
- [x] **T-0158** Implement `Dropdown`, `MultiSelect`, `ComboBox` wrappers
- [x] **T-0159** Implement `DatePicker`, `Button`, `Dialog`, `ConfirmDialog` wrappers
- [x] **T-0165** Implement `DataTable` wrapper (pagination, sorting, loading, empty state)
- [x] **T-0166** Implement `Toast`, `FileUpload`, `Checkbox`, `Tag` wrappers
- [x] **T-0167** Create `common/controls/index.ts` barrel export
- [ ] **T-0168** Wire `Toast` to Redux `appSlice` notification queue (component styled + `showWarningToast` / `showSuccessToast` / `showErrorToast` helpers done)

### 1.6 Common Services & Config

- [ ] **T-0150** Populate `Config.ts` with list names, lookup type keys, status constants, roles (routes + nav + roles + `ListNames.LookupType` done)
- [ ] **T-0151** Populate `Interface.ts` with all domain TypeScript interfaces (`ILookupType` done)
- [x] **T-0152** Create `roleService.ts` (multi-role resolution from Admins group + ROCA `ApproversMaster`, brand mapping)
- [ ] **T-0153** Create `lookupService.ts` (lookup queries with cache helpers)
- [x] **T-0154** Create `exportService.ts`, `importService.ts`, `templateService.ts` (reusable Import/Export)
- [ ] **T-0155** Implement global error handling pattern (toast + slice error state)
- [ ] **T-0156** Implement global loading state pattern

### 1.7 Redux Foundation

- [x] **T-0160** Create `appSlice.ts` (user, assignedRoles, per-role brands, roleStatus) — toast/loader pending
- [ ] **T-0161** Create `lookupSlice.ts` (lookup cache by type)
- [x] **T-0162** Create `uiSlice.ts` (sidebar, dialogs, nav state) — nav state done; confirm dialog pending
- [x] **T-0163** Create `appThunks.ts` — `initializeApp` on mount
- [x] **T-0164** Dispatch `initializeApp` from `MainComponent` on load

---

## Phase 2 — SharePoint Data Structure

### 2.1 List Provisioning

- [ ] **T-0201** Create / confirm Lookup Type Master list and fields
- [ ] **T-0202** Create / confirm Lookup Master list and fields
- [ ] **T-0203** Create / confirm Brand Material Extension Master list and fields
- [x] **T-0204** No local Plant Master list — consume ROCA `PlantMaster` (`Config.RocaMasterListNames`)
- [x] **T-0205** No local Role Master list — consume ROCA `RoleMaster`
- [x] **T-0206** No local Approver Configuration list — consume ROCA `ApproversMaster`
- [ ] **T-0207** Create / confirm Workflow Configuration Master list and fields
- [ ] **T-0208** Create / confirm Material Master list and fields
- [ ] **T-0209** Create / confirm NPD Request (header) list and fields
- [ ] **T-0210** Create / confirm NPD Item (child) list and fields
- [ ] **T-0211** Create / confirm Material Group Request (header) list and fields
- [ ] **T-0212** Create / confirm Material Group Request Item (child) list and fields

### 2.2 Seed Data & Relationships

- [ ] **T-0215** Seed Lookup Type Master (Brand, Material Type, Plant/Source, MG2–MG5, etc.)
- [ ] **T-0216** Seed initial Lookup Master values (brands, material types, plant codes)
- [ ] **T-0217** Configure Lookup Type → Lookup Master relationship
- [x] **T-0218** Brand Material Extension plants sourced from ROCA `PlantMaster` (no NPD-site Plant Master relationship)
- [ ] **T-0219** Role/approver routing from ROCA `RoleMaster` + `ApproversMaster` (no local Role → Approver lists)
- [ ] **T-0220** Configure NPD Request → NPD Item (1:N) relationship
- [ ] **T-0221** Configure Material Group Request → Item (1:N) relationship
- [ ] **T-0222** Set SharePoint list permissions per role group
- [ ] **T-0223** Document final internal field names in `Config.ts`
- [ ] **T-0224** Validate list schemas against `NPD_TRD.md` and wireframe

---

## Phase 3 — Security & Role Management

- [x] **T-0301** Implement logged-in user identification (`currentUser` / SPFx page context)
- [ ] **T-0302** Implement Employee ID retrieval (profile / list) — role match uses ApproversMaster `Users` Person field, not Employee ID
- [x] **T-0303** Implement Admin group membership check (`SharePointGroups.Admins`)
- [x] **T-0304** Implement role resolution from ROCA `ApproversMaster` (expand `Role/Title`, match `Users`)
- [x] **T-0305** Implement brand mapping for Initiator and Vertical Head (and other mapped roles)
- [x] **T-0306** Store assigned roles + brands in Redux `appSlice` (multi-role union, no override)
- [x] **T-0307** Implement role-based navigation filtering (`filterNavigationByRoles`)
- [x] **T-0308** Implement role-based route guards (`ProtectedRoute`)
- [x] **T-0309** Implement role-based action helpers (`hasPermission`, `canActOnNpdBrand`)
- [x] **T-0310** Block unauthorized URL / page access (`/unauthorized`)
- [x] **T-0311** Initiator access rules encoded (`includeOwn` + initiator brands; cannot approve/reject)
- [x] **T-0312** Vertical Head brand-scoped access encoded (`npdVerticalHeadBrands`)
- [x] **T-0313** MIS Coordinator assigned-request access encoded (brand filter when mapped; otherwise module-wide)
- [x] **T-0314** Consultant Material Group access only (NPD nav/routes hidden; MG actions only)

---

## Phase 4 — Admin Module

### 4.1 Lookup Type Master

- [x] **T-0401** Implement Lookup Type Master list screen
- [x] **T-0402** Implement Create Lookup Type form / dialog
- [x] **T-0403** Implement Edit Lookup Type
- [x] **T-0404** Implement search / list functionality
- [x] **T-0405** Implement required-field validation
- [x] **T-0406** Implement soft delete via `IsDeleted` (common `softDelete.ts` pattern)
- [x] **T-0407** Redesign Lookup Type Master UI (toolbar, table, pagination, Import/Export buttons)
- [x] **T-0407a** Implement reusable `ImportDialog` (wireframe Import popup + template download panel)
- [x] **T-0407b** Implement Lookup Type Import (NPD_Templates, duplicate warnings, batch insert)
- [x] **T-0407c** Implement Lookup Type Export (Excel of filtered grid data)
- [x] **T-0408** Redesign Add/Edit popup and common `DeleteConfirmDialog` per latest wireframes
- [x] **T-0409** Validation via common Toast (no inline field errors)

### 4.2 Lookup Master

- [x] **T-0410** Implement Lookup Master list screen (toolbar, table, pagination — same pattern as LookupType)
- [x] **T-0411** Implement Add/Edit Lookup popup (Lookup Type dropdown + Lookup Name — wireframe)
- [x] **T-0412** Implement Edit Lookup
- [x] **T-0413** Implement soft delete Lookup with dependency validation
- [x] **T-0414** Implement Lookup → Lookup Type mapping (`NPD_Lookup.LookupType` → `NPD_LookupType`)
- [x] **T-0415** Implement validation (required fields, duplicate Toast, import duplicates)
- [x] **T-0415a** Implement Lookup Import/Export (template `TemplateType = "Lookup"`)
- [x] **T-0415b** Implement reusable delete dependency validation (`dependencyValidationService.ts`)
- [x] **T-0415c** Block LookupType delete when referenced by Lookup records

### 4.3 Plant / Role / Approver — ROCA site (no local admin modules)

Plant Master, Role, and Approver Configuration are maintained on the **ROCA site**. This app reads them via cross-site services. Do not add nav items, routes, or NPD-site lists.

- [x] **T-0419** Remove Plant Master, Role, and Approver Configuration from side navigation and `ROUTE_DEFINITIONS`

### 4.6 Brand Material Extension Master

- [x] **T-0450** Implement Brand Material Extension list screen
- [x] **T-0451** Implement Add/Edit popup (Brand ComboBox, Plant MultiSelect)
- [x] **T-0452** Source Brand from ROCA `Brandmaster`; Plant from ROCA `PlantMaster` (`IsDeleted = false`)
- [x] **T-0453** Implement Edit / Delete (soft delete)
- [x] **T-0454** Store/read Plant as comma-separated values; populate MultiSelect on edit
- [x] **T-0455** Add reusable `resolveRocaMasterSiteUrl()` + `rocaMasterDataService.ts`
- [x] **T-0456** Duplicate Brand validation + required-field Toast validation

### 4.7 Workflow Configuration Master

- [x] **T-0460** Implement Workflow Configuration screen (grouped Approval Chain, search, Add/Edit/Delete)
- [x] **T-0461** Implement Configure Workflow modal (step builder, NPD multi-step, MG single-step Consultant)
- [x] **T-0462** Persist and load active workflow stages in `NPD_WorkflowConfig` (one record per step)
- [x] **T-0463** NPD role filtering: exclude Consultant via `WorkflowNpdExcludedNextRoles`; dynamic Add Step visibility
- [x] **T-0464** Lock earlier step Next Role when chain grows; only latest step editable/removable
- [x] **T-0465** Workflow form dialog consistent font size (`0.8125rem`) and standard Add Step icon sizing

### 4.8 Global UI Standards (All Masters)

- [x] **T-0490** Poppins font family app-wide via CDN + `theme.module.scss`
- [x] **T-0491** Shared DataTable styling — no grid lines, subtle sort icons, plain pagination report text
- [x] **T-0492** Reusable `MasterTablePanel` with reset-filters icon above every master DataTable
- [x] **T-0493** Shared form dialog SCSS (`_form-dialog-standard.scss`) — title/label hierarchy + footer buttons
- [x] **T-0494** Consistent **Lookup Type** spelling in nav, headings, routes, and dialog titles
- [x] **T-0495** Apply global standards to Lookup Type, Lookup, Brand Material Extension, Workflow Configuration masters
- [x] **T-0496** Master reset button visible styling + compact toolbar control heights (`_master-toolbar.scss`)
- [x] **T-0496a** Matched Search & Reset button heights (`2rem`) with dashboard buttons; Reset button theme-color background with white icon, permanent style (`_master-toolbar.scss`, `MasterToolbarSearch.tsx`)
- [x] **T-0496b** DataTables Actions column alignment: compact column width (`5.5rem`), left-aligned under "Action" header, eliminated excess whitespace on right across all master tables
- [x] **T-0496c** Form popup buttons alignment: eliminated PrimeReact default button right margins, aligned dialog content/footer padding to ensure buttons are flush with input fields
- [x] **T-0496d** Side navigation: removed separator line below Reports at the very bottom while preserving all other section separators (`NavSection.module.scss`, `SideNavigation.module.scss`)
- [x] **T-0497** Export `{Name}_Export_{DD-MM-YYYY}` + themed Excel header via `xlsx-js-style` (`exportService.ts`)
- [x] **T-0498** Import duplicate validation table in `ImportDialog` (preview/commit thunks; Proceed imports valid rows)
- [x] **T-0499** Taller form dialog footer buttons (`_form-dialog-standard.scss`)
- [x] **T-0500** Workflow: editable Next Role on all steps except Initiator on edit; Current Role derived from prior Next Role
- [x] **T-0500a** RoleMaster filter uses `System/Title eq "New Product Development"` for NPD workflow roles

### 4.9 Material Master

- [ ] **T-0470** Implement Material Master list screen
- [ ] **T-0471** Implement search (group, category, range, PCS, creator)
- [ ] **T-0472** Implement Creation Date From / To filters
- [ ] **T-0473** Implement Initiator filter
- [ ] **T-0474** Implement Download Template
- [ ] **T-0475** Implement Import bulk records
- [ ] **T-0476** Implement Export catalog
- [ ] **T-0477** Implement Add Record manually
- [ ] **T-0478** Implement Edit where applicable
- [ ] **T-0479** Validate catalog data

### 4.9 Admin — Request Visibility

- [ ] **T-0480** Implement Admin NPD All Requests view (all requests, search, filter, export)
- [ ] **T-0481** Implement Admin Material Group All Requests view

### 4.10 Admin Redux & Services

- [x] **T-0485** Create `adminSlice.ts` and lookup type thunks (`lookupTypeThunks.ts`)
- [ ] **T-0486** Create `adminService.ts` for all master CRUD operations (`lookupTypeService.ts` done)

---

## Phase 5 — NPD Initiator Module

### 5.1 List Views

- [x] **T-0501** Implement NPD All Requests table (own requests, summary cards)
- [x] **T-0502** Implement NPD Pending Approval table (view-only, own requests)
- [x] **T-0503** Implement NPD Approved Requests table (view-only, own requests)
- [x] **T-0504** Implement NPD Draft / ReWork table (edit; resubmit pending Submit phase)
- [x] **T-0505** Implement search, status filter, brand filter on All Requests
- [x] **T-0506** Implement Export (Excel .xlsx) on All Requests and Approved Requests
- [x] **T-0507** Standardize search field placeholders across NPD: 'Search here' for Pending/Draft-Rework, and 'Search by Request ID, Plant, Brand, Code, or Material...' for All/Approved dashboard
- [x] **T-0508** Unify DataTable layout and cell alignment: synchronized column headers, widths, vertical-align middle, white-space nowrap, and left-aligned Products and Actions across All, Approved, Pending, and Draft/Rework
- [x] **T-0509** Add read-only Workflow Status in a dedicated Workflow column (hidden for Draft); highlight only the current pending workflow role
- [x] **T-0535** BroadcastChannel lock: View/Edit/Save Draft/Submit/workflow actions in one tab lock the other with Editing Restricted; popup on the other tab's next navigation/interaction

### 5.2 New NPD Request Form

- [x] **T-0510** Implement General Information section (Brand, Material Type, Plant/Source) — Brand from ROCA `ApproversMaster` (client-filter: System, Role, Users email); Material Type from `Config.NpdMaterialTypes`; Plant/Source per material type
- [x] **T-0511** Implement cascading Plant/Source — disabled until Material Type selected; Finished Products → ROCA `PlantMaster` (Factory + active); Traded Products → `Config.NpdTradedPlantSources` (Imported, Domestic)
- [ ] **T-0512** Filter Plant/Source by Brand Material Extension
- [x] **T-0513** Implement conditional Roca Global Code column (Roca, Laufen, Armani brands) — UI only; options/validation wiring pending
- [x] **T-0514** Implement Item Details grid (all BRD columns; MultiSelect options from `NPD_Lookup` by Lookup Type matching field name); paginate at 7 rows when there are more than 7 items
- [x] **T-0515** Implement row actions: Add (latest row only, new empty line), Delete (any row) — Clear row pending
- [x] **T-0516** Implement + Add Another Item Line with small inline plus icon next to label
- [x] **T-0517** Implement Import items (Excel) — header mapping is trim + lowercase + whitespace-insensitive so template columns match Item Details fields; up to 200 rows
- [x] **T-0518** Implement Total Item Lines counter in section footer
- [x] **T-0519** Implement Cancel / Back, Save Draft + Submit Request buttons — Save Draft persists header + items (`Status=Draft`); Submit generates Request ID and routes to Vertical Head; Cancel/Back returns to the source list via `from`

### 5.3 NPD Form Validation

- [x] **T-0520** Validate required General Information fields — Toast on Submit (no inline field errors)
- [x] **T-0521** Validate Material Code max 18 characters — Toast on Submit
- [x] **T-0522** Validate Material Description max 40 characters — Toast on Submit
- [x] **T-0523** Validate all mandatory item fields — Toast on Submit
- [x] **T-0524** Validate Roca Global Code when applicable — Toast on Submit
- [x] **T-0525** Validate at least one item row on submit — Toast on Submit

### 5.4 NPD Initiator Services & Redux

- [x] **T-0530** Create `npdFormSlice.ts` and `npdFormThunks.ts` (General Info form state + ROCA dropdown fetches)
- [x] **T-0531** Create `npdFormDataService.ts` (initiator brand + factory plant/source fetch) + `npdRequestGeneralInfoService.ts` (General Info Save Draft / load by id / Draft-Rework list)
- [x] **T-0532** Implement batch save for header + items on Save Draft / Submit
- [x] **T-0533** Implement view-only detail screen for Pending / Approved requests — Pending Edit opens the same form read-only (Approved list still pending)
- [x] **T-0534** Implement edit + resubmit flow for Draft / Rework requests — Edit from Draft/Rework loads `/npd/new?id=`; Submit generates/keeps Request ID

---

## Phase 6 — NPD Vertical Head Module

- [x] **T-0601** Implement VH All Requests table (brand-scoped)
- [x] **T-0602** Implement VH Pending Approval table (counter + search)
- [x] **T-0603** Implement VH Approved Requests table (search, brand filter, Export CSV)
- [x] **T-0604** Implement VH Request Detail screen (read-only header + items)
- [x] **T-0605** Implement Approve action with confirmation dialog
- [x] **T-0606** Implement Rework action with comments and confirmation
- [x] **T-0607** Implement Reject action with comments and confirmation
- [x] **T-0608** Update request status and route to MIS on Approve
- [x] **T-0609** Route Rework back to Initiator with comments
- [x] **T-0610** Set Rejected status (permanently closed) on Reject
- [x] **T-0611** Implement `verticalHeadAction` thunk in npdSlice — `applyNpdWorkflowAction`
- [ ] **T-0612** Verify VH cannot access Material Group module
- [ ] **T-0613** Verify VH cannot perform MIS Coordinator actions
- [x] **T-0614** Verify brand-scoped data filtering

---

## Phase 7 — NPD MIS Coordinator Module

- [x] **T-0701** Implement MIS All Requests table (pending + self-posted)
- [x] **T-0702** Implement MIS Pending Approval table
- [x] **T-0703** Implement MIS Approved Requests table (posted to SAP by self)
- [x] **T-0704** Implement MIS Request Detail — read-only General Information
- [ ] **T-0705** Implement editable Item Details grid
- [ ] **T-0706** Implement Add Line Item
- [ ] **T-0707** Implement Other Details section (SAP fields)
- [ ] **T-0708** Auto-populate Storage Location, MRP Group, MRP Controller from ROCA `PlantMaster`
- [ ] **T-0709** Auto-populate Material Extension from Brand Material Extension Master
- [ ] **T-0710** Implement conditional Plant Code / Valuation Class logic
- [ ] **T-0711** Set Class Type = 001 always
- [ ] **T-0712** Implement Post to SAP action with confirmation
- [x] **T-0713** Implement Rework action with comments
- [x] **T-0714** Implement Reject action with comments
- [ ] **T-0715** Implement `misCoordinatorAction` thunk
- [ ] **T-0716** Verify MIS cannot access Material Group module

---

## Phase 8 — Material Group Initiator Module

- [ ] **T-0801** Implement MG All Requests table
- [ ] **T-0802** Implement MG Pending Request table (view-only)
- [ ] **T-0803** Implement MG Completed Request table (view-only)
- [ ] **T-0804** Implement MG Draft / ReWork table (edit + resubmit)
- [ ] **T-0805** Implement New Material Group Request form — Select Masters (multi-select)
- [ ] **T-0806** Implement Select All / Clear All for masters
- [ ] **T-0807** Implement Master Details section (Code optional, Description required)
- [ ] **T-0808** Implement Add Row / Delete Row per master group
- [ ] **T-0809** Implement Cancel, Save as Draft, Submit to Consultant
- [ ] **T-0810** Validate at least one master selected
- [ ] **T-0811** Validate Description mandatory per row
- [ ] **T-0812** Create `materialGroupSlice.ts` and `materialGroupThunks.ts`
- [ ] **T-0813** Create `materialGroupService.ts`
- [ ] **T-0814** Implement batch save for header + items
- [ ] **T-0815** Implement view-only detail for Pending / Completed
- [ ] **T-0816** Implement edit + resubmit for Draft / Rework

---

## Phase 9 — Material Group Consultant Module

- [ ] **T-0901** Implement Consultant All Requests table (dynamic total count)
- [ ] **T-0902** Implement Consultant Pending Request table (Edit only)
- [ ] **T-0903** Implement Consultant Completed Request table (View only)
- [ ] **T-0904** Implement Consultant Review & Edit screen
- [ ] **T-0905** Display read-only configured master badges
- [ ] **T-0906** Implement editable Code (mandatory) and Description per master
- [ ] **T-0907** Implement Consultant Remarks / SAP Configuration Note
- [ ] **T-0908** Implement Complete Request action
- [ ] **T-0909** Implement Send Back for ReWork action
- [ ] **T-0910** Implement Reject action
- [ ] **T-0911** Implement Cancel (discard changes)
- [ ] **T-0912** Implement `consultantAction` thunk
- [ ] **T-0913** On Complete — update Lookup Master with new codes
- [ ] **T-0914** Verify Consultant cannot access NPD module

---

## Phase 10 — Workflow Automation

- [ ] **T-1001** Implement NPD request creation trigger
- [x] **T-1002** Implement NPD Request ID generation (`NPD-YYYY-###`)
- [x] **T-1003** Implement NPD Draft save handling — General Information → `NPD_Request` with `WorkFlowJSON`
- [x] **T-1004** Implement NPD Submit → route to Vertical Head
- [x] **T-1005** Implement VH Approve → route to MIS Coordinator
- [x] **T-1006** Implement VH / MIS Rework → route to Initiator
- [x] **T-1007** Implement VH / MIS Reject → permanently closed
- [ ] **T-1008** Implement MIS Post to SAP → Completed
- [x] **T-1009** Implement NPD resubmission after Rework
- [ ] **T-1010** Implement MG request creation trigger
- [ ] **T-1011** Implement MG Request ID generation
- [ ] **T-1012** Implement MG Submit → route to Consultant
- [ ] **T-1013** Implement Consultant Complete → Completed
- [ ] **T-1014** Implement MG Rework → route to Initiator
- [ ] **T-1015** Implement MG Reject → permanently closed
- [ ] **T-1016** Implement MG resubmission after Rework
- [ ] **T-1017** Configure Power Automate flows (or in-app routing — confirm OPEN-006)
- [ ] **T-1018** Test all workflow paths end-to-end

---

## Phase 11 — SAP Integration

- [ ] **T-1101** Confirm SAP interface / API specification with ROCA (OPEN-002)
- [ ] **T-1102** Create `sapService.ts` — payload builder
- [ ] **T-1103** Map NPD fields to SAP fields
- [ ] **T-1104** Implement Post to SAP call
- [ ] **T-1105** Capture and store SAP response
- [ ] **T-1106** Handle SAP success (status → Completed)
- [ ] **T-1107** Handle SAP failure (show error, do NOT update status)
- [ ] **T-1108** Validate Plant Code, Storage Location, Profit Center, MRP fields before post
- [ ] **T-1109** Validate Valuation Class and Class Type before post
- [ ] **T-1110** Validate Material Extension before post
- [ ] **T-1111** Test SAP posting end-to-end in UAT
- [ ] **T-1112** Document SAP integration configuration

---

## Phase 12 — Material Master Integration

- [ ] **T-1201** Define NPD Completed → Material Master field mapping
- [ ] **T-1202** Implement automatic Material Master population on NPD Completed
- [ ] **T-1203** Map all required Material Master fields
- [ ] **T-1204** Implement duplicate detection / handling
- [ ] **T-1205** Handle Material Master creation failures (log + notify)
- [ ] **T-1206** Test with completed NPD sample record
- [ ] **T-1207** Verify Material Master data accuracy
- [ ] **T-1208** Verify Admin Material Master list reflects auto-populated records

---

## Phase 13 — Analytics & Reports

- [ ] **T-1301** Implement Reports navigation (all roles)
- [ ] **T-1302** Implement role-based report visibility
- [ ] **T-1303** Implement NPD request count reports
- [ ] **T-1304** Implement Material Group request count reports
- [ ] **T-1305** Implement status-based reporting
- [ ] **T-1306** Implement search / filter on reports
- [ ] **T-1307** Implement Export on reports where applicable
- [ ] **T-1308** Validate report data accuracy per role scope
- [ ] **T-1309** Validate Initiator sees own data only in reports
- [ ] **T-1310** Validate Admin sees all data in reports

---

## Phase 14 — Email Notifications (Blocked)

> **Blocker BLK-001:** Email content pending from ROCA team.

- [ ] **T-1401** Receive final email content from ROCA
- [ ] **T-1402** Identify all notification scenarios and recipients
- [x] **T-1403** Create email templates
- [ ] **T-1404** Implement notification triggers (Power Automate or equivalent)
- [x] **T-1405** Include Request ID, details, status, rework info in emails
- [ ] **T-1406** Test each notification scenario
- [ ] **T-1407** UAT notification flow
- [ ] **T-1408** Enable notifications in production

---

## Phase 15 — Testing

- [ ] **T-1501** Unit test — SPServices core CRUD functions
- [ ] **T-1502** Unit test — Redux reducers and selectors
- [ ] **T-1503** Unit test — validation helpers (NPD, Material Group)
- [ ] **T-1504** Unit test — role resolution service
- [ ] **T-1505** Unit test — SAP payload builder and conditional logic
- [ ] **T-1506** Integration test — NPD create → submit → approve → SAP flow
- [ ] **T-1507** Integration test — Material Group create → consultant complete flow
- [ ] **T-1508** Workflow test — all NPD paths (happy, rework, reject)
- [ ] **T-1509** Workflow test — all Material Group paths (happy, rework, reject)
- [ ] **T-1510** Negative test — missing mandatory fields, invalid lengths
- [ ] **T-1511** Negative test — unauthorized role actions blocked
- [ ] **T-1512** Negative test — rejected request resubmission blocked
- [ ] **T-1513** Security test — role bypass / URL access attempts
- [ ] **T-1514** Regression test — master data, existing requests, permissions
- [ ] **T-1515** UI test — wireframe match for all screens per role
- [ ] **T-1516** Performance test — large item grids and list pagination

---

## Phase 16 — UAT

- [ ] **T-1601** UAT — Admin master data management
- [ ] **T-1602** UAT — Initiator NPD creation, draft, submit, rework, resubmit
- [ ] **T-1603** UAT — Vertical Head approve, rework, reject
- [ ] **T-1604** UAT — MIS Coordinator SAP configuration and Post to SAP
- [ ] **T-1605** UAT — Material Master auto-population after NPD completion
- [ ] **T-1606** UAT — Initiator Material Group creation and submission
- [ ] **T-1607** UAT — Consultant complete, rework, reject
- [ ] **T-1608** UAT — Reports and export per role
- [ ] **T-1609** UAT — Search, filter, and status badges
- [ ] **T-1610** UAT defect logging and resolution
- [ ] **T-1611** UAT sign-off from business stakeholders
- [ ] **T-1612** UAT sign-off documented in project records

---

## Phase 17 — Deployment

- [ ] **T-1701** Complete all development phases
- [ ] **T-1702** Complete all testing phases
- [ ] **T-1703** Complete UAT with business sign-off
- [ ] **T-1704** Prepare production SharePoint lists and permissions
- [ ] **T-1705** Load production master data
- [ ] **T-1706** Deploy SPFx package to App Catalog
- [ ] **T-1707** Enable Power Automate flows in production
- [ ] **T-1708** Configure SAP connectivity in production
- [ ] **T-1709** Run production smoke tests (login, role, create, approve, SAP, MG)
- [ ] **T-1710** Run post-deployment regression
- [ ] **T-1711** Obtain business sign-off
- [ ] **T-1712** Hand over support documentation
- [ ] **T-1713** Archive project documents and final TaskList / Checklist

---

## Blockers & Open Items

| ID | Description | Impacts Tasks | Status |
|---|---|---|---|
| BLK-001 | Email notification content pending from ROCA | T-1401–T-1408 | Open |
| OPEN-001 | Exact SharePoint internal field names TBD | T-0210–T-0223 | To Confirm |
| OPEN-002 | SAP interface specification TBD | T-1101–T-1112 | To Confirm |
| OPEN-003 | Workflow Configuration scope (global vs per-brand) | T-0460–T-0462, T-1017 | To Confirm |
| OPEN-004 | Material Group Request ID format TBD | T-1011 | To Confirm |
| OPEN-005 | Material Master field schema TBD | T-0470–T-0479 | To Confirm |
| OPEN-006 | Power Automate vs in-app routing | T-1017 | To Confirm |

---

## Change Log

| Date | Change | Tasks Affected |
|---|---|---|
| 10 Sep 2026 | Initial TaskList created from TechnicalArchitecture + TRD + Master doc | All |
| 10 Sep 2026 | Marked Phase 1 setup tasks complete (SPFx, PnP v4, PrimeReact, theme) | T-0101–T-0107, T-0110–T-0113, T-0120–T-0122 |
| 17 Sep 2026 | Standardized search placeholders ('Search here' / Plant) and unified common DataTable layout across all NPD views | T-0501–T-0508 |
| 18 Sep 2026 | Fixed NPD Item Details Excel import header matching (trim + lowercase + whitespace-insensitive) so template columns are not marked missing | T-0517 |
| 18 Sep 2026 | Role-based View/Edit/approval actions: View is read-only, Edit first when the user can act, no Delete on request tables, VH/MIS nav limited to permitted modules | T-0311–T-0313, T-0502, T-0533, T-0602 |
| 18 Sep 2026 | Added read-only Workflow Status dialog on request list Actions; current Pending step highlighted from WorkFlowJSON | T-0509 |
| 18 Sep 2026 | Workflow Status highlights logged-in user roles; empty approver status shows Pending; BroadcastChannel Editing Restricted lock across tabs | T-0509, T-0535 |
| 18 Sep 2026 | Save Draft uses the Submit line-item progress bar; BroadcastChannel notifies View/Edit/any action; Item Details paginate at 7 rows; Workflow is its own column (hidden on Draft); highlight only the current pending workflow role | T-0509, T-0514, T-0519, T-0535 |
| 18 Sep 2026 | Centered DataTable empty states; Pending status shows current workflow role; Current Approver column; Item Details render memoization | T-0501, T-0508, T-0514 |

---

## Working Rules

1. Check off tasks immediately when completed — do not batch updates.
2. If a task is blocked, note the blocker ID in the task row comment or Blockers table.
3. If scope changes, add new tasks and reference a Change Request in `ROCA_NPD_Project_Master.md`.
4. Update the Progress Summary table after each work session.
5. Cross-verify completed tasks against `Checklist.md` before marking phase complete.

---

*End of TaskList.*
