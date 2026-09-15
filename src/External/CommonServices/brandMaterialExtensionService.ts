import { Config } from "./Config";
import type { IBrandMaterialExtension } from "./Interface";
import {
  joinCommaSeparatedPlants,
  parseCommaSeparatedPlants,
} from "./plantValueUtils";
import {
  getActiveRecordCreatePayload,
  getActiveRecordFilters,
  getSoftDeletePayload,
  isActiveRecord,
  SOFT_DELETE_FIELD,
} from "./softDelete";
import SPServices from "./SPServices";

const LIST_NAME = (): string => Config.ListNames.BrandMaterialExtension;

const SELECT_FIELDS = "Id,Title,Plant,IsDeleted";

function mapBrandMaterialExtension(
  item: Record<string, unknown>,
): IBrandMaterialExtension {
  const plantValue = String(item.Plant ?? "");

  return {
    Id: Number(item.Id),
    Brand: String(item.Title ?? ""),
    Plant: plantValue,
    Plants: parseCommaSeparatedPlants(plantValue),
    IsDeleted: Boolean(item[SOFT_DELETE_FIELD]),
  };
}

export async function fetchActiveBrandMaterialExtensions(): Promise<
  IBrandMaterialExtension[]
> {
  const rows = (await SPServices.SPReadItems({
    Listname: LIST_NAME(),
    Select: SELECT_FIELDS,
    Filter: getActiveRecordFilters(),
    Orderby: "Title",
    Orderbydecorasc: true,
  })) as Record<string, unknown>[];

  return rows.map(mapBrandMaterialExtension).filter(isActiveRecord);
}

export async function createBrandMaterialExtension(
  brand: string,
  plants: string[],
): Promise<void> {
  await SPServices.SPAddItem({
    Listname: LIST_NAME(),
    RequestJSON: {
      Title: brand.trim(),
      Plant: joinCommaSeparatedPlants(plants),
      ...getActiveRecordCreatePayload(),
    },
  });
}

export async function updateBrandMaterialExtension(
  id: number,
  brand: string,
  plants: string[],
): Promise<void> {
  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: id,
    RequestJSON: {
      Title: brand.trim(),
      Plant: joinCommaSeparatedPlants(plants),
    },
  });
}

export async function softDeleteBrandMaterialExtension(id: number): Promise<void> {
  await SPServices.SPUpdateItem({
    Listname: LIST_NAME(),
    ID: id,
    RequestJSON: getSoftDeletePayload(),
  });
}
