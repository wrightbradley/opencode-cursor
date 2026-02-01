![header](docs/header.png)

A lightweight OpenCode plugin for Cursor CLI integration via HTTP proxy.

## Quick Install (Go TUI Installer)

```bash
cd /path/to/opencode-cursor
./cmd/installer/installer-binary
```

Features animated terminal art, progress tracking, and automatic rollback on failure.

## Usage

```bash
# Run with cursor-acp model
opencode run "your prompt" --model cursor-acp/auto
```

## How It Works

Uses HTTP proxy server (port 32124) to bridge OpenCode ↔ cursor-agent. No E2BIG errors, full streaming support.

## Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime
- [cursor-agent](https://cursor.com/) - Cursor CLI (`curl -fsSL https://cursor.com/install | bash`)

## Development

```bash
bun install
bun run build
```

## License

ISC
