import * as vscode from 'vscode';
import * as fs from "fs";
import { port } from "./server";

export class GrafanaEditorProvider implements vscode.CustomTextEditorProvider {

	static webviewContent = "";
	static webviewErrorContent = "";

	static readonly viewType = 'grafana.dashboard';

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new GrafanaEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(
			GrafanaEditorProvider.viewType,
			provider,
			{
				webviewOptions: {
				    retainContextWhenHidden: true,
			    }
		    },
		);
		this.webviewContent = fs.readFileSync(context.asAbsolutePath("public/webview.html"), "utf-8");
		this.webviewContent = this.webviewContent.replaceAll("${editor}", "VSCode");
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

		webviewPanel.webview.html = this.getHtmlForWebview(document);

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
	private getHtmlForWebview(document: vscode.TextDocument): string {
		const dash = JSON.parse(document.getText());
		const uid = (dash.uid as string);
		let view = GrafanaEditorProvider.webviewContent.replaceAll("${filename}", document.uri.fsPath);
		view = view.replaceAll("${port}", port.toString());
		view = view.replaceAll("${uid}", uid);
		return view;
	}

}
