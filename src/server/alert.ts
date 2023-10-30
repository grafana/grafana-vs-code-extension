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
          html += `<li><a href="/alerting/${rule.grafana_alert.uid}/edit?filename=${filename}&returnTo=/alert-overview%3Ffilename=${filename}">${rule.grafana_alert.title}: /alerting/${rule.grafana_alert.uid}/edit?filename=${filename}&returnTo=/alert-overview%3Ffilename=${filename}</li>`;
          console.log("URL:", `/alerting/${rule.grafana_alert.uid}/edit?returnTo=/alert-overview%3Ffilename=${filename}`);
        }
        html += "</ul>";
        console.log("WRITING HTML");
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
      console.log("FORWARDING TO", url + req.url);
      const resp = await axios.get(url + req.url, {
        maxRedirects: 0,
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          Authorization: `Bearer ${token}`,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'User-Agent': ctx.globalState.get("userAgent"),
        },
      });
      console.log(resp);
      console.log("PROXY RESPONSE:", resp.data);
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

  app.get(
    "/api/dashboards/uid/:uid",
    express.json(),
    cors(corsOptions),
    (req, res) => {
      const refererParams = new URLSearchParams(req.headers.referer);
      const filename = refererParams.get("filename");
      if (filename === null) {
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
        const dash: any = JSON.parse(data);
        const wrapper = {
          dashboard: dash,
          meta: {
            isStarred: false,
            folderId: 0,
            folderUid: "",
            url: `/d/${dash.uid}/slug`,
          },
        };

        res.send(wrapper);
      });
    },
  );

  app.post(
    "/api/xxdashboards/db/",
    express.json(),
    cors(corsOptions),
    (req, res) => {
      const refererParams = new URLSearchParams(req.headers.referer);
      const filename = refererParams.get("filename");
      if (!filename) {
        res.send(500);
        return;
      }
      const uid = req.headers.referer?.split("/")[4];
      const jsonData = JSON.stringify(req.body.dashboard, null, 2);

      fs.writeFile(filename, jsonData, "utf-8", (err) => {
        if (err) {
          console.error("Error writing file:", err);
          res.sendStatus(500);
        } else {
          res.send({
            id: 1,
            slug: "slug",
            status: "success",
            uid: uid,
            url: `/d/${uid}/slug`,
            version: 1,
          });
        }
      });
    },
  );
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
    "/xx2": [],
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
