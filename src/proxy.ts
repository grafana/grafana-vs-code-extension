import * as httpProxy from "http-proxy";
import * as express from "express";
import * as fs from "fs";
import * as http from "http";
import * as grafana from "./grafana";
import * as vscode from "vscode";
import * as path from "path";
import * as ws from "ws";
import * as h from "./helpers";
import fetch from "node-fetch";

export function setup(
  ctx: vscode.ExtensionContext,
  port: number,
  cb: () => void
) {
  const sett = vscode.workspace.getConfiguration("gitit");
  const HOST = `http://localhost:${port}`;
  const URL = "https://guicaulada.grafana.net";
  const GRAFANA_SESSION = "8a0a144d5308cc5cb76fdc013cca329f";

  const app = express();
  const server = http.createServer(app);
  const wss = new ws.Server({ server });
  const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    target: URL,
  });

  app.post("/api/frontend-metrics", function (req, res) {
    res.send([]);
  });

  app.post("/api/ma/events", function (req, res) {
    res.send([]);
  });

  app.post("/api/live/publish", function (req, res) {
    res.send([]);
  });

  app.post("/api/ds/query", express.json());
  app.post("/api/ds/query", async function (req, res) {
    // console.log("QUERY", req.body);
    const body = JSON.stringify(req.body);
    const result = await fetch("https://guicaulada.grafana.net/api/ds/query", {
      headers: {
        ...grafana.getQueryHeaders(req),
        cookie: "grafana_session=" + GRAFANA_SESSION,
      },
      body,
      method: "POST",
    });
    const json = await result.json();
    //console.log(json);
    res.send(json);
  });

  app.get("/api/dashboards/uid/:uid", function (req, res) {
    const fileName = req.headers.referer?.split("/")[4];
    const document = vscode.workspace.textDocuments.find(
      (d) => path.basename(d.fileName) === fileName
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

  wss.on("connection", function (ws) {
    console.log("handling websocket connection");
    console.log("sett: ", sett.get("gitit"));
    ws.on("message", function (message) {
      ws.send(message);
    });
  });

  app.get("/*grafana*.css", function (req, res) {
    console.log("self handling *grafana*.css response");
    proxy.web(req, res, { selfHandleResponse: true });
  });

  proxy.on("proxyRes", async function (proxyRes, req, res) {
    const re = new RegExp(".*grafana.*.css");
    if (req.url && re.test(req.url)) {
      console.log("intercepting *grafana*.css response");
      h.interceptResponse(proxyRes, res, async (body) => {
        const css = fs.readFileSync(
          ctx.asAbsolutePath("public/iframe.css"),
          "utf-8"
        );
        if (req.url === "/grafana.css") {
          const result = await fetch(grafana.styleUrl);
          body = await result.text();
        }
        return body + css;
      });
    }
  });

  app.get("/d/:uid/editor", function (req, res) {
    console.log("self handling /d/:uid/editor response");
    proxy.web(req, res, { selfHandleResponse: true });
  });

  proxy.on("proxyRes", function (proxyRes, req, res) {
    const re = new RegExp(".*/editor");
    if (req.url && re.test(req.url)) {
      console.log("intercepting /d/:uid/editor response");
      h.interceptResponse(proxyRes, res, (body) => {
        body = body.replace(grafana.styleUrl, `${HOST}/grafana.css`);
        return body;
      });
    }
  });

  app.get("/*", function (req, res) {
    console.log(`GET: ${req.url}`);
    proxy.web(req, res, {});
  });

  app.post("/*", function (req, res) {
    console.log(`POST: ${req.url}`);
    proxy.web(req, res, {});
  });

  server.listen(port, cb);
}
