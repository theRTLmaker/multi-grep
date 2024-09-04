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
            <style>
                :root {
                    --container-padding: 20px;
                    --input-padding-vertical: 6px;
                    --input-padding-horizontal: 12px;
                    --input-margin-vertical: 4px;
                    --input-margin-horizontal: 0;
                }
                body {
                    padding: 0 var(--container-padding);
                    color: var(--vscode-foreground);
                    font-size: var(--vscode-font-size);
                    font-weight: var(--vscode-font-weight);
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-sideBar-background);
                }
                ol, ul {
                    padding-left: var(--container-padding);
                }
                body > *,
                form > * {
                    margin-block-start: var(--input-margin-vertical);
                    margin-block-end: var(--input-margin-vertical);
                }
                *:focus {
                    outline-color: var(--vscode-focusBorder) !important;
                }
                a {
                    color: var(--vscode-textLink-foreground);
                }
                a:hover,
                a:active {
                    color: var(--vscode-textLink-activeForeground);
                }
                code {
                    font-size: var(--vscode-editor-font-size);
                    font-family: var(--vscode-editor-font-family);
                }
                button {
                    border: none;
                    padding: var(--input-padding-vertical) var(--input-padding-horizontal);
                    text-align: center;
                    outline: 1px solid transparent;
                    outline-offset: 2px !important;
                    color: var(--vscode-button-foreground);
                    background: var(--vscode-button-background);
                    border-radius: 4px;
                }
                button:hover {
                    cursor: pointer;
                    background: var(--vscode-button-hoverBackground);
                }
                button:focus {
                    outline-color: var(--vscode-focusBorder);
                }
                button.secondary {
                    color: var(--vscode-button-secondaryForeground);
                    background: var(--vscode-button-secondaryBackground);
                }
                button.secondary:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
                input:not([type='checkbox']),
                textarea {
                    display: block;
                    width: 100%;
                    border: none;
                    font-family: var(--vscode-font-family);
                    padding: var(--input-padding-vertical) var(--input-padding-horizontal);
                    color: var(--vscode-input-foreground);
                    outline-color: var(--vscode-input-border);
                    background-color: var(--vscode-input-background);
                    border-radius: 4px;
                }
                input::placeholder,
                textarea::placeholder {
                    color: var(--vscode-input-placeholderForeground);
                }
                h1 {
                    font-size: 1.2em;
                    font-weight: 600;
                    margin-bottom: 1em;
                    margin-top: 1em;
                    text-transform: uppercase;
                    color: var(--vscode-sideBarSectionHeader-foreground);
                }
                .pattern-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    gap: 4px;
                }
                .pattern-group {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    flex-grow: 1;
                    flex-wrap: wrap;
                }
                .pattern-input-container {
                    display: flex;
                    align-items: center;
                    background-color: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    flex-grow: 1;
                    min-width: 100px;
                    border-radius: 4px;
                }
                .pattern-input {
                    flex-grow: 1;
                    border: none;
                    padding: 4px 8px;
                    background-color: transparent;
                    color: var(--vscode-input-foreground);
                    min-width: 50px;
                }
                .pattern-input:focus {
                    outline: none;
                }
                .icon-button {
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    flex-shrink: 0;
                    border: none;
                    cursor: pointer;
                    border-radius: 4px;
                    background-color: transparent;
                }
                .icon-button:hover {
                    opacity: 0.8;
                }
                .icon-button.active {
                    background-color: var(--vscode-inputOption-activeBackground);
                    color: var(--vscode-inputOption-activeForeground);
                }
                .remove-pattern {
                    color: var(--vscode-errorForeground);
                }
                .and-button {
                    color: var(--vscode-button-foreground);
                }
                .and-operator {
                    font-weight: bold;
                    margin: 0 4px;
                    white-space: nowrap;
                }
                #apply {
                    margin-bottom: 10px;
                    width: 100%;
                    font-size: 14px;
                    font-weight: 500;
                }
                #add-pattern {
                    margin-top: 10px;
                    width: 100%;
                }
            </style>
        </head>
        <body>
            <h1>Multi-Grep</h1>
            <button id="apply">Apply</button>
            <div id="patterns">
                <div class="pattern-row">
                    <button class="icon-button remove-pattern" title="Remove">×</button>
                    <button class="icon-button match-case-button" title="Match Case">Aa</button>
                    <button class="icon-button match-whole-word-button" title="Match Whole Word">ab</button>
                    <div class="pattern-group">
                        <div class="pattern-input-container">
                            <input type="text" class="pattern-input" placeholder="Enter search pattern">
                        </div>
                        <button class="icon-button and-button" title="Add AND condition">&</button>
                    </div>
                </div>
            </div>
            <button id="add-pattern" class="secondary">Add Pattern</button>
            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                const patternsContainer = document.getElementById('patterns');

                function createPatternRow() {
                    const row = document.createElement('div');
                    row.className = 'pattern-row';
                    row.innerHTML = \`
                        <button class="icon-button remove-pattern" title="Remove">×</button>
                        <button class="icon-button match-case-button" title="Match Case">Aa</button>
                        <button class="icon-button match-whole-word-button" title="Match Whole Word">ab</button>
                        <div class="pattern-group">
                            <div class="pattern-input-container">
                                <input type="text" class="pattern-input" placeholder="Enter search pattern">
                            </div>
                            <button class="icon-button and-button" title="Add AND condition">&</button>
                        </div>
                    \`;
                    addListeners(row);
                    return row;
                }

                function addListeners(row) {
                    row.querySelector('.remove-pattern').addEventListener('click', function() {
                        if (patternsContainer.children.length > 1) {
                            patternsContainer.removeChild(row);
                        } else {
                            vscode.postMessage({ type: 'info', message: 'Cannot remove the last input field.' });
                        }
                    });

                    row.querySelector('.and-button').addEventListener('click', function() {
                        const patternGroup = this.closest('.pattern-group');
                        const newInput = document.createElement('div');
                        newInput.className = 'pattern-input-container';
                        newInput.innerHTML = '<span class="and-operator">&&</span><input type="text" class="pattern-input" placeholder="Enter AND search pattern">';
                        patternGroup.insertBefore(newInput, this);
                    });

                    row.querySelectorAll('.match-case-button, .match-whole-word-button').forEach(button => {
                        button.addEventListener('click', function() {
                            this.classList.toggle('active');
                        });
                    });
                }

                addListeners(patternsContainer.querySelector('.pattern-row'));

                document.getElementById('add-pattern').addEventListener('click', () => {
                    const lastRow = patternsContainer.lastElementChild;
                    const inputs = lastRow.querySelectorAll('.pattern-input');
                    const lastInput = inputs[inputs.length - 1];

                    if (lastInput && lastInput.value.trim() !== '') {
                        patternsContainer.appendChild(createPatternRow());
                    } else {
                        vscode.postMessage({ type: 'info', message: 'Please fill the last input before adding a new pattern.' });
                    }
                });

                document.getElementById('apply').addEventListener('click', () => {
                    const patterns = Array.from(patternsContainer.getElementsByClassName('pattern-row')).map(row => {
                        return Array.from(row.getElementsByClassName('pattern-input')).map(input => ({
                            pattern: input.value.trim(),
                            matchCase: row.querySelector('.match-case-button').classList.contains('active'),
                            matchWholeWord: row.querySelector('.match-whole-word-button').classList.contains('active')
                        })).filter(p => p.pattern !== '');
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