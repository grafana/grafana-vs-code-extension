import * as vscode from "vscode";
import * as fs from "fs";
import { port } from "./server/server";

export class GrafanaEditorProvider implements vscode.CustomTextEditorProvider {
  static webviewContent = "";
  static webviewRuleContent = "";

  static readonly viewType = "grafana.dashboard";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new GrafanaEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      GrafanaEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );
    this.webviewContent = fs.readFileSync(
      context.asAbsolutePath("public/webview.html"),
      "utf-8",
    );
    this.webviewContent = this.webviewContent.replaceAll("${editor}", "VSCode");
    this.webviewRuleContent = fs.readFileSync(
      context.asAbsolutePath("public/alert-webview.html"),
      "utf-8",
    );
    this.webviewRuleContent = this.webviewRuleContent.replaceAll("${editor}", "VSCode");
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Called when our custom editor is opened.
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ) {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    try {
      const j = JSON.parse(document.getText()) as Map<string, any>;

      if (j.hasOwnProperty("schemaVersion")) {
        webviewPanel.webview.html = this.getHtmlForWebview(document);
      } else if (j.hasOwnProperty("rules")) {
        webviewPanel.webview.html = this.getRuleHtmlForWebview(document);
      }

    } catch(e) {
      if (e instanceof SyntaxError) {
        webviewPanel.webview.html = `<h1>Invalid JSON</h1><p>${e}</p>`;
      } else {
        webviewPanel.webview.html = `<h1>Error parsing json</h1><p>${e}</p>`;
      }
    }
  }

  /**
   * Get the static html used for the editor webviews.
   */
  private getHtmlForWebview(document: vscode.TextDocument): string {
    const dash = JSON.parse(document.getText());
    const uid: string = dash.uid;
    let view = GrafanaEditorProvider.webviewContent.replaceAll(
      "${filename}",
      document.uri.fsPath,
    );
    view = view.replaceAll("${port}", port.toString());
    view = view.replaceAll("${uid}", uid);
    return view;
  }

  /**
   * Get the static html used for the editor webviews.
   */
  private getRuleHtmlForWebview(document: vscode.TextDocument): string {
    const rules = JSON.parse(document.getText());
    const uid: string = rules.name;
    let view = GrafanaEditorProvider.webviewRuleContent.replaceAll(
      "${filename}",
      document.uri.fsPath,
    );
    view = view.replaceAll("${port}", port.toString());
    view = view.replaceAll("${uid}", uid);
    return view;
  }
}
