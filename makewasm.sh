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
    source/libraries/codecs_module.c && \

# compile the rest with -O0 and link everything together.
emcc -O0 \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='[_apex_execute_string]' \
    -s EXPORTED_RUNTIME_METHODS='[ccall,cwrap]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s NO_FILESYSTEM=1 \
    -s ENVIRONMENT=web \
    --no-entry \
    -I. -I./source/core -I./source/utils -I./source/libraries \
    -o apex.wasm \
    source/utils/apex_api.c \
    source/utils/execute.c \
    source/utils/error.c \
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
    codecs_module.o && \

# cleaning
rm -f *.o && \
echo ""
echo "✅ Build complete!"
echo "📦 Size: $(du -h apex.wasm | cut -f1)"
echo ""