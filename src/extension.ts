// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";

import { setCurrentFileName, startServer, stopServer } from "./server";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(ctx: vscode.ExtensionContext) {
  const openedFiles = new Set();

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "gitit" is now active!');
  startServer();

  ctx.subscriptions.push(
    vscode.commands.registerCommand("gitit.openUrl", (uri: vscode.Uri) => {
      const panel = vscode.window.createWebviewPanel(
        "webview",
        "Dashboard Editor",
        vscode.ViewColumn.One,
        {}
      );

      const fileName = uri?.fsPath;

      if (fileName) {
        openedFiles.add(fileName);
        const data = fs.readFileSync(fileName, "utf-8");

        const urlSafeJson = encodeURIComponent(data);

        const webviewContent = fs
          .readFileSync(ctx.asAbsolutePath("public/webview.html"), "utf-8")
          .replace("${json}", urlSafeJson);

        panel.webview.html = webviewContent;
        panel.webview.options = {
          enableScripts: true,
        };

        panel.onDidDispose(() => {
          openedFiles.delete(fileName);
        });
      }
    })
  );

  ctx.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (e) => {
      if (
        e &&
        e.document &&
        !openedFiles.has(e.document.uri.fsPath) &&
        vscode.workspace.getConfiguration("gitit").get("message")
      ) {
        try {
          const json = JSON.parse(e.document.getText());
          const dashboardAttributes = [
            "annotations",
            "editable",
            "fiscalYearStartMonth",
            "graphTooltip",
            "id",
            "links",
            "liveNow",
            "panels",
            "refresh",
            "revision",
            "schemaVersion",
            "style",
            "tags",
            "templating",
            "time",
            "timepicker",
            "timezone",
            "title",
            "uid",
            "version",
            "weekStart",
          ];
          for (const attribute of dashboardAttributes) {
            if (json[attribute] === undefined) {
              console.log("document missing attribute", attribute);
              return;
            }
          }
          const message =
            "This looks like a Grafana dashboard, would you like to open it with the Grafana Editor?";
          const response = await vscode.window.showInformationMessage(
            message,
            { modal: false },
            { title: "Yes" },
            { title: "No" },
            { title: "Don't show again" }
          );
          if (response && response.title === "Yes") {
            vscode.commands.executeCommand("gitit.openUrl", e.document.uri);
          }
          if (response && response.title === "Don't show again") {
            vscode.workspace.getConfiguration("gitit").update("message", false);
          }
        } catch {}
      }
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  stopServer();
}
