const path = require("path");
const fs = require("fs");
const stripColor = require("strip-color");
const { Command } = require("@aux4/engine");

function resolve(dir, filename, files) {
  let file = path.resolve(dir, filename);

  if (!fs.existsSync(file)) {
    if (!fs.existsSync(`${file}.test.md`)) {
      throw new Error(`File ${filename} not found`);
    } else {
      file = `${file}.test.md`;
    }
  }

  if (fs.lstatSync(file).isDirectory()) {
    fs.readdirSync(file).forEach(child => resolve(file, child, files));
  } else if (file.endsWith(".test.md")) {
    files.push(file);
  }
}

async function executeCommand(cmd, directory) {
  let exitCode, output, errorOutput;

  try {
    const { stdout, stderr } = await Command.execute(cmd, undefined, { cwd: directory });
    exitCode = 0;
    output = stdout;
    errorOutput = stderr;
  } catch (e) {
    exitCode = e.exitCode;
    output = e.stdout;
    errorOutput = e.stderr;
  }

  if (output.endsWith("\n")) {
    output = stripColor(output.slice(0, -1) || "");
  }

  if (errorOutput.endsWith("\n")) {
    errorOutput = stripColor(errorOutput.slice(0, -1) || "");
  }

  return { exitCode, stdout: output, stderr: errorOutput };
}

module.exports = { resolve, executeCommand };
