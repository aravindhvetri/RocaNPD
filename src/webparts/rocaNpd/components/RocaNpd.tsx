import * as React from "react";
import { spfi, SPFI, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/batching";
import "@pnp/sp/attachments";
import "@pnp/sp/fields";
import "@pnp/sp/files";
import "@pnp/sp/folders";
import "@pnp/sp/site-users/web";
import "@pnp/sp/site-groups/web";
import { Provider } from "react-redux";
import type { IRocaNpdProps } from "./IRocaNpdProps";
import { setupSP } from "../../../External/CommonServices/SPServices";
import { store } from "../../../store";
import MainComponent from "./MainComponent";

export default class RocaNpd extends React.Component<IRocaNpdProps> {
  private readonly _sp: SPFI;

  public constructor(props: IRocaNpdProps) {
    super(props);
    this._sp = spfi().using(SPFx(props.context));
    setupSP(this._sp);
  }

  public render(): React.ReactElement<IRocaNpdProps> {
    const { context } = this.props;

    return (
      <Provider store={store}>
        <MainComponent spfxContext={context} sp={this._sp} />
      </Provider>
    );
  }
}
