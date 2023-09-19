import * as vscode from 'vscode';
import * as fs from "fs";
import { configureFile, port } from "./server";

export class GrafanaEditorProvider implements vscode.CustomTextEditorProvider {

	static webviewContent = "";
	static webviewURL = "/d/vscode/dashboard";
	static readonly viewType = 'grafana.dashboard';

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new GrafanaEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(GrafanaEditorProvider.viewType, provider);
		this.webviewContent = fs.readFileSync(context.asAbsolutePath("public/webview.html"), "utf-8");
		this.webviewContent = this.webviewContent.replaceAll("${editor}", "VSCode");
		this.webviewContent = this.webviewContent.replaceAll("${url}", GrafanaEditorProvider.webviewURL);
		return providerRegistration;
	}

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

		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document.uri.fsPath);

		function updateWebview() {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
			});
		}

		webviewPanel.onDidChangeViewState(e=>{
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
	private getHtmlForWebview(webview: vscode.Webview, fspath: string): string {
		const uid = configureFile(fspath);
		console.log(`UID FOR ${fspath} is ${uid} *******`);
		let view = GrafanaEditorProvider.webviewContent.replaceAll("${filename}", fspath);
		view = view.replaceAll("${port}", port.toString());
		view = view.replaceAll("${uid}", uid);
		console.log("HTML:", view);
		return view;
	}
}
