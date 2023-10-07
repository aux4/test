const path = require("path");
const fs = require("fs");
const Test = require("../../lib/Test");

class TestExecutor {
  static async execute(params, action) {
    const files = [];
    action.forEach(file => resolve(".", file, files));
    if (files.length === 0) {
      resolve(".", ".", files);
    }
    await Test.run(files);
  }
}

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

module.exports = TestExecutor;
