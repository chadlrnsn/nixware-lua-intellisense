import { NixwareApi, NixwareClass, NixwareMethod, NixwareParameter } from '../types/api-types';
import axios from "axios";

export class NixwareDocumentationParser {
    private readonly baseUrl = 'https://raw.githubusercontent.com/Nixer1337/nixware-cs2-docs/main/docs';
    private readonly sections = ['globals', 'classes'];

    async parseDocumentation(): Promise<NixwareApi> {
        try {
            const api: NixwareApi = {
                globals: {},
                classes: {}
            };

            for (const section of this.sections) {
                const content = await this.fetchContent(`${this.baseUrl}/${section}.md`);
                this.parseMdSection(content, api);
            }

            return api;
        } catch (error) {
            console.error('Ошибка при парсинге документации:', error);
            return { globals: {}, classes: {} };
        }
    }

    private async fetchContent(url: string): Promise<string> {
        const response = await axios.get(url);
        return response.data;
    }

    private parseMdSection(content: string, api: NixwareApi) {
        const lines = content.split('\n');
        let currentClass: NixwareClass | null = null;
        let currentMethod: NixwareMethod | null = null;
        let description = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('# ')) {
                // Парсинг класса
                const className = line.substring(2).trim();
                currentClass = {
                    name: className,
                    methods: [],
                    properties: []
                };
                api.classes[className] = currentClass;
                description = '';
            }
            else if (line.startsWith('## ')) {
                // Парсинг метода
                const methodName = line.substring(3).trim();
                currentMethod = {
                    name: methodName,
                    parameters: [],
                    returnType: '',
                    description: description.trim()
                };

                // Парсим параметры и возвращаемое значение
                while (i < lines.length - 1) {
                    i++;
                    const nextLine = lines[i].trim();

                    if (nextLine.startsWith('- ')) {
                        // Парсинг параметра
                        const param = this.parseParameter(nextLine);
                        if (param && currentMethod) {
                            currentMethod.parameters.push(param);
                        }
                    }
                    else if (nextLine.startsWith('Returns:')) {
                        if (currentMethod) {
                            currentMethod.returnType = nextLine.substring(8).trim();
                        }
                    }
                    else if (nextLine === '' || nextLine.startsWith('#')) {
                        i--;
                        break;
                    }
                }

                if (currentClass && currentMethod) {
                    currentClass.methods.push(currentMethod);
                }
                description = '';
            }
            else if (line !== '') {
                description += line + '\n';
            }
        }
    }

    private parseParameter(line: string): NixwareParameter | null {
        // Формат: - name (type) - description
        const match = line.match(/^- ([^\(]+)\(([^\)]+)\)\s*-?\s*(.*)$/);
        if (match) {
            return {
                name: match[1].trim(),
                type: match[2].trim(),
                description: match[3].trim(),
                optional: line.includes('(optional)')
            };
        }
        return null;
    }
} 