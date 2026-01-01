# mermaid-to-excalidraw-cli

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/ayurkin/mermaid-to-excalidraw-cli)](https://github.com/ayurkin/mermaid-to-excalidraw-cli/issues)

Convert Mermaid (`.mmd`) diagrams into Excalidraw (`.excalidraw`) using a headless Chromium runtime for accurate layout and text metrics.

## Why

- Mermaid is easy to edit as text.
- Excalidraw is great for visual docs and hand edits.
- This tool keeps Mermaid as the source of truth while generating readable Excalidraw output.

## Features

- High-fidelity conversion using real browser rendering (Playwright + Chromium)
- Converts single files or entire folders (recursive)
- Deterministic output suitable for version control

## Install

```bash
npm install
npx playwright install chromium
```

For global usage:

```bash
npm link
```

After publishing to npm:

```bash
npm install -g mermaid-to-excalidraw-cli
```

## Usage

```bash
mmd2excalidraw <input> [output]
```

### Examples

```bash
# Convert a single file
mmd2excalidraw docs/architecture/service-overview.mmd

# Convert all .mmd files in a directory (recursive)
mmd2excalidraw docs/architecture

# Convert directory and write outputs to a separate folder
mmd2excalidraw docs/architecture -o docs/architecture
```

## Options

- `--font-size <number>`: Mermaid font size (default: 16)
- `--curve <linear|basis>`: Flowchart curve style (default: linear)
- `--max-edges <number>`: Max edges (default: 500)
- `--max-text-size <number>`: Max text size (default: 50000)
- `-o, --output <path>`: Output file or directory
- `-h, --help`: Show help

## Output

The CLI writes Excalidraw scene JSON with both shapes and text elements, ready to open in Excalidraw or the VS Code extension.

## Troubleshooting

- **Playwright error / Chromium missing**
  Run `npx playwright install chromium`.

- **Conversion hangs**
  Ensure no firewall blocks local loopback access.

## Development

```bash
node bin/mmd2excalidraw.mjs --help
```

## Publish

1. Update `version` in `package.json`
2. `npm publish`

## License

MIT

## Credits

This CLI is built on top of the official Excalidraw Mermaid converter:
https://github.com/excalidraw/mermaid-to-excalidraw
