Technical Design Document | Material Master Creation REST API 

### **TECHNICAL DESIGN DOCUMENT** 

# **Material Master Creation REST API** 

POST Service | ABAP REST Resource Implementation 

|**Item**|**Details**|
|---|---|
|Program / Implementation|IF_REST_RESOURCE~POST method (implementing REST resource<br>class name not present in supplied code).|
|Service Name|ZMATNPDCREATE|
|Backend Function Module|ZCR_RFC_MATERIAL_SAVEDATA|
|HTTP Method|POST|
|Content-Type|application/json|
|Document Version|1.0|



Confidential - SAP Technical Documentation 

Technical Design Document | Material Master Creation REST API 

## **1. Document Overview** 

This document describes the technical design of the REST POST method used to receive material data in JSON format, validate whether the material already exists in MARA, create the material through the custom function module ZCR_RFC_MATERIAL_SAVEDATA, and return a JSON response for each input record. 

The API supports multiple material objects in a single request because the request payload is deserialized into the internal table IT_DATA. 

## **2. Technical Objects** 

|**Object Type**|**Technical Name**|**Purpose**|
|---|---|---|
|REST Interface Method|IF_REST_RESOURCE~POST|Entry point for HTTP POST request processing.|
|Backend Function Module|ZCR_RFC_MATERIAL_SAVEDATA|Performs the actual material save/create<br>operation.|



## **3. API Interface Definition** 

|**Parameter**|**Value**|
|---|---|
|Service Name|ZMATNPDCREATE|
|Program / Method|ZCL_MAT_EXT_RH|
|HTTP Method|POST|
|Request Format|application/json|
|Response Format|application/json|
|Authentication|SAP Basic Authentication|
|Endpoint URI|SAP Q20 URL<br>http://vmerpqua202.08.roca.net:8000/sap/zmatnp<br>dcreate/materialcreation?sap-client=200|
|Backend Save FM|ZCR_RFC_MATERIAL_SAVEDATA|



## **4. Request JSON Structure - TY_DATA** 

The request payload is deserialized using CL_FDT_JSON=>JSON_TO_DATA into IT_DATA. Therefore, the JSON root must be an array. Each array element corresponds to one TY_DATA structure. 

|**JSON Field**|**ABAP Type / DDIC**|**Technical Type**|**Length**|**Description**|**Mapped To**|
|---|---|---|---|---|---|
|material|MATNR|CHAR/NUMC-like<br>material number domain|18|Material number|Header|
|matl_desc|MAKTX|CHAR|40|Material description.|Header|
|matl_type|MTART|CHAR|4|Material type.|Header|
|matl_group|MATKL|CHAR|9|Material group.|Header|
|base_uom|MEINS|UNIT/CHAR|3|Base unit of measure.|Header|
|plant|WERKS_D|CHAR|4|Plant for material<br>creation.|Header|
|stge_loc|LGORT_D|CHAR|4|Storage location.|Header|
|old_mat_no|BISMT|CHAR|18|blank|Header|
|extmatlgrp|EXTWG|CHAR|18|External material group.|Header|
|gross_wt|BRGEW|QUAN|13 (3 decimals)|Gross weight.|Header|
|net_weight|NTGEW|QUAN|13 (3 decimals)|Net weight.|Header|
|basic_matl|WRKST|CHAR|48|blank|Header|



Confidential - SAP Technical Documentation 

Technical Design Document | Material Master Creation REST API 

|**JSON Field**|**ABAP Type / DDIC**|**Technical Type**|**Length**|**Description**|**Mapped To**|
|---|---|---|---|---|---|
|klart|KLASSENART|CHAR|3|Class type.|Header|
|mat_extn_plant|Custom CHAR(100)|CHAR|100|Comma-separated plant<br>extension values; e.g.<br>CCHB,CDEW,CALW.|Header|
|taxclass_1|TAXKM|CHAR|1|Material tax<br>classification.|Sales|
|matl_grp_1|MVGR1|CHAR|3|Material group 1.|Sales|
|matl_grp_2|MVGR2|CHAR|3|Material group 2.|Sales|
|matl_grp_3|MVGR3|CHAR|3|Material group 3.|Sales|
|matl_grp_4|MVGR4|CHAR|3|Material group 4.|Sales|
|matl_grp_5|MVGR5|CHAR|3|Material group 5.|Sales|
|zzmvgr6|ZMGVR6|Custom DDIC type|TBC|Custom material group<br>6.|Sales|
|zzmvgr7|ZMVGR7|Custom DDIC type|TBC|Custom material group 7|Sales|
|zzmvgr8|ZMVGR8|Custom DDIC type|TBC|Custom material group<br>8.|Sales|
|profit_ctr|PRCTR|CHAR|10|Profit center.|Sales|
|ctrl_code|STEUC|CHAR|8|HSN Code|Sales|
|mrp_group|DISGR|CHAR|4|MRP group.|Sales|
|mrp_ctrler|DISPO|CHAR|3|MRP controller.|Sales|
|val_class|BKLAS|CHAR|4|Valuation class.|Sales|
|comm_group|PROVG|CHAR|2|product segment|Sales|
|mwert|ATWRT|CHAR|30|class number|Sales|



Length note: Standard SAP/DDIC lengths shown above are based on the referenced SAP data elements/domains. The exact runtime definition should be validated in SE11 for the target system, especially where customer-specific domains or releasespecific definitions are involved. 

## **5. Example Request JSON** 

[{"material":"MAT100001","matl_desc":"Example Material 

Description","matl_type":"FERT","matl_group":"C200","base_uom":"PC","plant":"CALW","stge_loc":"0023","old_mat_no":"OL DMAT001","extmatlgrp":"EXTGRP01","gross_wt":"10.500","net_weight":"10.000","basic_matl":"BASIC001","klart":"001","mat_ extn_plant":"CCHB,CCWH","taxclass_1":"1","matl_grp_1":"PW","matl_grp_2":"SWR","matl_grp_3":"108","matl_grp_4":"006"," matl_grp_5":"4R","zzmvgr6":"LF","zzmvgr7":"VC","zzmvgr8":"A12","profit_ctr":"PIRU","ctrl_code":"69101000","mrp_group":"FE RT","mrp_ctrler":"600","val_class":"6000","comm_group":"PA","mwert":"22-01-01"}, {"material":"MAT100002","matl_desc":"Example 

MaterialDescription","matl_type":"FERT","matl_group":"C200","base_uom":"EA","plant":"CALW","stge_loc":"0023","old_mat_ no":"OLDMAT001","extmatlgrp":"EXTGRP01","gross_wt":"10.500","net_weight":"10.000","basic_matl":"BASIC001","klart":"001 ","mat_extn_plant":"CCHB,CCWH","taxclass_1":"1","matl_grp_1":"PW","matl_grp_2":"SWR","matl_grp_3":"108","matl_grp_4": "006","matl_grp_5":"4R","zzmvgr6":"LF","zzmvgr7":"VC","zzmvgr8":"A12","profit_ctr":"PIRU","ctrl_code":"69101000","mrp_gro up":"FERT","mrp_ctrler":"600","val_class":"6000","comm_group":"PA","mwert":"22-01-01"}] 

Confidential - SAP Technical Documentation 

Technical Design Document | Material Master Creation REST API 

## **6. Response JSON Structure - TY_RESPONSE** 

|**JSON Field**|**ABAP Type**|**Technical Type**|**Length**|**Description**|
|---|---|---|---|---|
|status|STATUS|CHAR|5|Returns True for successful<br>creation or False for an<br>error/duplicate.|
|matnr|MATNR|SAP material number|18|Material number associated<br>with the result. Blank when<br>the request contains no<br>data.|
|message|Custom CHAR(100)|CHAR|100|Success or error message<br>returned to the caller.|



### **7. Example Response JSON - Success** 

[ { "status": "True", "matnr": "MAT100001", "message": "Material Created Successfully" } ] 

### **8. Example Response JSON - Existing Material** 

[ { "status": "False", "matnr": "MAT100001", "message": "Material Code already exist" } ] 

### **9. Example Response JSON - Backend Error** 

[ { "status": "False", "matnr": "MAT100001", "message": "<error message returned by ZCR_RFC_MATERIAL_SAVEDATA>" } ] 

## **10. Test Scenarios** 

|**Test ID**|**Scenario**|**Input / Condition**|**Expected Result**|
|---|---|---|---|
|TC01|Single new material|One new material with valid<br>mandatory data|Material Created Successfully; status<br>True.|
|TC02|Multiple new materials|Two or more new material objects in<br>one array|Each material processed and receives<br>its own response row.|
|TC03|Existing material|Material already present in MARA|Status False and message Material<br>Code already exist.|
|TC04|Mixed request|One existing material + one new<br>material|Existing one rejected; new one passed<br>to backend creation.|
|TC05|Empty array|[]|Status False and message Data not<br>received.|



Confidential - SAP Technical Documentation 

Technical Design Document | Material Master Creation REST API 

|**Test ID**|**Scenario**|**Input / Condition**|**Expected Result**|
|---|---|---|---|
|TC06|Backend validation error|Valid JSON but backend FM returns<br>BAPIRET2 TYPE=E|Status False with backend error<br>message.|
|TC07|mat_extn_plant list|Value such as CCHB,CDEW,CALW<br>within 100 chars|Value received intact in WA_HEADER-<br>MAT_EXTN_PLANT.|



Confidential - SAP Technical Documentation 

