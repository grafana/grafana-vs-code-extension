import vscode, { ColorThemeKind } from "vscode";
import fs from "fs";
import { port } from "./server";
import { Resource } from "./grafana";

export class GrafanaEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "grafana.dashboard";

  private static webviewContent = "";

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

    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) { }

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

    webviewPanel.webview.html = this.getHtmlForWebview(document);
  }

  private getTheme(): string {
    const settings = vscode.workspace.getConfiguration("grafana-vscode");
    const theme = settings.get<string>("theme");
    if (theme === "dark" || theme === "light") {
      return `theme=${theme}&`;
    }
    if (theme === "fixed") {
      return "";
    }

    const kind = vscode.window.activeColorTheme.kind;
    if (kind === ColorThemeKind.Light || kind === ColorThemeKind.HighContrastLight) {
      return "theme=light&";
    }

    return "theme=dark&";
  }

  /**
   * Get the static html used for the editor webviews.
   */
  private getHtmlForWebview(document: vscode.TextDocument): string {
    try {
      const resource = Resource.fromDocument(document);

      return GrafanaEditorProvider.webviewContent
        .replaceAll("${port}", port.toString())
        .replaceAll("${theme}", this.getTheme())
        .replaceAll("${filename}", resource.filename)
        .replaceAll("${uid}", resource.uid());
    } catch (err) {
      return this.errorView(String(err));
    }
  }

  private errorView(errorMessage: string): string {
    return fs.readFileSync(
      this.context.asAbsolutePath("public/error.html"),
      "utf-8",
    ).replaceAll('${error}', errorMessage);
  }
}
