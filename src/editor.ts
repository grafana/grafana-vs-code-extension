import * as vscode from "vscode";
import * as fs from "fs";
import { port, verifyConnection } from "./server";

export class GrafanaEditorProvider implements vscode.CustomTextEditorProvider {
  static webviewContent = "";
  static webviewErrorContent = "";

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
    this.webviewErrorContent = fs.readFileSync(
      context.asAbsolutePath("public/webview-error.html"),
      "utf-8",
    );
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

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: "update",
        text: document.getText(),
      });
    }

    webviewPanel.onDidChangeViewState((e) => {});

    // Update webview if text for *this* document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          updateWebview();
        }
      },
    );

    // Make sure we get rid of the listener when our editor is closed.
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    const self = this;
    function verifySuccess() {
      webviewPanel.webview.html = self.getHtmlForWebview(document);
      updateWebview();
    }
    function verifyFailure(error: any) {
      webviewPanel.webview.html = self.getHtmlForWebviewError(error);
      updateWebview();
    }
    verifyConnection(verifySuccess, verifyFailure);
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
  private getHtmlForWebviewError(error: any): string {
    let view = GrafanaEditorProvider.webviewErrorContent.replaceAll(
      "${error}",
      error,
    );
    return view;
  }
}
