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
            'import', 'as', 'match', 'case'
        ],
        constants: [
            'function', 'true', 'false', 'none', 'constant', 'and', 'or', 'not'
        ],
        libraries: [
            'os', 'sys', 'math', 'string', 'table', 'ffi', 'random',
            'json', 'xml', 'csv', 'base', 'regex', 'crypto', 'zip', 'network'
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

    monaco.editor.defineTheme('apex-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '008000' },
            { token: 'keyword', foreground: '8A3FF0' },
            { token: 'constant', foreground: '0000FF' },
            { token: 'type', foreground: '267F99' },
            { token: 'string', foreground: 'A31515' },
            { token: 'string.escape', foreground: 'D16969' },
            { token: 'constant.character.interpolation', foreground: '267F99' },
            { token: 'number', foreground: '098658' },
            { token: 'operator.comparison', foreground: '000000' },
            { token: 'operator.arithmetic', foreground: '000000' },
            { token: 'operator.assignment', foreground: '000000' },
            { token: 'delimiter', foreground: '000000' },
            { token: 'identifier', foreground: '001080' },
            { token: 'entity.name.function', foreground: '795E26' },
            { token: 'string.invalid', foreground: 'CD3131' },
        ],
        colors: {
            'editor.background': '#FFFFFF',
            'editor.foreground': '#000000',
            'editor.lineHighlightBackground': '#F5F5F5',
            'editor.selectionBackground': '#ADD6FF',
            'editor.inactiveSelectionBackground': '#E5EBF1',
        }
    });
}