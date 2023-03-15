import { Request } from "express";
import { overrideCookies } from "./helpers";

export const styleUrl =
  "https://grafana-assets.grafana.net/grafana/9.4.4-2911eec/public/build/grafana.dark.2336ef52b5298cb04209.css";

export function getMeta(uid: string) {
  return {
    type: "db",
    canSave: true,
    canEdit: true,
    canAdmin: true,
    canStar: false,
    canDelete: false,
    slug: "editor",
    url: `/d/${uid}/editor`,
    expires: new Date().toISOString(),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    updatedBy: "admin",
    createdBy: "admin",
    version: 1,
    hasAcl: false,
    isFolder: false,
    folderId: 0,
    folderUid: "",
    folderTitle: "Editor",
    folderUrl: "",
    provisioned: false,
    provisionedExternalId: "",
    annotationsPermissions: {
      dashboard: {
        canAdd: true,
        canEdit: true,
        canDelete: true,
      },
      organization: {
        canAdd: true,
        canEdit: true,
        canDelete: true,
      },
    },
    hasPublicDashboard: false,
    publicDashboardAccessToken: "",
    publicDashboardUid: "",
    publicDashboardEnabled: false,
  };
}

export function getQueryHeaders(req: Request): any {
  const sessionCookie = "grafana_session=9a74da0956e577625b6f65479ce8e199";
  return {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "cache-control": "no-cache",
    "content-type": "application/json",
    pragma: "no-cache",
    "sec-ch-ua":
      '"Google Chrome";v="111", "Not(A:Brand";v="8", "Chromium";v="111"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-datasource-uid": req.headers["x-datasource-uid"] || "grafanacloud-prom",
    "x-grafana-org-id": req.headers["x-grafana-org-id"] || "1",
    "x-panel-id": req.headers["x-panel-id"] || "6",
    "x-plugin-id": req.headers["x-plugin-id"] || "prometheus",
    cookie: overrideCookies(sessionCookie, req.headers["cookie"]),
    Referer:
      "https://guicaulada.grafana.net/d/7E_4qpn4k/node-exporter-macos?orgId=1&refresh=30s",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}
