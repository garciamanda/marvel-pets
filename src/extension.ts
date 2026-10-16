import * as vscode from 'vscode';
import * as fs from 'fs';

process.setMaxListeners(20);

export class MarvelPetsProvider implements vscode.WebviewViewProvider {
	constructor(private readonly context: vscode.ExtensionContext) {}

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	): void {
		console.log('🕷️ [4] resolveWebviewView CHAMADO!');

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
		};

		try {
			const html = this.getHtml(webviewView.webview);
			webviewView.webview.html = html;
		} catch (error) {
			console.error('🕷️ ERRO em resolveWebviewView:', error);
			webviewView.webview.html =
				`<html><body style="font-family:sans-serif;padding:10px;">` +
				`Erro ao carregar o pet: ${String(error)}</body></html>`;
		}
	}

	public getHtml(webview: vscode.Webview): string {
		const mediaDir = vscode.Uri.joinPath(this.context.extensionUri, 'media');
		const htmlPath = vscode.Uri.joinPath(mediaDir, 'index.html');
		let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

		console.log('🕷️ [5] HTML lido, tamanho:', html.length);

		const bust = (name: string): vscode.Uri => {
			const file = vscode.Uri.joinPath(mediaDir, name);
			let version = Date.now();
			try {
				version = fs.statSync(file.fsPath).mtimeMs;
			} catch (error) {
				console.warn(`🕷️ sem stat para ${name}:`, error);
			}
			return webview.asWebviewUri(file).with({ query: `v=${version}` });
		};

		const styleUri = bust('style.css');
		const scriptUri = bust('script.js');
		const idleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaDir, 'idle_1.png'));
		const walkUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaDir, 'walk_sheet.png'));
		const spriteUris = this.getSpriteUris(webview, mediaDir);

		html = html
			.replace(/{{cspSource}}/g, webview.cspSource)
			.replace(/{{styleUri}}/g, styleUri.toString())
			.replace(/{{scriptUri}}/g, scriptUri.toString())
			.replace(/{{idleUri}}/g, idleUri.toString())
			.replace(/{{walkSheetUri}}/g, walkUri.toString())
			.replace(/{{spritesJson}}/g, JSON.stringify(spriteUris));

		console.log('🕷️ [6] HTML final montado. Sprites:', JSON.stringify(spriteUris));

		return html;
	}

	private getSpriteUris(webview: vscode.Webview, mediaDir: vscode.Uri): Record<string, string> {
		const files: Record<string, string> = {
			idle: 'idle_1.png',
			walk: 'walk_sheet.png',
			run: 'run_sheet.png',
			swing: 'swing_sheet.png',
			sleep: 'sleep_sheet.png',
			talk: 'talk_sheet.png'
		};

		const fallbacks: Record<string, string> = {
			run: 'walk',
			swing: 'walk',
			sleep: 'idle',
			talk: 'idle'
		};

		const uris: Record<string, string> = {};

		for (const key of Object.keys(files)) {
			let file = files[key];
			const exists = (name: string) =>
				fs.existsSync(vscode.Uri.joinPath(mediaDir, name).fsPath);

			if (!exists(file)) {
				const fallbackKey = fallbacks[key];
				if (fallbackKey && exists(files[fallbackKey])) {
					console.log(`🕷️ sprite "${file}" ausente -> fallback "${files[fallbackKey]}"`);
					file = files[fallbackKey];
				}
			}

			uris[key] = webview.asWebviewUri(vscode.Uri.joinPath(mediaDir, file)).toString();
		}

		return uris;
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log('🕷️ [1] activate() foi chamado!');

	const provider = new MarvelPetsProvider(context);

	console.log('🕷️ [2] Tentando registrar provedor com ID: marvelPetsViewAmand2026XYZ');
	const disposable = vscode.window.registerWebviewViewProvider('marvelPetsViewAmand2026XYZ', provider);
	console.log('🕷️ [3.1] Registro retornou:', disposable);
	context.subscriptions.push(disposable);
	console.log('🕷️ [3] Provedor registrado com sucesso!');

	context.subscriptions.push(
		vscode.commands.registerCommand('marvelPets.start', () => {
			const panel = vscode.window.createWebviewPanel(
				'marvelPetsPanel',
				'Marvel Pets',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
				}
			);
			panel.webview.html = provider.getHtml(panel.webview);
		})
	);
}

export function deactivate() {}
