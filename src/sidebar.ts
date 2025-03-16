import * as vscode from "vscode";

export class AnnotationSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "jotation.annotationSidebar";
  private _view?: vscode.WebviewView;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = this.getHtml();
  }

  private getHtml() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Annotations</title>
          <style>
              body { font-family: Arial, sans-serif; padding: 10px; }
              button { margin-top: 10px; }
          </style>
      </head>
      <body>
          <h3>Jotation Annotations</h3>
          <button onclick="toggleAnnotations()">Toggle Annotations</button>
          <script>
              function toggleAnnotations() {
                  vscode.postMessage({ command: "toggleAnnotations" });
              }
          </script>
      </body>
      </html>
    `;
  }
}
