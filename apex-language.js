function registerApexLanguage() {
    monaco.languages.register({ id: 'apex' });

    monaco.languages.setLanguageConfiguration('apex', {
        comments: {
            lineComment: '//'
        },
        brackets: [
            ['(', ')'],
            ['[', ']']
        ],
        autoClosingPairs: [
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '"', close: '"' },
            { open: "'", close: "'" }
        ],
        surroundingPairs: [
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '"', close: '"' },
            { open: "'", close: "'" }
        ],
        indentationRules: {
            increaseIndentPattern: /^\s*(function|if|else if|else|for|match|case)\b.*$/,
            decreaseIndentPattern: /^\s*$/
        }
    });

    monaco.languages.setMonarchTokensProvider('apex', {
        defaultToken: '',
        tokenPostfix: '.apex',

        keywords: [
            'if', 'else', 'for', 'in', 'break', 'continue', 'return',
            'import', 'as', 'match', 'case', 'await'
        ],
        constants: [
            'function', 'true', 'false', 'none', 'constant', 'and', 'or', 'async'
        ],
        libraries: [
            'os', 'sys', 'math', 'string', 'table', 'random',
            'json', 'xml', 'csv', 'base', 'regex', 'crypto', 'zip', 'network', 'datetime'
        ],

        tokenizer: {
            root: [
                [/^#!.*$/, 'comment'],
                [/\/\/.*$/, 'comment'],

                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/'([^'\\]|\\.)*$/, 'string.invalid'],
                [/"/, 'string', '@string_double'],
                [/'/, 'string', '@string_single'],

                [/\b\d+(\.\d+)?([eE][+-]?\d+)?\b/, 'number'],

                [/[a-zA-Z_]\w*(?=\s*\()/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@constants': 'constant',
                        '@libraries': 'type',
                        '@default': 'entity.name.function'
                    }
                }],

                [/[a-zA-Z_]\w*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@constants': 'constant',
                        '@libraries': 'type',
                        '@default': 'identifier'
                    }
                }],

                [/==|!=|<=|>=|<|>/, 'operator.comparison'],
                [/[+\-*/%]/, 'operator.arithmetic'],
                [/=/, 'operator.assignment'],

                [/[{}()\[\]]/, '@brackets'],
                [/[;,.]/, 'delimiter'],
            ],

            string_double: [
                [/\{[a-zA-Z_][a-zA-Z0-9_\s+\-*/]*\}/, 'constant.character.interpolation'],
                [/[^\\"{]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, 'string', '@pop']
            ],
            string_single: [
                [/[^\\']+/, 'string'],
                [/\\./, 'string.escape'],
                [/'/, 'string', '@pop']
            ]
        }
    });

    monaco.editor.defineTheme('apex-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6A9955' },
            { token: 'keyword', foreground: 'C586C0' },
            { token: 'constant', foreground: '569CD6' },
            { token: 'type', foreground: '4EC9B0' },
            { token: 'string', foreground: 'CE9178' },
            { token: 'string.escape', foreground: 'D7BA7D' },
            { token: 'constant.character.interpolation', foreground: '4EC9B0' },
            { token: 'number', foreground: 'B5CEA8' },
            { token: 'operator.comparison', foreground: 'D4D4D4' },
            { token: 'operator.arithmetic', foreground: 'D4D4D4' },
            { token: 'operator.assignment', foreground: 'D4D4D4' },
            { token: 'delimiter', foreground: 'D4D4D4' },
            { token: 'identifier', foreground: '9CDCFE' },
            { token: 'entity.name.function', foreground: 'DCDCAA' },
            { token: 'string.invalid', foreground: 'F44747' },
        ],
        colors: {
            'editor.background': '#1e1e1e',
            'editor.foreground': '#d4d4d4',
            'editor.lineHighlightBackground': '#2a2a2a',
            'editor.selectionBackground': '#264f78',
            'editor.inactiveSelectionBackground': '#3a3d41',
        }
    });
}