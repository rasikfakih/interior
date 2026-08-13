#!/usr/bin/env node
/**
 * scripts/check-boolean-sql.mjs
 *
 * Postgres boolean-column guard (CI gate).
 *
 * Postgres has no implicit boolean-to-integer comparison, so a query
 * that compares or assigns a boolean column to the literal 1 or 0
 * (e.g. `active` compared to `1`) fails at runtime with
 * "operator does not exist: boolean = integer". SQLite is loosely
 * typed and silently accepts the same query, which is how these bugs
 * survive local dev and only explode on the Postgres deploy.
 *
 * This guard statically scans every SQL string literal in the app for
 * comparisons/assignments of a KNOWN boolean column against the integer
 * literals 0/1, using the boolean column set parsed from
 * supabase-bootstrap.sql (the canonical Postgres schema) plus a
 * defensive fallback list. Ports must use TRUE/FALSE literals instead
 * (e.g. `WHERE active = TRUE`), because Postgres rejects a boolean
 * compared to an integer at runtime.
 *
 * Pure Node, no deps. Exit 0 = clean. Note: because the scan reads
 * every backtick/double/single-quoted literal (including doc examples),
 * keep illustrative SQL out of backticks in comments.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// fileURLToPath handles Windows drive letters AND percent-encoding
// (spaces in the checkout path), which .pathname alone would mangle.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Boolean columns parsed from the Postgres schema (single source of
// truth) + a defensive fallback in case the parse ever misses one.
const FALLBACK_BOOLEANS = [
  "active",
  "is_published",
  "is_active",
  "is_front",
  "is_button",
  "is_pinned",
];

function parseBooleanColumns() {
  const sqlPath = path.join(repoRoot, "supabase-bootstrap.sql");
  const cols = new Set(FALLBACK_BOOLEANS);
  try {
    const text = fs.readFileSync(sqlPath, "utf8");
    // Matches inline `col BOOLEAN ...` column defs AND
    // `ALTER TABLE x ADD COLUMN IF NOT EXISTS col BOOLEAN ...`
    // (the latter breaks a ^ anchor, so the prefix is unanchored).
    const re = /(?:ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+)?([a-z_]+)\s+BOOLEAN\b/gim;
    let m;
    while ((m = re.exec(text)) !== null) cols.add(m[1].toLowerCase());
  } catch {
    // Fall back to the static list; the schema file is tracked, so a
    // missing read should be loud.
    console.error("warn - could not read supabase-bootstrap.sql; using fallback list");
  }
  return [...cols].sort((a, b) => b.length - a.length); // longest first
}

const BOOLEANS = parseBooleanColumns();

// Comparison/assignment against an integer literal, right after a
// known boolean column name. Word boundaries keep `id = 1`,
// `order_index = 1`, `LIMIT 1` etc. out of scope.
const INT_LITERAL = "[01]\\b";
const OPS = "(?:=|<>|!=|>=|<=|>|<)";
const BOOL_PATTERN = new RegExp(
  `\\b(?:${BOOLEANS.map((c) => escapeRe(c)).join("|")})\\s*${OPS}\\s*${INT_LITERAL}`,
  "gi"
);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SQL_HINT = /\b(SELECT|UPDATE|INSERT\s+INTO|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|WHERE|VALUES)\b/i;

// Extract string literals (backtick, double-quoted, single-quoted) and
// keep only the ones that look like SQL statements.
function sqlLiterals(text) {
  const out = [];
  const lit =
    /`([^`\\]|\\.)*`|"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g;
  let m;
  while ((m = lit.exec(text)) !== null) {
    const body = m[0];
    if (SQL_HINT.test(body)) out.push({ body, index: m.index });
  }
  return out;
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

/** Scan one file's source; push {file, line, match, literal} to issues. */
export function scanSource(source, filePath, issues) {
  for (const lit of sqlLiterals(source)) {
    BOOL_PATTERN.lastIndex = 0;
    let m;
    while ((m = BOOL_PATTERN.exec(lit.body)) !== null) {
      const col = m[0].trim().split(/\s*[=<>]+\s*/)[0];
      issues.push({
        file: filePath,
        line: lineAt(source, lit.index + m.index),
        match: m[0].trim(),
        column: col,
        hint: `'${col}' is BOOLEAN in Postgres; use TRUE/FALSE literals, not ${m[0].trim().split(/\s+/).pop()}`,
      });
      // Advance past this match so one column isn't reported twice in
      // the same literal (the /g flag alone would re-match `a = 1` inside
      // `a = 10`-style text and the same column across a multi-line stmt).
      BOOL_PATTERN.lastIndex = m.index + m[0].length;
    }
  }
}

function walk(dir, exts, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".next" || e.name === ".git") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

function main() {
  const files = [
    ...walk(path.join(repoRoot, "src"), [".ts", ".tsx"], []),
    ...walk(path.join(repoRoot, "scripts"), [".mjs"], []),
  ];
  const issues = [];
  for (const f of files) {
    let source;
    try {
      source = fs.readFileSync(f, "utf8");
    } catch {
      continue;
    }
    scanSource(source, path.relative(repoRoot, f), issues);
  }

  if (issues.length > 0) {
    console.error(`check-boolean-sql: ${issues.length} boolean-vs-integer comparison(s) found:`);
    for (const i of issues) {
      console.error(`  ${i.file}:${i.line}  ${i.match}   (${i.hint})`);
    }
    console.error("Use TRUE/FALSE literals - Postgres rejects `boolean = 0/1` at runtime.");
    process.exit(1);
  }
  console.log(
    `ok boolean-sql: ${files.length} file(s), ${BOOLEANS.length} boolean column(s) tracked, 0 violations`
  );
  process.exit(0);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("check-boolean-sql.mjs")) {
  main();
}
