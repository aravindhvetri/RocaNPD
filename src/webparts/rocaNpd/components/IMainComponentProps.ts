import { WebPartContext } from "@microsoft/sp-webpart-base";
import { SPFI } from "@pnp/sp";

export interface IMainComponentProps {
  spfxContext: WebPartContext;
  sp: SPFI;
}
