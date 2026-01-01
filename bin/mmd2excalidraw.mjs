#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const DEFAULTS = {
  fontSize: 16,
  curve: "linear",
  maxEdges: 500,
  maxTextSize: 50000,
};

function printHelp() {
  const helpText = `Usage:
  mmd2excalidraw <input> [output]

Options:
  -o, --output <path>       Output file or directory
  --font-size <number>      Mermaid font size (default: ${DEFAULTS.fontSize})
  --curve <linear|basis>    Mermaid flowchart curve (default: ${DEFAULTS.curve})
  --max-edges <number>      Max edges (default: ${DEFAULTS.maxEdges})
  --max-text-size <number>  Max text size (default: ${DEFAULTS.maxTextSize})
  -h, --help                Show this help

Notes:
  Requires Playwright with Chromium installed:
  npx playwright install chromium

Examples:
  mmd2excalidraw docs/architecture/service-overview.mmd
  mmd2excalidraw docs/architecture -o docs/architecture
`;
  console.log(helpText);
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  let output = null;
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }

    if (arg === "-o" || arg === "--output") {
      output = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--font-size") {
      options.fontSize = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }

    if (arg === "--curve") {
      options.curve = argv[i + 1] || DEFAULTS.curve;
      i += 1;
      continue;
    }

    if (arg === "--max-edges") {
      options.maxEdges = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }

    if (arg === "--max-text-size") {
      options.maxTextSize = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    positionals.push(arg);
  }

  if (positionals.length === 0) {
    printHelp();
    throw new Error("Missing input path.");
  }

  return {
    input: positionals[0],
    output: output ?? positionals[1] ?? null,
    options,
  };
}

function getPackageRoot() {
  const scriptPath = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(scriptPath), "..");
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".js":
    case ".mjs":
      return "text/javascript";
    case ".css":
      return "text/css";
    case ".json":
      return "application/json";
    case ".svg":
      return "image/svg+xml";
    case ".map":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

function createServer() {
  const packageRoot = getPackageRoot();
  const moduleRoots = new Map([
    [
      "/modules/mermaid-to-excalidraw/",
      path.join(
        packageRoot,
        "node_modules",
        "@excalidraw",
        "mermaid-to-excalidraw",
        "dist"
      ),
    ],
    [
      "/modules/mermaid/",
      path.join(packageRoot, "node_modules", "mermaid", "dist"),
    ],
    [
      "/modules/nanoid/",
      path.join(packageRoot, "node_modules", "nanoid"),
    ],
    [
      "/modules/markdown-to-text/",
      path.join(packageRoot, "vendor", "markdown-to-text"),
    ],
    [
      "/excalidraw/",
      path.join(
        packageRoot,
        "node_modules",
        "@excalidraw",
        "excalidraw",
        "dist"
      ),
    ],
    [
      "/react/",
      path.join(packageRoot, "node_modules", "react", "umd"),
    ],
    [
      "/react-dom/",
      path.join(packageRoot, "node_modules", "react-dom", "umd"),
    ],
  ]);

  const importMap = {
    imports: {
      mermaid: "/modules/mermaid/mermaid.esm.mjs",
      nanoid: "/modules/nanoid/index.browser.js",
      "@excalidraw/markdown-to-text":
        "/modules/markdown-to-text/index.mjs",
      "@excalidraw/mermaid-to-excalidraw":
        "/modules/mermaid-to-excalidraw/index.js",
    },
  };

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <script type="importmap">${JSON.stringify(importMap)}</script>
  <script src="/react/react.production.min.js"></script>
  <script src="/react-dom/react-dom.production.min.js"></script>
  <script src="/excalidraw/excalidraw.production.min.js"></script>
  <script type="module">
    import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
    window.parseMermaidToExcalidraw = parseMermaidToExcalidraw;
  </script>
</head>
<body></body>
</html>`;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      const pathname = url.pathname;

      if (pathname === "/" || pathname === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
        return;
      }

      for (const [prefix, root] of moduleRoots.entries()) {
        if (!pathname.startsWith(prefix)) {
          continue;
        }

        const relativePath = pathname.slice(prefix.length);
        const safePath = path
          .normalize(relativePath)
          .replace(/^([/\\]*\.\.)+/, "");
        const filePath = path.join(root, safePath);
        const stat = await fs.stat(filePath).catch(() => null);
        if (!stat || !stat.isFile()) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const fileBuffer = await fs.readFile(filePath);
        res.writeHead(200, { "Content-Type": getContentType(filePath) });
        res.end(fileBuffer);
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    } catch (error) {
      res.writeHead(500);
      res.end("Server error");
      console.error(error);
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to start server."));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function listMermaidFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMermaidFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".mmd")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function resolveOutputPath(inputPath, outputPath) {
  if (!outputPath) {
    return inputPath.replace(/\.mmd$/, ".excalidraw");
  }

  try {
    const stat = await fs.stat(outputPath);
    if (stat.isDirectory()) {
      return path.join(
        outputPath,
        path.basename(inputPath).replace(/\.mmd$/, ".excalidraw")
      );
    }
  } catch {
    // Output does not exist yet; treat as file path.
  }

  return outputPath;
}

async function convertMermaidFile(page, inputPath, outputPath, options) {
  const mermaid = await fs.readFile(inputPath, "utf8");

  const { elements, files } = await page.evaluate(
    async ({ mermaidText, opts }) => {
      const config = {
        flowchart: { curve: opts.curve },
        themeVariables: { fontSize: `${opts.fontSize}px` },
        maxEdges: opts.maxEdges,
        maxTextSize: opts.maxTextSize,
      };

      const { elements, files } = await window.parseMermaidToExcalidraw(
        mermaidText,
        config
      );
      const convertedElements = window.ExcalidrawLib.convertToExcalidrawElements(
        elements,
        { regenerateIds: false }
      );
      return { elements: convertedElements, files: files ?? {} };
    },
    { mermaidText: mermaid, opts: options }
  );

  const scene = {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements,
    appState: { viewBackgroundColor: "#ffffff" },
    files: files ?? {},
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(scene, null, 2), "utf8");
}

async function run() {
  const { input, output, options } = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), input);
  const outputPath = output ? path.resolve(process.cwd(), output) : null;

  const stats = await fs.stat(inputPath);
  const { server, url } = await createServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (msg) => {
    console.log(`[browser:${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (error) => {
    console.error(`[browser:error] ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    console.error(`[browser:requestfailed] ${request.url()} ${request.failure()?.errorText}`);
  });

  try {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(
      () =>
        window.parseMermaidToExcalidraw &&
        window.ExcalidrawLib?.convertToExcalidrawElements,
      { timeout: 60000 }
    );

    if (stats.isDirectory()) {
      const mermaidFiles = await listMermaidFiles(inputPath);
      if (mermaidFiles.length === 0) {
        console.log(`No .mmd files found under ${inputPath}`);
        return;
      }

      for (const filePath of mermaidFiles) {
        const relative = path.relative(inputPath, filePath);
        const targetBase = outputPath ?? inputPath;
        const targetPath = path
          .join(targetBase, relative)
          .replace(/\.mmd$/, ".excalidraw");
        console.log(`Converting ${relative}`);
        await convertMermaidFile(page, filePath, targetPath, options);
      }
      return;
    }

    if (!inputPath.endsWith(".mmd")) {
      throw new Error("Input file must have .mmd extension.");
    }

    const finalOutput = await resolveOutputPath(inputPath, outputPath);
    console.log(`Converting ${path.basename(inputPath)}`);
    await convertMermaidFile(page, inputPath, finalOutput, options);
  } finally {
    await page.close();
    await browser.close();
    server.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
