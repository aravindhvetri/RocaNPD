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
  brand: string;
  materialType: string;
  plant: string;
  otherDetails: INpdOtherDetails;
  items: INpdItemDetailRecord[];
  siteUrl?: string;
}

/**
 * Sends each SAP=false Item Details line to createZMatMast.
 * Material Master insert and the SAP flag run only after that line's response is success.
 */
export async function postNpdItemsToSap(
  params: IPostNpdItemsToSapParams,
): Promise<void> {
  const apiUrl = resolveSapMaterialMasterApiUrl(params.siteUrl);
  const lookups = await fetchActiveLookups();
  const lookupResolver = createSapLookupCodeResolver(lookups);

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
      insertMaster: (item) =>
        insertMaterialMasterFromNpdItems({
          requestId: params.requestId,
          brand: params.brand,
          materialType: params.materialType,
          items: [item],
        }),
    },
  );
}
