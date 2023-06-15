import * as express from "express";
import { Server, createServer } from "http";
import { createProxyServer } from "http-proxy";
import * as fs from "fs";
import * as vscode from "vscode";
import * as ws from "ws";
import * as cors from "cors";

let currentFileName: string | null = null;
let json: string | null = null;

export function setCurrentFileName(fileName: string) {
  currentFileName = fileName;
}

export function setJson(jsonData: string) {
  json = jsonData;
}

let server: Server;

export function startServer() {
  const settings = vscode.workspace.getConfiguration("gitit");
  const URL = String(settings.get("URL"));
  const port = String(settings.get("port"));
  const token = String(settings.get("token"));

  const app = express();
  server = createServer(app);
  const wss = new ws.Server({ server });
  const proxy = createProxyServer({
    changeOrigin: true,
    target: URL,
  });

  wss.on("connection", function (ws) {
    ws.on("message", function (message) {
      ws.send(JSON.stringify(message));
    });
  });

  app.post("/save-dashboard", express.json(), cors(), (req, res) => {
    const data = req.body;

    if (!currentFileName) {
      console.error("No file name set");
      res.sendStatus(500);
      return;
    }

    const jsonData = JSON.stringify(data.dashboard, null, 2);

    fs.writeFile(currentFileName, jsonData, "utf-8", (err) => {
      if (err) {
        console.error("Error writing file:", err);
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
      }
    });
  });

  app.get("/load-dashboard", express.json(), cors(), (req, res) => {
    if (!json) {
      console.error("No dashboard JSON set");
      res.sendStatus(500);
      return;
    }

    res.send(json);
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
    console.log(`Server listening on port ${port}`);
  });
}

export function stopServer() {
  if (server) {
    server.close();
  }
}
