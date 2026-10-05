import assert from "node:assert/strict";
import type { INpdItemDetailRecord, INpdOtherDetails } from "../src/External/CommonServices/Interface";
import { SapMaterialMasterApi } from "../src/External/CommonServices/Config";
import {
  isSapMaterialMasterProductionSite,
  resolveSapMaterialMasterApiUrl,
} from "../src/External/CommonServices/sapMaterialMasterApiUrl";
import { SapMaterialMasterFieldLengths } from "../src/External/CommonServices/sapMaterialMasterFieldConfig";
import { Config } from "../src/External/CommonServices/Config";
import {
  buildSapMaterialMasterRequestRow,
  type ISapMaterialMasterRequestRow,
} from "../src/External/CommonServices/sapMaterialMasterPayload";
import {
  createPassthroughSapLookupCodeResolver,
  createSapLookupCodeResolver,
} from "../src/External/CommonServices/sapMaterialMasterLookupResolver";
import { postItemDetailsToSap } from "../src/External/CommonServices/sapMaterialMasterPostFlow";
import {
  assertSapMaterialMasterSuccess,
  postSapMaterialMasterRow,
} from "../src/External/CommonServices/sapMaterialMasterResponse";

function item(
  partial: Partial<INpdItemDetailRecord> & Pick<INpdItemDetailRecord, "sharePointId" | "materialCode">,
): INpdItemDetailRecord {
  return {
    sharePointId: partial.sharePointId,
    rocaGlobalCode: "",
    materialCode: partial.materialCode,
    materialDescription: partial.materialDescription || `${partial.materialCode} desc`,
    productGroupMg2: partial.productGroupMg2 || ["SWR"],
    productCategoryMg3: partial.productCategoryMg3 || ["108"],
    productTypeMg4: partial.productTypeMg4 || ["006"],
    productSourceMg5: partial.productSourceMg5 || ["4R"],
    colorMgp1a: partial.colorMgp1a || ["LF"],
    productRangeMgp2a: partial.productRangeMgp2a || ["VC"],
    productSubCategoryMgp3a: partial.productSubCategoryMgp3a || ["A12"],
    materialGroup: partial.materialGroup || ["C200"],
    extMaterialGroup: partial.extMaterialGroup || ["EXTGRP01"],
    productSegment: partial.productSegment || ["PA"],
    taxClassification: partial.taxClassification || ["1"],
    classNumberPcsName: partial.classNumberPcsName || ["22-01-01"],
    hsnCode: partial.hsnCode || "69101000",
    weightKg: partial.weightKg === undefined ? 10.5 : partial.weightKg,
    uom: partial.uom || ["PC"],
    minQtyBoxQty: "",
    sapPosted: partial.sapPosted,
  };
}

const otherDetails: INpdOtherDetails = {
  plantCode: "CCWH",
  storageLocation: "0023",
  profitCenter: "PIRU",
  mrpGroup: "FERT",
  mrpController: "600",
  valuationClass: "Finished Product - 6000",
  classType: "001",
  materialExtension: "CCHB, CCWH",
};

const passthroughLookupResolver = createPassthroughSapLookupCodeResolver();

function build(
  row: INpdItemDetailRecord,
  plant = "CALW",
  materialType = Config.NpdMaterialTypes.FinishedProducts,
): ISapMaterialMasterRequestRow {
  return buildSapMaterialMasterRequestRow(
    {
      item: row,
      materialType,
      plant,
      brand: "PW",
      otherDetails,
    },
    { lookupResolver: passthroughLookupResolver },
  );
}

const payload = build(item({ sharePointId: 1, materialCode: "MAT100001" }));
const keys = Object.keys(SapMaterialMasterFieldLengths);
assert.deepEqual(Object.keys(payload), keys);

(Object.keys(payload) as (keyof ISapMaterialMasterRequestRow)[]).forEach((key) => {
  const maxLength = SapMaterialMasterFieldLengths[key];
  if (maxLength !== null) {
    assert.ok(
      payload[key].length <= maxLength,
      `${key} length ${payload[key].length} exceeds ${maxLength}`,
    );
  }
});

assert.equal(payload.material, "MAT100001");
assert.equal(payload.matl_desc, "MAT100001 desc");
assert.equal(payload.matl_type, "FERT");
assert.equal(
  build(item({ sharePointId: 3, materialCode: "MAT3" }), "CCWH", Config.NpdMaterialTypes.TradedProducts)
    .matl_type,
  "HAWA",
);

const segmentResolver = createSapLookupCodeResolver([
  {
    Id: 1,
    LookupName: "ABC",
    LookupCode: "1001",
    LookupTypeTitle: "Product Segment",
    LookupTypeId: 1,
    IsDeleted: false,
    Modified: "",
  },
]);
const segmentPayload = buildSapMaterialMasterRequestRow(
  {
    item: item({
      sharePointId: 4,
      materialCode: "MAT4",
      productSegment: ["ABC"],
    }),
    materialType: Config.NpdMaterialTypes.FinishedProducts,
    plant: "CALW",
    brand: "PW",
    otherDetails,
  },
  { lookupResolver: segmentResolver },
);
assert.equal(segmentPayload.comm_group, "1001");
assert.equal(payload.old_mat_no, "");
assert.equal(payload.basic_matl, "");
assert.equal(payload.gross_wt, "10.500");
assert.equal(payload.net_weight, "10.500");
assert.equal(payload.val_class, "6000");
assert.equal(payload.mat_extn_plant, "CCHB,CCWH");
assert.equal(payload.plant, "CALW");
assert.equal(build(item({ sharePointId: 2, materialCode: "MAT2" }), "Imported").plant, "CCWH");

assert.doesNotThrow(() =>
  assertSapMaterialMasterSuccess(
    JSON.stringify([{ status: "True", matnr: "MAT100001", message: "Material Created Successfully" }]),
    "MAT100001",
  ),
);
assert.throws(
  () =>
    assertSapMaterialMasterSuccess(
      JSON.stringify([{ status: "False", matnr: "MAT100001", message: "Material Code already exist" }]),
      "MAT100001",
    ),
  /Material Code already exist/,
);
assert.throws(
  () =>
    assertSapMaterialMasterSuccess(
      JSON.stringify([{ status: "False", matnr: "MAT100001", message: "Backend error" }]),
      "MAT100001",
    ),
  /Backend error/,
);

assert.equal(
  resolveSapMaterialMasterApiUrl("https://chandrudemo.sharepoint.com/sites/ROCA_NPD"),
  SapMaterialMasterApi.DevelopmentUrl,
);
assert.equal(
  resolveSapMaterialMasterApiUrl("https://rocasanitario.sharepoint.com/sites/RINMASTERDEV"),
  SapMaterialMasterApi.DevelopmentUrl,
);
assert.equal(isSapMaterialMasterProductionSite("https://rocasanitario.sharepoint.com/sites/rinpd"), true);
assert.throws(
  () => resolveSapMaterialMasterApiUrl("https://rocasanitario.sharepoint.com/sites/rinpd"),
  /Production SAP Material Master API URL is not configured/,
);

async function runFlow(): Promise<void> {
  const posted: string[] = [];
  const marked: number[] = [];
  const inserted: string[] = [];

  const deps = {
    postRow: async (row: ISapMaterialMasterRequestRow) => {
      posted.push(row.material);
      if (row.material === "FAIL") {
        return JSON.stringify([{ status: "False", matnr: "FAIL", message: "Material Code already exist" }]);
      }
      if (row.material === "ERR") {
        return JSON.stringify([{ status: "False", matnr: "ERR", message: "Backend error" }]);
      }
      return JSON.stringify([{ status: "True", matnr: row.material, message: "Material Created Successfully" }]);
    },
    assertSuccess: assertSapMaterialMasterSuccess,
    markPosted: async (id: number) => {
      marked.push(id);
    },
    insertMaster: async (row: INpdItemDetailRecord) => {
      if (row.materialCode === "MMFAIL") {
        throw new Error("Material Master insert failed");
      }
      inserted.push(row.materialCode);
    },
  };

  const first = [
    item({ sharePointId: 11, materialCode: "A" }),
    item({ sharePointId: 12, materialCode: "FAIL" }),
    item({ sharePointId: 13, materialCode: "B" }),
  ];
  await assert.rejects(() => postItemDetailsToSap(first, build, deps), /Material Code already exist/);
  assert.deepEqual(posted, ["A", "FAIL", "B"]);
  assert.deepEqual(marked, [11, 13]);
  assert.deepEqual(inserted, ["A", "B"]);
  assert.equal(first[0].sapPosted, true);
  assert.equal(first[1].sapPosted, undefined);
  assert.equal(first[2].sapPosted, true);

  posted.length = 0;
  marked.length = 0;
  inserted.length = 0;
  const retry = [
    item({ sharePointId: 11, materialCode: "A", sapPosted: true }),
    item({ sharePointId: 12, materialCode: "FAIL" }),
    item({ sharePointId: 13, materialCode: "B", sapPosted: true }),
  ];
  await assert.rejects(() => postItemDetailsToSap(retry, build, deps), /Material Code already exist/);
  assert.deepEqual(posted, ["FAIL"]);
  assert.deepEqual(marked, []);
  assert.deepEqual(inserted, ["A", "B"]);

  posted.length = 0;
  const calls: string[] = [];
  await postSapMaterialMasterRow(
    "https://example.test/create",
    build(item({ sharePointId: 1, materialCode: "MAT100001" })),
    async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      calls.push(JSON.stringify(body));
      assert.equal(Array.isArray(body), true);
      assert.equal(body.length, 1);
      assert.equal(body[0].material, "MAT100001");
      return new Response(JSON.stringify([{ status: "True", matnr: "MAT100001", message: "Material Created Successfully" }]), {
        status: 200,
      });
    },
  );
  assert.equal(calls.length, 1);

  await assert.rejects(
    () =>
      postSapMaterialMasterRow("https://example.test/create", payload, async () => {
        return new Response("nope", { status: 500 });
      }),
    /nope/,
  );

  const mmFail = [item({ sharePointId: 21, materialCode: "MMFAIL" })];
  await assert.rejects(() => postItemDetailsToSap(mmFail, build, deps), /Material Master insert failed/);
  assert.equal(mmFail[0].sapPosted, true);
  posted.length = 0;
  inserted.length = 0;
  mmFail[0].materialCode = "MMFAIL";
  const retryMaster = [item({ sharePointId: 21, materialCode: "OK", sapPosted: true })];
  await postItemDetailsToSap(retryMaster, build, {
    ...deps,
    insertMaster: async (row) => {
      inserted.push(row.materialCode);
    },
  });
  assert.deepEqual(posted, []);
  assert.deepEqual(inserted, ["OK"]);
}

runFlow().then(
  () => {
    console.log("SAP Material Master flow checks passed.");
  },
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
