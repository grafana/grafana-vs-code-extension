import fs from "fs";
import vscode from 'vscode';
import YAML from 'yaml';

type Format = 'json' | 'yaml';
type Envelope = 'none' | 'grizzly';

export class Resource {
  private readonly viewType = "grafana.dashboard";

  public static fromDocument(document: vscode.TextDocument): Resource {
    return Resource.decode(document.fileName, document.getText());
  }

  public static fromFile(filename: string): Resource {
    return Resource.decode(filename, fs.readFileSync(filename, 'utf-8').toString());
  }

  public static decode(filename: string, content: string): Resource {
    const extension = filename.slice(filename.lastIndexOf("."));
    let resourceData: any = {};
    let format: Format = 'json';

    switch (extension) {
      case '.json':
        resourceData = JSON.parse(content);
        break;
      case '.yaml':
      case '.yml':
        resourceData = YAML.parse(content);
        format = 'yaml';
        break;
      default:
        throw new Error(`unsupported extension '${extension}`);
    }

    return Resource.unwrap(filename, format, resourceData);
  }

  private static unwrap(filename: string, format: Format, resourceData: any): Resource {
    // no apparent envelope
    if (resourceData.uid) {
      return new Resource(filename, format, 'none', resourceData);
    }

    // grizzly envelope
    if (resourceData.apiVersion === 'grizzly.grafana.com/v1alpha1') {
      if (!resourceData.metadata || !resourceData.metadata.name) {
        throw new Error(`malformed grizzly envelope in '${filename}: metadata.name field not found`);
      }
      if (!resourceData.spec) {
        throw new Error(`malformed grizzly envelope in '${filename}: spec field not found`);
      }

      return new Resource(filename, format, 'grizzly', resourceData);
    }

    throw new Error(`could not parse resource in '${filename}: unrecognized format`);
  }

  constructor(
    public readonly filename: string,
    private readonly format: Format,
    private readonly envelope: Envelope,
    private readonly data: any,
  ) { }

  public uid(): string {
    if (this.envelope === 'none') {
      return this.data.uid;
    }

    return this.data.metadata.name;
  }
  
  public spec(): any {
    if (this.envelope === 'none') {
      return this.data;
    }

    return this.data.spec;
  }

  public withSpec(newSpec: any): Resource {
    if (this.envelope === 'grizzly') {
      const newData = {...this.data, ...{spec: newSpec}};
      return new Resource(this.filename, this.format, this.envelope, newData);
    }

    return new Resource(this.filename, this.format, this.envelope, newSpec);
  }

  public write(): Promise<void> {
    let content = '';
    switch (this.format) {
      case "json":
        content = JSON.stringify(this.data, null, 2);
        break;
      case "yaml":
        content = YAML.stringify(this.data, null, {indent: 4});
        break;
    }

    return fs.promises.writeFile(this.filename, content)
  }
}
