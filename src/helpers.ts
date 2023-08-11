import * as http from "http";
import { Configuration, OpenAIApi} from "openai";
import * as vscode from "vscode";
import { Query } from "./extension";

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

export function constructTempoQuery(selectedText: string, type?: string) {
  const tempoDatasourceID = String(vscode.workspace.getConfiguration("grafana-vscode").get("tempo-datasource-ID"));
  const grafanaURL = String(vscode.workspace.getConfiguration("grafana-vscode").get("URL"));
  let query;

  switch (type) {
    case "errors":
      query = encodeURIComponent(`queryType":"traceqlSearch","limit":20,"filters":[{"id":"9f4e9d63","operator":"=","scope":"span","tag":"status","value":["error"],"valueType":"keyword"},{"id":"a30b8233","operator":"=","scope":"span","tag":"name","value":["${selectedText}"],"valueType":"string"}]}]`);
      break;

    default:
      query = encodeURIComponent(`queryType":"traceql","limit":20,"query":"{name=\\"${selectedText}\\"}"}]`);
  }

  const finalGrafanaURL = grafanaURL.concat("/explore?panes=%7B%22EWU%22:%7B%22datasource%22:%22",
    tempoDatasourceID,
    "%22,%22queries%22:%5B%7B%22refId%22:%22A%22,%22datasource%22:",
    `%7B%22type%22%3A%22tempo%22%2C%22uid%22%3A%22${tempoDatasourceID}%22%7D%2C%22`,
    query,
    ',',
    "%22range%22:%7B%22from%22:%22now-6h%22,%22to%22:%22now%22%7D%7D%7D&schemaVersion=1&orgId=1"
  );

  console.log("constructed Tempo query: ", finalGrafanaURL);

  return finalGrafanaURL;
}

export function constructTempoDashboardQuery(selectedText: string) {
  const tempoDatasourceID = 'tTl06cUnk';//String(vscode.workspace.getConfiguration("grafana-vscode").get("tempo-datasource-ID"));
  const grafanaURL = String(vscode.workspace.getConfiguration("grafana-vscode").get("URL"));
  let query = encodeURIComponent(`&var-span=${selectedText}`);

  const finalGrafanaURL = grafanaURL.concat("/d/",
    tempoDatasourceID,
    "/tempo?orgId=1",
    query
  );

  console.log("constructed Tempo dashboard query: ", finalGrafanaURL);

  return finalGrafanaURL;
}

export function constructPyroscopeQuery(selectedText: string) {
  const pyroscopeDatasourceID = 'Jm9HMrH4k';//String(vscode.workspace.getConfiguration("grafana-vscode").get("tempo-datasource-ID"));
  const pyroscopeDatasourceName = 'grafana-pyroscope-datasource';
  const grafanaURL = String(vscode.workspace.getConfiguration("grafana-vscode").get("URL"));
  
  let query = encodeURIComponent(`[{"groupBy":[],"labelSelector":"{job=\\"${selectedText}\\"}","queryType":"both","refId":"A","datasource":{"type":"${pyroscopeDatasourceName}","uid":"${pyroscopeDatasourceID}"},"profileTypeId":"process_cpu:cpu:nanoseconds:cpu:nanoseconds"}]`);
  const finalGrafanaURL = grafanaURL.concat("/explore?panes=%7B%22EWU%22:%7B%22datasource%22:%22",
    pyroscopeDatasourceID,
    "%22,%22queries%22:",
    query,
    ',',
    "%22range%22:%7B%22from%22:%22now-6h%22,%22to%22:%22now%22%7D%7D%7D&schemaVersion=1&orgId=1"
  );

  console.log("constructed Pyroscope query: ", finalGrafanaURL);

  return finalGrafanaURL;
}

// Identifies PromQL queries in a text document using chat-gpt-3.5
export async function identifyPromQLQueries(text: string): Promise<Query[]> {
  // Set up the OpenAI API client
  const config = new Configuration({
    apiKey: String(vscode.workspace.getConfiguration("grafana-vscode").get("openai-api-key")),
  });
  const openai = new OpenAIApi(config);

  // Prompt to identify promql queries and their position in the document
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `
        You are an expert at the Go programming language.
        You are tasked by your colleague to identify the exact lines in the following file that represent a prometheus metric definition.
        A prometheus metric definition is typically identified by noticing the use of the promauto library together with the metric namespace
        and name. If you are able to identify the metric, respond with a JSON array where each item has the following JSON format:
        {"metric_name", "metric_namespace"}
        There could be multiple metrics in the file, or none.
        There should be one JSON entry per prometheus metric. Be precise and concise with your response. File contents follow`.concat(text),
      }
    ],
  });
  console.log(chatCompletion.data.choices[0].message);
  return JSON.parse(chatCompletion.data.choices[0].message?.content ?? "[]") as unknown as Query[]
}