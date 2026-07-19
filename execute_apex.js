class ApexExecutor {
    constructor() {
        this.wasmModule = null;
        this.outputBuffer = [];
        this.inputResolve = null;
        this.isRunning = false;
        this.onOutput = null;
        this.onInput = null;
        this.onError = null;
        this.ptr = 1024;
        this._heap_ptr = 2048;
    }

    async init(wasmPath = 'apex.wasm') {
        try {
            const response = await fetch(wasmPath);
            if (!response.ok) {
                throw new Error(`Failed to load WASM: ${response.status}`);
            }
            const bytes = await response.arrayBuffer();

            const imports = this._createImports();
            
            const result = await WebAssembly.instantiate(bytes, imports);
            this.wasmModule = result.instance;
            
            console.log('WASM initialized successfully');
            console.log('Exports:', Object.keys(this.wasmModule.exports));
            
            return this.wasmModule;
        } catch (error) {
            console.error('Failed to initialize WASM:', error);
            throw error;
        }
    }

    _createImports() {
        const self = this;
        
        const wasi = {
            fd_write: function(fd, iovs, iovs_len, nwritten) {
                try {
                    const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                    let output = '';
                    for (let i = 0; i < iovs_len; i++) {
                        const ptr = new Uint32Array(memory.buffer, iovs + i * 8, 2);
                        const buf_ptr = ptr[0];
                        const buf_len = ptr[1];
                        let str = '';
                        for (let j = 0; j < buf_len; j++) {
                            str += String.fromCharCode(memory[buf_ptr + j]);
                        }
                        output += str;
                    }
                    
                    if (fd === 1 || fd === 2) {
                        self._handleOutput(output);
                    }
                    
                    const nwritten_ptr = new Uint32Array(memory.buffer, nwritten, 1);
                    nwritten_ptr[0] = output.length;
                    return 0;
                } catch (e) {
                    return 0;
                }
            },
            
            fd_read: function(fd, iovs, iovs_len, nread) {
                if (fd === 0) {
                    const input = self._waitForInput();
                    if (input) {
                        const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                        const ptr = new Uint32Array(memory.buffer, iovs, 2);
                        const buf_ptr = ptr[0];
                        const buf_len = ptr[1];
                        const encoded = self._encodeString(input);
                        const len = Math.min(encoded.length - 1, buf_len);
                        memory.set(encoded.slice(0, len), buf_ptr);
                        const nread_ptr = new Uint32Array(memory.buffer, nread, 1);
                        nread_ptr[0] = len;
                        return 0;
                    }
                }
                return 0;
            },
            
            fd_close: function(fd) { return 0; },
            
            fd_fdstat_get: function(fd, stat) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                new Uint8Array(memory.buffer, stat, 1)[0] = 4;
                new Uint64Array(memory.buffer, stat + 8, 1)[0] = 0n;
                new Uint64Array(memory.buffer, stat + 16, 1)[0] = 0n;
                new Uint64Array(memory.buffer, stat + 24, 1)[0] = 0n;
                return 0;
            },
            
            fd_seek: function(fd, offset, whence, result) { return 0; },
            
            clock_time_get: function(id, precision, result) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                const now = BigInt(Date.now()) * BigInt(1000000);
                const view = new DataView(memory.buffer);
                view.setBigUint64(result, now, true);
                return 0;
            },
            
            proc_exit: function(code) {
                self.isRunning = false;
                return 0;
            },
            
            environ_get: function(environ, environ_buf) { return 0; },
            
            environ_sizes_get: function(environ_count, environ_buf_size) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                new Uint32Array(memory.buffer, environ_count, 1)[0] = 0;
                new Uint32Array(memory.buffer, environ_buf_size, 1)[0] = 0;
                return 0;
            },
            
            args_get: function(argv, argv_buf) { return 0; },
            
            args_sizes_get: function(argc, argv_buf_size) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                new Uint32Array(memory.buffer, argc, 1)[0] = 1;
                new Uint32Array(memory.buffer, argv_buf_size, 1)[0] = 4;
                return 0;
            },
            
            random_get: function(buf, buf_len) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                const random = new Uint8Array(buf_len);
                crypto.getRandomValues(random);
                memory.set(random, buf);
                return 0;
            },
            
            path_open: function(fd, dirflags, path, path_len, oflags, fs_rights_base, fs_rights_inheriting, fdflags, result) {
                return -1;
            },
            
            fd_readdir: function(fd, buf, buf_len, cookie, result) { return 0; },
            fd_filestat_get: function(fd, result) { return -1; },
            clock_res_get: function(id, result) { return 0; },
            sched_yield: function() { return 0; }
        };

        const env = {
            memory: new WebAssembly.Memory({ initial: 256, maximum: 1024 }),
            
            emscripten_notify_memory_growth: function(index) {
                return 0;
            },
            
            __syscall_getdents64: function(fd, dirp, count) {
                return 0;
            },

            __syscall_unlinkat: function(dirfd, path, flags) {
                return -1;
            },

            __syscall_statfs64: function(path, size, buf) {
                return -1;
            },

            __syscall_fstatfs64: function(fd, size, buf) {
                return -1;
            },

            __syscall_readlinkat: function(dirfd, path, buf, bufsize) {
                return -1;
            },

            __syscall_symlinkat: function(target, newdirfd, linkpath) {
                return -1;
            },

            __syscall_linkat: function(olddirfd, oldpath, newdirfd, newpath, flags) {
                return -1;
            },

            __syscall_mknodat: function(dirfd, path, mode, dev) {
                return -1;
            },

            __syscall_futimesat: function(dirfd, path, times) {
                return -1;
            },

            __syscall_utimensat: function(dirfd, path, times, flags) {
                return -1;
            },

            __syscall_faccessat: function(dirfd, path, mode, flags) {
                return 0;
            },

            __syscall_openat: function(dirfd, path, flags, mode) {
                return -1;
            },

            __syscall_fchdir: function(fd) {
                return 0;
            },

            __syscall_fchownat: function(dirfd, path, owner, group, flags) {
                return -1;
            },

            __syscall_fchmodat: function(dirfd, path, mode, flags) {
                return -1;
            },

            __syscall_mkdirat: function(dirfd, path, mode) {
                return -1;
            },

            __syscall_unlinkat: function(dirfd, path, flags) {
                return -1;
            },

            __syscall_renameat: function(olddirfd, oldpath, newdirfd, newpath) {
                return -1;
            },

            __syscall_statfs64: function(path, size, buf) {
                return -1;
            },

            __syscall_fstatfs64: function(fd, size, buf) {
                return -1;
            },

            __syscall_readlinkat: function(dirfd, path, buf, bufsize) {
                return -1;
            },

            __syscall_symlinkat: function(target, newdirfd, linkpath) {
                return -1;
            },

            __syscall_linkat: function(olddirfd, oldpath, newdirfd, newpath, flags) {
                return -1;
            },

            __syscall_mknodat: function(dirfd, path, mode, dev) {
                return -1;
            },

            __syscall_utimensat: function(dirfd, path, times, flags) {
                return -1;
            },

            __syscall_faccessat: function(dirfd, path, mode, flags) {
                return 0;
            },

            __syscall_openat: function(dirfd, path, flags, mode) {
                return -1;
            },

            __syscall_fchdir: function(fd) {
                return 0;
            },

            __syscall_dup3: function(oldfd, newfd, flags) {
                return newfd;
            },

            __syscall_pipe2: function(fds, flags) {
                return -1;
            },

            __syscall_eventfd: function(initval, flags) {
                return -1;
            },

            __syscall_eventfd2: function(initval, flags) {
                return -1;
            },

            __syscall_inotify_init: function() {
                return -1;
            },

            __syscall_inotify_init1: function(flags) {
                return -1;
            },

            __syscall_inotify_add_watch: function(fd, path, mask) {
                return -1;
            },

            __syscall_inotify_rm_watch: function(fd, wd) {
                return -1;
            },

            __syscall_epoll_create: function(size) {
                return -1;
            },

            __syscall_epoll_create1: function(flags) {
                return -1;
            },

            __syscall_epoll_ctl: function(epfd, op, fd, event) {
                return -1;
            },

            __syscall_epoll_wait: function(epfd, events, maxevents, timeout) {
                return -1;
            },

            __syscall_epoll_pwait: function(epfd, events, maxevents, timeout, sigmask) {
                return -1;
            },

            __syscall_timerfd_create: function(clockid, flags) {
                return -1;
            },

            __syscall_timerfd_settime: function(fd, flags, new_value, old_value) {
                return -1;
            },

            __syscall_timerfd_gettime: function(fd, curr_value) {
                return -1;
            },

            __syscall_signalfd: function(fd, mask, flags) {
                return -1;
            },

            __syscall_signalfd4: function(fd, mask, flags) {
                return -1;
            },

            __syscall_ppoll: function(fds, nfds, timeout, sigmask, sigsetsize) {
                return -1;
            },

            __syscall_pselect6: function(nfds, readfds, writefds, exceptfds, timeout, sigmask) {
                return -1;
            },

            __syscall_sendmsg: function(fd, msg, flags) {
                return -1;
            },

            __syscall_recvmsg: function(fd, msg, flags) {
                return -1;
            },

            __syscall_sendmmsg: function(fd, msgvec, vlen, flags) {
                return -1;
            },

            __syscall_recvmmsg: function(fd, msgvec, vlen, flags, timeout) {
                return -1;
            },

            __syscall_accept4: function(fd, addr, addrlen, flags) {
                return -1;
            },

            __syscall_prlimit64: function(pid, resource, new_limit, old_limit) {
                return 0;
            },

            __syscall_getdents64: function(fd, dirp, count) {
                return 0;
            },

            __syscall_getdents: function(fd, dirp, count) {
                return 0;
            },

            __syscall_getpriority: function(which, who) {
                return 0;
            },

            __syscall_setpriority: function(which, who, prio) {
                return 0;
            },

            __syscall_sched_setparam: function(pid, param) {
                return 0;
            },

            __syscall_sched_getparam: function(pid, param) {
                return 0;
            },

            __syscall_sched_setscheduler: function(pid, policy, param) {
                return 0;
            },

            __syscall_sched_getscheduler: function(pid) {
                return 0;
            },

            __syscall_sched_yield: function() {
                return 0;
            },

            __syscall_sched_get_priority_max: function(policy) {
                return 0;
            },

            __syscall_sched_get_priority_min: function(policy) {
                return 0;
            },

            __syscall_sched_rr_get_interval: function(pid, interval) {
                return 0;
            },

            __syscall_restart_syscall: function() {
                return 0;
            },

            __syscall_newuname: function(buf) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                const sysname = 'WebAssembly';
                const nodename = 'wasm';
                const release = '1.0';
                const version = '1.0';
                const machine = 'wasm32';
                
                const writeStr = (ptr, str) => {
                    const encoded = self._encodeString(str);
                    memory.set(encoded.slice(0, encoded.length - 1), ptr);
                };
                
                writeStr(buf, sysname);
                writeStr(buf + 65, nodename);
                writeStr(buf + 130, release);
                writeStr(buf + 195, version);
                writeStr(buf + 260, machine);
                return 0;
            },

            __syscall_renameat: function(olddirfd, oldpath, newdirfd, newpath) {
                return -1;
            },

            __syscall_faccessat: function(dirfd, path, amode, flags) {
                return 0;
            },
            
            __syscall_openat: function(dirfd, path, flags, mode) {
                return -1;
            },
            
            __syscall_close: function(fd) {
                return 0;
            },
            
            __syscall_read: function(fd, buf, count) {
                return 0;
            },
            
            __syscall_write: function(fd, buf, count) {
                const str = self._getStringFromMemory(buf);
                if (fd === 1 || fd === 2) {
                    self._handleOutput(str);
                }
                return count;
            },
            
            __syscall_lseek: function(fd, offset, whence) {
                return 0;
            },
            
            __syscall_fstat: function(fd, stat) {
                return 0;
            },
            
            __syscall_stat: function(path, stat) {
                return -1;
            },
            
            __syscall_getcwd: function(buf, size) {
                const str = '/';
                const encoded = self._encodeString(str);
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                const len = Math.min(encoded.length, size);
                memory.set(encoded.slice(0, len), buf);
                return 0;
            },
            
            __syscall_dup: function(fd) {
                return fd;
            },
            
            __syscall_dup2: function(oldfd, newfd) {
                return newfd;
            },
            
            __syscall_fcntl: function(fd, cmd, ...args) {
                return 0;
            },
            
            __syscall_ioctl: function(fd, cmd, ...args) {
                return 0;
            },
            
            __syscall_mmap: function(addr, length, prot, flags, fd, offset) {
                return -1;
            },
            
            __syscall_munmap: function(addr, length) {
                return 0;
            },
            
            __syscall_brk: function(addr) {
                return 0;
            },
            
            __syscall_getpid: function() {
                return 1;
            },
            
            __syscall_getuid: function() {
                return 1000;
            },
            
            __syscall_getgid: function() {
                return 1000;
            },
            
            __syscall_geteuid: function() {
                return 1000;
            },
            
            __syscall_getegid: function() {
                return 1000;
            },
            
            __syscall_getpgrp: function() {
                return 1;
            },
            
            __syscall_getppid: function() {
                return 1;
            },
            
            __syscall_getgroups: function(size, list) {
                return 0;
            },
            
            __syscall_setgroups: function(size, list) {
                return 0;
            },
            
            __syscall_gettimeofday: function(tv, tz) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                const now = BigInt(Date.now()) * BigInt(1000);
                const view = new DataView(memory.buffer);
                view.setBigUint64(tv, now, true);
                view.setBigUint64(tv + 8, 0n, true);
                return 0;
            },
            
            __syscall_clock_gettime: function(clk_id, tp) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                const now = BigInt(Date.now()) * BigInt(1000000);
                const view = new DataView(memory.buffer);
                view.setBigUint64(tp, now, true);
                view.setBigUint64(tp + 8, 0n, true);
                return 0;
            },
            
            __syscall_nanosleep: function(req, rem) {
                return 0;
            },
            
            __syscall_unlink: function(path) {
                return -1;
            },
            
            __syscall_rmdir: function(path) {
                return -1;
            },
            
            __syscall_mkdir: function(path, mode) {
                return -1;
            },
            
            __syscall_chdir: function(path) {
                return 0;
            },
            
            __syscall_rename: function(oldpath, newpath) {
                return -1;
            },
            
            __syscall_chmod: function(path, mode) {
                return -1;
            },
            
            __syscall_fchmod: function(fd, mode) {
                return -1;
            },
            
            __syscall_chown: function(path, owner, group) {
                return -1;
            },
            
            __syscall_fchown: function(fd, owner, group) {
                return -1;
            },
            
            __syscall_lchown: function(path, owner, group) {
                return -1;
            },
            
            __syscall_readlink: function(path, buf, bufsize) {
                return -1;
            },
            
            __syscall_symlink: function(target, linkpath) {
                return -1;
            },
            
            __syscall_link: function(oldpath, newpath) {
                return -1;
            },
            
            __syscall_socket: function(domain, type, protocol) {
                return -1;
            },
            
            __syscall_connect: function(fd, addr, addrlen) {
                return -1;
            },
            
            __syscall_accept: function(fd, addr, addrlen) {
                return -1;
            },
            
            __syscall_bind: function(fd, addr, addrlen) {
                return -1;
            },
            
            __syscall_listen: function(fd, backlog) {
                return -1;
            },
            
            __syscall_sendto: function(fd, buf, len, flags, dest_addr, addrlen) {
                return -1;
            },
            
            __syscall_recvfrom: function(fd, buf, len, flags, src_addr, addrlen) {
                return -1;
            },
            
            __syscall_setsockopt: function(fd, level, optname, optval, optlen) {
                return -1;
            },
            
            __syscall_getsockopt: function(fd, level, optname, optval, optlen) {
                return -1;
            },
            
            __syscall_getsockname: function(fd, addr, addrlen) {
                return -1;
            },
            
            __syscall_getpeername: function(fd, addr, addrlen) {
                return -1;
            },
            
            __syscall_shutdown: function(fd, how) {
                return -1;
            },
            
            __syscall_pipe: function(fds) {
                return -1;
            },
            
            __syscall_wait4: function(pid, status, options, rusage) {
                return -1;
            },
            
            __syscall_kill: function(pid, sig) {
                return 0;
            },
            
            __syscall_sigaction: function(signum, act, oldact) {
                return 0;
            },
            
            __syscall_sigprocmask: function(how, set, oldset) {
                return 0;
            },
            
            __syscall_sigaltstack: function(ss, old_ss) {
                return 0;
            },
            
            __syscall_rt_sigaction: function(signum, act, oldact, sigsetsize) {
                return 0;
            },
            
            __syscall_rt_sigprocmask: function(how, set, oldset, sigsetsize) {
                return 0;
            },
            
            __syscall_getrusage: function(who, usage) {
                return 0;
            },
            
            __syscall_times: function(buf) {
                return 0;
            },
            
            __syscall_utime: function(path, times) {
                return -1;
            },
            
            __syscall_utimes: function(path, times) {
                return -1;
            },
            
            __syscall_futimesat: function(dirfd, path, times) {
                return -1;
            },
            
            __syscall_getrandom: function(buf, buflen, flags) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                const random = new Uint8Array(buflen);
                crypto.getRandomValues(random);
                memory.set(random, buf);
                return buflen;
            },
            
            __syscall_exit: function(status) {
                self.isRunning = false;
                return 0;
            },
            
            __syscall_getdents: function(fd, dirp, count) {
                return 0;
            },
            
            __syscall_fcntl64: function(fd, cmd, ...args) {
                return 0;
            },
            
            __syscall_fstat64: function(fd, stat) {
                return 0;
            },
            
            __syscall_stat64: function(path, stat) {
                return -1;
            },
            
            __syscall_lstat64: function(path, stat) {
                return -1;
            },
            
            __syscall_truncate: function(path, length) {
                return -1;
            },
            
            __syscall_ftruncate: function(fd, length) {
                return -1;
            },
            
            __syscall_fsync: function(fd) {
                return 0;
            },
            
            __syscall_fdatasync: function(fd) {
                return 0;
            },
            
            __syscall_mlock: function(addr, len) {
                return 0;
            },
            
            __syscall_munlock: function(addr, len) {
                return 0;
            },
            
            __syscall_mlockall: function(flags) {
                return 0;
            },
            
            __syscall_munlockall: function() {
                return 0;
            },
            
            __syscall_umask: function(mask) {
                return 0;
            },
            
            __syscall_sysinfo: function(info) {
                return 0;
            },
            
            __syscall_uname: function(buf) {
                const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                const sysname = 'WebAssembly';
                const nodename = 'wasm';
                const release = '1.0';
                const version = '1.0';
                const machine = 'wasm32';
                
                const writeStr = (ptr, str) => {
                    const encoded = self._encodeString(str);
                    memory.set(encoded.slice(0, encoded.length - 1), ptr);
                };
                
                writeStr(buf, sysname);
                writeStr(buf + 65, nodename);
                writeStr(buf + 130, release);
                writeStr(buf + 195, version);
                writeStr(buf + 260, machine);
                return 0;
            },
            
            _emscripten_system: function(command) {
                return -1;
            },

            printf: function(format_ptr) {
                const str = self._getStringFromMemory(format_ptr);
                if (str) self._handleOutput(str);
                return 0;
            },
            
            puts: function(str_ptr) {
                const str = self._getStringFromMemory(str_ptr);
                if (str) self._handleOutput(str + '\n');
                return 0;
            },
            
            fwrite: function(ptr, size, count, stream) {
                const str = self._getStringFromMemory(ptr);
                if (str && (stream === 1 || stream === 2)) {
                    self._handleOutput(str);
                }
                return count;
            },
            
            fprintf: function(stream, format_ptr) {
                if (stream === 1 || stream === 2) {
                    const str = self._getStringFromMemory(format_ptr);
                    if (str) self._handleOutput(str);
                }
                return 0;
            },
            
            vfprintf: function(stream, format_ptr, args) {
                if (stream === 1 || stream === 2) {
                    const str = self._getStringFromMemory(format_ptr);
                    if (str) self._handleOutput(str);
                }
                return 0;
            },
            
            fflush: function(stream) { return 0; },
            
            putchar: function(ch) {
                self._handleOutput(String.fromCharCode(ch));
                return ch;
            },
            
            fputc: function(ch, stream) {
                if (stream === 1 || stream === 2) {
                    self._handleOutput(String.fromCharCode(ch));
                }
                return ch;
            },
            
            fgets: function(buf_ptr, size, stream) {
                if (stream === 0) {
                    const input = self._waitForInput();
                    if (input) {
                        const encoded = self._encodeString(input);
                        const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                        const len = Math.min(encoded.length - 1, size - 1);
                        memory.set(encoded.slice(0, len), buf_ptr);
                        memory[buf_ptr + len] = 0;
                        return buf_ptr;
                    }
                }
                return 0;
            },
            
            getchar: function() {
                const input = self._waitForInput();
                if (input && input.length > 0) {
                    return input.charCodeAt(0);
                }
                return -1;
            },
            
            scanf: function(format_ptr) {
                const input = self._waitForInput();
                if (input) return 1;
                return 0;
            },
            
            malloc: function(size) {
                const ptr = self._heap_ptr;
                self._heap_ptr = ptr + size + 8;
                return ptr;
            },
            
            free: function(ptr) {},
            
            calloc: function(count, size) {
                const total = count * size;
                const ptr = self._malloc(total);
                if (ptr) {
                    const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                    memory.fill(0, ptr, ptr + total);
                }
                return ptr;
            },
            
            realloc: function(ptr, size) {
                const new_ptr = self._malloc(size);
                if (new_ptr && ptr) {
                    const memory = new Uint8Array(self.wasmModule.exports.memory.buffer);
                    memory.set(memory.slice(ptr, ptr + size), new_ptr);
                }
                return new_ptr;
            },
            
            __ctype_get_mb_cur_max: function() {
                return 1;
            }
        };

        return {
            wasi_snapshot_preview1: wasi,
            env: env
        };
    }

    _getStringFromMemory(ptr) {
        if (!ptr || !this.wasmModule) return '';
        try {
            const memory = new Uint8Array(this.wasmModule.exports.memory.buffer);
            let str = '';
            let i = ptr;
            while (i < memory.length && memory[i] !== 0) {
                str += String.fromCharCode(memory[i]);
                i++;
            }
            return str;
        } catch (error) {
            console.error('Error reading string from memory:', error);
            return '';
        }
    }

    _encodeString(str) {
        const encoder = new TextEncoder();
        return encoder.encode(str + '\0');
    }

    _handleOutput(text) {
        if (this.onOutput) {
            this.onOutput(text);
        } else {
            this.outputBuffer.push(text);
        }
    }

    _waitForInput() {
        if (!this.onInput) {
            console.warn('No input handler set');
            return '';
        }
        
        let result = null;
        const promise = new Promise((resolve) => {
            this.inputResolve = (value) => {
                result = value;
                resolve(value);
            };
            this.onInput();
        });
        
        const timeout = Date.now() + 30000;
        while (result === null && Date.now() < timeout) {   }
        
        this.inputResolve = null;
        return result || '';
    }

    submitInput(input) {
        if (this.inputResolve) {
            this.inputResolve(input);
            this.inputResolve = null;
            return true;
        }
        return false;
    }

    async execute(code, options = {}) {
        if (!this.wasmModule) {
            await this.init(options.wasmPath || 'apex.wasm');
        }

        this.outputBuffer = [];
        this.isRunning = true;

        try {
            if (options.onOutput) this.onOutput = options.onOutput;
            if (options.onInput) this.onInput = options.onInput;
            if (options.onError) this.onError = options.onError;

            const ptr = options.ptr || this.ptr;
            this._writeStringToMemory(code, ptr);

            const result = this.wasmModule.exports.apex_execute(ptr);
            
            this.isRunning = false;
            
            return {
                success: result === 0 || result === true,
                output: this.outputBuffer.join(''),
                result: result
            };
        } catch (error) {
            this.isRunning = false;
            if (this.onError) {
                this.onError(error.message);
            }
            throw error;
        }
    }

    _writeStringToMemory(str, ptr) {
        const encoded = this._encodeString(str);
        const memory = new Uint8Array(this.wasmModule.exports.memory.buffer);
        memory.set(encoded, ptr);
        return ptr;
    }

    async executeSync(code) {
        let output = '';
        let error = null;
        
        try {
            const result = await this.execute(code, {
                onOutput: (text) => {
                    output += text;
                },
                onError: (text) => {
                    error = text;
                }
            });
            
            return {
                output: output,
                error: error,
                success: result.success
            };
        } catch (err) {
            return {
                output: output,
                error: err.message,
                success: false
            };
        }
    }

    clearOutput() {
        this.outputBuffer = [];
        if (this.onOutput) {
            this.onOutput('');
        }
    }

    isReady() {
        return this.wasmModule !== null;
    }

    getExports() {
        if (!this.wasmModule) return {};
        return this.wasmModule.exports;
    }

    callExport(name, ...args) {
        if (!this.wasmModule) {
            throw new Error('WASM not initialized');
        }
        const func = this.wasmModule.exports[name];
        if (!func) {
            throw new Error(`Function "${name}" not found`);
        }
        return func(...args);
    }
}

if (typeof window !== 'undefined') {
    window.ApexExecutor = ApexExecutor;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApexExecutor;
}