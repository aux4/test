const fs = require("fs");
const { executeCommand } = require("../../package/engine/TestUtils");
const path = require("path");
const MarkdownTestParser = require("../../package/engine/MarkdownTestParser");

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

  static async inspectTest(params) {
    const { testFile, name, dir } = params;

    // Check if the test file exists
    if (!fs.existsSync(testFile)) {
      throw new Error(`Test file ${testFile} does not exist`);
    }

    // Parse the test file
    const scenarios = MarkdownTestParser.parse(testFile);

    // Find the matching test scenario by name
    const matchingScenario = findScenarioByName(scenarios, name);
    if (!matchingScenario) {
      throw new Error(`Test scenario "${name}" not found in ${testFile}`);
    }

    // Create the directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }

    // Extract and save all files from this scenario, its parents, and its children
    const allFiles = [];
    collectFilesFromScenarioAndParents(scenarios, matchingScenario, allFiles);

    if (allFiles.length === 0) {
      console.log(`No files found in scenario "${name}"`);
      return;
    }

    // Save each file to the directory
    for (const fileInfo of allFiles) {
      const filePath = path.join(dir, fileInfo.name);
      const fileDir = path.dirname(filePath);

      // Create subdirectories if needed
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      fs.writeFileSync(filePath, fileInfo.content);
      console.log(`Extracted: ${fileInfo.name}`);
    }

    console.log(`\nExtracted ${allFiles.length} file(s) from "${name}" to ${dir}`);
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

function findScenarioByName(scenarios, name) {
  for (const scenario of scenarios) {
    if (scenario.title === name) {
      return scenario;
    }
    // Recursively search in children
    const found = findScenarioByName(scenario.children, name);
    if (found) {
      return found;
    }
  }
  return null;
}

function collectFilesFromScenario(scenario, allFiles) {
  // Add files from this scenario
  if (scenario.files) {
    for (const file of scenario.files) {
      allFiles.push(file);
    }
  }

  // Recursively collect files from children
  if (scenario.children) {
    for (const child of scenario.children) {
      collectFilesFromScenario(child, allFiles);
    }
  }
}

function collectFilesFromScenarioAndParents(scenarios, targetScenario, allFiles) {
  // Find the path to the target scenario
  const path = [];
  if (findScenarioPath(scenarios, targetScenario, path)) {
    // Collect files from all scenarios in the path (from root to target)
    for (const scenario of path) {
      if (scenario.files) {
        for (const file of scenario.files) {
          // Check if file is already added (avoid duplicates)
          if (!allFiles.some(existingFile => existingFile.name === file.name)) {
            allFiles.push(file);
          }
        }
      }
    }

    // Also collect files from children of the target scenario (but not the target itself since it's already in the path)
    if (targetScenario.children) {
      for (const child of targetScenario.children) {
        collectFilesFromScenarioRecursive(child, allFiles);
      }
    }
  }
}

function collectFilesFromScenarioRecursive(scenario, allFiles) {
  // Add files from this scenario
  if (scenario.files) {
    for (const file of scenario.files) {
      // Check if file is already added (avoid duplicates)
      if (!allFiles.some(existingFile => existingFile.name === file.name)) {
        allFiles.push(file);
      }
    }
  }

  // Recursively collect files from children
  if (scenario.children) {
    for (const child of scenario.children) {
      collectFilesFromScenarioRecursive(child, allFiles);
    }
  }
}

function findScenarioPath(scenarios, targetScenario, path) {
  for (const scenario of scenarios) {
    path.push(scenario);

    if (scenario === targetScenario) {
      return true;
    }

    // Search in children
    if (scenario.children && findScenarioPath(scenario.children, targetScenario, path)) {
      return true;
    }

    path.pop();
  }
  return false;
}

module.exports = TestEditor;
