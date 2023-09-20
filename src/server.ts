import * as express from "express";
import { Server, createServer } from "http";
import { createProxyServer } from "http-proxy";
import * as fs from "fs";
import * as vscode from "vscode";
import * as cors from "cors";
import { detectRequestSource } from "./middleware";
import axios, { AxiosResponse, AxiosError } from "axios";
import * as util from "./util";

export let port = 0;

let fileMapping = new Map<string, string>();

export function configureFile(fileName: string, uid: string) {
  fileMapping.set(uid, fileName);
}

let server: Server;

export function verifyConnection(success: any, failure: any) {
  const settings = vscode.workspace.getConfiguration("grafana-vscode");
  const URL = String(settings.get("URL"));
  const token = String(settings.get("token"));

  axios
    .get(URL, {
      maxRedirects: 0,
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Authorization: `Bearer ${token}`,
      },
    })
    .then((res: AxiosResponse) => {
      success();
    })
    .catch((err: AxiosError) => {
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

  /*
   * Note, this method avoids using `proxy.web`, implementing its own proxy
   * event using Axios. This is because Grafana returns `X-Frame-Options: deny`
   * which breaks our ability to place Grafana inside an iframe. `http-proxy`
   * will not remove that header once it is added. Therefore we need a different
   * form of proxy.
   *
   * This security protection does not apply to this situation - given we own
   * both the connection to the backend as well as the webview. Therefore
   * it is reasonable remove this header in this context.
  */
  app.get("/d/:uid/:slug", async function (req, res) {
    try {
      const resp = await axios.get(URL + req.url, {
        maxRedirects: 0,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Bearer ${token}`,
        },
      });
      res.write(resp.data);
    } catch (e) {
      res.write(e);
    }
  });

  app.get("/api/dashboards/uid/:uid", express.json(), cors(corsOptions), (req, res) => {

    const filename = fileMapping.get(req.params.uid);
    fs.readFile(filename+"", "utf-8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
        res.sendStatus(500);
        return;
      }
      const wrapper = {
        "dashboard": JSON.parse(data),
        "meta": {
          "isStarred": false,
          "folderId": 0,
        }
      };

      res.send(wrapper);
    });
  });

  app.post("/api/dashboards/db/", express.json(), cors(corsOptions), (req, res) => {
    const uid = req.body.dashboard.uid;
    const filename = fileMapping.get(uid)+"";
    
    const jsonData = JSON.stringify(req.body.dashboard, null, 2);

    fs.writeFile(filename, jsonData, "utf-8", (err) => {
      if (err) {
        console.error("Error writing file:", err);
        res.sendStatus(500);
      } else {
        res.sendStatus(200);
      }
    });
  });

  const mustProxyGET = [
    "/public/*",
    "/api/datasources/proxy/*",
    "/api/datasources/*",
  ];
  for (let path of mustProxyGET) {
    app.get(path, function(req, res) {
      proxy.web(req, res, {});
    });
  }

  const mustProxyPOST = [
    "/api/ds/query",
  ];
  for (let path of mustProxyPOST) {
    app.post(path, function(req, res) {
      proxy.web(req, res, {});
    });
  }

  const blockJSONget: { [name: string]: any } = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "/api/ma/events": [],
    "/api/live/publish": [],
    "/api/live/list": [],
    "/api/user/orgs": [],
    "/api/annotations": [],
    "/api/search": [],
    "/api/prometheus/grafana/api/v1/rules": {status: "success", data: {groups:[]}},
    "/avatar/*": "",
    /* eslint-enable @typescript-eslint/naming-convention */
  };
  for (let path in blockJSONget) {
    app.get(path, function(req, res) {
      res.send(blockJSONget[path]);
    });
  }

  const blockJSONpost: { [name: string]: any } = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "/api/frontend-metrics": [],
    "/api/search-v2": [],
    /* eslint-enable @typescript-eslint/naming-convention */
  };
  for (let path in blockJSONpost) {
    app.post(path, function(req, res) {
      res.send(blockJSONpost[path]);
    });
  }

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
