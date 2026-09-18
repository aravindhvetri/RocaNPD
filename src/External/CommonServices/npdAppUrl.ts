import { Config } from "./Config";
import type { NpdWorkflowAction } from "./Interface";

export function getNpdPageBaseUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

export function buildNpdHashUrl(hashPathAndQuery: string): string {
  const path = hashPathAndQuery.startsWith("/")
    ? hashPathAndQuery
    : `/${hashPathAndQuery}`;
  return `${getNpdPageBaseUrl()}#${path}`;
}

export function buildNpdRequestFormUrl(requestId: number): string {
  const query = new URLSearchParams();
  query.set("id", String(requestId));
  query.set(Config.NpdFormQuery.Mode, Config.NpdFormQuery.View);
  query.set(Config.NpdFormQuery.From, Config.NpdFormFrom.Pending);
  return buildNpdHashUrl(`${Config.Routes.NpdNew}?${query.toString()}`);
}

export function buildNpdEmailActionUrl(
  requestId: number,
  action: NpdWorkflowAction,
): string {
  const query = new URLSearchParams();
  query.set("id", String(requestId));
  query.set(Config.NpdEmail.QueryAction, action);
  query.set(Config.NpdFormQuery.From, Config.NpdFormFrom.Pending);
  return buildNpdHashUrl(`${Config.Routes.NpdNew}?${query.toString()}`);
}

export function buildNpdPendingUrl(): string {
  return buildNpdHashUrl(Config.Routes.NpdPending);
}

export function buildNpdDraftReworkUrl(): string {
  return buildNpdHashUrl(Config.Routes.NpdDraftRework);
}
