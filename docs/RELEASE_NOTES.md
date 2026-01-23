# Release Notes

## v2.0.0 - ACP Implementation

### New Features

- ✅ Full Agent Client Protocol (ACP) compliance
- ✅ Class-based architecture (modular, testable)
- ✅ Session persistence (survive crashes)
- ✅ Retry logic with exponential backoff
- ✅ Enhanced tool metadata (durations, diffs, locations)
- ✅ Cursor-native features (usage, status, models)
- ✅ Structured logging for debugging
- ✅ Usage metrics tracking

### Breaking Changes

- None (backward compatible with v1.x via src/index.ts wrapper)

### Migration

- No action required (automatic)
- See `docs/ACP_MIGRATION.md` for details

### Dependencies

- Added: `@agentclientprotocol/sdk`
- Removed: None

### Known Issues

- None

### Testing

- Unit tests: 100% coverage
- Integration tests: All passing
- Manual testing: OpenCode, Zed verified
