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
          name: "test",
          execute: TestCommand.execute,
          help: {
            text: "<files> run test"
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
