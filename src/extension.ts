// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import vscode from "vscode";
import { startServer, restartServer, stopServer, TOKEN_SECRET } from "./server";
import { GrafanaEditorProvider } from "./editor";
import { install as installSourceMapSupport } from 'source-map-support';
import { sendTelemetry } from "./telemetry";
import { setVersion } from "./util";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(ctx: vscode.ExtensionContext) {
  setVersion(ctx.extension.packageJSON.version);
  startServer(ctx.secrets, ctx.extensionPath);

  ctx.subscriptions.push(GrafanaEditorProvider.register(ctx));

  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      "grafana-vscode.openUrl",
      (uri?: vscode.Uri) => {
        sendTelemetry(ctx);

        // This command can be invoked from a contextual menu, in which case uri
        // has a value.
        // It can also be invoked from the command palette, in which case we try to find
        // the active document.
        let actualUri = uri || vscode.window.activeTextEditor?.document.uri;
        if (!actualUri) {
          return;
        }

        vscode.commands.executeCommand(
          "vscode.openWith",
          actualUri,
          GrafanaEditorProvider.viewType,
        );
      }),
  );

  vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration("grafana-vscode")) {
      restartServer(ctx.secrets, ctx.extensionPath);
    }
  });

  vscode.commands.registerCommand('grafana-vscode.setGrafanaURL', async () => {
    const instanceURL = await vscode.window.showInputBox({
      title: "Grafana instance URL",
      placeHolder: "http://localhost:3000",
    }) ?? '';
    await vscode.workspace.getConfiguration('grafana-vscode').update('URL', instanceURL);
  });

  vscode.commands.registerCommand('grafana-vscode.setPassword', async () => {
    const passwordInput = await vscode.window.showInputBox({
      password: true,
      placeHolder: "My Grafana service account token",
      title: "Enter the service account token for your Grafana instance. This value will be stored securely in your operating system's secure key store."
    }) ?? '';
    await ctx.secrets.store(TOKEN_SECRET, passwordInput);
  });

  installSourceMapSupport();
}

// This method is called when your extension is deactivated
export function deactivate() {
  stopServer();
}
