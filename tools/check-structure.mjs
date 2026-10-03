/**
 * @file check-structure.mjs
 * @description Enforces workspace rules: 200-line files, metadata headers, package import
 *   boundaries (declared dependencies and exports only) and an acyclic package graph.
 * @scope cinelab-studio
 * @depends node:fs, node:path, node:url, package.json files of every workspace package
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_LINES = 200;
const CODE = /\.(ts|tsx|mjs|js|css|html)$/;
const NO_HEADER = [/\.config\.(ts|mjs)$/, /next-env\.d\.ts$/];
const SKIP_DIRS = new Set(["node_modules", ".next", "coverage", "screenshots", "public", ".git"]);
const SCAN_ROOTS = ["apps", "packages", "test", "tools", "vitest.shared.ts", "vitest.config.ts", "eslint.config.mjs"];

const problems = [];
const report = (file, message) => problems.push(`${relative(ROOT, file)}: ${message}`);

function walk(path, out = []) {
  if (!existsSync(path)) return out;
  if (statSync(path).isFile()) {
    if (CODE.test(path)) out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) {
    if (!SKIP_DIRS.has(entry)) walk(join(path, entry), out);
  }
  return out;
}

/** Workspace packages keyed by name, with their directory, dependencies and export map. */
function loadPackages() {
  const packages = new Map();
  for (const group of ["apps", "packages"]) {
    for (const entry of readdirSync(join(ROOT, group))) {
      const file = join(ROOT, group, entry, "package.json");
      if (!existsSync(file)) continue;
      const pkg = JSON.parse(readFileSync(file, "utf8"));
      packages.set(pkg.name, {
        name: pkg.name,
        dir: join(ROOT, group, entry),
        deps: new Set(Object.keys(pkg.dependencies ?? {}).filter((dep) => dep.startsWith("@cinelab/"))),
        exports: pkg.exports ?? {},
      });
    }
  }
  return packages;
}

function owningPackage(file, packages) {
  for (const pkg of packages.values()) {
    if (file.startsWith(pkg.dir + sep)) return pkg;
  }
  return null;
}

function checkFile(file, packages) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  if (lines > MAX_LINES) report(file, `${lines} lines (max ${MAX_LINES})`);

  if (!NO_HEADER.some((pattern) => pattern.test(file))) {
    const head = text.split("\n").slice(0, 14).join("\n");
    for (const tag of ["@file", "@description", "@depends"]) {
      if (!head.includes(tag)) report(file, `metadata header is missing ${tag}`);
    }
  }

  // Import boundaries apply to package source and scripts; tool config may reach the root.
  if (!/\.(ts|tsx|mjs|js|html)$/.test(file) || NO_HEADER.some((pattern) => pattern.test(file))) return;
  const owner = owningPackage(file, packages);
  const specifiers = [...text.matchAll(/(?:from|import|mock)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]);
  for (const spec of specifiers) {
    if (spec.startsWith("@/")) report(file, `path alias "${spec}" is not allowed; import a package or a relative path`);
    if (spec.startsWith(".") && owner) {
      const target = resolve(dirname(file), spec);
      if (!target.startsWith(owner.dir + sep)) report(file, `relative import "${spec}" leaves ${owner.name}`);
    }
    const match = spec.match(/^(@cinelab\/[a-z-]+)(?:\/(.+))?$/);
    if (!match || !owner) continue;
    const [, name, sub] = match;
    const target = packages.get(name);
    if (!target) report(file, `unknown package ${name}`);
    else if (name !== owner.name && !owner.deps.has(name)) report(file, `${owner.name} imports ${name} without declaring it in package.json`);
    else if (!sub || !target.exports[`./${sub}`]) report(file, `"${spec}" is not in ${name}'s exports`);
  }
}

function checkExports(packages) {
  for (const pkg of packages.values()) {
    for (const [key, target] of Object.entries(pkg.exports)) {
      if (!existsSync(join(pkg.dir, target))) report(join(pkg.dir, "package.json"), `export "${key}" points to missing ${target}`);
    }
  }
}

function checkCycles(packages) {
  const state = new Map();
  const visit = (name, trail) => {
    if (state.get(name) === "done") return;
    if (state.get(name) === "active") {
      problems.push(`package cycle: ${[...trail, name].join(" -> ")}`);
      return;
    }
    state.set(name, "active");
    for (const dep of packages.get(name)?.deps ?? []) visit(dep, [...trail, name]);
    state.set(name, "done");
  };
  for (const name of packages.keys()) visit(name, []);
}

const packages = loadPackages();
const files = SCAN_ROOTS.flatMap((entry) => walk(join(ROOT, entry)));
files.forEach((file) => checkFile(file, packages));
checkExports(packages);
checkCycles(packages);

if (problems.length > 0) {
  console.error(`Structure check failed (${problems.length}):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`Structure check passed: ${files.length} files, ${packages.size} packages.`);
