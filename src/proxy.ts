import * as httpProxy from "http-proxy";
import * as express from "express";
import * as http from "http";
import * as vscode from "vscode";
import * as ws from "ws";

export function startProxy() {
  const settings = vscode.workspace.getConfiguration("gitit");
  const URL = String(settings.get("URL"));
  const port = String(settings.get("port"));
  const token = String(settings.get("token"));

  const app = express();
  const server = http.createServer(app);
  const wss = new ws.Server({ server });
  const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    target: URL,
  });

  // Proxy web socket requests, e.g. api/v1/live endpoint
  wss.on("connection", function (ws) {
    ws.on("message", function (message) {
      ws.send(JSON.stringify(message));
    });
  });

  app.get("/*", function (req, res) {
    proxy.web(req, res, {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Bearer ${token}`,
      },
    });
  });

  app.post("/*", function (req, res) {
    proxy.web(req, res, {
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Bearer ${token}`,
      },
    });
  });

  server.listen(port, () => {
    console.log(`Proxy server listening on port ${port}`);
  });
}
