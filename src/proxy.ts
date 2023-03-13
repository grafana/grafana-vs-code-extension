import * as httpProxy from "http-proxy";
import * as express from "express";
import * as fs from "fs";
import * as http from "http";
import * as grafana from "./grafana";

const URL = "http://localhost:3000";

const user = "admin";
const pass = "admin";
const hostHead = "localhost:3000";

const app = express();
const proxy = httpProxy.createProxyServer({ target: URL, ws: true });
const server = http.createServer(app);

app.get("/api/dashboards/uid/:uid", function (req, res) {
  fs.readFile("dash.json", function (err, data) {
    if (err) {
      res.send("ERROR!");
      return;
    }
    res.send({
      meta: grafana.getMeta(),
      dashboard: JSON.parse(data.toString()),
    });
  });
});

app.post("/api/dashboards/db/", express.json());
app.post("/api/dashboards/db/", function (req, res) {
  fs.writeFile(
    "dash.json",
    JSON.stringify(req.body.dashboard),
    { mode: 0o644 },
    function () {}
  );
  res.send({
    id: 2,
    slug: "vscode",
    status: "success",
    uid: "editor",
    url: "/d/editor/vscode",
    version: 3,
  });
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

export default app;
