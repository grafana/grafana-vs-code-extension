import * as httpProxy from "http-proxy";
import * as express from "express";
import * as fs from "fs";
import * as http from "http";
import * as grafana from "./grafana";
import * as vscode from "vscode";
import * as path from "path";

const URL = "http://localhost:3000";

const user = "admin";
const pass = "admin";
const hostHead = "localhost:3000";

const app = express();
const proxy = httpProxy.createProxyServer({ target: URL, ws: true });
const server = http.createServer(app);

app.get("/api/dashboards/uid/:uid", function (req, res) {
  const document = vscode.workspace.textDocuments.find(
    (d) => path.basename(d.fileName) === req.params.uid
  );
  if (document) {
    res.send({
      meta: grafana.getMeta(req.params.uid),
      dashboard: JSON.parse(document.getText()),
    });
  } else {
    res.sendStatus(404);
  }
});

app.post("/api/dashboards/db/", express.json());
app.post("/api/dashboards/db/", function (req, res) {
  console.log(req);
  const fileName = req.headers.referer?.split("/")[4];
  const document = vscode.workspace.textDocuments.find(
    (d) => path.basename(d.fileName) === fileName
  );
  if (document) {
    fs.writeFileSync(
      document.uri.fsPath,
      JSON.stringify(req.body.dashboard, null, 2)
    );
    res.send({
      id: 1,
      slug: "editor",
      status: "success",
      uid: fileName,
      url: `/d/${fileName}/editor`,
      version: 1,
    });
  } else {
    res.sendStatus(404);
  }
});

app.get("/api/search", function (req, res) {
  res.send([]);
});

app.get("/*", function (req, res) {
  console.log(`GET: ${req.url}`);
  proxy.web(req, res, {});
});

app.post("/*", function (req, res) {
  console.log(`POST: ${req.url}`);
  proxy.web(req, res, {});
});

server.on("upgrade", function (req, socket, head) {
  console.log("proxying upgrade request", req.url);
  proxy.ws(req, socket, head);
});

export default server;
