const fs = require("fs");
const path = require("path");

class CoverageReport {
  static generate(coverageFile, aux4Dir) {
    if (!fs.existsSync(coverageFile)) {
      console.error("No coverage data found.");
      return;
    }

    const coverageData = JSON.parse(fs.readFileSync(coverageFile, "utf-8"));
    const universe = CoverageReport.buildUniverse(aux4Dir);
    const hitMap = CoverageReport.buildHitMap(coverageData.steps);

    CoverageReport.printReport(universe, hitMap, coverageData);
  }

  static buildUniverse(dir) {
    const universe = [];
    CoverageReport.findAux4Files(dir, universe);
    return universe;
  }

  static findAux4Files(dir, universe) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        CoverageReport.findAux4Files(fullPath, universe);
      } else if (entry.name === ".aux4") {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          if (data.profiles) {
            const pkgName = CoverageReport.packageName(data);
            for (const profile of data.profiles) {
              for (const command of profile.commands || []) {
                if (command.execute) {
                  command.execute.forEach((step, index) => {
                    universe.push({
                      package: pkgName,
                      profile: profile.name,
                      command: command.name,
                      index,
                      step
                    });
                  });
                }
              }
            }
          }
        } catch {
          // Skip invalid .aux4 files
        }
      }
    }
  }

  static packageName(data) {
    if (data.scope && data.name) {
      const version = data.version ? `@${data.version}` : "";
      return `${data.scope}/${data.name}${version}`;
    }
    return ".aux4";
  }

  static buildHitMap(steps) {
    const map = {};
    for (const step of steps || []) {
      const key = `${step.profile}|${step.command}|${step.index}`;
      map[key] = step;
    }
    return map;
  }

  static printReport(universe, hitMap, coverageData) {
    // Group by package, then profile/command
    const groups = {};
    for (const entry of universe) {
      const cmdKey = `${entry.profile}/${entry.command}`;
      const groupKey = `${entry.package}||${cmdKey}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          package: entry.package,
          profile: entry.profile,
          command: entry.command,
          steps: []
        };
      }
      groups[groupKey].steps.push(entry);
    }

    // Also include steps from coverage that aren't in the local universe
    // (from installed packages)
    for (const step of coverageData.steps || []) {
      const cmdKey = `${step.profile}/${step.command}`;
      const groupKey = `${step.package}||${cmdKey}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          package: step.package,
          profile: step.profile,
          command: step.command,
          steps: []
        };
      }
      const existingStep = groups[groupKey].steps.find(s => s.index === step.index);
      if (!existingStep) {
        groups[groupKey].steps.push({
          package: step.package,
          profile: step.profile,
          command: step.command,
          index: step.index,
          step: step.step
        });
      }
    }

    // Sort steps within each group by index
    for (const group of Object.values(groups)) {
      group.steps.sort((a, b) => a.index - b.index);
    }

    let totalSteps = 0;
    let coveredSteps = 0;
    let totalCommands = 0;
    let coveredCommands = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    const slowCommands = [];

    // Group by package for display
    const byPackage = {};
    for (const group of Object.values(groups)) {
      if (!byPackage[group.package]) byPackage[group.package] = [];
      byPackage[group.package].push(group);
    }

    console.log("");
    console.log("Coverage Report");
    console.log("=".repeat(70));

    for (const [pkgName, commands] of Object.entries(byPackage)) {
      console.log("");
      console.log(`  Package: ${pkgName}`);
      console.log("");

      for (const cmd of commands) {
        totalCommands++;
        const stepCount = cmd.steps.length;
        let hitCount = 0;
        let cmdDuration = 0;
        let cmdHit = false;

        for (const step of cmd.steps) {
          totalSteps++;
          const hitKey = `${step.profile}|${step.command}|${step.index}`;
          const hit = hitMap[hitKey];
          if (hit && hit.hits > 0) {
            coveredSteps++;
            hitCount++;
            cmdHit = true;
            const avgDur = hit.durations.reduce((a, b) => a + b, 0) / hit.durations.length;
            cmdDuration += avgDur;
          }

          // Count branches
          if (step.step.startsWith("when:")) {
            totalBranches += 2;
            if (hit && hit.branches) {
              if (hit.branches["true"]) coveredBranches++;
              if (hit.branches["false"]) coveredBranches++;
            }
          }
        }

        if (cmdHit) coveredCommands++;

        const pct = stepCount > 0 ? Math.round((hitCount / stepCount) * 100) : 0;
        const bar = CoverageReport.progressBar(pct, 12);
        const durationStr = cmdHit ? `  ${CoverageReport.formatDuration(cmdDuration)}` : "";
        const label = `${cmd.profile}/${cmd.command}`;

        console.log(`    ${label.padEnd(30)} ${hitCount}/${stepCount} steps  ${bar} ${String(pct).padStart(3)}%${durationStr}`);

        // Show uncovered or notable steps
        for (const step of cmd.steps) {
          const hitKey = `${step.profile}|${step.command}|${step.index}`;
          const hit = hitMap[hitKey];

          if (!hit || hit.hits === 0) {
            console.log(`      \u2717 [${step.index}] ${CoverageReport.truncate(step.step, 55)}`);
          } else if (hit.branches) {
            const trueCount = hit.branches["true"] || 0;
            const falseCount = hit.branches["false"] || 0;
            const missing = [];
            if (!trueCount) missing.push("true");
            if (!falseCount) missing.push("false");
            if (missing.length > 0) {
              console.log(`      ~ [${step.index}] ${CoverageReport.truncate(step.step, 45)}  (missing: ${missing.join(", ")})`);
            }
          } else if (hit.iterations && hit.iterations.length > 0) {
            const totalIter = hit.iterations.reduce((sum, r) => sum + r.count, 0);
            const allIterDurs = hit.iterations.flatMap(r => r.durations);
            const avgIter = allIterDurs.length > 0
              ? allIterDurs.reduce((a, b) => a + b, 0) / allIterDurs.length
              : 0;
            const avgDur = hit.durations.reduce((a, b) => a + b, 0) / hit.durations.length;
            console.log(`      \u2713 [${step.index}] ${CoverageReport.truncate(step.step, 35)}  ${CoverageReport.formatDuration(avgDur)} (${totalIter} iterations, avg ${CoverageReport.formatDuration(avgIter)})`);
          }
        }

        if (cmdHit) {
          slowCommands.push({ label, duration: cmdDuration, hits: hitCount > 0 ? hitCount : 1 });
        }
      }
    }

    console.log("");
    console.log("-".repeat(70));
    console.log("");
    console.log("  Summary:");
    console.log(`    Commands:   ${coveredCommands}/${totalCommands} (${totalCommands > 0 ? Math.round((coveredCommands / totalCommands) * 100) : 0}%)`);
    console.log(`    Steps:      ${coveredSteps}/${totalSteps} (${totalSteps > 0 ? Math.round((coveredSteps / totalSteps) * 100) : 0}%)`);
    if (totalBranches > 0) {
      console.log(`    Branches:   ${coveredBranches}/${totalBranches} (${Math.round((coveredBranches / totalBranches) * 100)}%)`);
    }

    if (slowCommands.length > 0) {
      console.log("");
      console.log("  Slowest commands:");
      slowCommands
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .forEach(cmd => {
          console.log(`    ${cmd.label.padEnd(30)} ${CoverageReport.formatDuration(cmd.duration)}`);
        });
    }

    console.log("");
    console.log("=".repeat(70));
    console.log("");
  }

  static progressBar(pct, width) {
    const filled = Math.round((pct / 100) * width);
    const empty = width - filled;
    return "\u2588".repeat(filled) + "\u2591".repeat(empty);
  }

  static formatDuration(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  static truncate(str, maxLen) {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + "...";
  }
}

module.exports = CoverageReport;
