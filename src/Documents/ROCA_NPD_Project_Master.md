# ROCA NPD Project – Master Development & Completion Tracker

> **Source:** Roca New Product Development Functional Requirement Document  
> **Document Date:** 07 September 2026  
> **Purpose:** Master development, workflow, testing, UAT and deployment checklist.

---

## 1. Project Overview

### 1.1 Objective
Build the New Product Development (NPD) & New Material Group Management System for Roca.

The system supports:
- NPD request creation, submission and tracking.
- New Material Group request creation, submission and tracking.
- Role-based access and permissions.
- Multi-stage approval workflows.
- Rework and rejection handling.
- SAP-aligned material classification.
- SAP posting for completed NPD requests.
- Automatic Material Master population after NPD completion.
- Administration master-data management.
- Analytics & Reports.

### 1.2 User Roles

- [ ] Initiator
- [ ] Vertical Head
- [ ] MIS Coordinator
- [ ] Consultant
- [ ] Admin

---

# 2. Project Scope

## 2.1 In Scope

- [ ] Role-based access to modules, screens and actions.
- [ ] NPD request creation, submission and tracking.
- [ ] New Material Group request creation, submission and tracking.
- [ ] NPD workflow: Initiator → Vertical Head → MIS Coordinator → SAP Posting → Completed.
- [ ] New Material Group workflow: Initiator → Consultant → Completed.
- [ ] Rework handling at applicable workflow stages.
- [ ] Rejection handling at applicable workflow stages.
- [ ] MIS Coordinator SAP-related configuration.
- [ ] SAP posting.
- [ ] Automatic Material Master population after NPD completion.
- [ ] Administration master modules.
- [ ] Analytics & Reports.

---

# 3. Workflow

## 3.1 NPD Workflow

```text
Initiator
   ↓
Create / Save Draft
   ↓
Submit Request
   ↓
Vertical Head
   ├── Approve → MIS Coordinator
   ├── Rework → Initiator → Modify → Resubmit
   └── Reject → Permanently Closed
                     ↓
              MIS Coordinator
                ├── Post to SAP → Completed → Material Master
                ├── Rework → Initiator → Modify → Resubmit
                └── Reject → Permanently Closed
```

### NPD Workflow Checklist

- [ ] Initiator creates NPD request.
- [ ] Draft can be saved.
- [ ] Request can be submitted.
- [ ] Request routes to correct Vertical Head.
- [ ] Vertical Head can Approve.
- [ ] Vertical Head can Rework.
- [ ] Vertical Head can Reject.
- [ ] Approved request routes to MIS Coordinator.
- [ ] MIS Coordinator can review.
- [ ] MIS Coordinator can edit Item Details.
- [ ] MIS Coordinator can configure SAP-related details.
- [ ] MIS Coordinator can Post to SAP.
- [ ] MIS Coordinator can Rework.
- [ ] MIS Coordinator can Reject.
- [ ] Post to SAP changes status to Completed.
- [ ] Completed NPD data populates Material Master.
- [ ] Rework routes back to Initiator.
- [ ] Reworked request can be modified and resubmitted.
- [ ] Rejected request is permanently closed.
- [ ] Rejected request cannot be resubmitted.

## 3.2 New Material Group Workflow

```text
Initiator
   ↓
Create / Save Draft
   ↓
Submit to Consultant
   ↓
Consultant
   ├── Complete → Completed
   ├── Rework → Initiator → Modify → Resubmit
   └── Reject → Permanently Closed
```

### New Material Group Workflow Checklist

- [ ] Initiator creates request.
- [ ] Draft can be saved.
- [ ] Request can be submitted to Consultant.
- [ ] Request routes to Consultant.
- [ ] Consultant can review.
- [ ] Consultant can update Description.
- [ ] Consultant finalizes SAP Material Group Code.
- [ ] Consultant can Complete.
- [ ] Consultant can Send Back for ReWork.
- [ ] Consultant can Reject.
- [ ] Complete changes status to Completed.
- [ ] Rework routes to Initiator.
- [ ] Reworked request can be modified and resubmitted.
- [ ] Rejected request is permanently closed.
- [ ] Rejected request cannot be resubmitted.

---

# 4. Business Status

| Status | Business Meaning | Badge |
|---|---|---|
| Approved | Approved request | Green |
| Pending | Awaiting action | Amber |
| Rework | Returned for modification | Light Yellow |
| Rejected | Permanently closed | Red |
| Completed | Fully completed | Green |
| Draft | Saved but not submitted | Neutral |

---

# 5. Dependencies & Assumptions

## 5.1 Dependencies

- [ ] SAP system available for posting.
- [ ] Plant Master configured and current.
- [ ] Brand Material Extension Master configured.
- [ ] Lookup Type Master configured.
- [ ] Lookup Master configured.
- [ ] Approver Configuration Master configured.
- [ ] Role Master configured.

## 5.2 Assumptions

- [ ] Master data is pre-configured before request creation.
- [ ] Users are mapped to roles.
- [ ] Applicable users are mapped to brands through Approver Configuration.
- [ ] SAP integration is available.
- [ ] Plant, Storage Location, MRP Group and MRP Controller values are maintained.
- [ ] Brand-to-Plant/Warehouse mapping is maintained.

---

# 6. Role-Based Access Checklist

## 6.1 Initiator

### Navigation
- [ ] NPD Request – New NPD Request
- [ ] NPD Request – All Requests
- [ ] NPD Request – Pending Approval
- [ ] NPD Request – Approved Requests
- [ ] NPD Request – Draft / ReWork
- [ ] New Material Group – New Request
- [ ] New Material Group – All Requests
- [ ] New Material Group – Pending Request
- [ ] New Material Group – Completed Request
- [ ] New Material Group – Draft / ReWork
- [ ] Analytics & Reports – Reports

### Access Rules
- [ ] Initiator sees own NPD requests.
- [ ] Initiator sees own Material Group requests.
- [ ] Pending requests are view-only.
- [ ] Approved requests are view-only.
- [ ] Draft/Rework requests can be edited and resubmitted.

## 6.2 Vertical Head

- [ ] NPD Request – All Requests
- [ ] NPD Request – Pending Approval
- [ ] NPD Request – Approved Requests
- [ ] Analytics & Reports – Reports
- [ ] Access scoped to mapped brand(s).
- [ ] Can Approve.
- [ ] Can Rework.
- [ ] Can Reject.
- [ ] No New Material Group module.

## 6.3 MIS Coordinator

- [ ] NPD Request – All Requests
- [ ] NPD Request – Pending Approval
- [ ] NPD Request – Approved Requests
- [ ] Analytics & Reports – Reports
- [ ] Can review requests approved by Vertical Head.
- [ ] Can edit Item Details.
- [ ] Can configure Other Details.
- [ ] Can Post to SAP.
- [ ] Can Rework.
- [ ] Can Reject.
- [ ] No New Material Group module.

## 6.4 Consultant

- [ ] New Material Group – All Requests
- [ ] New Material Group – Pending Request
- [ ] New Material Group – Completed Request
- [ ] Analytics & Reports – Reports
- [ ] Can edit pending requests.
- [ ] Can finalize SAP codes.
- [ ] Can Complete.
- [ ] Can Send Back for ReWork.
- [ ] Can Reject.
- [ ] No NPD module.

## 6.5 Admin

- [ ] NPD Request – All Requests
- [ ] New Material Group – All Requests
- [ ] Administration modules
- [ ] Analytics & Reports
- [ ] Visibility into all NPD requests.
- [ ] Visibility into all Material Group requests.

---

# 7. Admin Module

## 7.1 Material Master

- [ ] Material Master listing.
- [ ] Download Template.
- [ ] Import bulk records.
- [ ] Export catalog.
- [ ] Add record manually.
- [ ] Search by group.
- [ ] Search by category.
- [ ] Search by range.
- [ ] Search by PCS.
- [ ] Search by creator.
- [ ] Creation Date From filter.
- [ ] Creation Date To filter.
- [ ] Filter by Initiator.
- [ ] Auto-populate completed NPD data.

## 7.2 Lookup Type Master

- [ ] Create Lookup Type.
- [ ] Display Lookup Type Name.
- [ ] Edit Lookup Type.
- [ ] Search/list functionality.
- [ ] Validate required fields.

Examples:
- Brand
- Material Type
- Plant/Source
- Product Group

## 7.3 Lookup Master

- [ ] Create Lookup.
- [ ] Edit Lookup.
- [ ] Delete Lookup.
- [ ] Lookup Code field.
- [ ] Lookup Name field.
- [ ] Lookup Type Name dropdown.
- [ ] Map Lookup to Lookup Type.
- [ ] Validate required fields.

## 7.4 Plant Master – Employee Master

### Form
- [ ] Plant Type – Required
- [ ] Plant Code – Required
- [ ] Location – Required
- [ ] State – Required
- [ ] Storage Location – Optional
- [ ] MRP Group – Optional
- [ ] MRP Controller – Optional
- [ ] Status – Optional

### Actions
- [ ] Search.
- [ ] Export.
- [ ] Import.
- [ ] New Plant.
- [ ] Edit.
- [ ] Delete.

### Validation
- [ ] Plant Code uniqueness.
- [ ] Required-field validation.
- [ ] Active/Inactive handling.

## 7.5 Role Master

- [ ] Create role.
- [ ] Role Name field.
- [ ] Edit role.
- [ ] Delete role.
- [ ] Role list.
- [ ] Validate required fields.

## 7.6 Approver Configuration Master

### Fields
- [ ] Approver Role – Required.
- [ ] Brand Multi-select – Conditional.
- [ ] User Name & Employee ID – Required.

### Rules
- [ ] Initiator role displays Brand multi-select.
- [ ] Vertical Head role displays Brand multi-select.
- [ ] Brand is mandatory for Initiator.
- [ ] Brand is mandatory for Vertical Head.
- [ ] MIS Coordinator hides Brand.
- [ ] Consultant hides Brand.
- [ ] One user can be mapped to multiple brands.

### Actions
- [ ] Create.
- [ ] Edit.
- [ ] Delete.

## 7.7 Brand Material Extension Master

- [ ] Brand dropdown.
- [ ] Material Extension multi-select.
- [ ] Plant/Warehouse values sourced from Plant Master.
- [ ] Create.
- [ ] Edit.
- [ ] Delete.
- [ ] Display brand mapping.
- [ ] Display mapped plant/warehouse codes.

---

# 8. Initiator – NPD Request

## 8.1 All Requests

- [ ] Display only logged-in Initiator's requests.
- [ ] Request ID.
- [ ] Brand (MG1).
- [ ] Material Type.
- [ ] Plant / Source.
- [ ] Products.
- [ ] Status.
- [ ] Created Date.
- [ ] View action.

## 8.2 Pending Approval

- [ ] Display own requests in approval pipeline.
- [ ] Vertical Head pending requests.
- [ ] MIS Coordinator pending requests.
- [ ] View-only.
- [ ] No edit.
- [ ] No approve/reject.
- [ ] No withdraw.

## 8.3 Approved Requests

- [ ] Display own fully approved/completed requests.
- [ ] Request ID.
- [ ] Brand.
- [ ] Material Type.
- [ ] Plant/Source.
- [ ] Line Items.
- [ ] Status.
- [ ] Approved Date.
- [ ] View.

## 8.4 Draft / ReWork

- [ ] Draft Request ID remains blank.
- [ ] Rework Request ID is shown.
- [ ] View/Edit.
- [ ] Modify.
- [ ] Resubmit.

---

# 9. Initiator – New NPD Request Form

## 9.1 General Information

- [ ] Brand (MG1) – Required.
- [ ] Material Type – Required.
- [ ] Plant / Source – Required.
- [ ] Plant / Source enabled after Material Type selection.
- [ ] Cascading behavior implemented.

## 9.2 Item Details

### Conditional Field

- [ ] Roca Global Code displayed when Brand = Roca.
- [ ] Roca Global Code displayed when Brand = Laufen.
- [ ] Roca Global Code displayed when Brand = Armani.
- [ ] Roca Global Code mandatory for those brands.
- [ ] Roca Global Code hidden for other brands.

### Required Fields

- [ ] Material Code – max 18 characters.
- [ ] Material Description – max 40 characters.
- [ ] Product Group (MG2).
- [ ] Product Category (MG3).
- [ ] Product Type (MG4).
- [ ] Product Source (MG5).
- [ ] Color (MGP1A).
- [ ] Product Range (MGP2A).
- [ ] Product Sub Category (MGP3A).
- [ ] Material Group.
- [ ] Ext. Material Group.
- [ ] Product Segment.
- [ ] Tax Classification.
- [ ] Class number (PCS Name).
- [ ] HSN Code.
- [ ] Weight (Kg).
- [ ] UOM.

### Optional Field

- [ ] Min. Qty / Box Qty.

### Row Actions

- [ ] Delete row.
- [ ] Copy row.
- [ ] Add Another Item Line.

### Footer Actions

- [ ] Cancel / Back.
- [ ] Save Draft.
- [ ] Submit Request.

---

# 10. Initiator – New Material Group

## 10.1 Screens

- [ ] All Requests.
- [ ] Pending Request.
- [ ] Completed Request.
- [ ] Draft / ReWork.

### Table

- [ ] Request ID.
- [ ] Configured Masters.
- [ ] Entries Count.
- [ ] Initiator.
- [ ] Date.
- [ ] Status.
- [ ] View action.

## 10.2 Create Request

### Select Masters

- [ ] Product Group (MG2).
- [ ] Product Category (MG3).
- [ ] Product Type (MG4).
- [ ] Product Source (MG5).
- [ ] Color (MGP1A).
- [ ] Product Range (MGP2A).
- [ ] Product Sub Category (MGP3A).
- [ ] Material Group.
- [ ] Ext. Material Group.
- [ ] Product Segment.
- [ ] Multi-select required.
- [ ] Select All.
- [ ] Clear All.

### Master Details

- [ ] Code – Optional for Initiator.
- [ ] Description – Mandatory.
- [ ] Delete row.
- [ ] Add Row per master.

### Footer

- [ ] Cancel.
- [ ] Save as Draft.
- [ ] Submit to Consultant.

---

# 11. Vertical Head

## 11.1 Screens

- [ ] All Requests.
- [ ] Pending Approval.
- [ ] Approved Requests.

### Rules

- [ ] All Requests scoped to mapped brand(s).
- [ ] Pending Approval search.
- [ ] Pending-item counter.
- [ ] Approved Requests search.
- [ ] Brand filter.
- [ ] Export CSV.

## 11.2 Request Detail & Action

### Header – Read Only

- [ ] Brand.
- [ ] Material Type.
- [ ] Plant / Source.
- [ ] Current Status.

### Item Details

- [ ] Same NPD item structure.
- [ ] Read-only for Vertical Head.

### Actions

- [ ] Approve → MIS Coordinator.
- [ ] Rework → Initiator.
- [ ] Reject → Permanently closed.

---

# 12. MIS Coordinator

## 12.1 Screens

- [ ] All Requests.
- [ ] Pending Approval.
- [ ] Approved Requests.

### Rules

- [ ] All Requests includes pending action.
- [ ] All Requests includes requests already posted to SAP by self.
- [ ] Pending Approval contains requests approved by Vertical Head and routed to self.
- [ ] Approved Requests contains requests posted to SAP by self.

## 12.2 Request Detail & Action

### General Header – Read Only

- [ ] Brand.
- [ ] Material Type.
- [ ] Plant / Source.
- [ ] Current Status.

### Item Details – Editable

- [ ] Edit Item Details.
- [ ] Add Line Item.
- [ ] Maintain same column structure as NPD form.

## 12.3 Other Details

- [ ] Plant Code.
- [ ] Storage Location.
- [ ] Profit Center.
- [ ] MRP Group.
- [ ] MRP Controller.
- [ ] Valuation Class.
- [ ] Class Type.
- [ ] Material Extension.
- [ ] SAP Posting Comments.

### Auto-Population

- [ ] Storage Location sourced from Plant Master.
- [ ] MRP Group sourced from Plant Master.
- [ ] MRP Controller sourced from Plant Master.
- [ ] Material Extension sourced from Brand Material Extension Master.
- [ ] Material Extension remains editable.

### Conditional Plant / Valuation Logic

- [ ] Finished Products → Plant Code same as Plant/Source.
- [ ] Finished Products → Valuation Class = 6000.
- [ ] Traded Products + Domestic → Plant Code = CCWH.
- [ ] Traded Products + Domestic → Valuation Class = 5000.
- [ ] Traded Products + Imported → Plant Code = CCWH.
- [ ] Traded Products + Imported → Valuation Class = 5100.
- [ ] Class Type always = 001.

### Actions

- [ ] Post to SAP → Completed.
- [ ] Rework → Initiator.
- [ ] Reject → Permanently closed.

---

# 13. Consultant

## 13.1 Screens

- [ ] All Requests.
- [ ] Pending Request.
- [ ] Completed Request.

### Actions

- [ ] Pending row → Edit.
- [ ] Completed row → View.
- [ ] Search.
- [ ] Dynamic request count.

## 13.2 Consultant Review & Edit

### Header

- [ ] Request ID.
- [ ] Initiator.
- [ ] Submission Date.
- [ ] Back to Requests.

### Configured Masters

- [ ] Read-only master badges.
- [ ] Categories Selected count.

### Master Details

- [ ] Code – Mandatory for Consultant.
- [ ] Description – Mandatory.
- [ ] Description pre-filled.
- [ ] Description editable.
- [ ] Delete row.
- [ ] Add Row per master.

### Additional

- [ ] Consultant Remarks / SAP Configuration Note.

### Actions

- [ ] Complete Request → Completed.
- [ ] Send Back for ReWork → Initiator.
- [ ] Reject → Permanently closed.
- [ ] Cancel → Discard changes and exit.

---

# 14. Analytics & Reports

All five roles have access to Analytics & Reports according to the functional access matrix.

- [ ] Reports navigation.
- [ ] Role-based report visibility.
- [ ] Validate report data.
- [ ] Validate request counts.
- [ ] Validate status values.
- [ ] Validate filters/search where applicable.
- [ ] Validate export where applicable.

---

# 15. Search / Filter / Export Checklist

- [ ] NPD Admin search by Request ID.
- [ ] NPD Admin search by Title.
- [ ] NPD Admin search by Brand.
- [ ] NPD Admin search by Code.
- [ ] NPD Admin search by Material.
- [ ] NPD Admin Status filter.
- [ ] NPD Admin Brand filter.
- [ ] NPD Admin Export CSV.
- [ ] Material Group search by ID.
- [ ] Material Group search by Master.
- [ ] Material Group search by Code.
- [ ] Material Master search/filter.
- [ ] Plant Master search.
- [ ] Plant Master Export.
- [ ] Role/Approver/Extension list actions.
- [ ] Role-specific request searches.

---

# 16. Data Relationships

```text
Lookup Type Master
        ↓
Lookup Master

Plant Master
        ↓
Brand Material Extension Master

Role Master
        ↓
Approver Configuration Master

NPD Request
        ↓
On Completed
        ↓
Material Master
```

Checklist:

- [ ] Lookup Type feeds Lookup Master.
- [ ] Plant Master feeds Brand Material Extension.
- [ ] Role Master feeds Approver Configuration.
- [ ] Completed NPD updates Material Master.
- [ ] Approver Configuration supports routing.
- [ ] Brand mapping works correctly.
- [ ] Plant/warehouse mapping works correctly.

---

# 17. Power Automate / Workflow Automation Checklist

## NPD

- [ ] Request creation trigger.
- [ ] Request ID generation.
- [ ] Draft handling.
- [ ] Submit handling.
- [ ] Vertical Head identification.
- [ ] Vertical Head routing.
- [ ] Approve handling.
- [ ] Rework handling.
- [ ] Reject handling.
- [ ] MIS Coordinator identification.
- [ ] MIS Coordinator routing.
- [ ] SAP posting handling.
- [ ] Completed status update.
- [ ] Material Master update.
- [ ] Resubmission handling.

## New Material Group

- [ ] Request creation trigger.
- [ ] Request ID generation.
- [ ] Draft handling.
- [ ] Consultant identification.
- [ ] Consultant routing.
- [ ] Complete handling.
- [ ] Rework handling.
- [ ] Reject handling.
- [ ] Resubmission handling.

---

# 18. Validation Checklist

## Common

- [ ] Mandatory field validation.
- [ ] Invalid input validation.
- [ ] Character length validation.
- [ ] Dropdown validation.
- [ ] Conditional field validation.
- [ ] Duplicate handling where applicable.
- [ ] Save Draft validation.
- [ ] Submit validation.
- [ ] Unauthorized action blocked.
- [ ] Role-based access enforced.

## NPD

- [ ] Material Code max 18 characters.
- [ ] Material Description max 40 characters.
- [ ] Roca Global Code conditional validation.
- [ ] Roca Global Code mandatory for Roca/Laufen/Armani.
- [ ] Plant/Source disabled until Material Type selected.
- [ ] At least required item details completed.

## New Material Group

- [ ] At least one master selected.
- [ ] Description mandatory.
- [ ] Code optional for Initiator.
- [ ] Consultant Code mandatory.
- [ ] Consultant Description mandatory.

---

# 19. Security / Permission Checklist

- [ ] Initiator cannot access another Initiator's requests.
- [ ] Vertical Head sees only mapped brand requests.
- [ ] MIS Coordinator sees assigned requests.
- [ ] Consultant sees assigned Material Group requests.
- [ ] Admin sees all requests.
- [ ] Initiator cannot Approve.
- [ ] Initiator cannot Reject.
- [ ] Initiator cannot perform approval actions.
- [ ] Vertical Head cannot perform MIS Coordinator actions.
- [ ] MIS Coordinator cannot perform Consultant actions.
- [ ] Consultant cannot access NPD actions.
- [ ] Admin master-management permissions verified.

---

# 20. UI / UX Checklist

- [ ] Navigation matches role.
- [ ] Section headings match requirement document.
- [ ] Table columns match requirement document.
- [ ] Action icons are available only where applicable.
- [ ] Status badges use defined status meanings.
- [ ] Counters display correct dynamic values.
- [ ] Search boxes work.
- [ ] Filters work.
- [ ] Empty states handled.
- [ ] Loading states handled.
- [ ] Error messages handled.
- [ ] Success messages handled.
- [ ] Form Cancel/Back behavior verified.
- [ ] Read-only screens cannot be edited.
- [ ] Editable screens allow required actions only.

---

# 21. Testing Checklist

## Functional Testing

- [ ] Login / role identification.
- [ ] Navigation.
- [ ] Create.
- [ ] Edit.
- [ ] View.
- [ ] Delete where applicable.
- [ ] Search.
- [ ] Filter.
- [ ] Export.
- [ ] Save Draft.
- [ ] Submit.
- [ ] Approve.
- [ ] Rework.
- [ ] Reject.
- [ ] Complete.
- [ ] Post to SAP.

## Workflow Testing

- [ ] Initiator → Vertical Head.
- [ ] Vertical Head → MIS Coordinator.
- [ ] MIS Coordinator → SAP.
- [ ] MIS Coordinator → Completed.
- [ ] Vertical Head → Initiator Rework.
- [ ] MIS Coordinator → Initiator Rework.
- [ ] Vertical Head → Reject.
- [ ] MIS Coordinator → Reject.
- [ ] Initiator → Consultant.
- [ ] Consultant → Completed.
- [ ] Consultant → Initiator Rework.
- [ ] Consultant → Reject.

## Negative Testing

- [ ] Missing mandatory fields.
- [ ] Invalid dropdown selection.
- [ ] Invalid conditional values.
- [ ] Exceeding character limits.
- [ ] Unauthorized role action.
- [ ] Rejected request resubmission blocked.
- [ ] Pending request editing blocked for Initiator.
- [ ] Completed request modification blocked where applicable.

## Regression Testing

- [ ] Existing master data.
- [ ] Existing requests.
- [ ] Existing workflow records.
- [ ] Role permissions.
- [ ] Search/filter.
- [ ] Reports.
- [ ] SAP posting.
- [ ] Material Master update.

---

# 22. UAT Checklist

- [ ] Admin UAT completed.
- [ ] Initiator UAT completed.
- [ ] Vertical Head UAT completed.
- [ ] MIS Coordinator UAT completed.
- [ ] Consultant UAT completed.
- [ ] NPD happy-path UAT.
- [ ] NPD Rework UAT.
- [ ] NPD Reject UAT.
- [ ] NPD SAP posting UAT.
- [ ] Material Master update UAT.
- [ ] Material Group happy-path UAT.
- [ ] Material Group Rework UAT.
- [ ] Material Group Reject UAT.
- [ ] Master data UAT.
- [ ] Reports UAT.
- [ ] Export UAT.

---

# 23. Deployment Checklist

## Pre-Deployment

- [ ] Requirement review completed.
- [ ] Development completed.
- [ ] Unit testing completed.
- [ ] Integration testing completed.
- [ ] Workflow testing completed.
- [ ] UAT completed.
- [ ] UAT defects closed.
- [ ] Master data prepared.
- [ ] SAP connectivity verified.
- [ ] Power Automate flows reviewed.
- [ ] Permissions reviewed.

## Deployment

- [ ] Application/package deployed.
- [ ] Required lists/libraries/configuration created.
- [ ] Master data loaded.
- [ ] Power Automate flows enabled.
- [ ] Permissions assigned.
- [ ] SAP integration configured.
- [ ] Production configuration verified.

## Post-Deployment

- [ ] Login smoke test.
- [ ] Role access smoke test.
- [ ] NPD create test.
- [ ] NPD approval test.
- [ ] NPD SAP posting test.
- [ ] Material Master update test.
- [ ] Material Group create test.
- [ ] Consultant completion test.
- [ ] Rework test.
- [ ] Reject test.
- [ ] Reports test.
- [ ] Export test.
- [ ] Production sign-off.

---

# 24. Email Notification

> **Pending requirement:** The requirement document states that email notification content will be updated after receiving the email content from the ROCA team.

- [ ] Receive email content from ROCA.
- [ ] Finalize notification scenarios.
- [ ] Identify recipients.
- [ ] Identify trigger conditions.
- [ ] Prepare email templates.
- [ ] Implement notifications.
- [ ] Test notifications.
- [ ] Validate dynamic request details.
- [ ] Validate recipient mapping.
- [ ] UAT notification flow.
- [ ] Production enablement.

---

# 25. Requirement Traceability

Use this section to map every requirement to development and testing.

| ID | Requirement | Module | Development | Testing | UAT | Status | Remarks |
|---|---|---|---|---|---|---|---|
| REQ-001 | Role-based access | Security | [ ] | [ ] | [ ] | Not Started | |
| REQ-002 | NPD Request | NPD | [ ] | [ ] | [ ] | Not Started | |
| REQ-003 | NPD Approval Workflow | Workflow | [ ] | [ ] | [ ] | Not Started | |
| REQ-004 | MIS SAP Processing | MIS | [ ] | [ ] | [ ] | Not Started | |
| REQ-005 | Material Master Update | Admin | [ ] | [ ] | [ ] | Not Started | |
| REQ-006 | New Material Group | Material Group | [ ] | [ ] | [ ] | Not Started | |
| REQ-007 | Consultant Workflow | Workflow | [ ] | [ ] | [ ] | Not Started | |
| REQ-008 | Administration Masters | Admin | [ ] | [ ] | [ ] | Not Started | |
| REQ-009 | Analytics & Reports | Reports | [ ] | [ ] | [ ] | Not Started | |
| REQ-010 | Email Notifications | Automation | [ ] | [ ] | [ ] | Pending ROCA Content | |

---

# 26. Development Progress

## Phase 1 – Foundation

- [ ] Project setup.
- [ ] Environment configuration.
- [ ] Authentication / user identification.
- [ ] Role setup.
- [ ] Base navigation.
- [ ] Common components.
- [ ] Common validation.
- [ ] Error handling.

## Phase 2 – Administration

- [ ] Material Master.
- [ ] Lookup Type Master.
- [ ] Lookup Master.
- [ ] Plant Master.
- [ ] Role Master.
- [ ] Approver Configuration.
- [ ] Brand Material Extension.
- [ ] Master relationships.

## Phase 3 – NPD Initiator

- [ ] All Requests.
- [ ] Pending Approval.
- [ ] Approved Requests.
- [ ] Draft/ReWork.
- [ ] New NPD Request.
- [ ] Item Details.
- [ ] Conditional fields.
- [ ] Draft.
- [ ] Submit.

## Phase 4 – Vertical Head

- [ ] All Requests.
- [ ] Pending Approval.
- [ ] Approved Requests.
- [ ] Request Detail.
- [ ] Approve.
- [ ] Rework.
- [ ] Reject.

## Phase 5 – MIS Coordinator

- [ ] All Requests.
- [ ] Pending Approval.
- [ ] Approved Requests.
- [ ] Editable Item Details.
- [ ] Other Details.
- [ ] Auto-population logic.
- [ ] SAP Posting.
- [ ] Rework.
- [ ] Reject.

## Phase 6 – New Material Group

- [ ] Initiator screens.
- [ ] Create form.
- [ ] Master selection.
- [ ] Code/Description.
- [ ] Consultant screens.
- [ ] Consultant Review & Edit.
- [ ] Complete.
- [ ] Rework.
- [ ] Reject.

## Phase 7 – Automation

- [ ] NPD routing.
- [ ] Material Group routing.
- [ ] Rework automation.
- [ ] Reject automation.
- [ ] SAP posting integration.
- [ ] Material Master automation.
- [ ] Email notifications.

## Phase 8 – Reports

- [ ] Analytics navigation.
- [ ] Reports.
- [ ] Role-based visibility.
- [ ] Filters/search.
- [ ] Export.

## Phase 9 – Testing & UAT

- [ ] Unit Testing.
- [ ] Integration Testing.
- [ ] Workflow Testing.
- [ ] Security Testing.
- [ ] Regression Testing.
- [ ] UAT.
- [ ] Defect closure.

## Phase 10 – Deployment

- [ ] Production deployment.
- [ ] Configuration.
- [ ] Master data.
- [ ] Flows.
- [ ] Permissions.
- [ ] SAP.
- [ ] Smoke test.
- [ ] Sign-off.

---

# 27. Issues / Blockers

| ID | Issue / Blocker | Module | Owner | Priority | Status | Remarks |
|---|---|---|---|---|---|---|
| BLK-001 | Email content pending from ROCA | Notifications | | Medium | Open | Requirement document says content is pending |
| BLK-002 | | | | | Open | |
| BLK-003 | | | | | Open | |

---

# 28. Change Request Log

| CR ID | Date | Requirement / Change | Impacted Module | Priority | Status | Approved By |
|---|---|---|---|---|---|---|
| CR-001 | | | | | Open | |
| CR-002 | | | | | Open | |

---

# 29. Defect Tracker

| Defect ID | Module | Description | Severity | Assigned To | Status | Retest |
|---|---|---|---|---|---|---|
| BUG-001 | | | | | Open | [ ] |
| BUG-002 | | | | | Open | [ ] |
| BUG-003 | | | | | Open | [ ] |

---

# 30. Final Completion Checklist

- [ ] All functional requirements implemented.
- [ ] All roles implemented.
- [ ] All screens implemented.
- [ ] All validations implemented.
- [ ] All workflow paths implemented.
- [ ] Rework completed and tested.
- [ ] Reject completed and tested.
- [ ] SAP posting completed and tested.
- [ ] Material Master update completed and tested.
- [ ] All administration masters completed.
- [ ] Analytics & Reports completed.
- [ ] Search/filter/export completed.
- [ ] Security/permissions validated.
- [ ] Power Automate workflows completed.
- [ ] Email notification requirement completed after ROCA content is received.
- [ ] UAT completed.
- [ ] All critical defects closed.
- [ ] Production deployment completed.
- [ ] Production smoke testing completed.
- [ ] Business sign-off received.

---

# 31. Project Status Summary

| Area | Status |
|---|---|
| Project Setup | Not Started |
| Administration | Not Started |
| NPD Initiator | Not Started |
| Vertical Head | Not Started |
| MIS Coordinator | Not Started |
| New Material Group | Not Started |
| Consultant | Not Started |
| Workflow Automation | Not Started |
| SAP Integration | Not Started |
| Material Master | Not Started |
| Reports | Not Started |
| Email Notifications | Pending ROCA Content |
| Testing | Not Started |
| UAT | Not Started |
| Deployment | Not Started |

---

## Working Rule

Update this file continuously during development.

**Technical standards:** All implementation must follow `TechnicalArchitecture.md` and **`ProjectStandards.md`** (component-based UI, PrimeReact common wrappers, Redux data flow, theme rules).

For every task:
1. Mark the task checkbox.
2. Update the status in the relevant tracker.
3. Record blockers/issues.
4. Record requirement changes in the Change Request Log.
5. Record defects separately.
6. Move to UAT only after development and functional testing are completed.
7. Mark the final task as completed only after validation/sign-off.

