#!/usr/bin/env node

const { Engine } = require("@aux4/engine");
const TestCommand = require("./command/TestExecutor");

process.title = "aux4-test";

const config = {
  profiles: [
    {
      name: "main",
      commands: [
        {
          name: "run",
          execute: TestCommand.run,
          help: {
            text: "<files> run test"
          }
        },
        {
          name: "coverage",
          execute: TestCommand.coverage,
          help: {
            text: "<files> run test with coverage"
          }
        }
      ]
    }
  ]
};

(async () => {
  const engine = new Engine({ aux4: config });

  const args = process.argv.splice(2);

  try {
    await engine.run(args);
  } catch (e) {
    console.error(e.message.red);
    process.exit(1);
  }
})();
