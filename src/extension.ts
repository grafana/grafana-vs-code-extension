// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import {
  setCurrentFileName,
  setJson,
  startServer,
  stopServer,
  port,
} from "./server";
import { constructPrometheusQuery, constructPyroscopeQuery, constructTempoDashboardQuery, constructTempoQuery, identifyPromQLQueries } from "./helpers";

//   // dev helper function to dump all the command identifiers to the console
//   // helps if you cannot find the command id on github.
//   var findCommand = function(){
//     vscode.commands.getCommands(true).then(
//         function(cmds){
//             console.log("fulfilled");
//             console.log(cmds);
//             var fs = require('fs');
//             fs.writeFile("/Users/annanay/Desktop/git/go/src/github.com/grafana/grafana-vs-code-extension/test.txt", JSON.stringify(cmds), function(err: Error) {
//                 if (err) {
//                     console.log(err);
//                 }
//             });
//                     },
//         function() {
//             console.log("failed");
//             console.log(arguments);
//         }
//     );
// };

export interface Query {
  metric_name: string
  metric_namespace: string
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(ctx: vscode.ExtensionContext) {
  const openedFiles = new Set();
  startServer();

  // Track identified queries per file
  const identifiedQueries = new Map<string, Query[]>();

  // Listen to text documents being opened to parse the file and identify any queries
  vscode.workspace.onDidOpenTextDocument(async (document) => {
    // For now, just check go files
    if (document.languageId !== 'go') {
      return
    }

    // Check if the file has already been processed and has results in identifiedQueries
    if (identifiedQueries.has(document.fileName)) {
      return identifiedQueries.get(document.fileName);
    }
    
    // Parse the file and identify queries if not already done
    const documentContent = document.getText();
    const res = await identifyPromQLQueries(documentContent)
    identifiedQueries.set(document.fileName, res);
  });

  // Register a hover provider for identified queries
  ctx.subscriptions.push(
    vscode.languages.registerHoverProvider('go', {
      provideHover(document, position, token) {
        // Check if the file has any identified queries
        const queries = identifiedQueries.get(document.fileName);
        if (!queries) {
          return;
        }

        // See if any of the identified queries overlap the active position
        const wordRange = document.getWordRangeAtPosition(position);
        const rangeText = document.getText(wordRange);
        const query = queries.find((query: Query) => query.metric_name.includes(rangeText)) ?? queries[0];
        if (!query) {
          return
        }

        // Build the explore URL and return the hover content
        // TODO: Identify if counter or histogram
        const exploreURL = constructPrometheusQuery(query.metric_name, "counter")
        const content = new vscode.MarkdownString()
        content.appendMarkdown(`<p>${query.metric_name}: <a href="${exploreURL}">Open in Explore</a></p>`)
        content.supportHtml = true
        return { 
          contents: [content]
        }
      }
    })
  )

  ctx.subscriptions.push(
    vscode.commands.registerCommand(
      "grafana-vscode.openUrl",
      (uri: vscode.Uri) => {
        const panel = vscode.window.createWebviewPanel(
          "webview",
          "Dashboard Editor",
          vscode.ViewColumn.One,
          { enableScripts: true }
        );

        const fileName = uri?.fsPath;

        if (fileName) {
          setCurrentFileName(fileName);
          openedFiles.add(fileName);
          const data = fs.readFileSync(fileName, "utf-8");
          setJson(data);

          panel.webview.html = fs
            .readFileSync(ctx.asAbsolutePath("public/webview.html"), "utf-8")
            .replaceAll("${port}", port.toString());

          panel.onDidDispose(() => {
            openedFiles.delete(fileName);
          });
        }
      }
    )
  );

  ctx.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "grafana-vscode.openInGrafanaExplore",
      async (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
        const selectedText = editor.document.getText(editor.selection);
        var grafanaURL = await constructPrometheusQuery(selectedText, "counter");
        // vscode.env.openExternal(vscode.Uri.parse(grafanaURL));
      }
    )
  );

  // // debug logging all extensions
  // // console.log(vscode.extensions.all.map(x => x.id));

  // var vscodeGoExtension =  vscode.extensions.getExtension('vscode.go');

  // // is the ext loaded and ready?
  // if( vscodeGoExtension !== undefined && vscodeGoExtension.isActive === false ){
  //   vscodeGoExtension.activate().then(
  //         function(){
  //             console.log( "Extension activated");
  //             const editor = vscode.window.activeTextEditor;
  //             var res = vscode.commands.executeCommand("<insert action name>");
  //             console.log("command execution response", res);
  //           },
  //         function(){
  //             console.log( "Extension activation failed");
  //         }
  //     );
  // } else {
  //   console.log( "Extension was already active");
  //   var res = vscode.commands.executeCommand("<insert action name>");
  //   console.log("command execution response", res);
  // }

  ctx.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "grafana-vscode.openInTempoExplore",
      (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
        const selectedText = editor.document.getText(editor.selection);
        var grafanaURL = constructTempoQuery(selectedText);
        vscode.env.openExternal(vscode.Uri.parse(grafanaURL));
      }
    )
  );

  ctx.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "grafana-vscode.openInTempoDashboard",
      (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
        const selectedText = editor.document.getText(editor.selection);
        var grafanaURL = constructTempoDashboardQuery(selectedText);
        vscode.env.openExternal(vscode.Uri.parse(grafanaURL));
      }
    )
  );

  ctx.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "grafana-vscode.openInTempoExploreErrors",
      (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
        const selectedText = editor.document.getText(editor.selection);
        var grafanaURL = constructTempoQuery(selectedText, 'errors');
        vscode.env.openExternal(vscode.Uri.parse(grafanaURL));
      }
    )
  );

  ctx.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "grafana-vscode.openInPyroscopeExplore",
      (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
        const selectedText = editor.document.getText(editor.selection);
        var grafanaURL = constructPyroscopeQuery(selectedText);
        vscode.env.openExternal(vscode.Uri.parse(grafanaURL));
      }
    )
  );

  ctx.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (e) => {
      if (
        e &&
        e.document &&
        !openedFiles.has(e.document.uri.fsPath) &&
        vscode.workspace.getConfiguration("grafana-vscode").get("message")
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
            vscode.commands.executeCommand(
              "grafana-vscode.openUrl",
              e.document.uri
            );
          }
          if (response && response.title === "Don't show again") {
            vscode.workspace
              .getConfiguration("grafana-vscode")
              .update("message", false);
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
