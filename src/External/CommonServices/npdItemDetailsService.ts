import { Config } from "./Config";
import type { INpdItemDetailRecord } from "./Interface";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.NpdItemDetails;
const FIELDS = Config.FieldNames.NpdItemDetails;
const SEPARATOR = Config.NpdItemImport.MultiValueSeparator;

const SELECT_FIELDS = [
  "Id",
  FIELDS.Title,
  FIELDS.RocaGlobalCode,
  FIELDS.MaterialCode,
  FIELDS.MaterialDescription,
  FIELDS.ProductGroupMG2,
  FIELDS.ProductCategoryMG3,
  FIELDS.ProductTypeMG4,
  FIELDS.ProductSourceMG5,
  FIELDS.ColorMGP1A,
  FIELDS.ProductRangeMGP2A,
  FIELDS.ProductSubCategoryMGP3A,
  FIELDS.MaterialGroup,
  FIELDS.ExtMaterialGroup,
  FIELDS.ProductSegment,
  FIELDS.TaxClassification,
  FIELDS.ClassNumberPcsName,
  FIELDS.HSNCode,
  FIELDS.Weight,
  FIELDS.UOM,
  FIELDS.MinQty,
  FIELDS.RequestGeneralInfoId,
].join(",");

function splitMultiValue(value: unknown): string[] {
  return String(value ?? "")
    .split(/[;,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinMultiValue(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(SEPARATOR);
}

function readText(item: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && String(item[key]).length) {
      return String(item[key]);
    }
  }
  return "";
}

function mapItem(item: Record<string, unknown>): INpdItemDetailRecord {
  const weightRaw = item[FIELDS.Weight];
  const weightNumber = Number(weightRaw);

  return {
    sharePointId: Number(item.Id) || 0,
    rocaGlobalCode: readText(item, FIELDS.RocaGlobalCode),
    materialCode: readText(item, FIELDS.MaterialCode),
    materialDescription: readText(item, FIELDS.MaterialDescription),
    productGroupMg2: splitMultiValue(item[FIELDS.ProductGroupMG2]),
    productCategoryMg3: splitMultiValue(item[FIELDS.ProductCategoryMG3]),
    productTypeMg4: splitMultiValue(item[FIELDS.ProductTypeMG4]),
    productSourceMg5: splitMultiValue(item[FIELDS.ProductSourceMG5]),
    colorMgp1a: splitMultiValue(item[FIELDS.ColorMGP1A]),
    productRangeMgp2a: splitMultiValue(item[FIELDS.ProductRangeMGP2A]),
    productSubCategoryMgp3a: splitMultiValue(item[FIELDS.ProductSubCategoryMGP3A]),
    materialGroup: splitMultiValue(item[FIELDS.MaterialGroup]),
    extMaterialGroup: splitMultiValue(item[FIELDS.ExtMaterialGroup]),
    productSegment: splitMultiValue(item[FIELDS.ProductSegment]),
    taxClassification: splitMultiValue(item[FIELDS.TaxClassification]),
    classNumberPcsName: splitMultiValue(
      readText(item, FIELDS.ClassNumberPcsName, "ClassNumberPCS Name"),
    ),
    hsnCode: readText(item, FIELDS.HSNCode),
    weightKg:
      weightRaw === null || weightRaw === undefined || weightRaw === ""
        ? null
        : Number.isFinite(weightNumber)
          ? weightNumber
          : null,
    uom: splitMultiValue(item[FIELDS.UOM]),
    minQtyBoxQty: readText(item, FIELDS.MinQty),
    isMisAdded: readText(item, FIELDS.Title) === "MIS_ADDED",
  };
}

function toSharePointPayload(
  record: INpdItemDetailRecord,
  requestId: number,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    [FIELDS.Title]: record.isMisAdded ? "MIS_ADDED" : "",
    [FIELDS.RocaGlobalCode]: record.rocaGlobalCode.trim(),
    [FIELDS.MaterialCode]: record.materialCode.trim(),
    [FIELDS.MaterialDescription]: record.materialDescription.trim(),
    [FIELDS.ProductGroupMG2]: joinMultiValue(record.productGroupMg2),
    [FIELDS.ProductCategoryMG3]: joinMultiValue(record.productCategoryMg3),
    [FIELDS.ProductTypeMG4]: joinMultiValue(record.productTypeMg4),
    [FIELDS.ProductSourceMG5]: joinMultiValue(record.productSourceMg5),
    [FIELDS.ColorMGP1A]: joinMultiValue(record.colorMgp1a),
    [FIELDS.ProductRangeMGP2A]: joinMultiValue(record.productRangeMgp2a),
    [FIELDS.ProductSubCategoryMGP3A]: joinMultiValue(record.productSubCategoryMgp3a),
    [FIELDS.MaterialGroup]: joinMultiValue(record.materialGroup),
    [FIELDS.ExtMaterialGroup]: joinMultiValue(record.extMaterialGroup),
    [FIELDS.ProductSegment]: joinMultiValue(record.productSegment),
    [FIELDS.TaxClassification]: joinMultiValue(record.taxClassification),
    [FIELDS.ClassNumberPcsName]: joinMultiValue(record.classNumberPcsName),
    [FIELDS.HSNCode]: record.hsnCode.trim(),
    [FIELDS.UOM]: joinMultiValue(record.uom),
    [FIELDS.MinQty]: record.minQtyBoxQty.trim(),
    [FIELDS.RequestGeneralInfoId]: requestId,
  };

  if (record.weightKg !== null && Number.isFinite(record.weightKg)) {
    payload[FIELDS.Weight] = record.weightKg;
  }

  return payload;
}

export async function fetchNpdItemDetailsByRequestId(
  requestId: number,
): Promise<INpdItemDetailRecord[]> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: SELECT_FIELDS,
    Filter: [
      {
        FilterKey: FIELDS.RequestGeneralInfoId,
        Operator: "eq",
        FilterValue: String(requestId),
      },
    ],
    Orderby: "Id",
    Orderbydecorasc: true,
    Topcount: 5000,
  })) as Record<string, unknown>[];

  return rows.map(mapItem);
}

function isPersistableItem(record: INpdItemDetailRecord): boolean {
  return Boolean(
    record.materialCode.trim() || record.materialDescription.trim(),
  );
}

export async function saveNpdItemDetailsBatch(
  requestId: number,
  records: INpdItemDetailRecord[],
  isNewRequest = false,
): Promise<void> {
  const persistable = records.filter(isPersistableItem);
  const toUpdate = persistable
    .filter((record) => record.sharePointId > 0)
    .map((record) => ({
      ID: record.sharePointId,
      ...toSharePointPayload(record, requestId),
    }));
  const toInsert = persistable
    .filter((record) => !record.sharePointId)
    .map((record) => toSharePointPayload(record, requestId));

  let toDelete: { ID: number }[] = [];
  if (!isNewRequest) {
    const existing = await fetchNpdItemDetailsByRequestId(requestId);
    const keepIds = new Set(
      persistable.map((record) => record.sharePointId).filter((id) => id > 0),
    );
    toDelete = existing
      .filter((item) => item.sharePointId > 0 && !keepIds.has(item.sharePointId))
      .map((item) => ({ ID: item.sharePointId }));
  }

  if (!toDelete.length && !toUpdate.length && !toInsert.length) {
    return;
  }

  await SPServices.batchMutate({
    ListName: LIST_NAME(),
    remove: toDelete,
    update: toUpdate,
    insert: toInsert,
  });
}
