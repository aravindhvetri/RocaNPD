import * as React from "react";
import * as ReactDom from "react-dom";
import { Version } from "@microsoft/sp-core-library";
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from "@microsoft/sp-property-pane";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { IReadonlyTheme } from "@microsoft/sp-component-base";
import { loadApplicationStyles } from "../../External/CommonServices/loadApplicationStyles";
import { lockWebPartViewport } from "../../External/CommonServices/hideSharePointChrome";

import * as strings from "NpdApproverMailWebPartStrings";
import NpdApproverMail from "./components/NpdApproverMail";
import type { INpdApproverMailProps } from "./components/INpdApproverMailProps";

export interface INpdApproverMailWebPartProps {
  description: string;
}

export default class NpdApproverMailWebPart extends BaseClientSideWebPart<INpdApproverMailWebPartProps> {
  public render(): void {
    const element: React.ReactElement<INpdApproverMailProps> =
      React.createElement(NpdApproverMail, {
        context: this.context,
        userDisplayName: this.context.pageContext.user.displayName,
      });

    ReactDom.render(element, this.domElement);
    lockWebPartViewport(this.domElement);
  }

  protected onInit(): Promise<void> {
    return loadApplicationStyles(this.domElement);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    const { semanticColors } = currentTheme;
    if (semanticColors) {
      this.domElement.style.setProperty(
        "--bodyText",
        semanticColors.bodyText || null,
      );
      this.domElement.style.setProperty("--link", semanticColors.link || null);
      this.domElement.style.setProperty(
        "--linkHovered",
        semanticColors.linkHovered || null,
      );
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse("1.0");
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription,
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField("description", {
                  label: strings.DescriptionFieldLabel,
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
