import createApexModule from './apex.js';

const REQUIRED_EXPORTS = [
    '_apex_open', '_apex_close', '_apex_run_string',
    '_apex_last_error', '_apex_had_error', '_apex_clear_error',
    '_apex_exit_requested', '_apex_exit_code', '_apex_clear_exit',
    '_apex_get_top', '_apex_set_top', '_apex_pop',
    '_apex_push_none', '_apex_push_boolean', '_apex_push_number', '_apex_push_string',
    '_apex_get_global', '_apex_set_global',
    '_apex_type', '_apex_type_name',
    '_apex_to_boolean', '_apex_to_number', '_apex_to_string',
    '_malloc', '_free',
];
const REQUIRED_RUNTIME = ['UTF8ToString', 'stringToUTF8', 'lengthBytesUTF8'];

const T = { NONE: 0, BOOLEAN: 1, NUMBER: 2, STRING: 3, TABLE: 4, FUNCTION: 5, LIGHTUSERDATA: 6, FUTURE: 7 };

export class ApexExecutor {
    constructor() {
        this.module = null;
        this.state = 0;
        this.outputBuffer = [];
        this.onOutput = null;
        this.onInput = null;
        this.onError = null;
        this.isRunning = false;
        this._wasmPath = 'apex.wasm';
        this._initPromise = null;
        this._broken = false;
    }

    async init(wasmPath = 'apex.wasm') {
        if (wasmPath) this._wasmPath = wasmPath;
        if (this._broken) this._teardown();
        if (this.module) {
            if (!this.state) this._openState();
            return this.module;
        }
        if (!this._initPromise) {
            this._initPromise = this._create(this._wasmPath).finally(() => { this._initPromise = null; });
        }
        return this._initPromise;
    }

    async _create(wasmPath) {
        const mod = await createApexModule({
            locateFile: (path) => path.endsWith('.wasm') ? wasmPath : path,
            print:    (text) => this._handleOutput(text + '\n'),
            printErr: (text) => this._handleOutput(text + '\n'),
            onAbort:  (what) => { this._broken = true; this._handleOutput('apex runtime aborted: ' + what + '\n'); },
        });
        this._checkExports(mod);
        this.module = mod;
        this._broken = false;
        this._openState();
        return mod;
    }

    _checkExports(mod) {
        const missing = REQUIRED_EXPORTS.filter((n) => typeof mod[n] !== 'function')
            .concat(REQUIRED_RUNTIME.filter((n) => typeof mod[n] !== 'function'));
        if (missing.length) {
            throw new Error('apex.js is missing exports: ' + missing.join(', ') +
                ' — rebuild with ./makewasm.sh (Apex 27.03 uses apex_open/apex_run_string, not apex_execute_string).');
        }
    }

    _openState() {
        this.state = this.module._apex_open();
        if (!this.state) throw new Error('apex_open() failed (out of memory)');
        return this.state;
    }

    _closeState() {
        if (this.module && this.state) { try { this.module._apex_close(this.state); } catch (_) {} }
        this.state = 0;
    }

    _teardown() { this._closeState(); this.module = null; this._broken = false; }

    _handleOutput(text) {
        this.outputBuffer.push(text);
        if (this.onOutput) this.onOutput(text);
    }

    _withCString(str, fn) {
        const mod = this.module;
        const len = mod.lengthBytesUTF8(str) + 1;
        const ptr = mod._malloc(len);
        if (!ptr) throw new Error('out of memory while allocating a C string');
        try { mod.stringToUTF8(str, ptr, len); return fn(ptr); }
        finally { mod._free(ptr); }
    }

    submitInput(_value) { return false; }

    setGlobal(name, value) {
        const mod = this.module, S = this.state;
        if (!S) throw new Error('executor not initialised');
        if (value === null || value === undefined) mod._apex_push_none(S);
        else if (typeof value === 'boolean') mod._apex_push_boolean(S, value ? 1 : 0);
        else if (typeof value === 'number') mod._apex_push_number(S, value);
        else if (typeof value === 'string') this._withCString(value, (p) => mod._apex_push_string(S, p));
        else throw new TypeError('setGlobal: only none/boolean/number/string are supported');
        this._withCString(name, (p) => mod._apex_set_global(S, p));
    }

    getGlobal(name) {
        const mod = this.module, S = this.state;
        if (!S) return undefined;
        const found = this._withCString(name, (p) => mod._apex_get_global(S, p));
        if (!found) return undefined;
        let out;
        switch (mod._apex_type(S, -1)) {
            case T.NONE:    out = null; break;
            case T.BOOLEAN: out = mod._apex_to_boolean(S, -1) !== 0; break;
            case T.NUMBER:  out = mod._apex_to_number(S, -1); break;
            case T.STRING: { const p = mod._apex_to_string(S, -1); out = p ? mod.UTF8ToString(p) : ''; break; }
            default: { const p = mod._apex_type_name(S, -1); out = '<' + (p ? mod.UTF8ToString(p) : 'value') + '>'; }
        }
        mod._apex_pop(S, 1);
        return out;
    }

    async execute(code, options = {}) {
        const mod = await this.init(options.wasmPath || this._wasmPath);
        this.outputBuffer = [];
        if (options.onOutput) this.onOutput = options.onOutput;
        if (options.onInput)  this.onInput  = options.onInput;
        if (options.onError)  this.onError  = options.onError;
        const filename = options.filename || 'script.apex';
        const S = this.state;
        this.isRunning = true;
        try {
            mod._apex_clear_error(S);
            mod._apex_clear_exit(S);
            mod._apex_set_top(S, 0);
            if (options.globals) {
                for (const [k, v] of Object.entries(options.globals)) this.setGlobal(k, v);
            }
            const rc = this._withCString(code, (codePtr) =>
                this._withCString(filename, (filePtr) => mod._apex_run_string(S, codePtr, filePtr)));
            const failed = rc !== 0 || mod._apex_had_error(S) !== 0;
            let error = null;
            if (failed) {
                const p = mod._apex_last_error(S);
                error = (p ? mod.UTF8ToString(p) : '') || ('apex run failed (rc=' + rc + ')');
            }
            const exitRequested = mod._apex_exit_requested(S) !== 0;
            const exitCode = exitRequested ? mod._apex_exit_code(S) : 0;
            mod._apex_clear_exit(S);
            if (error) {
                if (!this.outputBuffer.join('').includes(error)) this._handleOutput(error + '\n');
                if (this.onError) this.onError(error);
                mod._apex_clear_error(S);
            }
            this.isRunning = false;
            return {
                success: !failed,
                output: this.outputBuffer.join(''),
                error,
                result: failed ? 0 : 1,
                rc,
                exitRequested,
                exitCode,
            };
        } catch (err) {
            this.isRunning = false;
            this._broken = true;
            const msg = (err && err.message) ? err.message : String(err);
            if (this.onError) this.onError(msg);
            throw err;
        }
    }

    async executeSync(code) {
        let output = '', error = null;
        try {
            const r = await this.execute(code, {
                onOutput: (t) => { output += t; },
                onError:  (t) => { error = t; },
            });
            return { output, error: r.error || error, success: r.success, exitRequested: r.exitRequested, exitCode: r.exitCode };
        } catch (err) {
            return { output, error: (err && err.message) ? err.message : String(err), success: false };
        }
    }

    clearOutput() { this.outputBuffer = []; if (this.onOutput) this.onOutput(''); }
    isReady() { return this.module !== null && this.state !== 0; }
    getState() { return this.state; }
    close() { this._closeState(); }
    destroy() { this._teardown(); }
}
export default ApexExecutor;