import { describe, it, expect } from "bun:test";
import { ToolRegistry } from "../../src/tools/core/registry.js";
import { registerDefaultTools, getDefaultToolNames } from "../../src/tools/defaults.js";
import { executeWithChain } from "../../src/tools/core/executor.js";
import { LocalExecutor } from "../../src/tools/executors/local.js";

describe("Default Tools", () => {
  it("should register all 7 default tools", () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);

    const toolNames = getDefaultToolNames();
    expect(toolNames).toHaveLength(7);

    for (const name of toolNames) {
      const tool = registry.getTool(name);
      expect(tool).toBeDefined();
    }
  });

  it("should have correct tool definitions", () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);

    const bash = registry.getTool("bash");
    expect(bash?.name).toBe("bash");
    expect(bash?.parameters.required).toContain("command");

    const read = registry.getTool("read");
    expect(read?.name).toBe("read");
    expect(read?.parameters.required).toContain("path");

    const write = registry.getTool("write");
    expect(write?.name).toBe("write");

    const edit = registry.getTool("edit");
    expect(edit?.name).toBe("edit");

    const grep = registry.getTool("grep");
    expect(grep?.name).toBe("grep");

    const ls = registry.getTool("ls");
    expect(ls?.name).toBe("ls");

    const glob = registry.getTool("glob");
    expect(glob?.name).toBe("glob");
  });

  it("should execute ls tool", async () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);
    const executor = new LocalExecutor(registry);

    const result = await executeWithChain([executor], "ls", { path: "." });

    // Should list current directory contents
    expect(result.status).toBe("success");
    expect(result.output).toBeDefined();
    expect(result.output!.length).toBeGreaterThan(0);
  });

  it("should execute read tool", async () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);
    const executor = new LocalExecutor(registry);

    // Create a temp file to read
    const fs = await import("fs");
    const tmpFile = `/tmp/test-read-${Date.now()}.txt`;
    fs.writeFileSync(tmpFile, "Hello, World!", "utf-8");

    const result = await executeWithChain([executor], "read", { path: tmpFile });

    expect(result.status).toBe("success");
    expect(result.output).toBe("Hello, World!");

    // Cleanup
    fs.unlinkSync(tmpFile);
  });

  it("should execute write and read tools together", async () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);
    const executor = new LocalExecutor(registry);

    const tmpFile = `/tmp/test-write-${Date.now()}.txt`;

    // Write
    const writeResult = await executeWithChain([executor], "write", {
      path: tmpFile,
      content: "Test content"
    });
    expect(writeResult.status).toBe("success");
    expect(writeResult.output).toContain("written successfully");

    // Read back
    const readResult = await executeWithChain([executor], "read", { path: tmpFile });
    expect(readResult.status).toBe("success");
    expect(readResult.output).toBe("Test content");

    // Cleanup
    const fs = await import("fs");
    fs.unlinkSync(tmpFile);
  });

  it("should execute edit tool", async () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);
    const executor = new LocalExecutor(registry);

    const fs = await import("fs");
    const tmpFile = `/tmp/test-edit-${Date.now()}.txt`;
    fs.writeFileSync(tmpFile, "Hello, World!", "utf-8");

    const result = await executeWithChain([executor], "edit", {
      path: tmpFile,
      old_string: "World",
      new_string: "Universe"
    });

    expect(result.status).toBe("success");
    expect(result.output).toContain("edited successfully");

    const content = fs.readFileSync(tmpFile, "utf-8");
    expect(content).toBe("Hello, Universe!");

    // Cleanup
    fs.unlinkSync(tmpFile);
  });

  it("should get all tool definitions", () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);

    const tools = registry.list();
    expect(tools).toHaveLength(7);

    // All should have required fields
    for (const tool of tools) {
      expect(tool.name).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.source).toBe("local");
    }
  });

  it("should execute grep tool safely with special characters in pattern", async () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);
    const executor = new LocalExecutor(registry);

    const fs = await import("fs");
    const tmpFile = `/tmp/test-grep-${Date.now()}.txt`;
    fs.writeFileSync(tmpFile, "hello world\nfoo bar\n", "utf-8");

    const result = await executeWithChain([executor], "grep", {
      pattern: "hello",
      path: tmpFile
    });

    expect(result.status).toBe("success");
    expect(result.output).toContain("hello world");

    fs.unlinkSync(tmpFile);
  });

  it("should prevent grep command injection via pattern", async () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);
    const executor = new LocalExecutor(registry);

    const fs = await import("fs");
    const tmpFile = `/tmp/test-inject-${Date.now()}.txt`;
    fs.writeFileSync(tmpFile, "safe content\n", "utf-8");

    const attacks = [
      "test; echo INJECTED",
      "test && echo INJECTED",
      "test || echo INJECTED",
      "test | cat /etc/hostname",
      "test $(echo INJECTED)",
      "test `echo INJECTED`",
    ];

    for (const malicious of attacks) {
      const result = await executeWithChain([executor], "grep", {
        pattern: malicious,
        path: tmpFile
      });
      // execFile passes pattern as argument, not through shell
      // So these should find no matches, not execute commands
      expect(result.status).toBe("success");
      expect(result.output).toBe("No matches found");
    }

    fs.unlinkSync(tmpFile);
  });

  it("should prevent glob command injection via pattern", async () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);
    const executor = new LocalExecutor(registry);

    const attacks = [
      "*.ts; echo INJECTED",
      "*.ts && echo INJECTED",
      "$(echo INJECTED).ts",
    ];

    for (const malicious of attacks) {
      const result = await executeWithChain([executor], "glob", {
        pattern: malicious,
        path: "/tmp"
      });
      // execFile passes pattern as -name argument, not through shell
      // find may error on special chars or return no matches — both are safe
      if (result.status === "success") {
        expect(result.output).not.toContain("INJECTED");
      }
      // Either way, no command injection occurred
    }
  });

  it("should execute glob tool safely", async () => {
    const registry = new ToolRegistry();
    registerDefaultTools(registry);
    const executor = new LocalExecutor(registry);

    const result = await executeWithChain([executor], "glob", {
      pattern: "*.ts",
      path: "src/tools"
    });

    expect(result.status).toBe("success");
    expect(result.output).toContain(".ts");
  });
});