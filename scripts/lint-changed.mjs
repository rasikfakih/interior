#!/usr/bin/env node
/**
 * lint-changed.mjs - eslint gate for the current diff.
 *
 * The repo carries a large legacy lint debt (mostly no-explicit-any),
 * so the CI bar is "no NEW lint errors", not "zero errors repo-wide".
 * Two scopes make that precise:
 *   1. Only files changed vs the base are linted.
 *   2. Only errors on lines the diff ADDED are reported. Untracked
 *      (new) files count every line as added, so new files must be
 *      clean.
 * The legacy debt is tracked for a hygiene release; this gate keeps it
 * from growing on every push.
 *
 * Usage:
 *   node scripts/lint-changed.mjs [base-sha]
 *
 * Base resolution:
 *   - explicit arg, or
 *   - BASE_SHA env (set by the CI workflow from the PR base or the
 *     previous push SHA), or
 *   - origin/main if it resolves, else HEAD~1.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

function resolveBase() {
  const arg = process.argv[2];
  if (arg) return arg;
  if (process.env.BASE_SHA) return process.env.BASE_SHA;
  try {
    execSync("git rev-parse --verify origin/main", { stdio: "ignore" });
    return "origin/main";
  } catch {
    return "HEAD~1";
  }
}

function changedFiles(base) {
  // `git diff --name-only ${base}` includes committed, staged, and
  // unstaged changes vs the base; untracked files need a separate call.
  const tracked = execSync(`git diff --name-only ${base}`, {
    encoding: "utf8",
  });
  const untracked = execSync(`git ls-files --others --exclude-standard`, {
    encoding: "utf8",
  });
  return [...new Set([...tracked.split("\n"), ...untracked.split("\n")])]
    .map((s) => s.trim())
    .filter(Boolean)
    // Deleted files appear in `git diff --name-only` but have nothing
    // to lint; eslint.lintFiles throws NoFilesFoundError on them.
    .filter((f) => fs.existsSync(f));
}

function isUntracked(file) {
  try {
    const out = execSync(`git status --porcelain -- "${file}"`, {
      encoding: "utf8",
    });
    return out.startsWith("??");
  } catch {
    return false;
  }
}

/**
 * Parse `git diff -U0` hunk headers and return the set of line numbers
 * the diff ADDS in the new file. Removed lines do not advance the
 * counter; context and added lines do.
 */
function addedLines(file, base) {
  const out = execSync(`git diff -U0 ${base} -- "${file}"`, {
    encoding: "utf8",
  });
  const added = new Set();
  let current = null;
  for (const line of out.split("\n")) {
    const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (m) {
      current = Number(m[1]);
      continue;
    }
    if (current === null) continue;
    if (line.startsWith("-")) continue; // removed line: no shift
    if (line.startsWith("+")) added.add(current);
    current++;
  }
  return added;
}

const base = resolveBase();
const files = changedFiles(base);
if (files.length === 0) {
  console.log("No changed files to lint.");
  process.exit(0);
}
console.log(`Linting ${files.length} changed file(s) vs ${base}...`);

const eslint = new ESLint();
const results = await eslint.lintFiles(files);

const newErrors = [];
for (const r of results) {
  if (r.errorCount === 0) continue;
  const rel = path.relative(process.cwd(), r.filePath).split(path.sep).join("/");
  const untracked = isUntracked(rel);
  const added = untracked ? null : addedLines(rel, base);
  const msgs = r.messages.filter(
    (m) =>
      m.severity === 2 &&
      (added === null || (typeof m.line === "number" && added.has(m.line)))
  );
  if (msgs.length > 0) newErrors.push({ ...r, messages: msgs });
}

if (newErrors.length > 0) {
  const formatter = await eslint.loadFormatter("stylish");
  console.log(formatter.format(newErrors));
  console.log(
    `\n${newErrors.length} file(s) with NEW lint errors on changed lines. Fix before pushing.`
  );
  process.exit(1);
}
console.log("No new lint errors on changed lines.");
