const fs = require("fs");
const { executeCommand } = require("../../package/test/TestUtils");
const path = require("path");

class TestEditor {
  static async addTest(params) {
    const level = params.level;
    const name = params.name;
    const file = params.file;
    const execute = params.execute;
    const testSuiteFile = params.testFile;

    const fileContent = await getFileContent(file);
    const executeContent = await getExecuteContent(execute);

    const title = `${"#".repeat(level)} ${name}`;

    const test = `\n${title}\n${fileContent}${executeContent}`;
    fs.appendFileSync(testSuiteFile, test);
  }
}

async function getFileContent(file) {
  if (!file) {
    return "";
  }

  const files = [];

  if (file.startsWith("[") && file.endsWith("]")) {
    const fileList = JSON.parse(file);
    for (const item of fileList) {
      files.push(item.trim());
    }
  } else {
    files.push(file);
  }

  if (files.length === 0) {
    return "";
  }

  let textContent = "";

  for (const file of files) {
    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} does not exist`);
    }

    if (!fs.statSync(file).isFile()) {
      throw new Error(`Path ${file} is not a file`);
    }


    let content = fs.readFileSync(path.resolve(file), { encoding: "utf-8" });
    if (content.endsWith("\n")) {
      content = content.slice(0, -1);
    }

    textContent += `
\`\`\`file:${file}
${content}
\`\`\`
`;
  }

  return textContent;
}

async function getExecuteContent(execute) {
  if (!execute) {
    return "";
  }

  const { stdout, stderr } = await executeCommand(execute, path.resolve("."));

  let expect = "";
  if (stdout) {
    expect = `
\`\`\`expect
${stdout}
\`\`\`
`;
  }

  let error = "";
  if (stderr) {
    error = `
\`\`\`error
${stderr}
\`\`\`
`;
  }

  return `
\`\`\`execute
${execute}
\`\`\`
${expect}${error}
`;
}

module.exports = TestEditor;
