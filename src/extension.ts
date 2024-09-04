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
                body {
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                }
                h1 {
                    font-size: 1.5em;
                    margin-bottom: 20px;
                    color: var(--vscode-titleBar-activeForeground);
                }
                #patterns {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .pattern-row {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .pattern-group {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    flex-grow: 1;
                }
                .remove-pattern {
                    background-color: var(--vscode-errorForeground);
                    width: 24px;
                    height: 24px;
                    padding: 0;
                    font-size: 18px;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    order: -1; /* This moves the button to the start of the flex container */
                }
                .pattern-input {
                    flex-grow: 1;
                    padding: 5px 10px;
                    border: 1px solid var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border-radius: 3px;
                    height: 24px;
                    box-sizing: border-box;
                }
                button {
                    padding: 5px 10px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                #add-pattern {
                    margin-right: 10px;
                }
                .and-button {
                    background-color: var(--vscode-button-background);
                    width: 24px;
                    height: 24px;
                    padding: 0;
                    font-size: 14px;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .and-operator {
                    font-weight: bold;
                    color: var(--vscode-button-foreground);
                }
                .pattern-options {
                    display: flex;
                    gap: 10px;
                    margin-top: 5px;
                }
                .pattern-option {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
            </style>
        </head>
        <body>
            <h1>Multi-Grep</h1>
            <div id="patterns">
                <div class="pattern-row">
                    <button class="remove-pattern">-</button>
                    <div class="pattern-group">
                        <input type="text" class="pattern-input" placeholder="Enter search pattern">
                        <button class="and-button">&</button>
                        <div class="pattern-options">
                            <label class="pattern-option">
                                <input type="checkbox" class="match-case"> Match Case
                            </label>
                            <label class="pattern-option">
                                <input type="checkbox" class="match-whole-word"> Match Whole Word
                            </label>
                        </div>
                    </div>
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
                        <button class="remove-pattern">-</button>
                        <div class="pattern-group">
                            <input type="text" class="pattern-input" placeholder="Enter search pattern">
                            <button class="and-button">&</button>
                            <div class="pattern-options">
                                <label class="pattern-option">
                                    <input type="checkbox" class="match-case"> Match Case
                                </label>
                                <label class="pattern-option">
                                    <input type="checkbox" class="match-whole-word"> Match Whole Word
                                </label>
                            </div>
                        </div>
                    \`;
                    addRemoveListener(row.querySelector('.remove-pattern'));
                    addAndListener(row.querySelector('.and-button'));
                    return row;
                }

                function createAndPattern(button) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'pattern-input';
                    input.placeholder = 'Enter AND pattern';

                    const operator = document.createElement('span');
                    operator.className = 'and-operator';
                    operator.textContent = '&&';

                    const group = button.closest('.pattern-group');
                    group.insertBefore(operator, button);
                    group.insertBefore(input, button);
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

                function addAndListener(button) {
                    button.addEventListener('click', function() {
                        createAndPattern(this);
                    });
                }

                // Add listeners to the initial buttons
                addRemoveListener(patternsContainer.querySelector('.remove-pattern'));
                addAndListener(patternsContainer.querySelector('.and-button'));

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
                    const patterns = Array.from(patternsContainer.getElementsByClassName('pattern-row')).map(row => {
                        const inputs = row.getElementsByClassName('pattern-input');
                        return Array.from(inputs).map(input => {
                            const matchCase = input.parentElement.querySelector('.match-case').checked;
                            const matchWholeWord = input.parentElement.querySelector('.match-whole-word').checked;
                            return {
                                pattern: input.value.trim(),
                                matchCase,
                                matchWholeWord
                            };
                        }).filter(v => v.pattern !== '');
                    }).filter(group => group.length > 0);
                    vscode.postMessage({ type: 'apply', patterns: patterns });
                });
            </script>
        </body>
        </html>`;
    }

    private async _applyGrep(patterns: Array<Array<{ pattern: string; matchCase: boolean; matchWholeWord: boolean }>>) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const lines = text.split('\n');
            let results = '';

            lines.forEach((line) => {
                if (patterns.some(group => group.every(({ pattern, matchCase, matchWholeWord }) => {
                    let flags = 'g';
                    if (!matchCase) flags += 'i';
                    let regexPattern = pattern;
                    if (matchWholeWord) regexPattern = `\\b${regexPattern}\\b`;
                    const regex = new RegExp(regexPattern, flags);
                    return regex.test(line);
                }))) {
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