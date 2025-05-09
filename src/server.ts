import express, { Request, Response } from "express";
import { Server, createServer } from "http";
import { createProxyServer } from "http-proxy";
import cors from "cors";
import fs from "fs";
import path from "path";
import vscode from "vscode";
import { detectRequestSource } from "./middleware";
import * as util from "./util";
import { Resource } from "./grafana";

export let port = 0;

let server: Server;

export const TOKEN_SECRET = "grafana-vscode.token";

export async function startServer(secrets: vscode.SecretStorage, extensionPath: string) {
  const settings = vscode.workspace.getConfiguration("grafana-vscode");
  const token = await secrets.get(TOKEN_SECRET);
  let URL = String(settings.get("URL"));
  if (URL.slice(-1) === "/") {
    URL = URL.slice(0, -1);
  }

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
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'User-Agent': util.getUserAgent(),
    },
  });

  server.on("upgrade", function (req, socket, head) {
    proxy.ws(req, socket, head, {});
  });

  const sendErrorPage = (res: express.Response, message: string) => {
    const errorFile = path.join(extensionPath, "public/error.html");

    res.send(
      fs.readFileSync(errorFile, "utf-8")
        .replaceAll("${error}", message),
    );
  };

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
   * 
   * This method also doubles as connection verification. If an issue is
   * encountered connecting to Grafana, rather than reporting an HTTP error,
   * it returns an alternate HTML page to the user explaining the error, and
   * offering a "refresh" option.
   */
  app.get("/d/:uid/:slug", async function (req: Request, res: Response) {
    let msg = "";
    if (URL === "") {
      msg += "<p><b>Error:</b> URL is not defined</p>";
    }
    if (token === "") {
      msg += "<p><b>Warning:</b> No service account token specified.</p>";
    }

    try {
      const response = await fetch(URL + req.url, {
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Bearer ${token}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'User-Agent': util.getUserAgent(),
        },
      });
      res.send(await response.text());

      if (!response.ok && response.status === 302) {
        sendErrorPage(res, msg + "<p>Authentication error</p>");
      } else if (!response.ok) {
        sendErrorPage(res, msg + `<p>${response.status} ${response.statusText}</p>`);
      }
    } catch (e) {
      if (e instanceof Error) {
        sendErrorPage(res, msg + `<p>${e.message}</p>`);
      } else {
        sendErrorPage(res, msg + "<p>" + String(e) + "</p>");
      }
    }
  });

  app.get(
    "/api/dashboards/uid/:uid",
    express.json(),
    cors(corsOptions),
    (req: Request, res: Response) => {
      const refererParams = new URLSearchParams(req.headers.referer);
      const filename = refererParams.get("filename");
      if (filename === null) {
        console.log("Filename not specified in referer");
        res.sendStatus(500);
        return;
      }

      const resource = Resource.fromFile(filename);

      res.send({
        dashboard: resource.spec(),
        meta: {
          isStarred: false,
          folderId: 0,
          folderUid: "",
          url: `/d/${resource.uid()}/slug`,
        },
      });
    },
  );

  app.post(
    "/api/dashboards/db/",
    express.json(),
    cors(corsOptions),
    (req: Request, res: Response) => {
      const refererParams = new URLSearchParams(req.headers.referer);
      const filename = refererParams.get("filename");
      if (!filename) {
        console.error('expected filename in referer parameters');
        res.send(500);
        return;
      }

      const resource = Resource.fromFile(filename).withSpec(req.body.dashboard);

      resource.write().then(() => {
        res.send({
          id: 1,
          slug: "slug",
          status: "success",
          uid: resource.uid(),
          url: `/d/${resource.uid()}/slug`,
          version: 1,
        });
      }).catch((err) => {
          console.error("Error writing file:", err);
          res.sendStatus(500);
      });
    },
  );

  app.get(
    "/api/access-control/user/actions",
    express.json(),
    cors(corsOptions),
    (_: Request, res: Response) => {
      res.send({
        /* eslint-disable-next-line @typescript-eslint/naming-convention */
        "dashboards:write": true,
      });
      return;
    },
  );

  const mustProxyGET = [
    "/public/*",
    "/api/datasources/proxy/*",
    "/api/datasources/*",
    "/api/library-elements*",
    "/api/plugins/*",
    "/avatar/*",
  ];
  for (const path of mustProxyGET) {
    app.get(path, function (req: Request, res: Response) {
      proxy.web(req, res, {});
    });
  }

  const mustProxyPOST = [
    "/api/ds/query",
    "/api/datasources/proxy/*",
    "/api/datasources/uid/*",
  ];
  for (const path of mustProxyPOST) {
    app.post(path, function (req: Request, res: Response) {
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
    "/api/usage/*": [],
    "/api/org/preferences": [],
    "/api/prometheus/grafana/api/v1/rules": {
      status: "success",
      data: { groups: [] },
    },
    "/api/folders": [],
    "/api/ruler/grafana/api/v1/rules": {},
    "/api/recording-rules": [],
    "/api/recording-rules/writer": {
      "id": "cojWep7Vz",
      "data_source_uid": "grafanacloud-prom",
      "remote_write_path": "/api/prom/push"
    },
    "/apis/banners.grafana.app/*": {},
    "/api/user/preferences": {},
    /* eslint-enable @typescript-eslint/naming-convention */
  };
  for (const path in blockJSONget) {
    app.get(path, function (req: Request, res: Response) {
      res.send(blockJSONget[path]);
    });
  }

  const blockJSONpost: { [name: string]: any } = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "/api/frontend-metrics": [],
    "/api/search-v2": [],
    "/api/live/publish": {},
    /* eslint-enable @typescript-eslint/naming-convention */
  };
  for (const path in blockJSONpost) {
    app.post(path, function (req: Request, res: Response) {
      res.send(blockJSONpost[path]);
    });
  }

  server.listen(port, () => {
    //@ts-expect-error
    port = server?.address()?.port;
    console.log("Server started");
  });
}

export function restartServer(secrets: vscode.SecretStorage, extensionPath: string) {
  console.log("Restarting server");
  stopServer();
  startServer(secrets, extensionPath);
}
export function stopServer() {
  server?.close();
}
