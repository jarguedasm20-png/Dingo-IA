import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const exportRoot = path.join(projectRoot, "base44-export");
const widgetExportDir = path.join(exportRoot, "dingo");
const distWidgetFile = path.join(distDir, "dingo-widget.js");
const distAssetsDir = path.join(distDir, "assets");
const exportWidgetFile = path.join(widgetExportDir, "dingo-widget.js");
const exportAssetsDir = path.join(widgetExportDir, "assets");
const testHtmlFile = path.join(exportRoot, "test.html");

function fail(message) {
  console.error(`\n[Dingo Base44 Export] Error: ${message}`);
  process.exit(1);
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    fail(`Required folder was not found: ${path.relative(projectRoot, source)}`);
  }

  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function verifyFile(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(`Missing expected file: ${path.relative(projectRoot, filePath)}`);
  }
}

function verifyDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    fail(`Missing expected folder: ${path.relative(projectRoot, directoryPath)}`);
  }

  const files = fs.readdirSync(directoryPath);
  if (!files.length) {
    fail(`Expected folder is empty: ${path.relative(projectRoot, directoryPath)}`);
  }
}

function writeTestHtml() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dingo Base44 Widget Test</title>
    <style>
      body {
        min-height: 140vh;
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: #1e1b17;
        background: linear-gradient(180deg, #f7f0e7 0%, #e7ded0 100%);
      }

      main {
        width: min(920px, calc(100% - 40px));
        margin: 0 auto;
        padding: 72px 0;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Monark Page Test</h1>
      <p>
        This page simulates a Base44 or Monark website page. Dingo should appear
        automatically as a floating assistant in the bottom-right corner.
      </p>
    </main>

    <script type="module" src="./dingo/dingo-widget.js"></script>
    <dingo-app asset-base="./dingo/"></dingo-app>
  </body>
</html>
`;

  fs.writeFileSync(testHtmlFile, html, "utf8");
}

console.log("[Dingo Base44 Export] Preparing widget package...");

verifyFile(distWidgetFile);
verifyDirectory(distAssetsDir);

fs.rmSync(exportRoot, { recursive: true, force: true });
fs.mkdirSync(widgetExportDir, { recursive: true });

fs.copyFileSync(distWidgetFile, exportWidgetFile);
copyDirectory(distAssetsDir, exportAssetsDir);
writeTestHtml();

verifyFile(exportWidgetFile);
verifyDirectory(exportAssetsDir);
verifyFile(testHtmlFile);

console.log("[Dingo Base44 Export] Success.");
console.log(`- ${path.relative(projectRoot, exportWidgetFile)}`);
console.log(`- ${path.relative(projectRoot, exportAssetsDir)}`);
console.log(`- ${path.relative(projectRoot, testHtmlFile)}`);
console.log("\nCopy base44-export/dingo/ into the Base44 public folder as public/dingo/.");
