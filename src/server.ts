import * as express from "express";
import { Server, createServer } from "http";
import { createProxyServer } from "http-proxy";
import * as fs from "fs";
import * as vscode from "vscode";
import * as cors from "cors";
import { detectRequestSource } from "./middleware";
import axios, {AxiosResponse, AxiosError} from "axios";

let currentFileName: string | null = null;
export let port = 3004;

export function setCurrentFileName(fileName: string) {
  currentFileName = fileName;
}

let server: Server;

export function verifyConnection(success: any, failure: any) {
  const settings = vscode.workspace.getConfiguration("grafana-vscode");
  const URL = String(settings.get("URL"));
  const token = String(settings.get("token"));

  axios.get(URL, {
    maxRedirects:0,
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  .then((res:AxiosResponse)=>{
    success();
  })
  .catch((err:AxiosError)=>{
    if (err.response?.status == 302) {
      failure("Authentication error");
    } else {
    failure(err);
    }
  });
}

export function startServer() {
  const settings = vscode.workspace.getConfiguration("grafana-vscode");
  const URL = String(settings.get("URL"));
  const token = String(settings.get("token"));

  const corsOptions = {
    origin: `http://localhost:${port}`,
    optionsSuccessStatus: 200,
  };

  const app = express();
  app.use(detectRequestSource);
  server = createServer(app);

  const proxy = createProxyServer({
    target: URL,
    changeOrigin: !URL.includes("localhost"),
    ws: true,
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Authorization: `Bearer ${token}`,
    },
  });

  server.on("upgrade", function (req, socket, head) {
    proxy.ws(req, socket, head, {});
  });

  app.post("/save-dashboard", express.json(), cors(corsOptions), (req, res) => {
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

  app.get("/load-dashboard", express.json(), cors(corsOptions), (req, res) => {
    if (!currentFileName) {
      console.error("No file name set");
      res.sendStatus(500);
      return;
    }

    fs.readFile(currentFileName, "utf-8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
        res.sendStatus(500);
        return;
      }
      res.send(data);
    });
  });

  app.get("/d-embed", function (req, res) {
    proxy.web(req, res, {});
  });

  app.get("/public/*", function (req, res) {
    proxy.web(req, res, {});
  });

  app.get("/api/datasources/proxy/*", function (req, res) {
    proxy.web(req, res, {});
  });

  app.get("/api/datasources/*", function (req, res) {
    proxy.web(req, res, {});
  });

  app.post("/api/ds/query", function (req, res) {
    proxy.web(req, res, {});
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

  app.get("/api/live/list", function (req, res) {
    res.send([]);
  });

  app.get("/api/user/orgs", function (req, res) {
    res.send([]);
  });

  app.post("/api/search-v2", function (req, res) {
    res.send([]);
  });

  server.listen(0, () => {
    //@ts-expect-error
    port = server?.address()?.port;
    console.log("Server started");
  });
}

export function stopServer() {
  if (server) {
    server.close();
  }
}
