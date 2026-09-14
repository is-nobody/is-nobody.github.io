# compile libraries and the VM into object files with -O3.
emcc -O3 -c \
    -I. -I./source/core -I./source/utils -I./source/libraries \
    source/core/vm.c \
    source/libraries/os_module.c \
    source/libraries/sys_module.c \
    source/libraries/math_module.c \
    source/libraries/string_module.c \
    source/libraries/table_module.c \
    source/libraries/ffi_module.c \
    source/libraries/random_module.c \
    source/libraries/json_module.c \
    source/libraries/xml_module.c \
    source/libraries/csv_module.c \
    source/libraries/base_module.c \
    source/libraries/regex_module.c \
    source/libraries/crypto_module.c \
    source/libraries/zip_module.c \
    source/libraries/network_module.c && \

# compile the rest with -O0 and link everything together.
# MODULARIZE=1 + EXPORT_NAME wraps everything into createApexModule(),
# so emscripten generates its own JS glue with correct imports (no manual shim).
# ERROR_ON_UNDEFINED_SYMBOLS=0 + WARN_ON_UNDEFINED_SYMBOLS=0 let ffi/network
# resolve to emscripten's silent no-op stubs instead of failing the link.
emcc -O0 \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='createApexModule' \
    -s EXPORTED_FUNCTIONS='[_apex_execute_string,_malloc,_free]' \
    -s EXPORTED_RUNTIME_METHODS='[ccall,cwrap,UTF8ToString,stringToUTF8,lengthBytesUTF8]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s NO_FILESYSTEM=1 \
    -s ENVIRONMENT=web \
    -s EXPORT_ES6=1 \
    -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
    -s WARN_ON_UNDEFINED_SYMBOLS=0 \
    -o apex.js \
    -I. -I./source/core -I./source/utils -I./source/libraries \
    source/utils/apex_api.c \
    source/utils/execute.c \
    source/utils/error.c \
    source/utils/emit.c \
    source/utils/platform.c \
    source/core/tokenizer.c \
    source/core/parser.c \
    source/core/ast.c \
    source/core/bytecode.c \
    source/core/codegen.c \
    vm.o \
    os_module.o \
    sys_module.o \
    math_module.o \
    string_module.o \
    table_module.o \
    ffi_module.o \
    random_module.o \
    json_module.o \
    xml_module.o \
    csv_module.o \
    base_module.o \
    regex_module.o \
    crypto_module.o \
    zip_module.o \
    network_module.o && \

# cleaning
rm -f *.o && \
echo ""
echo "✅ Build complete!"
echo "📦 Size: apex.js $(du -h apex.js | cut -f1), apex.wasm $(du -h apex.wasm | cut -f1)"
echo ""