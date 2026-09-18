import * as React from "react";
import type { INpdRequestListItemRow } from "../../../../../External/CommonServices/Interface";
import type { INpdWorkflowStatusViewRow } from "../../../../../External/CommonServices/npdWorkflowStatusView";
import {
  buildNpdWorkflowStatusViewRows,
  fetchUserTitlesByEmail,
} from "../../../../../External/CommonServices/npdWorkflowStatusView";

let titlesByEmailPromise: Promise<Map<string, string>> | undefined;

function getUserTitlesByEmail(): Promise<Map<string, string>> {
  if (!titlesByEmailPromise) {
    titlesByEmailPromise = fetchUserTitlesByEmail();
  }
  return titlesByEmailPromise;
}

export function useNpdWorkflowStatusDialog(): {
  visible: boolean;
  rows: INpdWorkflowStatusViewRow[];
  openWorkflow: (row: INpdRequestListItemRow) => Promise<void>;
  hideWorkflow: () => void;
} {
  const [visible, setVisible] = React.useState(false);
  const [rows, setRows] = React.useState<INpdWorkflowStatusViewRow[]>([]);

  const openWorkflow = React.useCallback(
    async (row: INpdRequestListItemRow) => {
      const titles = await getUserTitlesByEmail();

      setRows(
        buildNpdWorkflowStatusViewRows({
          steps: row.WorkflowSteps ?? [],
          requestStatus: row.Status,
          authorEmail: row.AuthorEmail,
          authorTitle: row.AuthorTitle,
          titleByEmail: titles,
        }),
      );
      setVisible(true);
    },
    [],
  );

  const hideWorkflow = React.useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, rows, openWorkflow, hideWorkflow };
}
