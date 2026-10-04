.DELETE_ON_ERROR:

SHELL:=bash

SRC:=src
LIB_SRC:=$(SRC)/lib
BIN_SRC:=$(SRC)/cli
DIST:=dist
QA:=qa

ALL_JS_FILES_SRC:=$(shell find $(SRC) -name "*.js" -o -name "*.cjs" -o -name "*.mjs" -o -name "*.ts" -o -name "*.mts" -o -name "*.cts" -o -name "*.tsx")
ALL_LIB_JS_FILES_SRC:=$(shell find $(SRC)/lib -name "*.js" -o -name "*.cjs" -o -name "*.mjs" -o -name "*.ts" -o -name "*.mts" -o -name "*.cts" -o -name "*.tsx")
ALL_NON_TEST_JS_FILES_SRC:=$(shell find $(SRC) \( -name "*.js" -o -name "*.cjs" -o -name "*.mjs" -o -name "*.ts" -o -name "*.mts" -o -name "*.cts" -o -name "*.tsx" \) -not -path "**/test/**")

BABEL_CONFIG_DIST:=$(DIST)/babel/babel-shared.config.cjs $(DIST)/babel/babel.config.cjs
PACKJS_PKG:=$(CURDIR)/node_modules/@sdlcforge/packjs
BABEL_PKG:=$(PACKJS_PKG)

ROLLUP:=bunx rollup
ROLLUP_CONFIG:=$(PACKJS_PKG)/dist/rollup/rollup.config.mjs
JSDOC2MD:=bunx jsdoc2md

default: all

# set up the Babel config setup that we need to travel with the library and CLI tool
$(CONFIG_FILES_DIST): $(DIST)/%: $(LIB_SRC)/%
	mkdir -p $(dir $@)
	cp $< $@

$(BABEL_CONFIG_DIST): $(DIST)/babel/%: $(BABEL_PKG)/dist/babel/%
	mkdir -p $(dir $@)
	cp $< $@

# set up the library build
FANDL_LIB:=$(DIST)/fandl.js
FANDL_LIB_ENTRY:=$(SRC)/lib/index.mjs

$(FANDL_LIB): package.json $(ALL_LIB_JS_FILES_SRC)
	JS_BUILD_TARGET=$(FANDL_LIB_ENTRY) \
		JS_OUT=$@ \
	  $(ROLLUP) --config $(ROLLUP_CONFIG)

FANDL_EXEC:=$(DIST)/fandl-exec.js
FANDL_EXEC_ENTRY:=$(SRC)/cli/index.mjs

$(FANDL_EXEC): package.json $(ALL_JS_FILES_SRC) $(BABEL_CONFIG_DIST)
	JS_BUILD_TARGET=$(FANDL_EXEC_ENTRY) \
		JS_OUT=$@ \
		JS_OUT_PREAMBLE='#!/usr/bin/env -S node --enable-source-maps' \
	  $(ROLLUP) --config $(ROLLUP_CONFIG)
	chmod a+x $@

TEST_REPORT:=$(QA)/unit-test.txt
TEST_PASS_MARKER:=$(QA)/.unit-test.passed
COVERAGE_REPORTS:=$(QA)/coverage
BUILD_TARGETS:=$(CONFIG_FILES_DIST) $(BABEL_CONFIG_DIST) $(BIN_DIST)
PRECIOUS_TARGETS+=$(TEST_REPORT)

$(TEST_REPORT) $(TEST_PASS_MARKER) $(COVERAGE_REPORTS) &: package.json bun.lock bunfig.toml $(ALL_JS_FILES_SRC) $(FANDL_EXEC)
	mkdir -p $(dir $@)
	echo -n 'Test git rev: ' > $(TEST_REPORT)
	git rev-parse HEAD >> $(TEST_REPORT)
	( set -e; set -o pipefail; \
		bun test --coverage --coverage-reporter=text --coverage-reporter=lcov \
		--coverage-dir=$(COVERAGE_REPORTS) $(TEST) 2>&1 \
		| tee -a $(TEST_REPORT); \
		touch $(TEST_PASS_MARKER) )

# FANDL:=./dist/fandl.sh
LINT_REPORT:=$(QA)/lint.txt
LINT_PASS_MARKER:=$(QA)/.lint.passed
PRECIOUS_TARGETS+=$(LINT_REPORT)

$(LINT_REPORT) $(LINT_PASS_MARKER) &: $(ALL_JS_FILES_SRC) $(BUILD_TARGETS)
	mkdir -p $(dir $@)
	echo -n 'Test git rev: ' > $(LINT_REPORT)
	git rev-parse HEAD >> $(LINT_REPORT)
	( set -e; set -o pipefail; \
		$(FANDL_EXEC) lint \
	    | tee -a $(LINT_REPORT); \
	  touch $(LINT_PASS_MARKER) )

lint-fix: $(ALL_JS_FILES_SRC) $(BUILD_TARGETS)
	@( set -e; set -o pipefail; \
	  $(FANDL_EXEC) )

README_MD:=README.md
README_MD_SRC:=$(shell find $(SRC)/docs -name "*.md") $(ALL_NON_TEST_JS_FILES_SRC)

$(README_MD): $(README_MD_SRC)
	cp $(SRC)/docs/README.01.md $@
	$(JSDOC2MD) \
	  --configure ./jsdoc.config.json \
	  --files 'src/**/*' \
	  --global-index-format grouped \
	  --name-format \
	  --plugin dmd-readme-api \
	  --clever-links \
	  --no-cache \
	  >> $@
	  cat $(SRC)/docs/README.02.md >> $@

test: $(TEST_REPORT) $(TEST_PASS_MARKER)

lint: $(LINT_REPORT) $(LINT_PASS_MARKER)

qa: test lint

build: $(BABEL_CONFIG_DIST) $(FANDL_LIB) $(FANDL_EXEC) $(README_MD)

all: build

default: all

.PHONY: all build default lint qa

.PRECIOUS: $(LINT_REPORT)