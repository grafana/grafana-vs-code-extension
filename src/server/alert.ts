import * as express from "express";
import * as fs from "fs";
import * as vscode from "vscode";
import * as cors from "cors";
import axios from "axios";
import * as path from "path";

export function addEndpoints(url: string,
                      token: string | undefined,
                      corsOptions: cors.CorsOptions,
                      app: express.Express,
                      proxy: any,
                      ctx: vscode.ExtensionContext) {

  const sendErrorPage = (res: express.Response, message: string) => {
    const errorFile = path.join(ctx.extensionPath, "public/error.html");
    let content = fs.readFileSync(errorFile, "utf-8");
    content = content.replaceAll("${error}", message);
    res.write(content);
    };

  type RuleSet = {
    name: string,
    rules: [
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        grafana_alert: {
          uid: string,
          title: string,
        },
      },
    ],
  };
  
  app.get("/alert-overview",
    express.json(),
    cors(corsOptions),
    (req: express.Request, res) =>{
      const filename = req.query.filename as string;
      if (filename === undefined) {
        console.log("Filename not specified in referer");
        res.sendStatus(500);
        return;
      }
      try {
      fs.readFile(filename, "utf-8", (err, data) => {
        if (err) {
          console.error("Error reading file:", err);
          res.sendStatus(500);
          return;
        }
        const rules = JSON.parse(data) as RuleSet;
        let html = `<style>body, a {color: white;}</style><h1>Rule set: ${rules.name}</h1><ul>`;
        for (const rule of rules.rules) {
          html += `<li><a href="/alerting/${rule.grafana_alert.uid}/edit?filename=${filename}&returnTo=/alert-overview%3Ffilename=${filename}">${rule.grafana_alert.title} (${rule.grafana_alert.uid})</li>`;
        }
        html += "</ul>";
        res.write(html);
      });
    } catch (e) {
      console.log("ERROR READING FILE:", e);
    }
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
   * 
   * This method also doubles as connection verification. If an issue is
   * encountered connecting to Grafana, rather than reporting an HTTP error,
   * it returns an alternate HTML page to the user explaining the error, and
   * offering a "refresh" option.
   */
  app.get("/alerting/([^/]+)/edit", async function (req, res) {
    try {
      const resp = await axios.get(url + req.url, {
        maxRedirects: 0,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Bearer ${token}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'User-Agent': ctx.globalState.get("userAgent"),
        },
      });
      console.log("USER AGENT:", ctx.globalState.get("userAgent"));
      res.write(resp.data as string);
    } catch (e) {
      let msg = "";
      if (url === "") {
        msg += "<p><b>Error:</b> URL is not defined</p>";
      }
      if (token === "") {
        msg += "<p><b>Warning:</b> No service account token specified.</p>";
      }
      if (axios.isAxiosError(e)) {
        if (e.response?.status === 302) {
          sendErrorPage(res, msg+ "<p>Authentication error</p>");
        } else {
          sendErrorPage(res, msg + `<p>${e.message}</p>`);
        }
      } else if (e instanceof Error) {
        sendErrorPage(res, msg + `<p>${e.message}</p>`);
      } else {
        sendErrorPage(res, msg + "<p>" + String(e) + "</p>");
      }
    }
  });

  function getReferer(url: string|undefined):string {
    let paramstr = url?.split("?")[1] as string;
    let params = paramstr?.split("&");
    let filename = "";
    for (let param of params) {
      if (param.startsWith("filename=")) {
        return param.replace("filename=", "");
      }
    }
    return "";
  };

  app.get(
    "/api/ruler/grafana/api/v1/rules",
    express.json(),
    cors(corsOptions),
    (req, res) => {
      const filename = getReferer(req.headers.referer);
      if (filename === "") {
        console.log("Filename not specified in referer");
        res.sendStatus(500);
        return;
      }
      fs.readFile(filename, "utf-8", (err, data) => {
        if (err) {
          console.error("Error reading file:", err);
          res.sendStatus(500);
          return;
        }
        res.send({"test-alert-folder": [JSON.parse(data)]});
      });
    },
  );

  app.post(
    "/api/ruler/grafana/api/v1/rules/:folder",
    express.json(),
    cors(corsOptions),
    (req, res) => {
      const filename = getReferer(req.headers.referer);
      if (!filename) {
        console.log("Filename not specified in referer");
        res.send(500);
        return;
      }
      res.send({"message":"rule group updated successfully"});
      return;
      const uid = req.headers.referer?.split("/")[4];
      const jsonData = JSON.stringify(req.body.dashboard, null, 2);

      fs.writeFile(filename, jsonData, "utf-8", (err) => {
        if (err) {
          console.error("Error writing file:", err);
          res.sendStatus(500);
        } else {
          res.send({"message":"rule group updated successfully"});
        }
      });
    },
  );

  app.get('/api/folders/:uid',
    cors(corsOptions),
    (req, res) => {
      res.send({
        /* eslint-disable @typescript-eslint/naming-convention */
        "id": 1,
        "uid": req.params.uid,
        "title": "folder",
        "url": `/dashboards/f/${req.params.uid}/folder`,
        "hasAcl": false,
        "canSave": true,
        "canEdit": true,
        "canAdmin": false,
        "canDelete": true,
        "version": 1,
        "accessControl": {
            "alert.rules:create": true,
            "alert.rules:delete": true,
            "alert.rules:read": true,
            "alert.rules:write": true,
            "dashboards.permissions:read": true,
            "dashboards.permissions:write": true,
            "dashboards:create": true,
            "dashboards:delete": true,
            "dashboards:read": true,
            "dashboards:write": true,
            "folders.permissions:read": true,
            "folders.permissions:write": true,
            "folders:delete": true,
            "folders:read": true,
            "folders:write": true
        }
        /* eslint-enable @typescript-eslint/naming-convention */
    });
  });

  const mustProxyGET = [
    "xx0"
  ];
  for (const path of mustProxyGET) {
    app.get(path, function (req, res) {
      proxy.web(req, res, {});
    });
  }

  const mustProxyPOST = ["xx1"];
  for (const path of mustProxyPOST) {
    app.post(path, function (req, res) {
      proxy.web(req, res, {});
    });
  }

  const blockJSONget: { [name: string]: any } = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "/api/v1/ngalert": {"alertmanagersChoice":"internal","numExternalAlertmanagers":0},
    "/api/v1/ngalert/alertmanagers": {"status":"success","data":{"activeAlertManagers":[],"droppedAlertManagers":[]}},
    /* eslint-enable @typescript-eslint/naming-convention */
  };
  for (const path in blockJSONget) {
    app.get(path, function (req, res) {
      res.send(blockJSONget[path]);
    });
  }

  const blockJSONpost: { [name: string]: any } = {
    /* eslint-disable @typescript-eslint/naming-convention */
    "/xx3": [],
    /* eslint-enable @typescript-eslint/naming-convention */
  };
  for (const path in blockJSONpost) {
    app.post(path, function (req, res) {
      res.send(blockJSONpost[path]);
    });
  }
}
