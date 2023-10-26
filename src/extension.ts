// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { setVersion, startServer, restartServer, stopServer } from "./server";
import { GrafanaEditorProvider } from "./editor";
import { install as installSourceMapSupport } from 'source-map-support';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(ctx: vscode.ExtensionContext) {

  setVersion(ctx.extension.packageJSON.version);
  startServer();

  ctx.subscriptions.push(GrafanaEditorProvider.register(ctx));

  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      "grafana-vscode.openUrl",
      (uri: vscode.Uri) => {
        vscode.commands.executeCommand(
          "vscode.openWith",
          uri.with({
            path: uri?.fsPath,
          }),
          GrafanaEditorProvider.viewType,
        );
      }),
  );

  vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration("grafana-vscode.URL")
      || event.affectsConfiguration("grafana-vscode.token")) {
      restartServer();
    }
  });

  installSourceMapSupport();
}

// This method is called when your extension is deactivated
export function deactivate() {
  stopServer();
}
