import createApexModule from './apex.js';

export class ApexExecutor {
    constructor() {
        this.module = null;
        this.outputBuffer = [];
        this.onOutput = null;
        this.onInput = null;
        this.onError = null;
        this.isRunning = false;
    }

    async init(wasmPath = 'apex.wasm') {
        if (this.module) return this.module;

        this.module = await createApexModule({
            locateFile: (path) => path.endsWith('.wasm') ? wasmPath : path,
            print:    (text) => this._handleOutput(text + '\n'),
            printErr: (text) => this._handleOutput(text + '\n'),
            noExitRuntime: true,
        });

        return this.module;
    }

    _handleOutput(text) {
        if (this.onOutput) this.onOutput(text);
        else this.outputBuffer.push(text);
    }

    submitInput(_value) {
        return false;
    }

    async execute(code, options = {}) {
        const mod = await this.init(options.wasmPath || 'apex.wasm');

        this.outputBuffer = [];
        this.isRunning = true;
        if (options.onOutput) this.onOutput = options.onOutput;
        if (options.onInput)  this.onInput  = options.onInput;
        if (options.onError)  this.onError  = options.onError;

        const filename = options.filename || 'script.apex';

        const codeLen = mod.lengthBytesUTF8(code) + 1;
        const fileLen = mod.lengthBytesUTF8(filename) + 1;
        const codePtr = mod._malloc(codeLen);
        const filePtr = mod._malloc(fileLen);

        try {
            mod.stringToUTF8(code,     codePtr, codeLen);
            mod.stringToUTF8(filename, filePtr, fileLen);

            const result = mod._apex_execute_string(codePtr, filePtr);
            this.isRunning = false;

            return {
                success: result === 1 || result === true,
                output:  this.outputBuffer.join(''),
                result,
            };
        } catch (err) {
            this.isRunning = false;
            if (this.onError) this.onError(err.message);
            throw err;
        } finally {
            mod._free(codePtr);
            mod._free(filePtr);
        }
    }

    async executeSync(code) {
        let output = '';
        let error = null;
        try {
            const r = await this.execute(code, {
                onOutput: (t) => { output += t; },
                onError:  (t) => { error = t; },
            });
            return { output, error, success: r.success };
        } catch (err) {
            return { output, error: err.message, success: false };
        }
    }

    clearOutput() {
        this.outputBuffer = [];
        if (this.onOutput) this.onOutput('');
    }

    isReady() {
        return this.module !== null;
    }
}