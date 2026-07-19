function registerApexLanguage() {
    monaco.languages.register({ id: 'apex' });

    monaco.languages.setMonarchTokensProvider('apex', {
        keywords: [
            'function', 'if', 'elif', 'else', 'for', 'return', 'break', 'continue',
            'import', 'and', 'or', 'not', 'none', 'true', 'false',
            'number', 'string', 'type'
        ],
        libraries: [
            'os', 'sys', 'math', 'string', 'table', 'ffi', 'random', 'codecs'
        ],
        tokenizer: {
            root: [
                [/\/\/.*$/, 'comment'],
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/'([^'\\]|\\.)*$/, 'string.invalid'],
                [/"/, 'string', '@string_double'],
                [/'/, 'string', '@string_single'],
                [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                [/0[xX][0-9a-fA-F]+/, 'number.hex'],
                [/\d+/, 'number'],
                [/[a-zA-Z_]\w*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@libraries': 'type',
                        '@default': 'identifier'
                    }
                }],
                [/[=+\-*/%<>!&|^~]+/, 'operator'],
                [/[{}()\[\]]/, 'delimiter'],
                [/[;,.]/, 'delimiter'],
            ],
            string_double: [
                [/[^\\"]+/, 'string'],
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
            { token: 'type', foreground: '4EC9B0' },
            { token: 'string', foreground: 'CE9178' },
            { token: 'string.escape', foreground: 'D7BA7D' },
            { token: 'number', foreground: 'B5CEA8' },
            { token: 'number.float', foreground: 'B5CEA8' },
            { token: 'number.hex', foreground: 'B5CEA8' },
            { token: 'operator', foreground: 'D4D4D4' },
            { token: 'delimiter', foreground: 'D4D4D4' },
            { token: 'identifier', foreground: '9CDCFE' },
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
            { token: 'type', foreground: '267F99' },
            { token: 'string', foreground: 'A31515' },
            { token: 'string.escape', foreground: 'D16969' },
            { token: 'number', foreground: '098658' },
            { token: 'number.float', foreground: '098658' },
            { token: 'number.hex', foreground: '098658' },
            { token: 'operator', foreground: '000000' },
            { token: 'delimiter', foreground: '000000' },
            { token: 'identifier', foreground: '001080' },
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