# Tool Reliability Gap (2026-02-11)

## Current State
- Local `cursor-acp` tools (10): `bash`, `read`, `write`, `edit`, `grep`, `ls`, `glob`, `mkdir`, `rm`, `stat`.
- OpenCode runtime tool surface observed in production includes additional built-ins:
  - `task`, `webfetch`, `todowrite`, `skill`, `skill_mcp`, `interactive_bash`, `google_search`, `session_*`, `lsp_*`, `ast_grep_*`, `distill`, `prune`, `memory`, `background_*`, `look_at`, `slashcommand`.

## What Was Improved
- Added robust tool-name aliasing at the provider boundary for command and filesystem operations (`shell`, `executeCommand`, `createDirectory`, `deleteFile`, `findFiles`, etc.).
- Added argument alias/normalization for `bash`, `glob`, and `rm` (`cmd`, `workdir`, `targetDirectory`, `globPattern`, `recursive`, etc.).
- Hardened default tool handlers for argument parsing and better non-fatal behavior.
- Fixed `glob` implementation for slash patterns like `TOOL_REL_DIR/**/*.txt` and permission-denied tolerance.
- Updated loop guard to treat unknown outputs from output-heavy tools (notably `bash`) as success-class for loop accounting.

## Remaining Gaps
- Repeated successful `edit/write` calls still happen in real `opencode` runs under `auto`; loop guard prevents runaway but UX is noisy.
- MCP discovery/registration is skipped in `opencode` mode (only active in `proxy-exec`), so MCP tools are effectively unavailable there.
- Skills (`skill`, `skill_mcp`, `task`, `call_omo_agent`) lack end-to-end validation in `opencode` mode; permissions/doom_loop interactions untested.
- `glob`/`rm`/`mkdir` can conflict with OpenCode-native implementations when both are registered; no preference policy.

## Distance To “Seamless Cursor-on-OpenCode”
- Core file/shell tools: ~80% (loops and duplicate-provider edge cases remain).
- Skills/MCP/sub-agents: ~40% (plumbing exists; discovery and E2E reliability missing in `opencode` mode).

## Plan To Close Gaps
1) Tool loop stability
   - Add live regression test fixture for `write/edit` in `opencode` mode with `auto` to ensure guard stops after N and emits clear hint.
   - Add telemetry fields (tool name, alias resolution, executor, error class) to debug logs for real runs.
2) MCP enablement in `opencode`
   - Add a toggle to allow MCP discovery/registration even when `TOOL_LOOP_MODE=opencode` (default off), plus one live smoke test against a mock MCP server.
3) Skills/sub-agent validation
   - Add E2E smoke cases invoking `skill`, `skill_mcp`, and `task` with superpowers skills installed; assert tool_call emission and single-turn completion.
   - Exercise doom_loop/permission handling in those flows.
4) Provider preference
   - Implement preference policy so `cursor-acp` versions of `glob`/`rm`/`mkdir` win when duplicates are present, with a metrics flag to observe conflicts.
5) Installer + publish hygiene
   - Prefer npm package `@rama_nigg/open-cursor` in both Go and shell installers; allow tag override (default `latest`, optional `beta`) and surface installed vs latest version.
