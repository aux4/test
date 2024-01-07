const fs = require("fs");
const { executeCommand } = require("../../lib/TestUtils");

class TestEditor {
  static async addTest(params) {
    const name = await params.name;
    const file = await params.file;
    const execute = await params.execute;
    const testSuiteFile = await params.testFile;

    const fileContent = await getFileContent(file);
    const executeContent = await getExecuteContent(execute);

    const test = `${name}\n${fileContent}${executeContent}`;
    fs.appendFileSync(testSuiteFile, test);
  }
}

async function getFileContent(file) {
  if (!file) {
    return "";
  }

  const content = fs.readFileSync(file, "utf8");
  return `
\`\`\`file:${file}
${content}
\`\`\`
`;
}

async function getExecuteContent(execute) {
  if (!execute) {
    return "";
  }

  const { stdout, stderr } = await executeCommand(execute, ".");

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
