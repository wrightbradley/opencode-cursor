import { describe, it, expect, beforeEach, afterEach, afterAll, mock } from "bun:test";
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { pollForAuthFile, verifyCursorAuth, getAuthFilePath, getPossibleAuthPaths } from "../../src/auth";

const TEST_TIMEOUT = 10000;
const TEST_AUTH_DIR = join(homedir(), ".config", "cursor");
const TEST_CLI_CONFIG_DIR = join(homedir(), ".cursor");
const TEST_CONFIG_AUTH_FILE = join(TEST_AUTH_DIR, "auth.json");
const TEST_CONFIG_CLI_CONFIG_FILE = join(TEST_AUTH_DIR, "cli-config.json");
const TEST_CURSOR_CLI_CONFIG_FILE = join(TEST_CLI_CONFIG_DIR, "cli-config.json");
const TEST_CURSOR_AUTH_FILE = join(TEST_CLI_CONFIG_DIR, "auth.json");
const ORIGINAL_XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME;

describe("Auth Module", () => {
  const cleanupAuthFiles = () => {
    const files = [
      TEST_CONFIG_AUTH_FILE,
      TEST_CONFIG_CLI_CONFIG_FILE,
      TEST_CURSOR_CLI_CONFIG_FILE,
      TEST_CURSOR_AUTH_FILE,
    ];
    for (const file of files) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    }
  };

  beforeEach(() => {
    process.env.XDG_CONFIG_HOME = join(homedir(), ".config");
    cleanupAuthFiles();
  });

  afterEach(() => {
    cleanupAuthFiles();
  });

  afterAll(() => {
    if (ORIGINAL_XDG_CONFIG_HOME === undefined) {
      delete process.env.XDG_CONFIG_HOME;
      return;
    }
    process.env.XDG_CONFIG_HOME = ORIGINAL_XDG_CONFIG_HOME;
  });

  describe("getAuthFilePath", () => {
    it("should return correct auth file path", () => {
      const path = getAuthFilePath();
      expect(path).toContain("cursor");
      expect(path).toMatch(/(cli-config|auth)\.json/);
    });
  });

  describe("getPossibleAuthPaths", () => {
    it("should include cli-config.json paths", () => {
      const paths = getPossibleAuthPaths();
      const hasCliConfig = paths.some((path) => path.includes("cli-config.json"));
      expect(hasCliConfig).toBe(true);
    });

    it("should check both auth.json and cli-config.json", () => {
      const paths = getPossibleAuthPaths();
      const hasAuthJson = paths.some((path) => path.includes("auth.json"));
      const hasCliConfig = paths.some((path) => path.includes("cli-config.json"));
      expect(hasAuthJson).toBe(true);
      expect(hasCliConfig).toBe(true);
    });
  });

  describe("verifyCursorAuth", () => {
    it("should return false when auth file does not exist", () => {
      const result = verifyCursorAuth();
      expect(result).toBe(false);
    });

    it("should return true when auth file exists", () => {
      if (!existsSync(TEST_AUTH_DIR)) {
        mkdirSync(TEST_AUTH_DIR, { recursive: true });
      }
      writeFileSync(TEST_CONFIG_AUTH_FILE, JSON.stringify({ token: "test" }));
      
      const result = verifyCursorAuth();
      expect(result).toBe(true);
    });

    it("should return true when cli-config.json exists", () => {
      if (!existsSync(TEST_CLI_CONFIG_DIR)) {
        mkdirSync(TEST_CLI_CONFIG_DIR, { recursive: true });
      }
      writeFileSync(TEST_CURSOR_CLI_CONFIG_FILE, JSON.stringify({ accessToken: "test" }));

      const result = verifyCursorAuth();
      expect(result).toBe(true);
    });
  });

  describe("pollForAuthFile", () => {
    it("should return true when auth file already exists", async () => {
      if (!existsSync(TEST_AUTH_DIR)) {
        mkdirSync(TEST_AUTH_DIR, { recursive: true });
      }
      writeFileSync(TEST_CONFIG_AUTH_FILE, JSON.stringify({ token: "test" }));

      const result = await pollForAuthFile(1000, 100);
      expect(result).toBe(true);
    }, TEST_TIMEOUT);

    it("should return false when auth file never appears", async () => {
      const result = await pollForAuthFile(500, 100);
      expect(result).toBe(false);
    }, TEST_TIMEOUT);

    it("should detect auth file created during polling", async () => {
      const pollPromise = pollForAuthFile(2000, 100);
      
      setTimeout(() => {
        if (!existsSync(TEST_AUTH_DIR)) {
          mkdirSync(TEST_AUTH_DIR, { recursive: true });
        }
        writeFileSync(TEST_CONFIG_AUTH_FILE, JSON.stringify({ token: "test" }));
      }, 300);

      const result = await pollPromise;
      expect(result).toBe(true);
    }, TEST_TIMEOUT);

    it("should respect custom timeout", async () => {
      const startTime = Date.now();
      const result = await pollForAuthFile(300, 50);
      const elapsed = Date.now() - startTime;
      
      expect(result).toBe(false);
      expect(elapsed).toBeGreaterThanOrEqual(250);
      expect(elapsed).toBeLessThan(500);
    }, TEST_TIMEOUT);

    it("should respect custom interval", async () => {
      let checkCount = 0;
      const originalExistsSync = existsSync;
      
      mock.module("fs", () => ({
        ...require("fs"),
        existsSync: (path: string) => {
          if (path === TEST_CONFIG_AUTH_FILE) {
            checkCount++;
          }
          return originalExistsSync(path);
        }
      }));

      await pollForAuthFile(500, 100);
      
      expect(checkCount).toBeGreaterThanOrEqual(4);
      expect(checkCount).toBeLessThanOrEqual(7);
    }, TEST_TIMEOUT);
  });
});
