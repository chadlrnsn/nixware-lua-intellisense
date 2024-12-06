// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NixwareDocumentationParser } from './parser/documentation-parser';

export let outputChannel: vscode.OutputChannel;
export let apiDocs: any = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Создаем канал для логирования
	outputChannel = vscode.window.createOutputChannel('Nixware Lua');
	context.subscriptions.push(outputChannel);

	// Регистрируем команду перезагрузки
	let reloadCommand = vscode.commands.registerCommand('nixware-lua.reload', async () => {
		outputChannel.appendLine('Перезагрузка расширения...');

		// Очищаем текущее состояние
		if (provider) {
			provider.dispose();
		}

		// Заново инициализируем парсер и загружаем документацию
		const parser = new NixwareDocumentationParser();
		apiDocs = null;

		try {
			apiDocs = await parser.parseDocumentation();
			outputChannel.appendLine('Расширение успешно перезагружено');
			vscode.window.showInformationMessage('Nixware Lua: Расширение перезагружено');
		} catch (error) {
			outputChannel.appendLine('Ошибка при перезагрузке расширения');
			vscode.window.showErrorMessage('Nixware Lua: Ошибка при перезагрузке');
		}
	});

	context.subscriptions.push(reloadCommand);

	outputChannel.appendLine('Nixware CS2 Lua Extension активировано');

	const parser = new NixwareDocumentationParser();
	let provider: vscode.Disposable;

	// Загружаем документацию при активации
	parser.parseDocumentation().then(docs => {
		apiDocs = docs;
		outputChannel.appendLine(`Документация загружена: ${Object.keys(docs.classes).length} классов`);
		// Показываем канал при успешной загрузке
		outputChannel.show(true);
	}).catch(error => {
		outputChannel.appendLine(`Ошибка загрузки документации: ${error.message}`);
		// Показываем канал при ошибке
		outputChannel.show(true);
	});

	provider = vscode.languages.registerCompletionItemProvider('nixLua', {
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
			if (!apiDocs) {
				outputChannel.appendLine('API документация еще не загружена');
				return [];
			}

			const linePrefix = document.lineAt(position).text.substr(0, position.character);
			outputChannel.appendLine(`Запрос автодополнения для: ${linePrefix}`);

			const completionItems: vscode.CompletionItem[] = [];

			// Добавляем глобальные функции
			Object.keys(apiDocs.globals).forEach(globalName => {
				const item = new vscode.CompletionItem(globalName);
				item.kind = vscode.CompletionItemKind.Function;
				completionItems.push(item);
			});

			// Добавляем классы и их методы
			Object.values(apiDocs.classes).forEach((nixClass: any) => {
				const classItem = new vscode.CompletionItem(nixClass.name);
				classItem.kind = vscode.CompletionItemKind.Class;
				completionItems.push(classItem);

				nixClass.methods.forEach((method: any) => {
					const methodItem = new vscode.CompletionItem(`${nixClass.name}.${method.name}`);
					methodItem.kind = vscode.CompletionItemKind.Method;
					methodItem.documentation = new vscode.MarkdownString(method.description);
					completionItems.push(methodItem);
				});
			});

			outputChannel.appendLine(`Предложено ${completionItems.length} вариантов автодополнения`);
			return completionItems;
		}
	});

	context.subscriptions.push(provider);
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (outputChannel) {
		outputChannel.dispose();
	}
}
