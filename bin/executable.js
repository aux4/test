#!/usr/bin/env node

const TestCommand = require("./command/TestExecutor");
const TestEditor = require("./command/TestEditor");

process.title = "aux4-test";

(async () => {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("No action specified. Available actions: run, coverage, add");
    process.exit(1);
  }

  const action = args[0];
  try {
    switch (action) {
      case "run": {
        const testFileDir = args[1];
        const files = args.slice(2);
        await TestCommand.run(testFileDir, files);
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
      default:
        console.error(`Unknown action: ${action}`);
        process.exit(1);
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
