import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("Plugin Directory Initialization", () => {
  let previousXdgConfigHome: string | undefined;
  let testConfigHome: string;
  let testPluginDir: string;

  beforeEach(() => {
    previousXdgConfigHome = process.env.XDG_CONFIG_HOME;
    testConfigHome = mkdtempSync(join(tmpdir(), "opencode-cursor-test-"));
    process.env.XDG_CONFIG_HOME = testConfigHome;
    testPluginDir = join(testConfigHome, "opencode", "plugin");

    if (existsSync(testPluginDir)) {
      rmSync(testPluginDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(testConfigHome)) {
      rmSync(testConfigHome, { recursive: true, force: true });
    }
    if (previousXdgConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = previousXdgConfigHome;
    }
  });

  it("should create plugin directory when it does not exist", async () => {
    expect(existsSync(testPluginDir)).toBe(false);
    
    const { ensurePluginDirectory } = await import("../../src/plugin");
    await ensurePluginDirectory();
    
    expect(existsSync(testPluginDir)).toBe(true);
  });

  it("should not fail when plugin directory already exists", async () => {
    mkdirSync(testPluginDir, { recursive: true });
    expect(existsSync(testPluginDir)).toBe(true);
    
    const { ensurePluginDirectory } = await import("../../src/plugin");
    await expect(ensurePluginDirectory()).resolves.toBeUndefined();
  });

  it("should create parent directories recursively", async () => {
    const parentDir = join(testConfigHome, "opencode");
    if (existsSync(parentDir)) {
      rmSync(parentDir, { recursive: true, force: true });
    }
    
    const { ensurePluginDirectory } = await import("../../src/plugin");
    await ensurePluginDirectory();
    
    expect(existsSync(testPluginDir)).toBe(true);
  });
});
