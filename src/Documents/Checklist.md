# ROCA NPD — Checklist

> **Purpose:** Verify that every important item is implemented correctly and works as expected before marking tasks complete.  
> **How to use:** Check off `- [ ]` → `- [x]` when verified. Use alongside `TaskList.md` — completing a task should trigger the related checklist items.  
> **References:** `TechnicalArchitecture.md`, `ProjectStandards.md`, `TaskList.md`, `NPD_TRD.md`, `ROCA_NPD_Project_Master.md`, Wireframe ([roca-npd.ai.studio](https://roca-npd.ai.studio/))

---

## Verification Summary

| Category | Total Items | Verified | Pending |
|---|---:|---:|---:|
| A — Project & Documentation | 16 | 6 | 10 |
| B — Technical Foundation | 40 | 25 | 15 |
| C — SharePoint Data | 24 | 0 | 24 |
| D — Security & Roles | 22 | 0 | 22 |
| E — UI / UX / Theme | 27 | 6 | 21 |
| F — Admin Module | 36 | 0 | 36 |
| G — NPD Module | 42 | 0 | 42 |
| H — Material Group Module | 24 | 0 | 24 |
| I — Workflow & Automation | 20 | 0 | 20 |
| J — SAP Integration | 16 | 0 | 16 |
| K — Material Master | 10 | 0 | 10 |
| L — Reports | 10 | 0 | 10 |
| M — Email Notifications | 8 | 0 | 8 |
| N — Testing | 24 | 0 | 24 |
| O — UAT | 18 | 0 | 18 |
| P — Deployment | 16 | 0 | 16 |
| **TOTAL** | **334** | **34** | **300** |

**Last Updated:** 10 September 2026

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
- [ ] **CHK-B19** Toast notifications work for success and error

### B.4 Routing & App Shell

- [x] **CHK-B20** react-router-dom routes configured for all modules (HashRouter + placeholder pages)
- [ ] **CHK-B21** Route guards block unauthorized role access — deferred to next phase
- [x] **CHK-B22** App shell matches wireframe layout (header, left nav, content)
- [ ] **CHK-B23** Navigation items show/hide correctly per role — all items visible for now; role filtering deferred
- [x] **CHK-B24** Active Login Role indicator displays correct role (static default; dynamic role resolution deferred)
- [ ] **CHK-B25** Unauthorized URL redirects to access-denied page

### B.5 Common Components — Composites

- [ ] **CHK-B26** StatusBadge shows correct colors per status (Draft, Pending, Rework, Approved, Rejected, Completed)
- [ ] **CHK-B27** ConfirmActionDialog appears before Approve / Rework / Reject / Delete
- [ ] **CHK-B28** SearchFilterBar filters list data correctly
- [ ] **CHK-B29** EmptyState displays when no records found
- [ ] **CHK-B30** LoaderOverlay shows during data fetch and save operations
- [ ] **CHK-B31** ExportButton generates valid CSV / Excel files

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
- [ ] **CHK-C04** Plant Master list provisioned
- [ ] **CHK-C05** Role Master list provisioned
- [ ] **CHK-C06** Approver Configuration Master list provisioned
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
- [ ] **CHK-C16** Plant Master → Brand Material Extension relationship works
- [ ] **CHK-C17** Role Master → Approver Configuration relationship works
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

- [ ] **CHK-D01** Logged-in user identified correctly via `currentUser`
- [ ] **CHK-D02** Employee ID retrieved correctly
- [ ] **CHK-D03** Admin role assigned when user is in Admin SharePoint group
- [ ] **CHK-D04** Non-admin role resolved from Approver Configuration Master
- [ ] **CHK-D05** Brand mapping loaded for Initiator and Vertical Head
- [ ] **CHK-D06** Role cached for session (no repeated SP calls on every navigation)

### D.2 Access Control — Initiator

- [ ] **CHK-D07** Initiator sees only own NPD requests
- [ ] **CHK-D08** Initiator sees only own Material Group requests
- [ ] **CHK-D09** Initiator cannot Approve, Rework, or Reject
- [ ] **CHK-D10** Initiator cannot edit Pending or Approved requests
- [ ] **CHK-D11** Initiator can edit and resubmit Draft / Rework requests

### D.2 Access Control — Vertical Head

- [ ] **CHK-D12** Vertical Head sees only brand-scoped NPD requests
- [ ] **CHK-D13** Vertical Head can Approve, Rework, Reject on pending requests
- [ ] **CHK-D14** Vertical Head cannot access Material Group module
- [ ] **CHK-D15** Vertical Head cannot perform MIS Coordinator actions

### D.3 Access Control — MIS Coordinator

- [ ] **CHK-D16** MIS Coordinator sees requests approved by VH and assigned to self
- [ ] **CHK-D17** MIS Coordinator can edit Item Details and Other Details
- [ ] **CHK-D18** MIS Coordinator can Post to SAP, Rework, Reject
- [ ] **CHK-D19** MIS Coordinator cannot access Material Group module

### D.4 Access Control — Consultant

- [ ] **CHK-D20** Consultant sees assigned Material Group pending requests
- [ ] **CHK-D21** Consultant can Complete, Rework, Reject Material Group requests
- [ ] **CHK-D22** Consultant cannot access NPD module

### D.5 Access Control — Admin

- [ ] **CHK-D23** Admin sees all NPD and Material Group requests
- [ ] **CHK-D24** Admin has full Administration module access
- [ ] **CHK-D25** Admin cannot perform workflow actions (approve/post) unless by design

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
- [ ] **CHK-E08** PrimeReact components styled consistently inside `.roca-npd-app`

### E.2 Wireframe Alignment

- [x] **CHK-E09** Left navigation matches NavSelectDesign.png (icon tones, hover, selected bar, pill actions)
- [x] **CHK-E06** Primary/accent colors match wireframe (#40919D accent, #162C34 sidebar, semantic nav icons)
- [x] **CHK-E17b** Nav hover = subtle translucent bg; selected = teal bg + yellow left bar; icons keep semantic colors
- [x] **CHK-E17c** Sidebar shrink/expand toggle matches shrink.png; content area adjusts; primary actions hover + selected only on click
- [x] **CHK-E17a** Static header matches `headerSample` wireframe with ROCA Group logo from assets
- [ ] **CHK-E10** Page headings match wireframe / requirement document
- [ ] **CHK-E11** Table columns match wireframe for each list view
- [ ] **CHK-E12** Form fields and layout match New NPD Request wireframe
- [ ] **CHK-E13** Material Group form matches wireframe (Select Masters + Master Details)
- [ ] **CHK-E14** Admin master screens match wireframe list + form pattern
- [ ] **CHK-E15** Confirmation dialogs match wireframe action pattern
- [ ] **CHK-E16** Summary cards on NPD All Requests dashboard match wireframe

### E.3 UX Behavior

- [ ] **CHK-E17** Loading spinner/skeleton shown during data operations
- [ ] **CHK-E18** Empty state shown when lists have no records
- [ ] **CHK-E19** Success toast shown after Save, Submit, Approve, Complete, etc.
- [ ] **CHK-E20** Error toast shown on validation failure or SP errors
- [ ] **CHK-E21** Cancel / Back navigates correctly without unintended data loss warning
- [ ] **CHK-E22** Read-only screens cannot be edited (form controls disabled)
- [ ] **CHK-E23** Editable screens show only permitted actions for current role
- [ ] **CHK-E24** Horizontal scroll works on wide Item Details grid
- [ ] **CHK-E25** Total Items counter updates correctly on NPD form
- [ ] **CHK-E26** Dynamic pending/completed counters update on list views

---

## F — Admin Module

### F.1 Lookup Type Master

- [ ] **CHK-F01** List displays all lookup types
- [ ] **CHK-F02** Create new lookup type works
- [ ] **CHK-F03** Edit lookup type works
- [ ] **CHK-F04** Required-field validation enforced

### F.2 Lookup Master

- [ ] **CHK-F05** List displays lookups with Code, Name, Type
- [ ] **CHK-F06** Create lookup with type dropdown works
- [ ] **CHK-F07** Edit lookup works
- [ ] **CHK-F08** Delete lookup works
- [ ] **CHK-F09** Lookup correctly linked to Lookup Type Master

### F.3 Plant Master

- [ ] **CHK-F10** Plant list displays with search
- [ ] **CHK-F11** New Plant form saves all required fields
- [ ] **CHK-F12** Plant Code uniqueness enforced
- [ ] **CHK-F13** Edit and Delete work correctly
- [ ] **CHK-F14** Import and Export work correctly
- [ ] **CHK-F15** Active/Inactive status handled correctly

### F.4 Role Master

- [ ] **CHK-F16** Role list displays all roles
- [ ] **CHK-F17** Create / Edit / Delete role works
- [ ] **CHK-F18** Required-field validation enforced

### F.5 Approver Configuration

- [ ] **CHK-F19** Approver list displays role, user, employee ID, brands
- [ ] **CHK-F20** Brand multi-select shown for Initiator and Vertical Head
- [ ] **CHK-F21** Brand hidden for MIS Coordinator and Consultant
- [ ] **CHK-F22** One user can map to multiple brands
- [ ] **CHK-F23** Create / Edit / Delete works

### F.6 Brand Material Extension

- [ ] **CHK-F24** Brand → Plant/Warehouse mapping displays correctly
- [ ] **CHK-F25** Plant values sourced from Plant Master
- [ ] **CHK-F26** Create / Edit / Delete works

### F.7 Workflow Configuration

- [ ] **CHK-F27** Workflow stages display (Initiator → VH → MIS)
- [ ] **CHK-F28** Configure Workflow modal saves correctly

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

- [ ] **CHK-G01** All Requests shows only own requests with correct columns
- [ ] **CHK-G02** Summary cards show correct counts (Total, Pending, Rework, Approved)
- [ ] **CHK-G03** Pending Approval shows own requests in pipeline (view-only)
- [ ] **CHK-G04** Approved Requests shows own completed/approved requests (view-only)
- [ ] **CHK-G05** Draft / ReWork shows editable own requests
- [ ] **CHK-G06** Search by Request ID, Title, Brand, Code, Material works
- [ ] **CHK-G07** Status and Brand filters work
- [ ] **CHK-G08** Export CSV produces valid file

### G.2 Initiator — New NPD Request Form

- [ ] **CHK-G09** Brand (MG1) dropdown populated from Lookup Master
- [ ] **CHK-G10** Material Type dropdown populated from Lookup Master
- [ ] **CHK-G11** Plant/Source disabled until Material Type selected
- [ ] **CHK-G12** Plant/Source filtered by Brand Material Extension for selected Brand
- [ ] **CHK-G13** Roca Global Code shown and required for Roca, Laufen, Armani brands
- [ ] **CHK-G14** Roca Global Code hidden for other brands
- [ ] **CHK-G15** Item Details grid displays all required columns
- [ ] **CHK-G16** Add row, Copy row, Delete row, Clear row work
- [ ] **CHK-G17** + Add Another Item Line works
- [ ] **CHK-G18** Import items from Excel works
- [ ] **CHK-G19** Save Draft saves header + items without submitting
- [ ] **CHK-G20** Submit Request validates and routes to Vertical Head
- [ ] **CHK-G21** Draft Request ID remains blank until submitted
- [ ] **CHK-G22** Request ID generated as `NPD-YYYY-####` on submit

### G.3 Initiator — Validation

- [ ] **CHK-G23** Submit blocked when Brand, Material Type, or Plant/Source missing
- [ ] **CHK-G24** Material Code max 18 characters enforced
- [ ] **CHK-G25** Material Description max 40 characters enforced
- [ ] **CHK-G26** All mandatory item fields validated on submit
- [ ] **CHK-G27** Roca Global Code validated when applicable
- [ ] **CHK-G28** At least one item row required on submit

### G.4 Vertical Head

- [ ] **CHK-G29** All Requests scoped to mapped brand(s) only
- [ ] **CHK-G30** Pending Approval shows assigned requests with counter
- [ ] **CHK-G31** Request detail is read-only (header + items)
- [ ] **CHK-G32** Approve routes to MIS Coordinator and updates status
- [ ] **CHK-G33** Rework routes to Initiator with comments
- [ ] **CHK-G34** Reject permanently closes request
- [ ] **CHK-G35** Approved Requests supports search, brand filter, Export CSV

### G.5 MIS Coordinator

- [ ] **CHK-G36** Pending Approval shows VH-approved requests assigned to self
- [ ] **CHK-G37** Item Details editable (edit rows, add line items)
- [ ] **CHK-G38** Other Details section displays all SAP fields
- [ ] **CHK-G39** Storage Location auto-populated from Plant Master
- [ ] **CHK-G40** MRP Group and MRP Controller auto-populated from Plant Master
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
- [ ] **CHK-I18** Approver Configuration Master drives user routing
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
- [ ] **CHK-M02** Notification sent on NPD Submit
- [ ] **CHK-M03** Notification sent on Approve / Rework / Reject (VH and MIS)
- [ ] **CHK-M04** Notification sent on Post to SAP / Completed
- [ ] **CHK-M05** Notification sent on Material Group Submit / Complete / Rework
- [ ] **CHK-M06** Email includes Request ID and key request details
- [ ] **CHK-M07** Email recipients match Approver Configuration routing
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

---

## Working Rules

1. **Task → Checklist:** When a TaskList item is marked complete, verify the related Checklist items before considering it done.
2. **Checklist → Task:** If a Checklist item fails, do not mark the related TaskList item complete until fixed.
3. **Phase gate:** Do not sign off a phase until all related CHK items pass.
4. **Update counts:** Update the Verification Summary table after each session.
5. **Blockers:** Mark blocked sections (BLK-001) as N/A until unblocked — do not check off prematurely.

---

*End of Checklist.*
