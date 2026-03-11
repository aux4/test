#!/usr/bin/env node

const TestCommand = require("./command/TestExecutor");
const TestEditor = require("./command/TestEditor");

process.title = "aux4-test";

(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("       run   <files> run test");
    console.log("  coverage   <files> run test with coverage");
    process.exit(0);
  }

  const action = args[0];
  try {
    switch (action) {
      case "run": {
        const testFileDir = args[1];
        const remaining = args.slice(2);

        const AUX4_INTERNAL = new Set(["packageDir", "aux4HomeDir", "configDir", "dir", "config", "configFile", "group"]);
        let params = {};
        let files = remaining;

        if (remaining.length > 0) {
          const lastArg = remaining[remaining.length - 1];
          if (lastArg.startsWith("{")) {
            try {
              const parsed = JSON.parse(lastArg);
              if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const configFile = parsed.configFile;
                const configSection = parsed.config;
                if (configFile && configSection) {
                  try {
                    const cp = require("child_process");
                    const configOutput = cp.execSync(
                      `aux4 config get --file "${configFile}" ${configSection}`,
                      { encoding: "utf-8", timeout: 5000 }
                    ).trim();
                    if (configOutput) {
                      const configValues = JSON.parse(configOutput);
                      if (configValues && typeof configValues === "object" && !Array.isArray(configValues)) {
                        for (const [key, value] of Object.entries(configValues)) {
                          params[key] = typeof value === "string" ? value : JSON.stringify(value);
                        }
                      }
                    }
                  } catch {
                    // Config resolution failed, continue without config params
                  }
                }
                for (const [key, value] of Object.entries(parsed)) {
                  if (!AUX4_INTERNAL.has(key)) {
                    params[key] = value;
                  }
                }

                if (parsed.configFile) process.env.AUX4_TEST_CONFIG_FILE = parsed.configFile;
                if (parsed.aiConfig) process.env.AUX4_TEST_AI_CONFIG = parsed.aiConfig;
                if (parsed.group) process.env.AUX4_TEST_GROUP = parsed.group;
              }
            } catch {
              // Not valid JSON, treat as file path
            }
            files = remaining.slice(0, -1);
          }
        }

        await TestCommand.run(testFileDir, files, params);
        break;
      }
      case "add": {
        const [, testFile, level, name, file, execute] = args;
        if (!testFile || !name) {
          console.error("Usage: add <testFile> <level> <name> [file] [execute]");
          process.exit(1);
        }
        const params = { testFile, level, name, file, execute };
        await TestEditor.addTest(params);
        break;
      }
      case "inspect": {
        const [, testFile, name, dir] = args;
        if (!testFile || !name || !dir) {
          console.error("Usage: inspect <testFile> <name> <dir>");
          process.exit(1);
        }
        const params = { testFile, name, dir };
        await TestEditor.inspectTest(params);
        break;
      }
      default:
        console.error(`Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
