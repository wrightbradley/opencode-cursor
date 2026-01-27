![header](docs/header.png)

A lightweight OpenCode plugin for Cursor Agent integration via stdin (fixes E2BIG errors). Includes automatic rollback and backup system for safe installation.

## Installation

**Quick install with automated setup and rollback**:

```bash
curl -fsSL https://raw.githubusercontent.com/nomadcxx/opencode-cursor/main/install.sh | bash
```

The installer automatically:
- Installs to `~/.local/share/opencode-cursor` (permanent location for uninstall)
- Checks prerequisites (bun, cursor-agent, OpenCode)
- Builds the plugin
- Installs ACP SDK to `~/.config/opencode/node_modules/` (externalized to avoid Bun segfault)
- Creates plugin symlink to `~/.config/opencode/plugin/cursor-acp.js`
- Adds cursor-acp provider with 30 Cursor models
- **Creates backups** before each operation
- **Auto-rollback** if any step fails
- Verifies installation with `opencode models`

**Manual install**:

```bash
git clone https://github.com/nomadcxx/opencode-cursor.git
cd opencode-cursor
bun install && bun run build
cd ~/.config/opencode && bun add @agentclientprotocol/sdk@^0.13.1
mkdir -p ~/.config/opencode/plugin
ln -s $(pwd)/dist/index.js ~/.config/opencode/plugin/cursor-acp.js
```

**Note**: The plugin externalizes ACP SDK to avoid Bun's segfault bug with large bundles. ACP SDK is installed to `~/.config/opencode/node_modules/`.

**Safety Features**:
- Backup system creates copies of all modified files before changes
- Automatic rollback if any installation step fails
- Clean uninstall removes everything with safety backups

## Usage

Select `cursor-acp/auto` as your model in OpenCode.

```bash
opencode "Hello world" --model=cursor-acp/auto
```

## Available Models

The cursor-acp provider includes 30 Cursor Agent models:
- `cursor-acp/auto` - Automatic model selection
- `cursor-acp/gpt-5.2` - GPT-5.2
- `cursor-acp/gemini-3-pro` - Gemini 3 Pro
- `cursor-acp/opus-4.5-thinking` - Claude 4.5 Opus with extended thinking
- `cursor-acp/sonnet-4.5` - Claude 4.5 Sonnet
- `cursor-acp/deepseek-v3.2` - DeepSeek V3.2
- And 24 more models (composer-1, grok-4, kimi-k2, etc.)

## Features

- stdin/stdout communication (no E2BIG argument limit errors)
- Full streaming support
- Tool calling support
- ACP protocol (works with OpenCode, Zed, JetBrains, neovim)
- Session persistence
- Automatic retry with exponential backoff
- **Built-in logging and error handling**

## Safety Features

**Automatic Rollback System**:
1. Backups created before every file modification
2. Automatic restoration if any installation step fails
3. Clean uninstall with safety backups
4. No broken OpenCode installs left behind

**Uninstall / Rollback**:

The installer installs to `~/.local/share/opencode-cursor` for permanent access. To uninstall:

```bash
cd ~/.local/share/opencode-cursor
./installer --uninstall
```

If running from a downloaded copy:
```bash
cd /path/to/opencode-cursor
./installer --uninstall
```

Removes:
- Plugin symlink (`~/.config/opencode/plugin/cursor-acp.js`)
- ACP SDK from `~/.config/opencode/node_modules/`
- Provider config from `~/.config/opencode/opencode.json`
- Old `opencode-cursor-auth` plugin reference
- **With safety backups created first**

## Why This Approach

CLI argument passing fails with E2BIG errors. HTTP proxies add daemon overhead. This plugin uses stdin/stdout for simple, direct communication.

## Prerequisites

- bun (`curl -fsSL https://bun.sh/install | bash`)
- cursor-agent (`curl -fsS https://cursor.com/install | bash`)
- OpenCode (`curl -fsSL https://opencode.ai/install | bash`)
- Go 1.21+ (installer)

## Development

```bash
bun install
bun run build  # or bun run dev for watch mode
./install.sh --debug  # Run installer in debug mode
```

## Troubleshooting

**Installation failed?** The installer automatically rolls back all changes. Check the log file for details.

**Cursor-acp not appearing in models?** Run the installer with `--debug` flag:
```bash
./install.sh --debug
```

**Manual cleanup**: Use the uninstaller even after failed installs:
```bash
./installer --uninstall
```

## License

ISC
