function parseSuiteFile(filePath) {
  const fs = require("fs");
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const groups = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      const header = trimmed.slice(3).trim();
      const optionalMatch = header.match(/^(.+?)\s*\(optional\)\s*$/);
      current = {
        title: optionalMatch ? optionalMatch[1].trim() : header,
        optional: !!optionalMatch,
        files: []
      };
      groups.push(current);
    } else if (trimmed.startsWith("- ") && current) {
      const file = trimmed.slice(2).trim();
      if (file) {
        current.files.push(file);
      }
    }
  }

  return groups;
}

module.exports = { parseSuiteFile };
