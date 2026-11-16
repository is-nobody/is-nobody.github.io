#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BUILD_DIR="${BUILD_DIR:-build-wasm}"
OUT_BASE="${OUT_BASE:-apex}"
HOT_OPT="${HOT_OPT:--O3}"
COLD_OPT="${COLD_OPT:--O0}"
LINK_OPT="${LINK_OPT:--O0}"
STACK_SIZE="${STACK_SIZE:-1048576}"
FILESYSTEM="${FILESYSTEM:-1}"
USE_PTHREADS="${USE_PTHREADS:-0}"
ALLOW_UNDEFINED="${ALLOW_UNDEFINED:-1}"
LONGJMP="${LONGJMP:-emscripten}"
CLOSURE="${CLOSURE:-0}"
INCREMENTAL="${INCREMENTAL:-0}"
EXCLUDE_REGEX="${EXCLUDE_REGEX:-^source/jit/}"

if [[ -z "${JOBS:-}" ]]; then
  if   command -v nproc  >/dev/null 2>&1; then JOBS="$(nproc)"
  elif command -v sysctl >/dev/null 2>&1; then JOBS="$(sysctl -n hw.ncpu)"
  else JOBS=4; fi
fi

if [[ "${1:-}" == "clean" ]]; then
  rm -rf "$BUILD_DIR"
  echo "removed $BUILD_DIR"
  exit 0
fi

command -v emcc >/dev/null 2>&1 || { echo "emcc not found - source emsdk_env.sh first"; exit 1; }
[[ -d source ]] || { echo "run from the apex repo root (no ./source)"; exit 1; }

VERSION="$(sed -n 's/.*project(Apex VERSION \([0-9.]*\).*/\1/p' CMakeLists.txt | head -n1)"
echo "Apex ${VERSION:-unknown} -> WebAssembly (jobs: $JOBS, filesystem: $FILESYSTEM)"

SOURCES=()
while IFS= read -r src; do
  if [[ "$src" =~ $EXCLUDE_REGEX ]]; then continue; fi
  SOURCES+=("$src")
done < <(find source -type f -name '*.c' | LC_ALL=C sort)
((${#SOURCES[@]})) || { echo "no sources found"; exit 1; }

INC_DIRS=(".")
while IFS= read -r h; do INC_DIRS+=("$(dirname "$h")"); done \
  < <(find . -type d \( -name .git -o -name "$BUILD_DIR" -o -name node_modules \) -prune \
        -o -type f -name '*.h' -print)
INCLUDES=()
while IFS= read -r d; do INCLUDES+=("-I$d"); done < <(printf '%s\n' "${INC_DIRS[@]}" | LC_ALL=C sort -u)

CFLAGS=(-std=gnu11 -Wall -Wextra -D_DEFAULT_SOURCE "${INCLUDES[@]}")
if [[ "$USE_PTHREADS" == 1 ]]; then CFLAGS+=(-pthread); fi
if [[ "$LONGJMP" == wasm ]]; then CFLAGS+=(-sSUPPORT_LONGJMP=wasm); fi

is_hot() { case "$1" in source/core/vm.c|source/libraries/*.c) return 0;; *) return 1;; esac; }

OBJECTS=()
PIDS=()
reap() { for p in "${PIDS[@]}"; do wait "$p"; done; PIDS=(); }
trap 'kill $(jobs -rp) 2>/dev/null || true' INT TERM

for src in "${SOURCES[@]}"; do
  obj="$BUILD_DIR/obj/${src%.c}.o"
  OBJECTS+=("$obj")
  if [[ "$INCREMENTAL" == 1 && -f "$obj" && "$obj" -nt "$src" ]]; then continue; fi
  mkdir -p "$(dirname "$obj")"
  opt="$COLD_OPT"
  if is_hot "$src"; then opt="$HOT_OPT"; fi
  emcc "$opt" "${CFLAGS[@]}" -c "$src" -o "$obj" &
  PIDS+=($!)
  if ((${#PIDS[@]} >= JOBS)); then reap; fi
done
reap
echo "compiled ${#SOURCES[@]} translation units"

RUNTIME_METHODS='ccall,cwrap,UTF8ToString,stringToUTF8,lengthBytesUTF8'
LDFLAGS=(
  "$LINK_OPT"
  -sWASM=1
  -sMODULARIZE=1
  -sEXPORT_NAME=createApexModule
  -sEXPORT_ES6=1
  -sENVIRONMENT=web
  -sALLOW_MEMORY_GROWTH=1
  -sSTACK_SIZE="$STACK_SIZE"
  --no-entry
)

if [[ "$FILESYSTEM" == 1 ]]; then
  LDFLAGS+=(-sFILESYSTEM=1)
  RUNTIME_METHODS+=',FS'
else
  LDFLAGS+=(-sFILESYSTEM=0)
fi
LDFLAGS+=(-sEXPORTED_RUNTIME_METHODS="[$RUNTIME_METHODS]")

if [[ "$USE_PTHREADS" == 1 ]]; then LDFLAGS+=(-pthread -sPTHREAD_POOL_SIZE=4); fi
if [[ "$LONGJMP" == wasm ]]; then LDFLAGS+=(-sSUPPORT_LONGJMP=wasm); fi

if [[ "$ALLOW_UNDEFINED" == 1 ]]; then
  LDFLAGS+=(-sERROR_ON_UNDEFINED_SYMBOLS=0 -sWARN_ON_UNDEFINED_SYMBOLS=0)
else
  LDFLAGS+=(-sERROR_ON_UNDEFINED_SYMBOLS=1)
fi

if [[ "$CLOSURE" == 1 && "$LINK_OPT" != "-O0" ]]; then LDFLAGS+=(--closure 1); fi

FALLBACK_EXPORTS='[_apex_open,_apex_close,_apex_run_string,_apex_run_file,_apex_last_error,_apex_had_error,_apex_clear_error,_apex_exit_requested,_apex_exit_code,_apex_clear_exit,_apex_get_top,_apex_set_top,_apex_pop,_apex_check_stack,_apex_push_value,_apex_push_none,_apex_push_boolean,_apex_push_number,_apex_push_string,_apex_push_lstring,_apex_new_table,_apex_type,_apex_type_name,_apex_to_boolean,_apex_to_number,_apex_to_string,_apex_to_lstring,_apex_get_global,_apex_set_global,_apex_get_field,_apex_set_field,_apex_get_index,_apex_set_index,_apex_get_table,_apex_set_table,_apex_table_size,_apex_register_function,_malloc,_free]'

NM="$(em-config LLVM_ROOT 2>/dev/null || true)/llvm-nm"
if [[ ! -x "$NM" ]]; then NM="$(command -v llvm-nm || true)"; fi
API_OBJ="$BUILD_DIR/obj/source/utils/apex_api.o"
if [[ -n "$NM" && -x "$NM" && -f "$API_OBJ" ]]; then
  API_EXPORTS="$("$NM" --defined-only --extern-only "$API_OBJ" | awk '{print $NF}' | grep '^apex_' | sed 's/^/_/' | paste -sd, -)"
  if [[ -n "$API_EXPORTS" ]]; then
    LDFLAGS+=(-sEXPORTED_FUNCTIONS="[$API_EXPORTS,_malloc,_free]")
    echo "exporting $(awk -F, '{print NF}' <<< "$API_EXPORTS") api symbols + malloc/free"
  else
    LDFLAGS+=(-sEXPORTED_FUNCTIONS="$FALLBACK_EXPORTS")
  fi
else
  LDFLAGS+=(-sEXPORTED_FUNCTIONS="$FALLBACK_EXPORTS")
fi

emcc "${LDFLAGS[@]}" -o "$OUT_BASE.js" "${OBJECTS[@]}"

echo ""
echo "Build complete!"
echo "Size: $OUT_BASE.js $(du -h "$OUT_BASE.js" | cut -f1), $OUT_BASE.wasm $(du -h "$OUT_BASE.wasm" | cut -f1)"
echo ""