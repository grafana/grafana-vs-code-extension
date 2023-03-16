# gitit README

gitit is an extenstion for VSCode that allows you to view, edit, and preview a dashboard in a running instance of grafana without opening a browser - and without having to save the changes remotely before you are done!

The name `gitit` is a reference to ideas around meaningful git workflows for Grafana. This extension gives you support for Git (and any other version control system for that matter). If it is available in VSCode, it is available for you immediately.

## Features

- reads a dashboard JSON you have locally
- opens the dashboard configured in the JSON in a running grafana instance
- allows you to edit the dashboard from the UI
- saves your changes to _your_ JSON when you hit "Save dashboard" in the webview

## Requirements

- have a dashboard JSON handy
- have a running instance of grafana locally _or_ have access to a hosted grafana instance
- it is best if you use an instance of grafana that has this dashboard because otherwise some parts of it that use its UID won't load for you
- it is best if the datasources that the dashboard references are available (and named the same) on the Grafana instance you are pointing at

## Usage:

#### Setup
- `yarn install` in this repo
- have a JSON file of a dashboard on your machine

#### Run
1. open VSCode Run and Debug and run extension, or press `F5` anywhere 
2. go to the just opened Extension Development Host
3. go to your dashboard JSON file
4. right-click on the file and choose `Edit in Grafana`.
5. open the Dashboard Editor in the Extension Development Host and see your dashboard*

*If you cannot see your dashboard, go to your browser and load http://localhost:3001. Login and see your `grafana_session` cookie. Copy it and paste in your VSCode settings `GitIt: Cookie` or in your settings json as "`gitit.cookie`". Rerun the extension and repeat above steps. 

#### Play
- edit your dashboard 
- save the changes
- see your changes in the JSON file you used to open the editor

The changes are not saved in Grafana. The editor is for local preview and editing only. 

## Extension Settings

* `gitit.URL`: Set the URL of the grafana instance your dashboard lives on. Defaults to 'http://localhost:3000'.
* `gitit.cookie`: Set value of an active `grafana_session` cookie.

## Known Issues

If you are using a hosted grafana instance, you need to setup the following configuration in it:
```
[security]
cookie_secure = true
cookie_samesite = none
allow_embedding = true
```

