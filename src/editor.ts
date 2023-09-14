import * as vscode from 'vscode';
import * as fs from "fs";
import { setCurrentFileName, port } from "./server";

export class GrafanaEditorProvider implements vscode.CustomTextEditorProvider {

	static webviewContent = "";

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new GrafanaEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(GrafanaEditorProvider.viewType, provider);
		this.webviewContent = fs.readFileSync(context.asAbsolutePath("public/webview.html"), "utf-8");
		return providerRegistration;
	}

	static readonly viewType = 'grafana.dashboard';

	constructor(
		private readonly context: vscode.ExtensionContext
	) { }

	/**
	 * Called when our custom editor is opened.
	 */
	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	) {
		
		webviewPanel.webview.options = {
			enableScripts: true,
		};

		setCurrentFileName(document.uri.fsPath);

		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		function updateWebview() {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
			});
		}

		webviewPanel.onDidChangeViewState(e=>{
			setCurrentFileName(document.uri.fsPath);
		});

		// Update webview if text for *this* document changes
		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});

		// Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		updateWebview();
	}

	/**
	 * Get the static html used for the editor webviews.
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		return GrafanaEditorProvider.webviewContent.replaceAll("${port}", port.toString());
	}
}
