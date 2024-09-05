import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

class MultiGrepViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'multi-grep-view';
    private _view?: vscode.WebviewView;
    private _state: any = { patterns: [[{ pattern: '', matchCase: false, matchWholeWord: false }]] };

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'apply':
                    this._applyGrep(data.patterns);
                    this._state.patterns = data.patterns;
                    break;
                case 'info':
                    vscode.window.showInformationMessage(data.message);
                    break;
                case 'stateUpdate':
                    this._state = data.state;
                    break;
                case 'reset':
                    this._state = { patterns: [[{ pattern: '', matchCase: false, matchWholeWord: false }]] };
                    this._view?.webview.postMessage({ type: 'reset', state: this._state });
                    break;
            }
        });

        // Send the initial state to the webview
        webviewView.webview.postMessage({ type: 'initialState', state: this._state });

        // Update the webview's content when it becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                webviewView.webview.postMessage({ type: 'initialState', state: this._state });
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();

        // Read the HTML file
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'webview', 'multi-grep-view.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

        // Replace placeholders in the HTML
        htmlContent = htmlContent.replace(/{{nonce}}/g, nonce);
        htmlContent = htmlContent.replace(/{{cspSource}}/g, webview.cspSource);

        return htmlContent;
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