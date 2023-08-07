import * as http from "http";
import * as vscode from "vscode";

export function interceptResponse(
  proxyRes: http.IncomingMessage,
  res: http.ServerResponse<http.IncomingMessage>,
  bodyFunc: (body: string) => string | Promise<string>
) {
  let body = Buffer.from([]);
  proxyRes.on("data", function (data) {
    body = Buffer.concat([body, data]);
  });
  proxyRes.on("end", async function () {
    res.end(await bodyFunc(body.toString("utf8")));
  });
}

export function parseCookies(cookies: string) {
  const cookiesObj = {} as any;
  for (const cookie of cookies.split("; ")) {
    const key = cookie.split("=").shift();
    if (key) {
      const value = cookie.split("=").slice(1).join("=");
      cookiesObj[key] = value;
    }
  }
  return cookiesObj;
}

export function unparseCookies(obj: any) {
  let cookies = "";
  for (const key in obj) {
    if (!cookies) {
      cookies = `${key}=${obj[key]}`;
    } else {
      cookies = `; ${key}=${obj[key]}`;
    }
  }
  return cookies;
}

export function overrideCookies(
  originalCookies: string,
  overrideCookies: string | undefined
) {
  const cookieObj = {} as any;
  if (originalCookies) {
    const originalObj = parseCookies(originalCookies);
    console.log("Original cookies", originalObj);
    for (const key in originalObj) {
      cookieObj[key] = originalObj[key];
    }
  }
  if (overrideCookies) {
    const overrideObj = parseCookies(overrideCookies);
    console.log("Overriden cookies", overrideObj);
    for (const key in overrideObj) {
      cookieObj[key] = overrideObj[key];
    }
  }
  return unparseCookies(cookieObj);
}

export function constructPrometheusQuery(metric: string, type: string) {
  const promDatasourceID = String(vscode.workspace.getConfiguration("grafana-vscode").get("prometheus-datasource-ID"));
  const grafanaURL = String(vscode.workspace.getConfiguration("grafana-vscode").get("URL"));
  const queryLabels = String(vscode.workspace.getConfiguration("grafana-vscode").get("query-labels"));

  const metricNamespace = "tempo";
  var metricWithLabels = metricNamespace.concat("_",
    metric,
    "{",
    queryLabels,
    "}"
  );
  var promqlQuery = "";

  switch (type) {
    case "counter":
      promqlQuery = "sum(rate(".concat(
        metricWithLabels,
        "[1m]))"
      );
      break;

    case "histogram":
      promqlQuery = "histogram_quantile(0.95, sum(rate(".concat(
        metricWithLabels,
        "[5m])) by (le))"
      );
    break;

    default:
      break;
  }

  const finalGrafanaURL = grafanaURL.concat("/explore?panes=%7B%22EWU%22:%7B%22datasource%22:%22",
    promDatasourceID,
    "%22,%22queries%22:%5B%7B%22refId%22:%22A%22,%22expr%22:%22",
    promqlQuery,
    "%22,",
    "%22range%22:true,%22instant%22:true%7D%5D,%22range%22:%7B%22from%22:%22now-6h%22,%22to%22:%22now%22%7D%7D%7D&schemaVersion=1&orgId=1"
    );

  console.log("constructed promql query: ", finalGrafanaURL);

  return finalGrafanaURL;
}