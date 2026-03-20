# Claude Code Relative Path Bug Fix

Patches the [Claude Code CLI](https://github.com/anthropics/claude-code) to fix the `path should be a path.relative()d string` error ([#35298](https://github.com/anthropics/claude-code/issues/35298)).

## The Bug

When Claude Code has custom skills or rules with a `paths` field, file operations can fail with:

```
Error: path should be a `path.relative()`d string, but got "../README.md"
```

This is triggered in two scenarios:

1. **Editing plans** -- Plan files stored in `~/.claude/plans/` resolve to `../../` relative paths when skills or rules with `paths` patterns are present, causing plan creation and updates to fail.
2. **After changing directories** -- When a bash command changes the working directory (e.g. `cd subdir && npm run ...`), files in the project root resolve to `../` paths relative to the new CWD, causing edits to fail.

The root cause is the `node-ignore` library rejecting any relative path that starts with `../` but only when there are skills / rules that define a `paths:` pattern and when those skills and rules didn't get the chances to be activated depending on the files that got read/updated.

See [maleus-ai/claude-code-relative-path-bug](https://github.com/maleus-ai/claude-code-relative-path-bug) for a full reproduction.

## How It Works

The script changes `node-ignore`'s `allowRelativePaths` default from `false` to `true` inside the CLI bundle, making it silently skip `../` paths instead of throwing. The patch is byte-safe and preserves file size, so it works on both plain JS files and compiled Bun binaries.

## Usage

### Binary install (standalone binary)

```bash
node fix-claude-path-bug.js $(which claude)
```

### npm install

If you installed Claude Code via npm (`npm install -g @anthropic-ai/claude-code`), you need to patch the `cli.js` file where the package is installed.

Find the install location:

```bash
npm list -g @anthropic-ai/claude-code
```

Then patch the `cli.js` file:

```bash
node fix-claude-path-bug.js $(npm prefix -g)/lib/node_modules/@anthropic-ai/claude-code/cli.js
```

### Disabling auto-updates

Claude Code auto-updates will overwrite the patch. To prevent this, disable the auto-updater:

```bash
export DISABLE_AUTOUPDATER='1'
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) to make it persistent.

## Notes

- If you allow auto-updates, the patch needs to be re-applied after each update.
- This is a workaround until the bug is fixed upstream.
