#!/usr/bin/env node
//
// Fixes the node-ignore path.relative() bug in Claude Code CLI
//
// Bug: node-ignore crashes with "path should be a path.relative()d string"
// when a file path resolves to ../ relative to the base directory.
//
// Fix: Changes node-ignore's allowRelativePaths default from false to true,
// making it silently skip ../paths instead of throwing.
//
// Works on both plain JS files and compiled Bun executables.
//
// Usage: node fix-claude-path-bug.js <path-to-cli>

const fs = require('fs');
const path = require('path');

const PATTERN = /allowRelativePaths:([a-zA-Z])=!1/g;
const PATCHED = /allowRelativePaths:[a-zA-Z]=!0/;

function fix(filePath) {
  filePath = path.resolve(filePath);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const buf = fs.readFileSync(filePath);
  const content = buf.toString('binary');

  if (PATCHED.test(content)) {
    console.log(`Already patched: ${filePath}`);
    return;
  }

  const matches = content.match(PATTERN);
  if (!matches) {
    console.error(`Pattern not found: "allowRelativePaths:<var>=!1" not in ${filePath}`);
    console.error('The file may use a different format or the bug may not be present.');
    process.exit(1);
  }

  const patched = content.replace(PATTERN, 'allowRelativePaths:$1=!0');

  // Verify the replacement didn't change the file length (important for binaries)
  if (Buffer.byteLength(patched, 'binary') !== buf.length) {
    console.error('Patch changed file size — aborting to avoid corrupting binary.');
    process.exit(1);
  }

  fs.writeFileSync(filePath, Buffer.from(patched, 'binary'));
  console.log(`Patched ${matches.length} occurrence(s) in: ${filePath}`);
}

const target = process.argv[2];
if (!target) {
  console.error('Usage: node fix-claude-path-bug.js <path-to-cli>');
  process.exit(1);
}

fix(target);
