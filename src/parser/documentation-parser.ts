import { NixwareApi, NixwareClass, NixwareMethod, NixwareParameter } from '../types/api-types';
import axios from "axios";
import { outputChannel } from '../extension';

export class NixwareDocumentationParser {
    private readonly baseUrl = 'https://api.github.com/repos/Nixer1337/nixware-cs2-docs/contents/docs';

    async parseDocumentation(): Promise<NixwareApi> {
        try {
            const api: NixwareApi = {
                globals: {},
                classes: {}
            };

            await this.parseDirectory(this.baseUrl, api);
            return api;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Ошибка парсинга документации: ${error.message}`);
            }
            throw new Error('Неизвестная ошибка при парсинге документации');
        }
    }

    private async parseDirectory(url: string, api: NixwareApi): Promise<void> {
        try {
            const response = await axios.get(url);
            const items = response.data;

            for (const item of items) {
                if (item.type === 'dir') {
                    // Рекурсивно обходим поддиректории
                    await this.parseDirectory(item.url, api);
                } else if (item.type === 'file' && item.name.endsWith('.md')) {
                    // Парсим .md файлы
                    const content = await this.fetchContent(item.download_url);
                    outputChannel.appendLine(`Парсинг файла: ${item.path}`);

                    if (item.name === 'globals.md') {
                        this.parseGlobals(content, api);
                    } else {
                        this.parseClasses(content, api);
                    }
                }
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Ошибка обхода директории ${url}: ${error.message}`);
            }
            throw new Error(`Неизвестная ошибка при обходе директории ${url}`);
        }
    }

    private async fetchContent(url: string): Promise<string> {
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Ошибка загрузки ${url}: ${error.message}`);
            }
            throw new Error(`Неизвестная ошибка при загрузке ${url}`);
        }
    }

    private parseClasses(content: string, api: NixwareApi) {
        const lines = content.split('\n');
        let currentClass: NixwareClass | null = null;
        let currentMethod: NixwareMethod | null = null;
        let currentSection: 'description' | 'parameters' | 'returns' = 'description';
        let description = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('# ')) {
                // Новый класс
                if (currentClass) {
                    api.classes[currentClass.name] = currentClass;
                }
                const className = line.substring(2).trim();
                currentClass = {
                    name: className,
                    methods: [],
                    properties: []
                };
                currentMethod = null;
                description = '';
                currentSection = 'description';
            }
            else if (line.startsWith('## ')) {
                // Новый метод
                if (currentMethod && currentClass) {
                    currentClass.methods.push(currentMethod);
                }
                const methodName = line.substring(3).trim();
                currentMethod = {
                    name: methodName,
                    parameters: [],
                    returnType: '',
                    description: ''
                };
                description = '';
                currentSection = 'description';
            }
            else if (line.toLowerCase() === 'parameters:') {
                if (currentMethod) {
                    currentMethod.description = description.trim();
                }
                description = '';
                currentSection = 'parameters';
            }
            else if (line.toLowerCase().startsWith('returns:')) {
                currentSection = 'returns';
                if (currentMethod) {
                    currentMethod.returnType = line.substring(8).trim();
                }
            }
            else if (line.startsWith('- ') && currentSection === 'parameters') {
                const param = this.parseParameter(line);
                if (param && currentMethod) {
                    currentMethod.parameters.push(param);
                }
            }
            else if (line !== '') {
                if (currentSection === 'description') {
                    description += line + '\n';
                }
            }
        }

        // Добавляем последний класс
        if (currentClass) {
            if (currentMethod) {
                currentClass.methods.push(currentMethod);
            }
            api.classes[currentClass.name] = currentClass;
        }
    }

    private parseGlobals(content: string, api: NixwareApi) {
        const lines = content.split('\n');
        let currentFunction: NixwareMethod | null = null;
        let description = '';
        let currentSection: 'description' | 'parameters' | 'returns' = 'description';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('## ')) {
                if (currentFunction) {
                    currentFunction.description = description.trim();
                    api.globals[currentFunction.name] = currentFunction;
                }
                const funcName = trimmedLine.substring(3).trim();
                currentFunction = {
                    name: funcName,
                    parameters: [],
                    returnType: '',
                    description: ''
                };
                description = '';
                currentSection = 'description';
            }
            else if (trimmedLine.toLowerCase() === 'parameters:') {
                if (currentFunction) {
                    currentFunction.description = description.trim();
                }
                description = '';
                currentSection = 'parameters';
            }
            else if (trimmedLine.toLowerCase().startsWith('returns:')) {
                currentSection = 'returns';
                if (currentFunction) {
                    currentFunction.returnType = trimmedLine.substring(8).trim();
                }
            }
            else if (trimmedLine.startsWith('- ') && currentSection === 'parameters') {
                const param = this.parseParameter(trimmedLine);
                if (param && currentFunction) {
                    currentFunction.parameters.push(param);
                }
            }
            else if (trimmedLine !== '') {
                if (currentSection === 'description') {
                    description += trimmedLine + '\n';
                }
            }
        }

        // Добавляем последнюю функцию
        if (currentFunction) {
            currentFunction.description = description.trim();
            api.globals[currentFunction.name] = currentFunction;
        }
    }

    private parseParameter(line: string): NixwareParameter | null {
        const match = line.match(/^-\s*([^\(]+)\s*\(([^\)]+)\)\s*-?\s*(.*)$/);
        if (match) {
            return {
                name: match[1].trim(),
                type: match[2].trim(),
                description: match[3].trim(),
                optional: line.toLowerCase().includes('(optional)')
            };
        }
        return null;
    }
} 