# Contributing Guidelines

This document is a guide to help you through the process of contributing to the `grafana-vs-code-extension`.

## Developing the extension

### Create a fork

[Fork][fork], then clone the repository:

```shell
git clone git@github.com:{your_github_username}/grafana-vs-code-extension.git
cd grafana-vs-code-extension
git remote add upstream https://github.com/grafana/grafana-vs-code-extension.git
git fetch upstream
```

### Install `devbox`

This repository relies on [devbox](https://www.jetify.com/devbox/docs/) to manage all
the tools and dependencies needed for its development.

A shell including all the required tools is accessible via:

```shell
devbox shell
```

This shell can be exited like any other shell, with `exit` or `CTRL+D`.

One-off commands can be executed within the devbox shell as well:

```shell
devbox run node --version
```

### Install dependencies

```shell
devbox run yarn install
```

### Run the extension

Compile the extension, and keep watching for changes:

```shell
devbox run yarn watch
```

Open this repository in VS Code, then press `F5` to start the extension locally.

### Make changes

To make changes to this codebase, follow the instructions on running the extension. Then, in your original VS Code window, make changes to the code base.

Restart the extension with either <kbd>CTRL</kbd> + <kbd>SHIFT</kbd> + <kbd>F5</kbd> (<kbd>CMD</kbd> + <kbd>SHIFT</kbd> + <kbd>F5</kbd> on a Mac) or by clicking the green restart circle.

Debug logs and dev tools can be accessed with <kbd>CTRL</kbd> + <kbd>SHIFT</kbd> + <kbd>I</kbd> on the VS Code development host.

## Releasing the extension

Releasing is a two step process:

1. Prepare the release by updating the version number in `package.json` and describing what changed in the `CHANGELOG.md` file. See the [release preparation commit for `v0.0.19`](https://github.com/grafana/grafana-vs-code-extension/commit/71299f05d96391ce10b40bfe4de812955ace56dd). Open a pull request for this commit, get it reviewed and merged.
2. Trigger the release pipeline by creating and pushing a tag: `git tag {version} && git push origin {version}`

> [!NOTE]
> The release pipeline creates and publishes a `.vsix` artifact to Open VSX, the Visual Studio Marketplace, as well as a GitHub release.


[fork]: https://github.com/grafana/grafana-vs-code-extension/fork
