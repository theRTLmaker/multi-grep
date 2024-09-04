import * as vscode from 'vscode';

class MultiGrepViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'multi-grep-view';

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'apply':
                    this._applyGrep(data.patterns);
                    break;
                case 'info':
                    vscode.window.showInformationMessage(data.message);
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <title>Multi-Grep</title>
            <style>
                body { padding: 10px; font-family: Arial, sans-serif; }
                #patterns { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
                .pattern-row { display: flex; gap: 5px; }
                .pattern-input { flex-grow: 1; }
                button { cursor: pointer; }
            </style>
        </head>
        <body>
            <h1>Multi-Grep</h1>
            <div id="patterns">
                <div class="pattern-row">
                    <input type="text" class="pattern-input">
                    <button class="remove-pattern">-</button>
                </div>
            </div>
            <button id="add-pattern">+</button>
            <button id="apply">Apply</button>
            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                const patternsContainer = document.getElementById('patterns');

                function createPatternRow() {
                    const row = document.createElement('div');
                    row.className = 'pattern-row';
                    row.innerHTML = \`
                        <input type="text" class="pattern-input">
                        <button class="remove-pattern">-</button>
                    \`;
                    addRemoveListener(row.querySelector('.remove-pattern'));
                    return row;
                }

                function addRemoveListener(button) {
                    button.addEventListener('click', function() {
                        const row = this.closest('.pattern-row');
                        if (patternsContainer.children.length > 1) {
                            patternsContainer.removeChild(row);
                        } else {
                            vscode.postMessage({ type: 'info', message: 'Cannot remove the last input field.' });
                        }
                    });
                }

                // Add listener to the initial remove button
                addRemoveListener(patternsContainer.querySelector('.remove-pattern'));

                document.getElementById('add-pattern').addEventListener('click', () => {
                    const inputs = patternsContainer.getElementsByClassName('pattern-input');
                    const lastInput = inputs[inputs.length - 1];
                    if (lastInput && lastInput.value.trim() !== '') {
                        patternsContainer.appendChild(createPatternRow());
                    } else {
                        vscode.postMessage({ type: 'info', message: 'Please fill the last input before adding a new one.' });
                    }
                });

                document.getElementById('apply').addEventListener('click', () => {
                    const patterns = Array.from(document.getElementsByClassName('pattern-input')).map(input => input.value);
                    vscode.postMessage({ type: 'apply', patterns: patterns.filter(p => p.trim() !== '') });
                });
            </script>
        </body>
        </html>`;
    }

    private async _applyGrep(patterns: string[]) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const lines = text.split('\n');
            let results = '';

            // Create a single regex pattern for all search terms
            const combinedPattern = patterns.map(p => `(${p})`).join('|');
            const regex = new RegExp(combinedPattern, 'i'); // 'i' for case-insensitive

            lines.forEach((line) => {
                if (regex.test(line)) {
                    results += `${line.trim()}\n`;
                }
            });

            if (results) {
                const resultDocument = await vscode.workspace.openTextDocument({ content: results });
                vscode.window.showTextDocument(resultDocument, vscode.ViewColumn.Beside);
            } else {
                vscode.window.showInformationMessage('No matches found for the given patterns.');
            }
        } else {
            vscode.window.showErrorMessage('No active text editor found. Please open a file to search.');
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new MultiGrepViewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MultiGrepViewProvider.viewType, provider)
    );

    let disposable = vscode.commands.registerCommand('multi-grep.start', () => {
        vscode.commands.executeCommand('workbench.view.extension.multi-grep-sidebar');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}