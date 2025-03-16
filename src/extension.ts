import * as vscode from "vscode";

// Store annotations
let annotations: { [key: string]: string } = {};

// Create a decoration type for highlighting annotated text
const annotationDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgb(195, 195, 70)", 
  border: "1px solid rgb(255, 255, 255)",
  overviewRulerColor: "yellow",
  overviewRulerLane: vscode.OverviewRulerLane.Right,
});

/**
 * Updates decorations in the active editor based on annotations.
 */
function updateDecorations(editor: vscode.TextEditor) {
  if (!editor) return;

  const decorations: vscode.DecorationOptions[] = [];

  for (const key in annotations) {
    const [uri, line, character] = key.split(":");
    if (editor.document.uri.toString() !== uri) continue;

    const position = new vscode.Position(Number(line), Number(character));
    const range = new vscode.Range(position, position.translate(0, 3)); // Highlight character
    decorations.push({ range, hoverMessage: `**📝 Annotation:** ${annotations[key]}` });
  }

  editor.setDecorations(annotationDecoration, decorations);
}

export function activate(context: vscode.ExtensionContext) {
  // Register command to add annotation
  let addAnnotationCommand = vscode.commands.registerCommand("jotation.addAnnotation", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active text editor found.");
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText.trim()) {
      vscode.window.showWarningMessage("Please select some text to annotate.");
      return;
    }

    // Prompt the user for an annotation
    const note = await vscode.window.showInputBox({ prompt: "Enter your annotation:" });
    if (!note) return;

    // Store the annotation
    const key = `${editor.document.uri.toString()}:${selection.start.line}:${selection.start.character}`;
    annotations[key] = note;

    // Update decorations
    updateDecorations(editor);

    vscode.window.showInformationMessage("Annotation added!");
  });

  // Register a hover provider globally
  vscode.languages.registerHoverProvider("*", {
    provideHover(document, position) {
      const key = `${document.uri.toString()}:${position.line}:${position.character}`;
      if (annotations[key]) {
        return new vscode.Hover(`**📝 Annotation:** ${annotations[key]}`);
      }
    }
  });

  // Update decorations when the editor changes
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) updateDecorations(editor);
  }, null, context.subscriptions);

  // Update decorations when text changes
  vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (editor && event.document === editor.document) {
      updateDecorations(editor);
    }
  }, null, context.subscriptions);

  context.subscriptions.push(addAnnotationCommand);
}

export function deactivate() {}
