# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Borp is a TypeScript-aware test runner for `node:test` with built-in code coverage support via c8. It's self-hosted and uses ESM modules throughout.

## Development Commands

### Primary Commands
- `npm test` - Run complete test suite (clean, lint, and unit tests)
- `npm run unit` - Run unit tests with coverage, excluding fixtures
- `npm run lint` - Run ESLint with neostandard configuration
- `npm run lint:fix` - Run ESLint with automatic fixes
- `npm run clean` - Remove build artifacts and test directories

### Running Individual Tests
- Use borp directly: `node borp.js [options] [test-files]`
- With coverage: `node borp.js --coverage`
- Single test file: `node borp.js test/basic.test.js`

## Architecture

### Core Structure
- `borp.js` - Main CLI entry point with argument parsing and orchestration
- `lib/run.js` - Core test runner with TypeScript compilation support
- `lib/conf.js` - Configuration file loading (`.borp.yaml` or `.borp.yml`)

### Key Features
- Automatic TypeScript compilation detection via `tsconfig.json`
- Multiple reporter support (spec, tap, dot, junit, github)
- Code coverage via c8 with customizable thresholds
- Watch mode for development
- Post-compilation hooks
- Configuration file support

### Test Structure
- Tests use `node:test` with `@matteo.collina/tspl` for planning
- Test files follow `*.test.{js|ts}` pattern
- Fixtures in `fixtures/` directory demonstrate various scenarios
- Coverage excludes test files and fixtures by default

### TypeScript Support
- Automatically compiles TypeScript when `tsconfig.json` found
- Supports both ESM and CJS module formats
- Source map support for debugging
- Incremental compilation for performance

## Configuration

### CLI Options
- Coverage: `--coverage` or `-C`
- Concurrency: `--concurrency` or `-c` (defaults to CPU count - 1)
- Timeout: `--timeout` or `-t` (default 30s)
- Watch: `--watch` or `-w`
- Reporter: `--reporter` or `-r`

### Config File
Supports `.borp.yaml`/`.borp.yml` with:
- `files`: Array of test file globs
- `reporters`: Array of reporter configurations