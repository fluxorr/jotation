import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

// File path for storing annotations
const annotationFilePath = vscode.workspace.workspaceFolders
    ? path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, ".vscode", "jotation_annotations.json")
    : null;

// Annotation storage
let annotations: { [key: string]: { range: vscode.Range; text: string } } = {};
let showAnnotations = true; 

// load annotations from file storage
function loadAnnotations() {
    if (!annotationFilePath) return;
    if (fs.existsSync(annotationFilePath)) {
        try {
            const data = fs.readFileSync(annotationFilePath, "utf8");
            annotations = JSON.parse(data);
            console.log("Annotations loaded successfully:", annotations);
        } catch (error) {
            console.error("Failed to load annotations:", error);
        }
    }
}

// save jots to file sotrage
function saveAnnotations() {
    if (!annotationFilePath) return;
    try {
        fs.writeFileSync(annotationFilePath, JSON.stringify(annotations, null, 2), "utf8");
        console.log("✅ Annotations saved successfully.");
    } catch (error) {
        console.error("❌ Failed to save annotations:", error);
    }
}


const annotationDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 255, 0, 0.3)",
    border: "1px solid yellow"
});


function updateDecorations() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const documentUri = editor.document.uri.toString();
    let decorations: vscode.DecorationOptions[] = [];

    if (showAnnotations) {
        for (const key in annotations) {
            if (key.startsWith(documentUri)) {
                console.log("Applying decoration for key:", key);
                const annotation = annotations[key];

                decorations.push({
                    range: new vscode.Range(
                        new vscode.Position(annotation.range.start.line, annotation.range.start.character),
                        new vscode.Position(annotation.range.end.line, annotation.range.end.character)
                    ),
                    hoverMessage: `📝 ${annotation.text}`
                });
            }
        }
    }

    console.log("Applying decorations:", decorations.length);
    editor.setDecorations(annotationDecoration, decorations);
}

export function activate(context: vscode.ExtensionContext) {
    console.log("🚀 Jotation Extension Activated!");


    loadAnnotations();

    // apply jots immediartelty  
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) updateDecorations();
    }, null, context.subscriptions);

    vscode.workspace.onDidOpenTextDocument((document) => {
        if (vscode.window.activeTextEditor?.document === document) {
            updateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            updateDecorations();
        }
    }, null, context.subscriptions);

    // Command to add an annotation
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

        const note = await vscode.window.showInputBox({ prompt: "Enter your annotation:" });
        if (!note) return;

        const key = `${editor.document.uri.toString()}:${selection.start.line}:${selection.start.character}`;
        annotations[key] = { range: selection, text: note };

        saveAnnotations();
        updateDecorations();
        vscode.window.showInformationMessage("Annotation added!");
        annotationProvider.refresh();
    });

    // Toggle annotation visibility
    let toggleAnnotationsCommand = vscode.commands.registerCommand("jotation.toggleAnnotations", () => {
        showAnnotations = !showAnnotations;
        updateDecorations();
        vscode.window.showInformationMessage(`Annotations ${showAnnotations ? "enabled" : "hidden"}`);
    });

    context.subscriptions.push(addAnnotationCommand, toggleAnnotationsCommand);

    // Sidebar somethin view for annotations
    const annotationProvider = new AnnotationProvider();
    vscode.window.registerTreeDataProvider("jotationSidebar", annotationProvider);

    let refreshAnnotationsCommand = vscode.commands.registerCommand("jotation.refreshAnnotations", () => {
        annotationProvider.refresh();
    });

    context.subscriptions.push(refreshAnnotationsCommand);
}

export function deactivate() {}

// Sidebar Data Provider // pretty shit ik
class AnnotationProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): vscode.TreeItem[] {
        return Object.keys(annotations).map((key) => {
            const annotation = annotations[key];
            const label = annotation.text;
            const uriParts = key.split(":");
            const line = parseInt(uriParts[uriParts.length - 2]);
            const fileUri = vscode.Uri.parse(uriParts.slice(0, -2).join(":"));

            let item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
            item.command = {
                command: "vscode.open",
                title: "Open Annotation",
                arguments: [fileUri, { selection: annotation.range }]
            };
            item.tooltip = `Line ${line}`;
            return item;
        });
    }
}
