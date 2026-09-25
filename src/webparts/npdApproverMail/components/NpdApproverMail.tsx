import * as React from "react";
import { spfi, SPFI, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/batching";
import "@pnp/sp/site-users/web";
import { Provider } from "react-redux";
import {
  setupSP,
  setupSpfxContext,
} from "../../../External/CommonServices/SPServices";
import { store } from "../../../store";
import type { INpdApproverMailProps } from "./INpdApproverMailProps";
import NpdApproverMailApp from "./NpdApproverMailApp";

const NpdApproverMail: React.FC<INpdApproverMailProps> = (props) => {
  const spRef = React.useRef<SPFI | null>(null);

  if (!spRef.current) {
    spRef.current = spfi().using(SPFx(props.context));
    setupSP(spRef.current);
    setupSpfxContext(props.context);
  }

  return (
    <Provider store={store}>
      <NpdApproverMailApp context={props.context} />
    </Provider>
  );
};

export default NpdApproverMail;
