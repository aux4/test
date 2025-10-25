const fs = require("fs");
const { executeCommand } = require("../../package/engine/TestUtils");
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

function getRequiredBackticks(content) {
  // Find the longest sequence of consecutive backticks in the content
  const matches = content.match(/`+/g) || [];
  let maxBackticks = 2;

  if (matches.length > 0) {
    const lengths = matches.map(match => match.length);
    maxBackticks = Math.max(...lengths);
  }

  // Return at least 3 backticks, or more if needed to escape content
  return Math.max(3, maxBackticks + 1);
}

function createBackticks(count) {
  return '`'.repeat(count);
}

async function getFileContent(file) {
  if (!file || typeof file !== 'string') {
    return "";
  }

  const trimmedFile = file.trim();
  if (trimmedFile === "" || trimmedFile === "[]" || trimmedFile === '[""]') {
    return "";
  }

  const files = [];

  if (trimmedFile.startsWith("[") && trimmedFile.endsWith("]")) {
    try {
      const fileList = JSON.parse(trimmedFile);
      for (const item of fileList) {
        const trimmedItem = item.trim();
        if (trimmedItem !== "") {
          files.push(trimmedItem);
        }
      }
    } catch (error) {
      throw new Error(`Invalid JSON in file parameter: ${trimmedFile}`);
    }
  } else {
    files.push(trimmedFile);
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

    const backticks = createBackticks(getRequiredBackticks(content));

    textContent += `
${backticks}file:${file}
${content}
${backticks}
`;
  }

  return textContent;
}

async function getExecuteContent(execute) {
  if (!execute) {
    return "";
  }

  const { stdout, stderr } = await executeCommand(execute, path.resolve("."));

  // Calculate required backticks for all content
  const allContent = [execute, stdout, stderr].filter(Boolean).join('\n');
  const requiredBackticks = getRequiredBackticks(allContent);
  const backticks = createBackticks(requiredBackticks);

  let expect = "";
  if (stdout) {
    expect = `
${backticks}expect
${stdout}
${backticks}
`;
  }

  let error = "";
  if (stderr) {
    error = `
${backticks}error
${stderr}
${backticks}
`;
  }

  return `
${backticks}execute
${execute}
${backticks}
${expect}${error}
`;
}

module.exports = TestEditor;
