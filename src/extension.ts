// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import proxy from "./proxy";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // try to setup proxy
  proxy.listen(3001);

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "gitit" is now active!');
  let disposable = vscode.commands.registerCommand("gitit.openUrl", () => {
    const panel = vscode.window.createWebviewPanel(
      "webview",
      "Dashboard Editor",
      vscode.ViewColumn.One,
      {}
    );

    const fileName = vscode.window.activeTextEditor?.document.fileName;
    if (fileName) {
      const webviewContent = fs
        .readFileSync(context.asAbsolutePath("public/webview.html"), "utf-8")
        .replace("${fileName}", path.basename(fileName));

      panel.webview.html = webviewContent;
      panel.webview.options = {
        enableScripts: true,
      };
    }
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
