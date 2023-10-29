import * as express from "express";
import { Server, createServer } from "http";
import { createProxyServer } from "http-proxy";
import * as vscode from "vscode";
import { detectRequestSource } from "./middleware";
import * as dashboard from "./dashboard";

export let port = 0;

let server: Server;

let userAgent: string;

export const TOKEN_SECRET = "grafana-vscode.token";

export function setVersion(version: string) {
  userAgent = `Grafana VSCode Extension/v${version}`;
}

export async function startServer(ctx: vscode.ExtensionContext) {
  const settings = vscode.workspace.getConfiguration("grafana-vscode");
  const url = String(settings.get("URL"));
  const token = await ctx.secrets.get(TOKEN_SECRET);

  const corsOptions = {
    origin: `http://localhost:${port}`,
    optionsSuccessStatus: 200,
  };

  const app = express();
  app.use(detectRequestSource);
  server = createServer(app);

  const proxy = createProxyServer({
    target: url,
    changeOrigin: !url.includes("localhost"),
    ws: true,
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Authorization: `Bearer ${token}`,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'User-Agent': userAgent,
    },
  });

  server.on("upgrade", function (req, socket, head) {
    proxy.ws(req, socket, head, {});
  });

  dashboard.addEndpoints(url, token, corsOptions, app, proxy, ctx);

  server.listen(port, () => {
    //@ts-expect-error
    port = server?.address()?.port;
    console.log("Server started");
  });
}

export function restartServer(ctx: vscode.ExtensionContext) {
  console.log("Restarting server");
  stopServer();
  startServer(ctx);
}
export function stopServer() {
  if (server) {
    server.close();
  }
}
