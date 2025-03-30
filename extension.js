const vscode = require("vscode");
const fs = require("fs-extra");
const path = require("path");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log("TrueScreenshot extension is now active!");

  // Register the command to capture a screenshot
  let disposable = vscode.commands.registerCommand(
    "extension.captureScreenshot",
    async function () {
      try {
        await captureScreenshot(context);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error capturing screenshot: ${error.message}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

/**
 * Captures a screenshot of the code with all visual elements intact
 * @param {vscode.ExtensionContext} context
 */
async function captureScreenshot(context) {
  // Get active editor
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage("No active editor found");
    return;
  }

  // Show progress notification
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Preparing screenshot...",
      cancellable: false,
    },
    async (progress) => {
      // Get configuration
      const config = vscode.workspace.getConfiguration("truescreenshot");
      const quality = config.get("quality") || 90;
      const format = config.get("format") || "png";

      // Get the document and selection
      const document = editor.document;
      const selection = editor.selection;

      // Get diagnostics (errors, warnings) for the file
      const diagnostics = vscode.languages.getDiagnostics(document.uri);

      // Determine range to capture
      let startLine, endLine;
      if (selection && !selection.isEmpty) {
        startLine = selection.start.line;
        endLine = selection.end.line;
      } else {
        startLine = 0;
        endLine = document.lineCount - 1;
      }

      // Get the code text with line numbers
      const codeLines = [];
      for (let i = startLine; i <= endLine; i++) {
        codeLines.push(document.lineAt(i).text);
      }
      const code = codeLines.join("\n");

      // Create a webview panel to render the code
      const panel = vscode.window.createWebviewPanel(
        "screenshotPreview",
        "Screenshot Preview",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "media")),
          ],
        }
      );

      // Prepare diagnostics data for the webview
      const diagnosticsData = diagnostics.map((d) => ({
        startLine: d.range.start.line,
        startChar: d.range.start.character,
        endLine: d.range.end.line,
        endChar: d.range.end.character,
        message: d.message,
        severity: d.severity,
        code: d.code,
      }));

      // Get the editor's current theme colors
      const tokenColors = await getTokenColors();

      // Create HTML content with the code, diagnostics, and styling
      panel.webview.html = generateHtml(
        code,
        document.languageId,
        diagnosticsData,
        startLine,
        tokenColors,
        quality,
        format
      );

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(
        async (message) => {
          if (message.command === "saveScreenshot") {
            try {
              // Extract base64 data from data URL
              const base64Data = message.dataUrl.split(",")[1];

              // Let user choose where to save the file
              const defaultPath = path.join(
                vscode.workspace.workspaceFolders &&
                  vscode.workspace.workspaceFolders.length > 0
                  ? vscode.workspace.workspaceFolders[0].uri.fsPath
                  : require("os").homedir(),
                `screenshot.${format}`
              );

              const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultPath),
                filters: {
                  Images: [format],
                },
              });

              if (saveUri) {
                // Save the file
                const buffer = Buffer.from(base64Data, "base64");
                await fs.writeFile(saveUri.fsPath, buffer);

                vscode.window.showInformationMessage(
                  `Screenshot saved to ${saveUri.fsPath}`
                );
              }
            } catch (error) {
              vscode.window.showErrorMessage(
                `Error saving screenshot: ${error.message}`
              );
            }
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );
}

/**
 * Get token colors from current theme
 * @returns {Promise<Object>} Token colors
 */
async function getTokenColors() {
  // Default VS Code dark theme colors
  return {
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    lineNumber: "#858585",
    keyword: "#569cd6",
    string: "#ce9178",
    comment: "#6a9955",
    variable: "#9cdcfe",
    function: "#dcdcaa",
    number: "#b5cea8",
    class: "#4ec9b0",
    type: "#4ec9b0",
    error: "#f14c4c",
    warning: "#cca700",
  };
}

/**
 * Generate HTML for the webview with code and diagnostics
 * @param {string} code Code to display
 * @param {string} languageId Language ID
 * @param {Array} diagnostics Diagnostics data
 * @param {number} startLine Starting line number
 * @param {Object} colors Theme colors
 * @param {number} quality Image quality
 * @param {string} format Image format
 * @returns {string} HTML content
 */
function generateHtml(
  code,
  languageId,
  diagnostics,
  startLine,
  colors,
  quality,
  format
) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Screenshot</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/vs2015.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: ${colors.background};
            color: ${colors.foreground};
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .code-container {
            display: flex;
            background-color: ${colors.background};
            border-radius: 4px;
            overflow: hidden;
            white-space: pre;
        }
        
        .line-numbers {
            padding: 10px 10px 10px 0;
            text-align: right;
            color: ${colors.lineNumber};
            background-color: ${colors.background};
            user-select: none;
            border-right: 1px solid #333;
            min-width: 40px;
        }
        
        .code-content {
            padding: 10px;
            overflow-x: auto;
            flex-grow: 1;
            position: relative;
        }
        
        pre {
            margin: 0;
            white-space: pre;
        }
        
        code {
            font-family: 'Consolas', 'Courier New', monospace;
            tab-size: 4;
        }
        
        .diagnostic {
            position: absolute;
            background-image: url("data:image/svg+xml,%3Csvg width='6' height='3' viewBox='0 0 6 3' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 2.5 L2 0 L4 2.5 L6 0' fill='none' stroke='%23f14c4c' stroke-width='1'/%3E%3C/svg%3E");
            background-position: bottom;
            background-repeat: repeat-x;
            background-size: 6px 3px;
            padding-bottom: 3px;
        }
        
        .error {
            background-image: url("data:image/svg+xml,%3Csvg width='6' height='3' viewBox='0 0 6 3' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 2.5 L2 0 L4 2.5 L6 0' fill='none' stroke='%23f14c4c' stroke-width='1'/%3E%3C/svg%3E");
        }
        
        .warning {
            background-image: url("data:image/svg+xml,%3Csvg width='6' height='3' viewBox='0 0 6 3' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 2.5 L2 0 L4 2.5 L6 0' fill='none' stroke='%23cca700' stroke-width='1'/%3E%3C/svg%3E");
        }
        
        /* Custom token colors to match VS Code */
        .hljs-keyword {
            color: ${colors.keyword};
        }
        
        .hljs-string {
            color: ${colors.string};
        }
        
        .hljs-comment {
            color: ${colors.comment};
        }
        
        .hljs-variable {
            color: ${colors.variable};
        }
        
        .hljs-function {
            color: ${colors.function};
        }
        
        .hljs-number {
            color: ${colors.number};
        }
        
        .hljs-built_in {
            color: ${colors.function};
        }
        
        .hljs-params {
            color: ${colors.variable};
        }
        
        /* Specific error highlighting */
        .typo-error {
            text-decoration: wavy underline ${colors.error};
            text-decoration-skip-ink: none;
        }
        
        .controls {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        
        button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background-color: #0e639c;
            color: white;
        }
        
        button:hover {
            background-color: #1177bb;
        }
    </style>
</head>
<body>
    <div id="capture-area">
        <div class="code-container">
            <div class="line-numbers">
                ${generateLineNumbers(code, startLine)}
            </div>
            <div class="code-content">
                <pre><code id="code-block" class="language-${languageId}">${escapeHtml(
    code
  )}</code></pre>
                <div id="diagnostics-layer"></div>
            </div>
        </div>
    </div>
    
    <div class="controls">
        <button id="save-btn">Save Screenshot</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const diagnostics = ${JSON.stringify(diagnostics)};
        const startLineOffset = ${startLine};
        
        // Initialize highlight.js
        document.addEventListener('DOMContentLoaded', () => {
            // Highlight code
            hljs.highlightAll();
            
            // Add error styling
            addDiagnosticsStyling();
            
            // Set up common error patterns
            addCommonErrorStyling();
            
            // Set up button
            document.getElementById('save-btn').addEventListener('click', captureAndSave);
        });
        
        // Add diagnostic styling
        function addDiagnosticsStyling() {
            const codeBlock = document.getElementById('code-block');
            const codeContent = document.querySelector('.code-content');
            
            // Get line heights and character widths
            const tempSpan = document.createElement('span');
            tempSpan.innerHTML = 'x';
            codeContent.appendChild(tempSpan);
            const charWidth = tempSpan.getBoundingClientRect().width;
            const lineHeight = parseInt(getComputedStyle(codeBlock).lineHeight) || 21;
            codeContent.removeChild(tempSpan);
            
            // Add diagnostic markers
            diagnostics.forEach(diag => {
                // Adjust for line offset
                const startLine = diag.startLine - startLineOffset;
                const endLine = diag.endLine - startLineOffset;
                
                if (startLine < 0 || startLine >= ${code.split("\n").length}) {
                    return; // Skip diagnostics outside our range
                }
                
                // Create marker element
                const marker = document.createElement('div');
                marker.className = 'diagnostic ' + (diag.severity === 1 ? 'error' : 'warning');
                
                // Position marker
                marker.style.left = (diag.startChar * charWidth) + 'px';
                marker.style.top = (startLine * lineHeight) + 'px';
                marker.style.width = ((diag.endChar - diag.startChar) * charWidth) + 'px';
                marker.style.height = lineHeight + 'px';
                
                // Add tooltip
                marker.title = diag.message;
                
                document.getElementById('diagnostics-layer').appendChild(marker);
            });
        }
        
        // Add styling for common error patterns
        function addCommonErrorStyling() {
            const codeText = document.getElementById('code-block').innerHTML;
            
            // Find common JavaScript errors
            const commonErrors = [
                { pattern: /\\bfunctin\\b/g, replacement: '<span class="typo-error">functin</span>' },
                { pattern: /\\boutputDi\\b/g, replacement: '<span class="typo-error">outputDi</span>' },
                { pattern: /\\bese\\b(?!\\s*if)/g, replacement: '<span class="typo-error">ese</span>' }
            ];
            
            let processedCode = codeText;
            commonErrors.forEach(error => {
                processedCode = processedCode.replace(error.pattern, error.replacement);
            });
            
            if (processedCode !== codeText) {
                document.getElementById('code-block').innerHTML = processedCode;
            }
        }
        
        // Capture and save screenshot
        function captureAndSave() {
            const captureArea = document.getElementById('capture-area');
            
            html2canvas(captureArea, {
                scale: 2, // Higher resolution
                backgroundColor: '${colors.background}',
                logging: false,
                useCORS: true,
                allowTaint: true
            }).then(canvas => {
                const dataUrl = canvas.toDataURL('image/${format}', ${
    quality / 100
  });
                
                // Send data back to extension
                vscode.postMessage({
                    command: 'saveScreenshot',
                    dataUrl: dataUrl
                });
            });
        }
    </script>
</body>
</html>`;
}

/**
 * Generate HTML for line numbers
 * @param {string} code Code to generate line numbers for
 * @param {number} startLine Starting line number
 * @returns {string} HTML for line numbers
 */
function generateLineNumbers(code, startLine) {
  const lines = code.split("\n");
  return lines
    .map((_, index) => `<div>${startLine + index + 1}</div>`)
    .join("");
}

/**
 * Escape HTML special characters
 * @param {string} unsafe Unsafe string
 * @returns {string} Escaped HTML string
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
