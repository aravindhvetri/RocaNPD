import type { INpdItemDetailRecord, INpdOtherDetails } from "./Interface";
import { insertMaterialMasterFromNpdItems } from "./materialMasterService";
import { markNpdItemDetailPostedToSap } from "./npdItemDetailsService";
import { resolveSapMaterialMasterApiUrl } from "./sapMaterialMasterApiUrl";
import { fetchActiveLookups } from "./lookupService";
import { buildSapMaterialMasterRequestRow } from "./sapMaterialMasterPayload";
import { postItemDetailsToSap } from "./sapMaterialMasterPostFlow";
import { createSapLookupCodeResolver } from "./sapMaterialMasterLookupResolver";
import {
  assertSapMaterialMasterSuccess,
  postSapMaterialMasterRow,
} from "./sapMaterialMasterResponse";

export interface IPostNpdItemsToSapParams {
  requestId: number;
  /**
   * BrandMaster.BrandCode — used by the SAP payload (unchanged).
   * Also written to NPD_MaterialMaster.BrandCode.
   */
  brand: string;
  /** Selected Brand title for NPD_MaterialMaster.Brand (not sent to SAP). */
  brandTitle?: string;
  materialType: string;
  plant: string;
  otherDetails: INpdOtherDetails;
  items: INpdItemDetailRecord[];
  siteUrl?: string;
  /** Fired at 0/total and after each successful SAP API + SAP flag write (remaining SAP=false count). */
  onProgress?: (
    posted: number,
    total: number,
    postedSharePointId?: number,
  ) => void;
}

/**
 * Sends each SAP=false Item Details line to createZMatMast and sets SAP=true
 * per success. NPD_MaterialMaster is written once after every line is SAP=true.
 */
export async function postNpdItemsToSap(
  params: IPostNpdItemsToSapParams,
): Promise<void> {
  const apiUrl = resolveSapMaterialMasterApiUrl(params.siteUrl);
  const lookups = await fetchActiveLookups();
  const lookupResolver = createSapLookupCodeResolver(lookups);
  const brandCode = params.brand.trim();
  const brandTitle = (params.brandTitle || params.brand).trim();

  await postItemDetailsToSap(
    params.items,
    (item) =>
      buildSapMaterialMasterRequestRow(
        {
          item,
          materialType: params.materialType,
          plant: params.plant,
          brand: params.brand,
          otherDetails: params.otherDetails,
        },
        { lookupResolver },
      ),
    {
      postRow: (row) => postSapMaterialMasterRow(apiUrl, row),
      assertSuccess: assertSapMaterialMasterSuccess,
      markPosted: markNpdItemDetailPostedToSap,
      insertMaster: (items) =>
        insertMaterialMasterFromNpdItems({
          requestId: params.requestId,
          brand: brandTitle,
          brandCode,
          materialType: params.materialType,
          items,
        }),
      onProgress: params.onProgress,
    },
  );
}
