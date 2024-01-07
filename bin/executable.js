#!/usr/bin/env node

const { Engine } = require("@aux4/engine");
const TestCommand = require("./command/TestExecutor");
const TestEditor = require("./command/TestEditor");

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
        },
        {
          name: "add",
          execute: TestEditor.addTest,
          help: {
            text: "<testFile> add test to test suite",
            variables: [
              {
                name: "testFile",
                text: "test suite file",
                arg: true
              },
              {
                name: "name",
                text: "test name",
              },
              {
                name: "file",
                text: "file to add",
                default: ""
              },
              {
                name: "execute",
                text: "command to execute",
                default: ""
              }
            ]
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
