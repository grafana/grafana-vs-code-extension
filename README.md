# VS Code Extension for Grafana

VS Code Extension for Grafana is an extension for VSCode that allows you to view, edit, and preview a dashboard in a running instance of Grafana without opening a browser - and without having to save the changes remotely before you are done!

This extension gives you support for Git (and any other version control system for that matter). If it is available in VS Code, it is available for you immediately.

## Features

- Reads a dashboard JSON you have locally.
- Opens the dashboard configured in the JSON in a running Grafana instance.
- Allows you to edit the dashboard from the UI.
- Saves your changes to _your_ JSON when you hit "Save" in the webview.

## Requirements

- Have a dashboard JSON handy.
- Have a running instance of Grafana locally _or_ have access to a hosted Grafana instance.
- It is best if you use an instance of Grafana that has this dashboard because otherwise some parts of it that use its UID won't load for you.
- It is best if the data sources that the dashboard references are available (and named the same) on the Grafana instance you are pointing at.

## Usage:

### Setup
- Run `yarn install` in this repo.
- Have a JSON file of a dashboard on your machine.

### Run

1. Add `dashboardEmbed` feature toggle to Grafana config.
2. Create a [Service account in Grafana](https://grafana.com/docs/grafana/latest/administration/service-accounts/#create-a-service-account-in-grafana) and add a token to it. Save the token for later use.
3. Open the Settings tab inside the extension (use `cmd` + `,` on Mac) and find the Grafana VS Code Extension.
4. If using a hosted Grafana instance, paste that instance's URL in the `URL` field. If using a local Grafana instance, leave the default value.
5. Paste the previously created Service Account token into the `Token` field.
6. If using a local Grafana instance, start Grafana locally.
7. Open the extension in VS Code, then press F5 to start the extension locally.
8. Right-click on one of the `dashboard.json` files in the `dashboards` folder and select `Edit in Grafana`.

### Play
- Edit your dashboard.
- Save the changes.
- See your changes in the JSON file you used to open the editor.

The changes are not saved in Grafana. The editor is for local preview and editing only.

## Extension Settings

- `grafana-vscode.URL`: Set the URL of the Grafana instance you want to open the dashboard in. Defaults to 'http://localhost:3000'.
- `grafana-vscode.token`: A Service Account token. Defaults to an empty string.
- `grafana-vscode.port`: A port for the extension's proxy server, defaults to `3004`.
- `grafana-vscode.message`: A toggle to show a popup message when a dashboard JSON is detected. Defaults to `true`.

## Known Issues

If you are using a hosted Grafana instance, you need to set up the following configuration in it:
```yaml
[security]
cookie_secure = true
cookie_samesite = none
allow_embedding = true
```

## Plugin communication with Grafana

```mermaid
sequenceDiagram
    participant Webview as Webview <br> (inside the VS Code Extension)
    participant Iframe as Iframe (Grafana) <br> (rendered inside the extension's webview)
    participant ProxyServer as Proxy server <br> (running inside the extension)
    participant FileSystem as File system

    Note over ProxyServer: Starts on port 3004 (configurable via the extension's settings)
    Iframe->>ProxyServer: Request to retrieve the JSON for opened dashboard
    Webview->>Iframe: Render an iframe for Grafana. Callback URL to the proxy is an iframe src URL param 
    ProxyServer-->>Iframe: JSON for opened dashboard
    Iframe->>ProxyServer: Edited dashboard JSON on save
    ProxyServer->>FileSystem: Edited dashboard JSON
```